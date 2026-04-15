# Prod Checklist — MonprojetPro

> Liste exhaustive des actions manuelles à faire avant / pendant la mise en production.
> Chaque entrée est ajoutée par les stories qui posent un prérequis externe (clé API, webhook, DNS, etc.).
> Format : `[ ]` = à faire, `[x]` = fait, `[~]` = en cours.

---

## Comment utiliser ce fichier

- **Avant chaque déploiement prod** : relire la section "Bloquant prod" et cocher / valider chaque ligne.
- **Avant d'activer un client réel** : vérifier que toutes les sections "Bloquant onboarding client" sont vertes.
- **Quand une story ajoute un prérequis** : Claude met à jour ce fichier dans le commit de la story (étape DOC du pipeline).

---

## 🔴 Bloquant prod — Variables d'environnement Vercel

À configurer sur **chaque environnement Vercel** (preview + production), pour les apps `hub` et `client`.

### Communes (déjà configurées normalement)

- [ ] `NEXT_PUBLIC_SUPABASE_URL` — URL projet Supabase
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` — clé anon
- [ ] `SUPABASE_SERVICE_ROLE_KEY` — clé service role (jamais exposée client, utilisée par les webhooks et les Edge Functions)
- [ ] `NEXT_PUBLIC_CLIENT_URL` — `https://app.monprojet-pro.com` en prod
- [ ] `RESEND_API_KEY` — utilisée par les Edge Functions email
- [ ] `EMAIL_FROM` — adresse expéditeur Resend (ex: `MonprojetPro <no-reply@monprojet-pro.com>`)

### Story 11.x — Pennylane facturation

- [ ] `PENNYLANE_API_TOKEN` — token API Pennylane (sandbox d'abord, prod ensuite)
- [ ] `PENNYLANE_API_URL` — `https://sandbox.pennylane.com/api/external/v2` (sandbox) ou `https://app.pennylane.com/api/external/v2` (prod)

### Story 13.4 — Tunnel paiement Pennylane

- [ ] `PENNYLANE_WEBHOOK_SECRET` — secret HMAC partagé avec Pennylane (générer une chaîne aléatoire 32+ chars)

---

## 🔴 Bloquant prod — Edge Functions Supabase à déployer

> ⚠️ **DÉCOUVERT 2026-04-15** : sur le projet Supabase actuel (`monprojetpro-HUB`), **une seule Edge Function est déployée** (`elio-chat`). Toutes les autres existent dans le code (`supabase/functions/*`) mais n'ont jamais été déployées.
> Conséquence concrète détectée : `billing_sync` (devis/factures) figé depuis le 2026-02-10, aucun devis n'apparaissait dans le Hub.
> Patch immédiat appliqué par la story 13.4 : `create-quote.ts` insère directement dans `billing_sync` au lieu de dépendre de l'Edge Function. Mais les autres fonctions doivent être déployées pour le bon fonctionnement complet.

À déployer via `npx supabase functions deploy <name>` ou via le MCP Supabase :

- [ ] **`billing-sync`** — polling Pennylane (factures, devis à étendre dans une story future). Cron pg_cron toutes les 5 min à activer après déploiement.
- [ ] **`send-email`** — envoi des emails transactionnels via Resend (welcome-lab, welcome-one, final-payment-confirmation, validation, graduation, etc.). **CRITIQUE pour la story 13.4 — sans elle, aucun email d'invitation n'est envoyé.**
- [ ] **`calcom-webhook`** — réception webhook Cal.com (rendez-vous prospect)
- [ ] **`check-inactivity`** — détection clients Lab inactifs (cron quotidien)
- [ ] **`elio-alerts-cron`** — alertes proactives Élio One+ (Story 8.9c)
- [ ] **`health-check-cron`** — monitoring santé système (Story 12.5a)
- [ ] **`instances-monitor-cron`** — monitoring usage instances (Story 12.7)
- [ ] **`backup-weekly`** — backup hebdomadaire (Story 12.2)
- [ ] **`cleanup-archived-clients`** — nettoyage clients archivés (Story 9.5c)
- [ ] **`cleanup-expired-exports`** — nettoyage exports RGPD expirés (Story 9.5a)
- [ ] **`generate-client-export`** — génération exports RGPD client (Story 9.5a)
- [ ] **`get-openvidu-token`** — token visio OpenVidu (Story 5.1)
- [ ] **`openvidu-webhook`** — webhook fin de visio (Story 5.1-5.2)
- [ ] **`transcribe-recording`** — transcription enregistrements visio (Story 5.2)
- [ ] **`transfer-client-instance`** — kit de sortie One (legacy story 9.5b — sera remplacé par Story 13.1)

### Secrets Supabase Edge Functions à configurer

Via `supabase secrets set` ou dashboard Supabase → Settings → Edge Functions → Secrets :

- [ ] `PENNYLANE_API_TOKEN` — token API Pennylane (sandbox puis prod)
- [ ] `RESEND_API_KEY` — clé API Resend pour l'envoi d'emails
- [ ] `EMAIL_FROM` — adresse expéditeur Resend (ex: `MonprojetPro <no-reply@monprojet-pro.com>`)
- [ ] `APP_URL` — URL de l'app cliente (ex: `https://app.monprojet-pro.com`)

### Cron pg_cron à activer après déploiement billing-sync

Dans Supabase Studio → SQL Editor :
```sql
SELECT cron.schedule(
  'billing-sync-cron',
  '*/5 * * * *',
  $$SELECT net.http_post(
    url:='https://mpgpwcpeqfwknohhqdmd.supabase.co/functions/v1/billing-sync',
    headers:='{"Authorization":"Bearer <SERVICE_ROLE_KEY>","Content-Type":"application/json"}'::jsonb,
    body:='{}'::jsonb
  )$$
);
```

---

## 🔴 Bloquant prod — Webhooks à configurer côté tiers

### Pennylane (Story 13.4)

- [ ] Aller dans le dashboard Pennylane → Paramètres → Webhooks
- [ ] Créer un webhook sur l'événement **"facture payée"** (`invoice.paid` ou équivalent)
- [ ] URL cible : `https://hub.monprojet-pro.com/api/webhooks/pennylane/paid`
- [ ] Définir le secret HMAC (mettre la même valeur que `PENNYLANE_WEBHOOK_SECRET` côté Vercel)
- [ ] Vérifier que le header signature est `x-pennylane-signature` (sinon ajuster `route.ts`)
- [ ] Tester avec une facture sandbox payée → vérifier qu'un compte est créé

### Cal.com (Story 5.3)

- [ ] Webhook Cal.com → ancienne URL `*.foxeo.io` à remplacer par `https://hub.monprojet-pro.com/api/webhooks/cal-com` au lancement

### Stripe / autres (à venir avec stories futures)

- _Aucun pour l'instant_

---

## 🔴 Bloquant prod — DNS & domaines

- [ ] `hub.monprojet-pro.com` → pointe vers le déploiement Vercel `apps/hub`
- [ ] `app.monprojet-pro.com` → pointe vers le déploiement Vercel `apps/client` (multi-tenant Lab + One)
- [ ] `monprojet-pro.com` (vitrine) → pointe où il faut
- [ ] Certificats SSL OK sur les 3 sous-domaines

---

## 🟠 Bloquant onboarding client — Comptes & accès

- [ ] Compte Pennylane prod actif avec les bons SIRET / coordonnées entreprise
- [ ] Compte Resend vérifié, domaine d'envoi configuré (SPF / DKIM / DMARC)
- [ ] Compte Supabase prod : RLS testée sur tables sensibles, backups activés
- [ ] Compte OpenVidu prod (Story 5.x) — clés en env vars
- [ ] Compte Google Cloud (Drive / Calendar / Gmail) si stories 13.7-13.9 activées

---

## 🟢 Pré-flight checks avant chaque déploiement

- [ ] Toutes les migrations Supabase appliquées sur la prod (`supabase db push`)
- [ ] `npm run build` passe en local
- [ ] Tests verts sur toutes les stories de la release
- [ ] Backup DB Supabase fait juste avant
- [ ] Vercel preview testée sur preview deployment URL avant de promote en prod

---

## Notes

- Les Edge Functions Supabase (`send-email`, `billing-sync`, etc.) doivent être déployées via `supabase functions deploy <name>` après chaque modification.
- Le secret `PENNYLANE_WEBHOOK_SECRET` doit être identique côté Vercel et côté Pennylane — sinon le webhook retournera 401.
- Si tu changes `SUPABASE_SERVICE_ROLE_KEY`, tous les webhooks (`pennylane/paid`, `contact-form`, `cal-com`) cassent en silence — penser à les retester.
