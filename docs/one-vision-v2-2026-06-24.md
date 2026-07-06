# Vision du One — v2 (2026-06-24)

> **Source de vérité** de la refonte stratégique du dashboard One, validée en session avec MiKL.
> Remplace les passages contradictoires des anciens docs (instances dédiées, « le client possède
> son outil », flou Élio One). Base factuelle : `docs/one-audit-existant-2026-06-23.md`.
> Statut : vision **validée**, quelques réglages encore ouverts (voir §8).

---

## 1. La mission en une phrase

> **Le One est la console de pilotage des livrables du client + le canal de lien permanent avec MiKL.**

Le client ne *possède* pas l'outil (la base technique appartient à MiKL) : il y **accède** via son
abonnement. Le One n'est plus « l'outil qu'on donne », c'est « le poste de commande de tout ce que
MiKL fabrique pour lui, plus la relation continue ».

### Les 3 couches
```
🔵 SOCLE UNIVERSEL (modules RELATION)  → identique pour tous, gère le lien client ↔ MiKL
🟢 COCKPITS (modules sur-mesure)       → pilotent SES livrables (site, app...), variables par projet
🤝 LIEN MiKL                            → relation continue, évolutions, coaching (selon offre)
```

---

## 2. Distinction structurante : Relation vs Cockpit

| Famille | Rôle | Nature |
|---|---|---|
| 🔵 **Modules RELATION** (« One de base ») | Gèrent le lien client ↔ MiKL | Universels, identiques pour tous |
| 🟢 **Modules COCKPIT** | Pilotent les livrables du client (son site, son app, ses métriques) | Sur-mesure, branchés selon le projet |

**Le base = la relation. Le cockpit = le produit.**

---

## 3. La bibliothèque de modules + l'agent FORGE

**Principe** : chaque module développé pour un client **nourrit une bibliothèque réutilisable**
(`packages/modules/` — déjà en place, système manifest auto-découvert). Une commande similaire
plus tard = on rebranche une brique existante au lieu de recoder. Le sur-mesure est dans
l'**assemblage**, pas dans la fabrication de chaque brique (principe Lego 🧱).

**Règle de discipline absolue** (sinon la bibliothèque devient un cimetière de code) :
> Un module ne connaît JAMAIS un client en particulier. Toute spécificité client (URL, couleurs,
> contenus, clés API, source de métriques) vit en **base / config**, jamais dans le code.

**FORGE « le Forgeron »** — nouvel **agent MPP dédié** (validé MiKL 2026-06-24), paramétrable sans
perturber ARCH. Rôle :
- Détient la **doctrine module** (générique, configurable, manifest + docs guide/faq/flows obligatoires).
- **Gate d'entrée** : tout nouveau module passe sa revue avant d'être « labellisé bibliothèque ».
- **Tient le catalogue** : sait ce qui existe, évite de recoder un module déjà présent.
- **Conseille au lancement projet** : « tu as déjà A et B, il te manque juste C ».
- → *À créer (skill) quand la vision sera totalement figée. Pas encore construit.*

---

## 4. Ce qu'on ABANDONNE / ce qu'on GARDE

| Décision | Détail |
|---|---|
| ❌ **Abandon — kit de sortie One** | Provisioning instance dédiée (Vercel + Supabase + repo au client). Utopie technique. *(Audit : `client_instances`/`instance_transfers`/`client_handoffs` = 0 ligne, jamais déclenché.)* |
| ❌ **Abandon — « le client possède son outil »** | La base de l'outil appartient à MiKL. Le client y accède via abonnement. |
| ✅ **Gardé — kit de sortie LAB** | À tout moment, le client peut repartir avec un kit de **ses documents validés** (briefs, livrables). Self-service, permanent. *(Brique existante : `client_lab_exports` + Edge Functions `generate-client-export` déployées.)* |

---

## 5. Le socle universel (One de base)

Tous les onglets ci-dessous sont **déjà construits et fonctionnels** (audit) — on réorganise, on ne repart pas de zéro.

```
🏠 Accueil           Vue d'ensemble + mot d'Élio
💬 Chat MiKL         Le lien direct permanent
📄 Documents         Livrables + docs validés
📣 Suivi de l'outil  Fil « voilà où en est ton outil »
🆘 Support           Bugs / questions
🤖 Élio One          Assistant usage des outils + collecteur de demandes d'évolution
🔔 Notifications     Cloche
⚙️ Paramètres        → Profil · Mes factures (abonnement MPP) · RGPD · Accès
🧪 Accès Lab         Toggle si parcours / nouveau projet (à vie en One+)
```

**Décision facturation** : « Facturation » **sort du socle** (c'était une brique cockpit = outil pour
que le client facture SES clients → bibliothèque FORGE plus tard). L'aspect « mes factures
d'abonnement MPP » est **rapatrié dans Paramètres → Mes factures** (réutilise le module Pennylane
existant, `billing_sync`).

Puis 🟢 **cockpits sur-mesure** branchés par-dessus selon le projet : Cockpit Site (changer
photos/textes, métriques de visite), Cockpit App (raccourci + métriques + actions), etc.

---

## 6. Les 3 offres

| | **① Ponctuel** | **② One** | **③ One+** |
|---|---|---|---|
| **Prix** | Devis projet (one-shot) | **39 €/mois** | **99 €/mois** |
| **Promesse** | « Mon outil, livré. » | « Mon outil vit, et je garde le lien. » | « Mon outil vit, et j'ai quelqu'un. » |
| **Dashboard One** | ❌ (repart avec kit Lab) | ✅ socle + cockpits | ✅ socle + cockpits |
| **Hébergement + maintenance + débogage** | — | ✅ | ✅ |
| **Élio (assistant usage des outils)** | — | ✅ | ✅ |
| **Chat (support de base + demandes d'évolution)** | — | ✅ | ✅ |
| **Coaching humain** (psyché, blocages, accompagnement perso) | — | ❌ | ✅ |
| **Lab actif à vie** | — | si besoin | ✅ à vie |
| **Évolutions produit / agentique IA** | au devis | au devis | au devis |

### Détail coaching One+
- 🎥 **1 visio de coaching / mois** — durée libre (credo MiKL : « au service de l'humain avant tout »).
- 💬 **Chat illimité** pour parler de l'**évolution du projet/produit** (nourrit les futurs devs MiKL).
- 🧪 **Lab actif à vie**.
- ➕ **Séances humaines supplémentaires** : **facturées** (1 visio/mois incluse, au-delà payant), **tarif dégressif** → **45 € pour un One+, 75 € pour un One**. Crée un upsell ② → ③.

### Cycle de vie visuel du One : « en chantier → livré »
Quand le client signe, son outil n'existe pas encore (MiKL le développe). Le One affiche alors un
**état visuel « en chantier »** (le client suit l'avancement via le module Suivi de l'outil), puis
**bascule en « livré »** quand l'outil est prêt. **Les onglets restent identiques** dans les deux états
(le client a tout le socle dès le départ) — seuls les **cockpits sur-mesure s'allument** à la livraison.
C'est purement visuel, aucune restriction d'accès.

### Positionnement du coaching (important)
Coaching = **accompagnement humain de l'entrepreneur** (psyché, blocages, motivation, solitude du
créateur), **pas du conseil métier expert** (MiKL ne prétend pas maîtriser tous les secteurs). C'est
honnête et différenciant : peu de prestataires tech offrent une présence humaine.

### Décisions de packaging actées
- **Agentique IA = option au devis de dev**, jamais incluse dans un tier (coûte cher en API + temps).
- **Évolutions = toujours au devis**, jamais un quota inclus (évite les conflits « inclus ou pas ? »).
  MiKL peut offrir une petite retouche en geste commercial, à sa main.
- **Coaching humain = le SEUL levier qui sépare ② et ③** → repose entièrement sur la marque « MiKL coach ».

---

## 7. Insight stratégique — le One ② est un canal de fidélisation

Garder le client dans son One = **rester dans son radar** pour ses futurs projets (nouveau site,
nouvelle app). Le vrai ROI du One ② n'est pas la marge de l'abonnement, c'est **les projets de dev
qu'il génère derrière**. → Le One ② peut être volontairement **peu cher** (quasi produit d'appel).

---

## 8. Décisions finalisées (2026-06-24)

- ✅ **Séances coaching supp.** : facturées, dégressif (45 € One+ / 75 € One).
- ✅ **Pricing** : ① devis · ② 39 €/mois · ③ 99 €/mois.
- ✅ **Phases « en chantier → livré »** : bascule visuelle, onglets identiques, cockpits qui s'allument à la livraison.
- ✅ **Offre ① Ponctuel** : l'outil est construit **en standalone dès le départ** (Supabase + Vercel propres au client) ; il en repart propriétaire ; pas de récurrent → facturé plus cher en one-shot, maintenance en option.
- ✅ **Usage IA** : pas de fair-use strict pour l'instant ; si le coût dérape, MiKL change de fournisseur IA.

## 9. Questions encore ouvertes (prochaine session)

1. **Sources de métriques** des cockpits : décidées **projet par projet** (pas de choix figé pour éviter les coquilles vides).
2. **Posture exacte d'Élio One** : préciser la frontière « assistant d'usage des outils » vs « collecteur de demandes d'évolution ».
3. ~~**Nettoyage doc** : mettre à jour `epic-list.md` (contredit l'ADR-01 : parle encore d'instances dédiées).~~ ✅ **Fait le 2026-07-06** : `epic-list.md` réaligné (Epics 1, 9, 10, 12 + note de révision), `architecture/03-core-decisions.md` corrigé (tableau déploiement multi-tenant unique), note d'obsolescence en tête de `epic-9-...-stories-detaillees.md`. Les rapports datés (readiness, impact-assessment) sont conservés tels quels comme archives.
4. **Plan de construction** : par quoi on commence pour matérialiser cette vision (socle propre + 1er cockpit type ?).
```

