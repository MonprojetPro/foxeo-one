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

## LOT B — Agents par agent (grisé + réouverture)
- Migration `client_parcours_agents.is_enabled boolean default true`.
- `get-parcours.ts` : exclure les agents désactivés du calcul de complétion ; exposer `isEnabled` ; statut visuel grisé.
- Actions `toggle-agent-enabled` + `reopen-agent` (completed→active, gérer le successeur). Guard : pas de désactivation d'un `pending_review`.
- RPC `approve_validation_request` : sauter les agents `is_enabled=false`.
- UI : `client-parcours-agents-list.tsx` (toggle + grisé) ; vue parcours client (grisé lecture).
- D2 : recâbler la complétion/graduation sur `client_parcours_agents`.

## LOT C — Séquencement « définir agents → valider → email »
- `pennylane-paid-handlers.ts` : créer compte + flags, PAS d'email ; notifier MiKL « configure le parcours ».
- `launch-client-parcours.ts` : envoyer welcome-lab après l'INSERT (avec la vraie étape 1) ; template `welcome-lab.ts` enrichi.
- Tests maj.

## LOT D — Onglet « Pilote / Cockpit » (Hub)
- `client-cockpit-tab.tsx` (accès Lab/One, progression parcours, validations, instance One) + raccourcis `onNavigateToTab` ; export barrel.
- Onglet « Pilote » en 1ʳᵉ position (`client-detail-with-support.tsx`, `client-tabs.tsx`) ; option : onglet par défaut. Hook `useClientTabNav` (DRY).

## Différé (gros chantier ultérieur)
- One « construction → livré » + module « Suivi de l'outil » (screenshots/messages Hub→client).
