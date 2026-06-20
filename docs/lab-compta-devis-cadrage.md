# Cadrage — Relier le Lab au flux Comptabilité

> Cadrage du 2026-06-20 (MiKL + MAX).
>
> ⚠️ **DÉCISION FINALE (2026-06-20)** : on **abandonne** l'idée d'un statut « devis en
> attente de signature » côté Lab. Le devis, la signature et les relances sont gérés
> **dans la section Comptabilité**, à part. Le Lab est **déclenché au PAIEMENT validé**
> (comme prévu à l'origine). Ce qu'on relie : paiement d'un devis `lab_onboarding` →
> activation Lab + statut + 1er mail de bienvenue.
>
> **Implémenté (commit suivant)** :
> 1. `handleLabOnboardingPaid` pose `clients.lab_paid=true` + `lab_paid_at` (+ `lab_amount`).
> 2. 1er mail `welcome-venture` envoyé AU PAIEMENT (le mail d'accès reste au lancement parcours).
> 3. Cohérence : `getClientLabStatus.labPaid` → l'onglet Lab affiche « payé — actif ».
>
> Les sections 3-5 ci-dessous documentent l'exploration initiale (incl. la piste signature
> finalement écartée) — conservées pour mémoire.

## 1. État des lieux (vérifié en code + prod)

Le flux compta gère déjà un type de devis **`lab_onboarding` (Lab 199€)**, et la chaîne est **déjà branchée** :

```
Devis lab_onboarding (Comptabilité)  →  client paie  →  webhook Pennylane /paid
   →  handleLabOnboardingPaid()  →  crée le compte + active le Lab
       (dashboard_type=lab, lab_mode_available, elio_lab_enabled, active_modules)
   →  notifie MiKL « configure le parcours »
```

Cycle de vie d'un devis (`quote_metadata`) :

| Étape | Colonne | Écrite aujourd'hui ? |
|-------|---------|----------------------|
| Devis créé | (row) | ✅ `createAndSendQuote` |
| Devis envoyé = **en attente de signature** | `sent_at` | ✅ `send-quote-by-email` / `create-quote` |
| Devis **signé** | `signed_at` | ❌ jamais (colonne orpheline) |
| Payé → Lab activé | `paid_at` | ✅ webhook `/paid` |

En prod : 0 devis `lab_onboarding` (uniquement `one_direct_deposit`, `ponctuel_deposit`). `signed_at` = 0 partout.

## 2. Manques identifiés

1. **Statut Lab non branché sur le devis** : `getClientLabStatus` lit `clients.lab_invoice_sent_at` / `lab_paid` (vieux flux « facture directe »), pas `quote_metadata`.
2. **Signature non captée** : `signed_at` n'est écrit par rien. Pas de webhook Pennylane « devis signé » (webhooks Pennylane en beta très limitée).
3. **Bug** : `handleLabOnboardingPaid()` n'écrit pas `clients.lab_paid=true` → statut « payé » + déduction Lab (-199€ sur devis One) jamais actifs.
4. **Email** : aucun mail au paiement (par design LOT C : l'invite part au lancement du parcours).

## 3. Décisions MiKL (2026-06-20)

- **Signature** : auto via Pennylane. ⚠️ **Contrainte découverte** : Pennylane n'a PAS de webhook « devis signé ». L'auto se fera donc par **polling** : un cron lit le `status` des devis Lab en attente via `GET /quotes/{id}` (notre code lit déjà `quote.status` dans `getQuoteWithLines`) et écrit `signed_at`. Reste à confirmer la valeur exacte du statut Pennylane « accepté/signé » (test API live).
- **Email** : **les deux**.
  1. **Au paiement** : 1er mail chaleureux « Ravi de partager cette aventure » — prévient que le compte est créé, qu'un 2e mail avec tous les détails arrive bientôt, « en attendant on paramètre ton dashboard aux petits oignons ».
  2. **Au lancement du parcours** : mail détaillé existant (invite « définis ton mot de passe » + 1ʳᵉ étape, LOT C).

## 4. Statut Lab cible (unifié, lu depuis le devis)

`État du Lab` dérivé du devis `lab_onboarding` le plus récent :

| État | Condition |
|------|-----------|
| Pas de devis Lab | aucun `quote_metadata` lab_onboarding |
| Devis créé (pas envoyé) | row, `sent_at` null |
| **Devis envoyé — en attente de signature** | `sent_at` set, `signed_at` null, `paid_at` null |
| **Devis signé — en attente de paiement** | `signed_at` set, `paid_at` null |
| **Payé — Lab actif** | `paid_at` set |
| (legacy) Activé manuellement | pas de devis mais `dashboard_type=lab` |

## 5. Plan de dev proposé (lots)

- **LOT G1 — Statut Lab branché sur le devis (fondation, sans dépendance externe)**
  - `getClientLabStatus` lit aussi `quote_metadata` (lab_onboarding récent) → expose `quoteStatus` (créé/envoyé/signé/payé) + dates.
  - Cockpit (bloc Instance One / À traiter) + onglet Lab affichent le vrai statut.
  - **Fix** : `handleLabOnboardingPaid()` écrit `clients.lab_paid=true` + `lab_paid_at`.
  - Tests + build.

- **LOT G2 — 1er mail de bienvenue au paiement**
  - Template `welcome-venture` (chaleureux, « 2e mail à suivre »).
  - `handleLabOnboardingPaid()` l'envoie (best-effort, n'échoue jamais le webhook).
  - L'invite parcours (LOT C) reste au lancement.

- **LOT G3 — Signature auto (polling Pennylane)**
  - Confirmer la valeur de statut Pennylane « signé/accepté » (test API).
  - Cron (pg_cron + Edge Function, comme LOT F) : pour chaque devis Lab `sent_at` set / `paid_at` null, lire `GET /quotes/{id}` ; si accepté → écrire `signed_at`.
  - Le statut « en attente de signature » → « signé » devient automatique.

- **LOT G4 (option) — Créer le devis Lab depuis la fiche client**
  - Raccourci CRM → Comptabilité pré-rempli (type lab_onboarding, 199€) si le parcours actuel n'est pas assez fluide.

## 6. Ordre recommandé

G1 d'abord (valeur immédiate, zéro dépendance externe, corrige le bug `lab_paid`), puis G2 (email), puis G3 (polling signature, après confirmation du statut Pennylane). G4 selon besoin.
