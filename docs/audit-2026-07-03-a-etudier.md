# Audit 2026-07-03 — Dossier d'étude (à trancher au cas par cas)

> Issu de l'audit complet full Fable du 2026-07-03.
> L'Horizon 1 (réparations) a été exécuté le jour même — **sauf** le raccrochage des pages orphelines, volontairement mis de côté ici pour étude.
> Ce document contient : ① les 8 pages orphelines, ② les évolutions Horizon 2, ③ les évolutions Horizon 3, ④ tes actions côté tokens/secrets, ⑤ le reliquat sécurité 🟠.

---

## ① Les 8 pages orphelines (fonctionnelles mais sans aucun lien)

Du travail déjà développé et opérationnel, invisible faute d'un lien. Pour chacune : décider **raccrocher / supprimer / fusionner**.

| # | Page | Ce qu'elle fait | Effort pour raccrocher | Recommandation |
|---|------|-----------------|------------------------|----------------|
| 1 | Hub `/modules/templates` | Éditeur complet de templates de parcours Lab + templates d'emails | Ajouter 1 entrée sidebar Hub | 🟢 Raccrocher — c'est un outil d'opérateur que tu vas utiliser à chaque nouveau client |
| 2 | Hub `/modules/analytics` | Dashboard analytics opérateur avec vraies données Supabase | 1 entrée sidebar Hub | 🟢 Raccrocher — mais décider d'abord s'il fait doublon avec les stats de l'accueil |
| 3 | Hub `/modules/crm/reminders` | Rappels & calendrier CRUD complet (table `reminders`) | 1 lien depuis la page CRM (onglet ou bouton) | 🟡 Étudier — chevauche l'Agenda ; soit fusionner dans l'Agenda, soit assumer « rappels client » dans le CRM |
| 4 | Hub `/modules/crm/stats` | Stats portefeuille (taux de graduation, temps par client…) | 1 lien depuis la page CRM | 🟡 Étudier — pourrait fusionner avec `/modules/analytics` (#2) pour ne garder qu'UN écran de stats |
| 5 | Client `/settings/notifications` | Préférences de notifications (toggles email/in-app) | 1 lien dans `/settings` **+ 1 bugfix obligatoire** : la page écrit sous `client.id` alors que l'enforcement lit `auth_user_id` → les toggles n'ont aucun effet réel tant que ce n'est pas corrigé | 🔴 Raccrocher + corriger ensemble — page finie à 95 %, mais la raccrocher SANS le fix donnerait des réglages placebo |
| 6 | Client `/settings/communication` | Profil de communication Élio (ton, style souhaités par le client) | 1 lien dans `/settings` | 🟢 Raccrocher — nourrit directement la qualité d'Élio |
| 7 | Client `/settings/elio/advanced` | Config avancée Élio (Orpheus) | 1 lien dans `/settings` | 🟡 Étudier — puissant mais peut-être trop technique pour un client ; option : le réserver au Hub (toi) plutôt qu'au client |
| 8 | Client `/modules/documentation` | Doc des modules actifs (guide/faq/flows) | ⚠️ Pas juste un lien : la page lit les `.md` via `fs` au runtime → **très probablement cassée sur Vercel** (fichiers absents du bundle serverless) | 🔴 Repenser — soit servir la doc autrement (import statique, base, ou l'injecter dans Élio qui répond déjà aux questions), soit supprimer la page |

Doublons mineurs relevés en passant (à nettoyer un jour, pas urgents) : client `/help` et `/support` (doublons des onglets du module support — la notif de ticket pointe vers `/support` au lieu de `/modules/support`), pages client `/modules/facturation` et `/modules/facturation/lab` (reliquat pré-Vision v2, contenu déménagé dans `/settings/billing`), Hub `/modules/admin/{catalog,instances}` (doublons des tabs).

---

## ② Évolutions Horizon 2 — compléter les kits entamés

Features dont le socle existe déjà ; à prioriser au cas par cas.

| # | Évolution | Ce qui existe déjà | Ce qui manque | Valeur |
|---|-----------|--------------------|---------------|--------|
| 1 | **Élio Hub, ton copilote** | Le chat Élio Hub complet existe (`/modules/elio`), mais les onglets `/elio/hub` et `/elio/one` affichent « À venir », et les « Suggestions Élio » de l'accueil sont statiques | Brancher de VRAIES suggestions calculées : parcours qui stagnent, impayés, clients silencieux, validations en attente depuis X jours | ⭐⭐⭐ C'est le cœur du modèle Centaure côté opérateur |
| 2 | **Lecture réelle des PDF par Élio** | L'upload accepte les PDF, TXT/DOCX sont réellement lus | L'extraction PDF renvoie juste `[Document PDF : nom.pdf]` — ajouter une vraie extraction de texte | ⭐⭐⭐ Grosse valeur perçue client, risque de confiance si découvert |
| 3 | **Recherche globale du header Hub** | La barre existe visuellement (décorative) | La brancher : clients, documents, messages, validations | ⭐⭐ Gain de temps quotidien pour toi |
| 4 | **RDV internes persistés dans l'Agenda** | L'agenda affiche Google/Cal.com/iCal (le faux chemin « local » a été retiré à l'Horizon 1) | Une table `internal_events` + CRUD si tu veux des RDV hors Google ; sinon statu quo (tout passe par Google Calendar) | ⭐ À décider : Google suffit peut-être |
| 5 | **Backups planifiés** | ✅ TERMINÉ le 2026-07-03 : `backup-weekly` déployée, bucket `backups` créé, onglet Backups branché, backup manuel vérifié en base (5 fichiers), cron hebdo `backup-weekly-sunday` actif (dimanche 3h) et testé de bout en bout (HTTP 200, triggeredBy=cron). Rétention 52 semaines gérée par la fonction | — | Fait |
| 6 | **Onglet Instances (One) opérationnel** | Les server actions provision/suspend/archive existent | Les boutons de la liste ne sont pas câblés (callbacks jamais passés) → brancher ou retirer l'onglet | ⭐⭐ |
| 7 | **Bouton micro Élio** | Le bouton existe (mort) dans les 2 apps | Soit implémenter la dictée (Web Speech API), soit retirer le bouton | ⭐ Retirer coûte 5 min ; implémenter = vraie feature |
| 8 | **Page « toutes mes notifications »** | La cloche + dropdown existent des deux côtés | Une page liste complète avec filtres/historique | ⭐ |
| 9 | **Emails de `transfer-client-instance` et `billing-sync`** | Fonctions déployées à l'Horizon 1, in-app OK | Leurs appels internes à `send-email` sont mal formés (rejetés en 400) : le transfert et la sync marchent, leurs emails de confirmation ne partent pas | ⭐ Petit fix à faire au premier usage réel |
| 10 | **Doctrine modules : trancher** | La règle « aucun import entre modules » est violée 29 fois (10 modules) ; sidebar Hub codée en dur vs registre auto-découvert promis | Soit assumer officiellement les dépendances déclarées dans les manifests (mettre la doctrine à jour), soit refactorer — décision d'architecture, pas un bug | ⭐⭐ Pour la maintenabilité long terme |

---

## ③ Évolutions Horizon 3 — vision produit (ce qui ferait décoller One)

| # | Vision | Idée | Pourquoi c'est différenciant |
|---|--------|------|------------------------------|
| 1 | **Reporting automatique client** | Digest mensuel généré par Élio pour chaque client One : avancement des livrables, échanges du mois, prochaines étapes — envoyé par email + consultable dans One | Matérialise le modèle Centaure : le client VOIT la valeur de l'accompagnement sans que tu rédiges quoi que ce soit |
| 2 | **Portail prospect self-service** | Le webhook contact-form crée déjà des prospects ; ajouter la vitrine : prise de RDV Cal.com intégrée + qualification par Élio AVANT le premier échange | Ton pipeline commercial s'auto-alimente pendant que tu dors |
| 3 | **Notifications push / PWA mobile** | Les clients One vivent sur téléphone ; la cloche in-app + email existent, le push est l'étape logique (PWA + Web Push) | Réactivité perçue de l'accompagnement |
| 4 | **Kit de sortie enfin opérationnel (Story 13.1)** | `transfer-client-instance` est maintenant déployée ; reste le bout-en-bout : provisioning Vercel/GitHub/Supabase + transfert d'ownership (nécessite `VERCEL_TOKEN`, `SUPABASE_MANAGEMENT_TOKEN`) | C'est la promesse commerciale « le client possède son outil en partant » |
| 5 | **Multi-opérateur** | Toute l'app est architecturée autour de toi seul (avatar « M » hardcodé compris) | À anticiper AVANT de recruter — c'est un chantier structurel (rôles, attribution des clients, RLS) |
| 6 | **Webhooks & API publique (placeholders « Phase 2 » de Maintenance & Système)** | Les onglets existent en placeholder | Ouvrir des intégrations tierces aux clients One (Zapier-like) | Attractivité de l'offre One |

---

## ④ ⏸️ TES actions — tokens & secrets (personne d'autre ne peut le faire)

1. **🔴 Token Supabase en clair dans `.mcp.json`** (`sbp_…`) :
   - Dashboard Supabase → Account → Access Tokens → **révoquer** ce token → en générer un nouveau.
   - Le stocker en variable d'environnement Windows utilisateur (ex : `FOXEOONE_SUPABASE_TOKEN`) et remplacer dans `.mcp.json` par `"Bearer ${FOXEOONE_SUPABASE_TOKEN}"` (même pattern que le bloc github juste au-dessus). Dis-le-moi et je fais la modif du fichier.
2. **`PENNYLANE_API_TOKEN` côté Edge Functions** : Dashboard Supabase → Edge Functions → Secrets → ajouter `PENNYLANE_API_TOKEN` (le même que dans Vercel — rappel : les secrets Vercel et Edge Functions sont DEUX magasins séparés). Sans lui, le bouton « Sync Comptabilité » répondra « Missing API token ».
3. **Vérifier dans Vercel** que `CALCOM_WEBHOOK_SECRET` et `CONTACT_FORM_WEBHOOK_SECRET` sont bien définis (sinon ces 2 webhooks acceptent actuellement n'importe quelle requête non signée).
4. **Supprimer l'Edge Function `env-probe-temp`** (sonde de debug de juin, encore active en prod, sans source dans le repo) : Dashboard Supabase → Edge Functions → env-probe-temp → Delete. 10 secondes.
5. *(Pour l'Horizon 3 #4 uniquement, pas urgent)* : `VERCEL_TOKEN` et `SUPABASE_MANAGEMENT_TOKEN` seront nécessaires au kit de sortie complet.

---

## ⑤ Reliquat sécurité 🟠 (corrigeable par dev — à planifier)

Le 🔴 critique (auto-approbation des validations) a été corrigé le 2026-07-03. Reste, par ordre de priorité suggéré :

1. **`elio-chat` ouverte au public** (pas d'auth, CORS `*`) → n'importe qui peut consommer le crédit Anthropic. Fix : secret partagé ou vérif JWT en tête de fonction.
2. **Policy `notifications_insert_system` trop ouverte** : tout utilisateur connecté peut insérer une notification pour n'importe qui (et déclencher l'email Resend derrière). Fix : réserver l'INSERT au service_role.
3. **Webhooks fail-open** (cal-com, contact-form) : si le secret d'env manque, ils acceptent tout. Fix : refuser (500) quand le secret n'est pas configuré. (Complémentaire de ton action ④.3.)
4. **32 fonctions SECURITY DEFINER exécutables par anon** + grant PUBLIC implicite découvert pendant le fix (le REVOKE anon seul ne suffit pas, il faut aussi REVOKE PUBLIC). Fix : passe de REVOKE en masse + revue au cas par cas des flux anon légitimes (login).
5. **Buckets `client-assets` et `screenshots` publics et listables** → risque d'énumération cross-client. Fix : buckets privés + URLs signées.
6. **Aucun header de sécurité** (CSP, HSTS, X-Frame-Options) sur les 2 apps + `typescript.ignoreBuildErrors: true` qui masque des centaines d'erreurs de types périmés (régénérer `database.types.ts` serait le préalable).
7. **npm audit** : dompurify, postcss, xmldom (high) → bump des versions.
8. **`api/dev-login`** avec identifiants en clair (protégé dev-only) → à supprimer avant les vrais clients.
9. **2 migrations en base sans fichier dans le repo** (`tighten_concierge_messages_insert_policy`, `schedule_health_check_cron_fix`) → rapatrier les .sql pour que la base soit reconstructible depuis git.
10. **OAuth Gmail** : paramètre `state` non signé (CSRF possible sur le lien de compte). Fix : HMAC + cookie de session.
