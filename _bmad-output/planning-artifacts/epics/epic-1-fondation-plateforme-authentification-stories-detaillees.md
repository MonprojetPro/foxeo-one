# Epic 1 : Fondation Plateforme & Authentification — Stories detaillees

**Objectif :** MiKL et les clients peuvent acceder aux dashboards MonprojetPro de maniere securisee avec isolation des donnees, design responsive et dark mode "Minimal Futuriste".

**FRs couverts:** FR52, FR53, FR54, FR55, FR56, FR73, FR82, FR108, FR112, FR113, FR114, FR117, FR118, FR119, FR134, FR140, FR141, FR142, FR143, FR151, FR152

**NFRs pertinentes:** NFR-P1, NFR-S1 a NFR-S9, NFR-A1 a NFR-A4, NFR-R5, NFR-M1 a NFR-M5

---

## Story 1.1 : Setup monorepo, packages partages & dashboard shell

> **Technical Enabler** — Story technique fondationnelle, pas de valeur utilisateur directe.

As a **MiKL (operateur)**,
I want **deux applications distinctes (Hub operateur + Client Lab/One) avec un systeme de modules activables et un design system partage**,
So that **chaque audience a une experience dediee et optimisee des le depart**.

**Acceptance Criteria :**

**Given** le starter template Turborepo existant avec @monprojetpro/ui, @monprojetpro/utils, @monprojetpro/tsconfig
**When** la story est completee
**Then** les packages suivants existent et sont fonctionnels :
- `packages/supabase/` avec client.ts, server.ts, middleware.ts, realtime.ts, providers (query-provider, realtime-provider, theme-provider)
- `packages/types/` avec index.ts, module-manifest.ts, action-response.ts, auth.types.ts, client-config.types.ts
- `packages/utils/` mis a jour avec case-transform.ts, format-currency.ts, validation-schemas.ts, module-registry.ts
**And** les dependances sont installees : @supabase/supabase-js ^2.95.x, @supabase/ssr, @tanstack/react-query ^5.90.x, zustand ^5.0.x, react-hook-form ^7.71.x, @hookform/resolvers

**Given** les packages partages en place
**When** les apps hub/ et client/ sont configurees
**Then** chaque app possede :
- `app/(auth)/login/page.tsx` et `app/(auth)/layout.tsx` (placeholder)
- `app/(dashboard)/layout.tsx` avec dashboard shell (sidebar dynamique, header, slot contenu)
- `app/(dashboard)/loading.tsx` avec shell-skeleton
- `app/(dashboard)/modules/[moduleId]/page.tsx` qui charge les modules via registry
- `app/(dashboard)/modules/[moduleId]/loading.tsx` et `error.tsx`
- `middleware.ts` (placeholder auth)
- `layout.tsx` root avec providers (QueryProvider, RealtimeProvider, ThemeProvider)
**And** `turbo dev` lance les deux apps simultanement sans erreur
**And** `turbo build` compile sans erreur TypeScript
**And** le turbo.json contient les tasks : build, dev, lint, test, test:rls, test:contracts, test:e2e, gen:types, clean

**Given** le module core-dashboard existe
**When** le module registry est actif
**Then** le registry auto-decouvre les manifests des modules dans packages/modules/
**And** le dashboard shell affiche la sidebar avec les modules decouverts
**And** la route dynamique [moduleId] charge le bon module via le registry

---

## Story 1.2 : Migrations Supabase fondation

> **Technical Enabler** — Story technique fondationnelle, pas de valeur utilisateur directe.

As a **MiKL (operateur)**,
I want **la base de donnees initialisee avec les tables fondamentales (operateurs, clients, configurations, consentements, logs d'activite)**,
So that **la structure de donnees est en place pour gerer mes clients et leur multi-tenancy**.

**Acceptance Criteria :**

**Given** le dossier supabase/ avec config.toml
**When** les migrations sont executees
**Then** la table `operators` existe avec les colonnes : id (UUID PK), email, name, role, two_factor_enabled, created_at, updated_at
**And** la table `clients` existe avec les colonnes : id (UUID PK), operator_id (FK operators), email, name, company, contact, sector, client_type (Complet/Direct One/Ponctuel), status, auth_user_id (FK auth.users), created_at, updated_at
**And** la table `client_configs` existe avec les colonnes : client_id (UUID PK FK clients), operator_id (FK operators), active_modules (TEXT[] DEFAULT ARRAY['core-dashboard']), dashboard_type (TEXT DEFAULT 'one'), theme_variant, custom_branding (JSONB), elio_config (JSONB), parcours_config (JSONB), created_at, updated_at
**And** la table `consents` existe avec les colonnes : id (UUID PK), client_id (FK clients), consent_type (TEXT : 'cgu', 'ia_processing'), accepted (BOOLEAN), version (TEXT), ip_address, user_agent, created_at
**And** la table `activity_logs` existe avec les colonnes : id (UUID PK), actor_type (TEXT CHECK IN ('client', 'operator', 'system', 'elio') NOT NULL), actor_id (UUID NOT NULL), action (TEXT NOT NULL), entity_type (TEXT NOT NULL — 'client', 'parcours', 'document', 'validation_request', 'payment', etc.), entity_id (UUID nullable), metadata (JSONB nullable), created_at (TIMESTAMP DEFAULT NOW())
**And** un index `idx_activity_logs_actor_created_at` est cree sur (actor_id, created_at)
**And** un index `idx_activity_logs_entity` est cree sur (entity_type, entity_id)
**And** les policies RLS activity_logs : MiKL voit tous les logs de ses clients, le client ne voit PAS les logs (table interne operateur)
**And** toutes les tables utilisent snake_case et les conventions de nommage definies dans l'architecture
**And** les triggers `updated_at` sont en place sur operators, clients, client_configs

**Given** les migrations executees
**When** le seed.sql est joue
**Then** un operateur MiKL (operator_id: 1) est cree avec les donnees de base
**And** les modules socle sont enregistres

**Given** les tables creees
**When** `turbo gen:types` est execute
**Then** le fichier `packages/types/src/database.types.ts` est genere et reflete le schema

---

## Story 1.3 : Authentification client (inscription, login, sessions)

As a **client MonprojetPro**,
I want **pouvoir m'inscrire avec email + mot de passe, me connecter et avoir une session persistante**,
So that **j'accede de maniere securisee a mon dashboard personnalise**.

**Acceptance Criteria :**

**Given** un client avec un compte existant
**When** il accede a app.monprojet-pro.com/login et saisit email + mot de passe valides
**Then** il est redirige vers le dashboard (dashboard)/
**And** un access token et un refresh token sont crees via Supabase Auth
**And** les cookies de session sont configures cote serveur via @supabase/ssr

**Given** un client non authentifie
**When** il tente d'acceder a une route /(dashboard)/*
**Then** le middleware client/ le redirige vers /login
**And** l'URL demandee est stockee pour redirection post-login

**Given** un client authentifie avec session active
**When** il reste inactif pendant 8 heures (NFR-S4)
**Then** sa session expire automatiquement
**And** il est redirige vers /login avec un message explicatif

**Given** un client authentifie
**When** il clique sur "Se deconnecter"
**Then** la session est invalidee cote serveur
**And** les cookies sont supprimes
**And** il est redirige vers /login

**Given** un utilisateur qui tente de se connecter
**When** il echoue 5 fois consecutivement (NFR-S5)
**Then** le compte est bloque pendant 5 minutes
**And** un message explicite informe de la duree du blocage

**Given** le login page client
**When** elle est affichee
**Then** elle utilise le dark mode (#020402) et le design "Minimal Futuriste"
**And** elle est responsive (fonctionne sur mobile >=320px, NFR-A1)

---

## Story 1.4 : Authentification MiKL (login + 2FA, middleware hub admin)

As **MiKL (operateur)**,
I want **me connecter avec email + mot de passe + 2FA et avoir un acces protege au Hub**,
So that **mon acces administrateur est hautement securise**.

**Acceptance Criteria :**

**Given** MiKL avec un compte operateur
**When** il accede a hub.monprojet-pro.com/login et saisit email + mot de passe valides
**Then** il est redirige vers l'ecran de saisie du code 2FA (TOTP)

**Given** MiKL sur l'ecran 2FA
**When** il saisit le code TOTP correct
**Then** il est redirige vers le dashboard Hub /(dashboard)/
**And** la session est creee avec le flag admin verifie

**Given** MiKL sur l'ecran 2FA
**When** il saisit un code TOTP incorrect
**Then** un message d'erreur explicite s'affiche
**And** le compteur d'echecs s'incremente

**Given** un utilisateur non authentifie ou sans role admin
**When** il tente d'acceder a une route hub.monprojet-pro.com/(dashboard)/*
**Then** le middleware hub/ verifie admin + 2FA
**And** il est redirige vers /login

**Given** MiKL sur la page de premiere configuration 2FA
**When** il scanne le QR code et valide avec un code TOTP
**Then** le 2FA est active sur son compte
**And** des codes de recuperation sont generes et affiches une seule fois

**Given** le login page Hub
**When** elle est affichee
**Then** elle utilise la palette Hub (Cyan/Turquoise sur fond #020402)
**And** elle est responsive

---

## Story 1.5 : RLS & isolation donnees multi-tenant

As a **operateur de la plateforme**,
I want **que chaque client ne puisse acceder qu'a ses propres donnees et que chaque operateur ne voie que ses clients**,
So that **la securite et la confidentialite des donnees sont garanties nativement au niveau base de donnees**.

**Acceptance Criteria :**

**Given** les tables operators, clients, client_configs, consents
**When** les migrations RLS sont executees (00014_rls_policies.sql, 00015_rls_functions.sql)
**Then** les fonctions SQL `is_admin()`, `is_owner(client_id)`, `is_operator(operator_id)` sont creees
**And** les policies RLS sont appliquees :
- `clients_select_owner` : un client ne peut lire que sa propre fiche
- `clients_select_operator` : un operateur voit tous ses clients
- `client_configs_select_owner` : un client ne lit que sa config
- `consents_select_owner` : un client ne voit que ses consentements
- `consents_insert_authenticated` : un client peut creer ses consentements

**Given** un client A authentifie
**When** il tente de lire les donnees du client B via l'API Supabase
**Then** la requete retourne un resultat vide (pas d'erreur, pas de donnees)
**And** le test RLS `client-isolation.test.ts` verifie ce scenario

**Given** un operateur A authentifie
**When** il tente de lire les clients de l'operateur B
**Then** la requete retourne un resultat vide
**And** le test RLS `operator-isolation.test.ts` verifie ce scenario

**Given** les tests RLS
**When** le CI s'execute
**Then** les tests RLS passent comme quality gate bloquant
**And** si un test d'isolation echoue, le build est casse

---

## Story 1.6 : Gestion sessions avancee (multi-device, voir/revoquer, forcer deconnexion)

As a **client MonprojetPro**,
I want **pouvoir voir mes sessions actives et en revoquer, et me connecter simultanement sur plusieurs appareils**,
So that **j'ai le controle total sur la securite de mon compte**.

**Acceptance Criteria :**

**Given** un client connecte sur plusieurs appareils (mobile + desktop)
**When** il se connecte sur un nouvel appareil
**Then** les deux sessions coexistent sans conflit (FR112)
**And** chaque session est identifiee (appareil, navigateur, derniere activite)

**Given** un client connecte
**When** il accede a la page "Sessions actives" dans ses parametres
**Then** il voit la liste de toutes ses sessions avec : appareil, navigateur, IP approximative, date derniere activite, indicateur "session courante" (FR114)

**Given** un client qui visualise ses sessions
**When** il revoque une session specifique
**Then** la session ciblee est invalidee immediatement
**And** l'appareil concerne est redirige vers /login
**And** un message de confirmation s'affiche (FR134)

**Given** MiKL dans le Hub
**When** il force la deconnexion de toutes les sessions d'un client (FR113)
**Then** toutes les sessions du client sont invalidees
**And** le client est redirige vers /login sur tous ses appareils
**And** une notification est envoyee au client

---

## Story 1.7 : Design system fondation (dark mode, palettes, responsive, accessibilite)

As a **utilisateur (MiKL ou client)**,
I want **une interface dark mode "Minimal Futuriste" avec la palette adaptee a mon dashboard, responsive et accessible**,
So that **j'ai une experience visuelle coherente, agreable et utilisable sur tous mes appareils**.

**Acceptance Criteria :**

**Given** le package @monprojetpro/ui existant
**When** les themes sont configures
**Then** 3 fichiers CSS OKLCH existent dans packages/ui/src/themes/ :
- `hub.css` — palette Cyan/Turquoise sur fond #020402
- `lab.css` — palette Violet/Purple sur fond #020402
- `one.css` — palette Orange vif + Bleu-gris sur fond #020402
**And** les variables CSS sont utilisees via Tailwind v4 `@theme`
**And** le fond noir profond (#020402) est commun aux 3 palettes

**Given** le globals.css de chaque app
**When** l'app hub est chargee
**Then** la palette Hub est active
**When** l'app client est chargee avec dashboard_type='lab'
**Then** la palette Lab est active
**When** l'app client est chargee avec dashboard_type='one'
**Then** la palette One est active

**Given** la densite configuree par dashboard
**When** le Hub est affiche
**Then** la densite est `compact` (data-dense)
**When** le Lab est affiche
**Then** la densite est `spacious` (emotionnel)
**When** le One est affiche
**Then** la densite est `comfortable` (operationnel)

**Given** les typographies definies
**When** l'interface est rendue
**Then** Poppins est utilise pour les titres et UI
**And** Inter est utilise pour le corps de texte

**Given** un utilisateur sur mobile (>=320px, NFR-A1)
**When** il accede au dashboard
**Then** la sidebar se collapse en menu hamburger
**And** tous les composants sont utilisables sans scroll horizontal

**Given** les standards d'accessibilite (NFR-A2, A3, A4)
**When** l'interface est evaluee
**Then** le contraste texte/fond respecte WCAG AA (ratio 4.5:1)
**And** la navigation au clavier fonctionne sur toutes les pages
**And** les elements interactifs ont des labels accessibles (aria-label)

---

## Story 1.8 : UX transversale (fil d'ariane, etats vides, messages confirmation, erreurs, robustesse)

As a **utilisateur (MiKL ou client)**,
I want **un fil d'ariane clair, des etats vides explicatifs, des messages de confirmation apres chaque action, des messages d'erreur explicites et une gestion gracieuse des connexions instables**,
So that **je sais toujours ou je suis, ce que je peux faire et ce qui se passe**.

**Acceptance Criteria :**

**Given** un utilisateur qui navigue dans le dashboard
**When** il est dans un module (ex: /modules/crm/clients/123)
**Then** un fil d'ariane affiche sa position : Dashboard > CRM > Client > Fiche (FR108)
**And** chaque niveau est cliquable pour remonter

**Given** un utilisateur qui accede a une section sans contenu
**When** la liste est vide (pas de documents, pas de messages, pas de clients)
**Then** un etat vide explicatif s'affiche avec illustration, message engageant et CTA (FR73)
**And** le composant `EmptyState` de @monprojetpro/ui est utilise

**Given** un utilisateur qui effectue une action (creation, modification, suppression)
**When** l'action reussit
**Then** un toast de confirmation s'affiche (FR134)
**And** le message est contextualise ("Client cree avec succes", "Document partage")

**Given** une erreur cote serveur ou reseau
**When** l'erreur survient
**Then** un message explicite s'affiche — jamais d'ecran blanc (FR82)
**And** l'error boundary du module capture le crash sans affecter le reste du shell
**And** le message indique la nature de l'erreur et une action possible

**Given** un navigateur non supporte
**When** l'utilisateur accede a l'application
**Then** un message explicite informe que le navigateur n'est pas compatible (FR151)

**Given** une connexion reseau instable
**When** une requete echoue a cause du reseau
**Then** le systeme retente automatiquement (retry)
**And** un message discret informe de la perte de connexion (FR152)
**And** quand la connexion revient, les donnees se resynchronisent

**Given** une action sensible (suppression, modification critique)
**When** l'utilisateur la declenche
**Then** une boite de dialogue de confirmation s'affiche avant execution (FR56)

---

## Story 1.9 : Consentements & legal (CGU, traitement IA, traces, notification MAJ)

As a **client MonprojetPro**,
I want **accepter les CGU et le consentement IA lors de mon inscription, et etre notifie des mises a jour**,
So that **la plateforme est conforme RGPD et je garde le controle sur mes donnees**.

**Acceptance Criteria :**

**Given** un nouveau client qui s'inscrit
**When** il arrive sur le formulaire d'inscription
**Then** il doit cocher l'acceptation des CGU avant de pouvoir valider (FR140)
**And** un lien vers les CGU completes est fourni
**And** une case separee demande le consentement explicite pour le traitement IA (FR142)
**And** le consentement IA est clairement explique (ce qu'Elio fait avec les donnees)

**Given** un client qui accepte les CGU et/ou le consentement IA
**When** il valide
**Then** une entree est creee dans la table `consents` avec : client_id, consent_type, accepted=true, version, ip_address, user_agent, created_at (FR143)
**And** la trace est horodatee et immuable (pas de UPDATE, seulement des INSERT)

**Given** MiKL met a jour les CGU (nouvelle version)
**When** un client se connecte apres la mise a jour
**Then** un ecran interstitiel lui presente les changements et demande une nouvelle acceptation (FR141)
**And** le client ne peut pas acceder au dashboard tant qu'il n'a pas accepte
**And** un nouveau consentement est enregistre avec la nouvelle version

**Given** un client qui refuse le consentement IA
**When** il utilise la plateforme
**Then** les fonctionnalites Elio sont desactivees pour ce client
**And** le reste de la plateforme fonctionne normalement

---

## Story 1.10 : Structure multi-langue P3 (preparation i18n)

> **Technical Enabler** — Preparation structurelle, valeur differee a P3.

As a **MiKL (operateur)**,
I want **la plateforme structuree pour supporter facilement plusieurs langues a l'avenir**,
So that **quand je voudrai proposer MonprojetPro en anglais, il n'y aura pas de refactoring massif**.

**Acceptance Criteria :**

**Given** l'architecture actuelle en francais uniquement
**When** la structure i18n est mise en place
**Then** un dossier `messages/` (ou `locales/`) existe dans chaque app avec un fichier `fr.json` contenant les chaines UI principales
**And** un helper `t()` ou un hook `useTranslations()` est disponible dans @monprojetpro/utils
**And** les chaines statiques des composants partages (@monprojetpro/ui) passent par ce helper

**Given** la structure i18n en place
**When** un developpeur ajoute un nouveau composant
**Then** il utilise `t('cle.sous_cle')` au lieu de chaines en dur
**And** la cle est ajoutee dans `fr.json`

**Given** que P3 arrive et qu'on veut ajouter l'anglais
**When** un fichier `en.json` est ajoute
**Then** le systeme peut switcher entre les langues sans modification de composants
**And** le Next.js middleware gere la detection de langue (FR119)

---

## Resume Epic 1 — Couverture FRs

| Story | Titre | FRs couvertes |
|-------|-------|---------------|
| 1.1 | Setup monorepo, packages & dashboard shell | — (fondation technique) |
| 1.2 | Migrations Supabase fondation | — (fondation donnees) |
| 1.3 | Auth client (inscription, login, sessions) | FR52, FR54 |
| 1.4 | Auth MiKL (login + 2FA, middleware hub) | FR53 |
| 1.5 | RLS & isolation donnees multi-tenant | FR55 |
| 1.6 | Gestion sessions avancee | FR112, FR113, FR114 |
| 1.7 | Design system fondation | FR117, FR118 |
| 1.8 | UX transversale | FR56, FR73, FR82, FR108, FR134, FR151, FR152 |
| 1.9 | Consentements & legal | FR140, FR141, FR142, FR143 |
| 1.10 | Structure multi-langue P3 | FR119 |

**Toutes les 21 FRs de l'Epic 1 sont couvertes.**

---
