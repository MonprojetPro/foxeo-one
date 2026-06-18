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

## LOT C — Séquencement « définir agents → valider → email »
- `pennylane-paid-handlers.ts` : créer compte + flags, PAS d'email ; notifier MiKL « configure le parcours ».
- `launch-client-parcours.ts` : envoyer welcome-lab après l'INSERT (avec la vraie étape 1) ; template `welcome-lab.ts` enrichi.
- Tests maj.

## LOT D — Onglet « Pilote / Cockpit » (Hub)
- `client-cockpit-tab.tsx` (accès Lab/One, progression parcours, validations, instance One) + raccourcis `onNavigateToTab` ; export barrel.
- Onglet « Pilote » en 1ʳᵉ position (`client-detail-with-support.tsx`, `client-tabs.tsx`) ; option : onglet par défaut. Hook `useClientTabNav` (DRY).

## LOT E — Mode « Parcours tracé » vs « Parcours libre » (option définie par MiKL) — À FAIRE
> Idée validée MiKL 2026-06-18. Option choisie PAR MiKL, par client (depuis le Hub), pas par le client.
- Flag de mode au niveau parcours/client : `parcours_mode TEXT CHECK ('tracee','libre') DEFAULT 'tracee'`
  (sur `client_configs` ou colonne dédiée — à trancher au moment du dev).
- **Tracé** (= comportement actuel) : étapes séquentielles, une `active` à la fois, déverrouillage à l'approbation. La réouverture (LOT B) est le mécanisme de retour en arrière.
- **Libre** : tous les agents définis sont navigables/soumissibles en parallèle (pas de verrou séquentiel). Le client avance sur plusieurs étapes en même temps, dans l'ordre qu'il veut. L'**agent recap** fait la synthèse finale quel que soit l'ordre.
- Impacts à traiter : `get-parcours.ts` (statut visuel : plus de `pending`/`locked` en libre, tout `active`), `approve_validation_request` (ne PAS auto-activer « la prochaine » en libre), UI cartes parcours client (toutes cliquables en libre), UI Hub (sélecteur de mode par client), calcul de complétion (inchangé : tous les agents enabled terminés).
- Décisions ouvertes à cadrer avant dev : où stocker le flag ? bascule de mode en cours de parcours autorisée ? rendu visuel du mode libre côté client ?

## LOT F — Élio Concierge vivant (moteur IA sur événement) — EN COURS
> Validé MiKL 2026-06-18. Moteur choisi : IA générée sur événement (Haiku via Edge Function `elio-chat`), fallback templaté. Le bandeau passe d'un arbre de phrases en dur à « le dernier mot d'Élio ».
- ✅ **Incrément 1** : table `client_concierge_messages` (+ broadcast), action `generateConciergeWord` (Haiku + fallback), lecture dans `getParcours` (`conciergeWord`), bandeau qui l'affiche en priorité, branché sur l'événement **réouverture d'agent**. RLS : lecture client (son parcours) / opérateur ; insert opérateur ou client-propre.
- ✅ **Incrément 2** : événements branchés — soumission client (`submission_sent`), validation (`submission_approved`), refus/révision (`submission_revision`), parcours terminé (`parcours_completed`, détecté à l'approbation de la dernière étape enabled). Côté validation-hub : helper `notify-concierge.ts` (import dynamique de `generateConciergeWord`, best-effort, ne touche que le nouveau modèle `step_submission`).
- ⏳ **Incrément 3** : relances proactives d'inactivité (cron Edge Function).

## Différé (gros chantier ultérieur)
- One « construction → livré » + module « Suivi de l'outil » (screenshots/messages Hub→client).
