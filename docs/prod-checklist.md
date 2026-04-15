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
