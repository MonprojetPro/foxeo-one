# Plan d'attaque — Modèle Lab/One pilotable (validé MiKL 2026-06-17)

> Découle de `docs/lab-one-lifecycle.md`. Dev lot par lot, chaque lot testable.
> Décisions actées : (D1) remboursement Lab = couper les agents, garder l'espace (permanence). (D2) recâbler graduation/complétion sur `client_parcours_agents` (pas l'ancienne table `parcours`).

## Faits (enquête code 2026-06-17)
- Bug toggle One : `access-toggles.tsx:37` lit `dashboard_type`, `toggleAccess` écrit `one_mode_available` → désync.
- Email welcome-lab part au paiement (`pennylane-paid-handlers.ts:~229`), avant la définition des agents (`launchClientParcours`).
- Agents : un seul champ `client_parcours_agents.status` → besoin d'une colonne `is_enabled`.
- Onglets Hub : `ExtraTab` adressable `?tab=` ; ajout d'un onglet « Pilote » en tête trivial.
- Dette : graduation lit l'ancienne table `parcours`, découplée de `client_parcours_agents`.

## LOT A — Socle d'accès correct (corrige le bug + permanence)
- Switches Hub lisent `lab_mode_available`/`one_mode_available` (pas `dashboard_type`) : `access-toggles.tsx`, `client-lab-tab-content.tsx`, `client-header.tsx`.
- `toggle-access.ts` : lit les flags ; Lab OFF = `elio_lab_enabled=false` seulement (jamais `lab_mode_available=false` — permanence) ; One ouvrable/refermable.
- `assign-parcours.ts` : pose `lab_mode_available=true` (has_lab à l'ouverture manuelle).
- Lecteurs à corriger (permanence) : `upgrade-client.ts` (éligibilité), `start-lab-exit-kit.ts` (utiliser lab_mode_available), `pennylane-paid-handlers.ts:~315` (remboursement = couper agents).
- Tests : toggle-access, access-toggles, pennylane.

## LOT B — Agents par agent (grisé + réouverture) ✅ FAIT (2026-06-18)
- ✅ Migration `client_parcours_agents.is_enabled boolean default true`.
- ✅ `get-parcours.ts` : exclut les agents désactivés du calcul de complétion ; expose `isEnabled` ; statut visuel grisé.
- ✅ Action `toggle-agent-enabled` (actif/grisé).
- ✅ Action `reopen-agent` (completed→active, **pas** de cascade sur les agents suivants — le client peut revenir en arrière puis reprendre). Notif client via `auth_user_id` (corrige le bug latent de `reopen-step`). Bouton « Rouvrir » dans `client-parcours-agents-list.tsx`. Ancien `ReopenStepButton` (ancien modèle `parcours_steps`) retiré du Validation Hub.
- ✅ D2 (complétion) : déjà calculée sur `client_parcours_agents` dans `get-parcours.ts`. Graduation = action MANUELLE de MiKL (`graduateClient`), jamais auto au 100 % → rouvrir un agent ne déclenche aucune graduation.
- (Reste différé si besoin : RPC `approve_validation_request` saut explicite des agents `is_enabled=false`.)

## LOT C — Séquencement « définir agents → valider → email » — ✅ FAIT (2026-06-19)
> Choix MiKL : email d'invitation « définis ton mot de passe » (lien à usage unique), pas de mot de passe en clair.
- ✅ `pennylane-paid-handlers.ts` : paiement Lab → crée compte + flags, PLUS d'email ; `password_change_required=false` (le client définit son mdp via le lien) ; notif MiKL « configure le parcours » avec lien `/modules/crm/clients/{id}`.
- ✅ `launch-client-parcours.ts` : après l'INSERT, si client jamais connecté (`first_login_at` null) → `sendWelcomeLabInvite` (helper) avec la vraie 1ʳᵉ étape. Best-effort (n'échoue jamais le lancement) ; alerte l'opérateur si l'email KO. Client déjà actif (parcours additionnel) = couvert par notif + mot d'Élio, pas de mail.
- ✅ Helper `utils/send-welcome-lab-invite.ts` : `admin.generateLink` (recovery) → lien à usage unique → email branché `welcome-lab` via Edge Function `send-email`. Redirect `/auth/callback?next=/reset-password`.
- ✅ Template `welcome-lab.ts` (+ copie inline `index.ts`) refondu : CTA « Définir mon mot de passe », vraie 1ʳᵉ étape, plus aucun mdp en clair.
- ✅ Route `/auth/callback` créée (app client) — corrige aussi « mot de passe oublié » qui pointait vers une route inexistante.
- ✅ Tests : welcome-lab, launch-client-parcours, pennylane-paid-handlers, send-welcome-lab-invite.
- ⚠️ Reste à vérifier (MiKL/dashboard Supabase) : l'URL `…/auth/callback` doit être dans les Redirect URLs autorisées Supabase. Dette : `create-lab-onboarding.ts` (flow legacy post-visio, ancienne table `parcours`) à réconcilier avec ce pattern ; ancienne route `/api/auth/callback` redondante à consolider.

## LOT D — Onglet « Pilote / Cockpit » (Hub) — ✅ FAIT (2026-06-20)
- ✅ `client-cockpit-tab.tsx` : cards A (statut) + B (progression) + C (à traiter : validations/abandon/support) + D (activité & inactivité) + E (accès toggles inline) + F (instance One) + bouton Graduer + raccourcis. 100 % hooks CRM ; le compteur support est passé en prop par le parent Hub (pas d'import cross-module).
- ✅ Hook `useClientTabNav` (DRY) : source unique du `?tab=`, partagée par `ClientTabs` (barre) et le cockpit (raccourcis).
- ✅ Onglet « Pilote » en 1ʳᵉ position **et par défaut** (`client-tabs.tsx`, `client-detail-with-support.tsx`) ; export barrel.
- ✅ Action `getClientActivitySnapshot` (1ʳᵉ connexion + dernière activité + inactivité >7j alignée sur le moteur LOT F).
- ✅ Tests : get-client-activity-snapshot, client-cockpit-tab, client-tabs (réécrit), client-detail-content (corrigé). Commit `08b6614`.
- ℹ️ Le « dernier mot d'Élio » (conciergeWord) reste dans l'onglet Lab : il vient du module `parcours`, l'exposer dans le cockpit CRM violerait la règle no-import-cross-module.

## LOT E — Mode « Parcours tracé » vs « Parcours libre » (option définie par MiKL) — ✅ FAIT (2026-06-21)
> Idée validée MiKL 2026-06-18. Option choisie PAR MiKL, par client (depuis le Hub), pas par le client.
> Décisions actées au dev (2026-06-21) : flag sur `client_configs` ; bascule à chaud autorisée à tout moment ; UX libre = toutes les étapes « disponibles » + bandeau ; **+ mémoire partagée de parcours** (les agents Élio connaissent les étapes déjà validées).
- ✅ Migration `client_configs.parcours_mode TEXT CHECK ('tracee','libre') DEFAULT 'tracee'` (broadcast realtime déjà actif sur la table).
- ✅ **Tracé** (= comportement actuel) : étapes séquentielles, une `active` à la fois, déverrouillage à l'approbation. La réouverture (LOT B) est le mécanisme de retour en arrière.
- ✅ **Libre** : toutes les étapes activées (`is_enabled=true`) sont `active` → navigables/soumissibles en parallèle. L'agent recap fait la synthèse quel que soit l'ordre.
- ✅ Action `setParcoursMode` (CRM) : écrit le flag + **resynchronise les statuts à chaud** (libre = pending→active ; tracé = re-verrouille en séquentiel, 1ʳᵉ non terminée garde le focus). Log d'activité.
- ✅ `launch-client-parcours.ts` : statuts initiaux selon le mode (libre = toutes active).
- ✅ RPC `approve_validation_request` mode-aware : n'auto-active « la prochaine pending » qu'en tracé (+ saute désormais les `is_enabled=false`). `search_path=public` préservé (gate CERBÈRE).
- ✅ `get-parcours.ts` : expose `parcoursMode` ; en libre une étape `locked` (pending) s'affiche « disponible » (current).
- ✅ UI Hub : `ParcoursModeSelector` dans le cockpit (Pilote), visible pour tout client ayant un espace Lab (pré-réglable avant lancement), avec confirmation de bascule.
- ✅ UX client : bandeau « Parcours libre » dans `parcours-overview` ; cartes déjà toutes cliquables.
- ✅ Realtime : `use-parcours-realtime-refresh` écoute aussi `client_configs:{clientId}` (la bascule de mode sans changement d'étape rafraîchit quand même le bandeau).
- ✅ **Mémoire partagée** (`getParcoursMemory`) : digest des soumissions validées des AUTRES étapes injecté dans le system prompt de chaque agent (« dossier du client », actif dans les 2 modes) → plus de répétitions entre agents.
- ✅ **Pop-up d'accueil Concierge** (`ParcoursModeIntroDialog`) : à la découverte du parcours + à chaque changement de mode, Élio Concierge (avatar) explique les règles. Limite assumée du libre (mémoire = docs validés) **transparente pour le client** : la pop-up l'invite à faire valider ses étapes pour qu'Élio relie l'ensemble. Persistance localStorage (clé par mode).
- ✅ Complétion / graduation : inchangée (tous les agents enabled terminés).
- ✅ Tests : set-parcours-mode, get-parcours-memory, launch-client-parcours (mode libre), cockpit, step-elio-chat. Build turbo vert.

## LOT F — Élio Concierge vivant (moteur IA sur événement) — ✅ COMPLET (2026-06-18)
> Validé MiKL 2026-06-18. Moteur choisi : IA générée sur événement (Haiku via Edge Function `elio-chat`), fallback templaté. Le bandeau passe d'un arbre de phrases en dur à « le dernier mot d'Élio ».
- ✅ **Incrément 1** : table `client_concierge_messages` (+ broadcast), action `generateConciergeWord` (Haiku + fallback), lecture dans `getParcours` (`conciergeWord`), bandeau qui l'affiche en priorité, branché sur l'événement **réouverture d'agent**. RLS : lecture client (son parcours) / opérateur ; insert opérateur ou client-propre.
- ✅ **Incrément 2** : événements branchés — soumission client (`submission_sent`), validation (`submission_approved`), refus/révision (`submission_revision`), parcours terminé (`parcours_completed`, détecté à l'approbation de la dernière étape enabled). Côté validation-hub : helper `notify-concierge.ts` (import dynamique de `generateConciergeWord`, best-effort, ne touche que le nouveau modèle `step_submission`).
- ✅ **Incrément 3** : relances proactives d'inactivité. Fonction SQL `find_inactive_parcours_clients` (agent actif idle > 7j, Lab non en pause, parcours non abandonné, anti-spam cooldown 7j) + Edge Function `concierge-inactivity-relance` (IA Haiku via elio-chat + fallback, insère bandeau + notification cloche) + pg_cron quotidien 8h. Testé en prod (relance IA générée + nettoyée).

## Différé (gros chantier ultérieur)
- One « construction → livré » + module « Suivi de l'outil » (screenshots/messages Hub→client).
