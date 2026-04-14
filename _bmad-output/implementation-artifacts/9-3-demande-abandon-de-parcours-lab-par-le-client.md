# Story 9.3: Demande d'abandon de parcours Lab par le client

Status: done

## Story

As a **client Lab**,
I want **pouvoir demander à abandonner mon parcours si je ne souhaite plus continuer**,
so that **je peux sortir du parcours proprement sans que mes données soient perdues**.

## Acceptance Criteria

**Given** un client Lab est en cours de parcours (FR88)
**When** il souhaite abandonner
**Then** un bouton "Quitter le parcours" est accessible depuis :
- La page "Mon Parcours" (parcours-progress) — en bas de page, discret
- Les paramètres du compte — section "Mon parcours Lab"
**And** le bouton n'est visible que si le parcours est en statut 'in_progress' ou 'not_started'

**Given** le client clique sur "Quitter le parcours"
**When** la modale de confirmation s'affiche
**Then** elle contient :
- Message d'avertissement : "Êtes-vous sûr de vouloir quitter votre parcours Lab ?"
- Récapitulatif de la progression actuelle : "{X}/{Y} étapes complétées"
- Champ raison d'abandon (optionnel, textarea) avec des suggestions :
  - "Je n'ai plus le temps en ce moment"
  - "Le parcours ne correspond pas à mes attentes"
  - "J'ai trouvé une autre solution"
  - "Autre raison..."
- Mention rassurante : "Vos données et documents seront conservés. MiKL vous contactera pour en discuter."
- Boutons "Confirmer l'abandon" (rouge) / "Continuer mon parcours" (vert, mis en avant)

**Given** le client confirme l'abandon
**When** la Server Action `requestParcoursAbandonment(clientId, reason)` s'exécute
**Then** les opérations suivantes sont effectuées :
1. `parcours.status` → 'abandoned'
2. `parcours.completed_at` → NOW() (date de fin)
3. `activity_logs` → événement 'parcours_abandoned' avec la raison
4. Une notification est envoyée à MiKL (type : 'alert', priorité haute) :
   - Titre : "Le client {nom} souhaite abandonner son parcours Lab"
   - Body : "Raison : {raison}. Progression : {X}/{Y} étapes. Contactez-le pour en discuter."
   - Link : "/modules/crm/clients/{clientId}"
5. Les données du client sont PRÉSERVÉES intégralement (pas d'archivage ni suppression)
**And** un toast confirme au client : "Votre demande a été envoyée à MiKL. Il vous contactera prochainement."
**And** le cache TanStack Query est invalidé

**Given** le parcours est abandonné
**When** le client se reconnecte
**Then** :
- La page parcours affiche : "Votre parcours est en pause. MiKL va vous contacter pour en discuter."
- Elio Lab est désactivé (le chat affiche : "Votre parcours est en pause. Contactez MiKL si vous souhaitez reprendre.")
- Les documents et briefs restent accessibles en lecture
- Le chat avec MiKL reste actif

**Given** MiKL veut réactiver un parcours abandonné
**When** il accède à la fiche client et clique "Réactiver le parcours"
**Then** `parcours.status` → 'in_progress', `parcours.completed_at` → null
**And** Elio Lab est réactivé
**And** le client est notifié : "Bonne nouvelle ! Votre parcours Lab a été réactivé par MiKL."

## Tasks / Subtasks

- [x] Créer bouton "Quitter le parcours" dans page parcours (AC: #1)
  - [x] Modifier `packages/modules/parcours/components/parcours-overview.tsx`
  - [x] Ajouter bouton en bas de page, style discret (text link)
  - [x] Afficher uniquement si `parcours.status IN ('en_cours', 'in_progress', 'not_started', 'suspendu')`
  - [x] Cacher si `parcours.status = 'termine'` ou 'abandoned'
  - [x] Au clic, ouvrir `AbandonParcoursDialog`

- [x] Créer bouton dans paramètres compte (AC: #1)
  - [x] Modifier `apps/client/app/(dashboard)/settings/page.tsx`
  - [x] Créer `apps/client/app/(dashboard)/settings/parcours-settings-section.tsx`
  - [x] Section "Mon parcours Lab" avec statut actuel + bouton "Quitter le parcours"
  - [x] Même logique : visible uniquement si status in_progress ou not_started

- [x] Créer modale de confirmation abandon (AC: #2)
  - [x] Créer `packages/modules/parcours/components/abandon-parcours-dialog.tsx`
  - [x] Utiliser Dialog component de @monprojetpro/ui (Radix UI)
  - [x] Header : "Êtes-vous sûr de vouloir quitter votre parcours Lab ?"
  - [x] Afficher progression : "{stepsCompleted}/{totalSteps} étapes complétées"
  - [x] Champ raison : Clickable suggestion buttons + "Autre" avec textarea
  - [x] Suggestions :
    - "Je n'ai plus le temps en ce moment"
    - "Le parcours ne correspond pas à mes attentes"
    - "J'ai trouvé une autre solution"
    - "Autre raison..." (déclenche textarea libre)
  - [x] Mention rassurante : "Vos données et documents seront conservés. MiKL vous contactera pour en discuter."
  - [x] Boutons : "Confirmer l'abandon" (destructive, rouge) / "Continuer mon parcours" (default)
  - [x] Validation : raison optionnelle mais encouragée

- [x] Créer Server Action `requestParcoursAbandonment` (AC: #3)
  - [x] Créer `packages/modules/parcours/actions/request-abandonment.ts`
  - [x] Signature: `requestParcoursAbandonment(input: { clientId, reason? }): Promise<ActionResponse<void>>`
  - [x] Validation Zod : clientId UUID, reason optionnel (max 1000 chars)
  - [x] Vérifier que parcours existe et status IN ('en_cours', 'suspendu')
  - [x] Si déjà abandonné ou completed : retourner error 'PARCOURS_ALREADY_COMPLETED'
  - [x] UPDATE `parcours` SET `status = 'abandoned'`, `completed_at = NOW()`, `abandonment_reason = {reason}`
  - [x] INSERT `activity_logs` : type 'parcours_abandoned', metadata { reason, progression: {X}/{Y} }
  - [x] Retourner format `{ data: null, error }` standard

- [x] Créer notification MiKL pour abandon (AC: #3)
  - [x] Intégré directement dans `requestParcoursAbandonment` (utilise `createNotification` existant)
  - [x] Fetch client info + operator_id
  - [x] Créer notification type 'alert'
  - [x] Titre : "Le client {nom} souhaite abandonner son parcours Lab"
  - [x] Body : "Raison : {raison}. Progression : {X}/{Y} étapes. Contactez-le pour en discuter."
  - [x] Link : `/modules/crm/clients/{clientId}`

- [x] Implémenter invalidation cache client (AC: #3)
  - [x] Après succès action : invalider `queryClient.invalidateQueries(['parcours', clientId])` + `['client-parcours', clientId]`
  - [x] Toast success : "Votre demande a été envoyée à MiKL. Il vous contactera prochainement."

- [x] Implémenter affichage parcours abandonné (AC: #4)
  - [x] Modifier `packages/modules/parcours/components/parcours-overview.tsx`
  - [x] Si `parcours.status = 'abandoned'` : afficher état pause (banner warning)
  - [x] Message : "Votre parcours est en pause. MiKL va vous contacter pour en discuter."

- [x] Désactiver Elio Lab pour parcours abandonné (AC: #4)
  - [x] Modifier `packages/modules/elio/components/elio-chat.tsx`
  - [x] Ajout prop `parcoursAbandoned` au composant ElioChat
  - [x] Si status = 'abandoned' + dashboardType = 'lab' : afficher message pause sans input
  - [x] Message : "Votre parcours est en pause. Contactez MiKL si vous souhaitez reprendre."
  - [x] Chat MiKL reste actif (module chat séparé, pas impacté)

- [x] Créer action réactivation parcours (MiKL side) (AC: #5)
  - [x] Créer `packages/modules/parcours/actions/reactivate-parcours.ts`
  - [x] Signature: `reactivateParcours(input: { clientId }): Promise<ActionResponse<void>>`
  - [x] Vérifier que parcours status = 'abandoned'
  - [x] UPDATE `parcours` SET `status = 'en_cours'`, `completed_at = null`, `abandonment_reason = null`
  - [x] INSERT `activity_logs` : type 'parcours_reactivated'
  - [x] Créer notification client : "Bonne nouvelle ! Votre parcours Lab a été réactivé par MiKL."
  - [x] Retourner format `{ data, error }` standard

- [x] Créer UI réactivation dans fiche client Hub (AC: #5)
  - [x] Modifier `packages/modules/crm/components/client-info-tab.tsx`
  - [x] Créer `packages/modules/crm/components/reactivate-parcours-dialog.tsx`
  - [x] Section "Parcours Lab" : si status = 'abandoned', afficher badge "Abandonné" + bouton "Réactiver le parcours"
  - [x] Au clic : confirmation dialog "Réactiver le parcours de {nom} ?"
  - [x] Appeler `reactivateParcours(clientId)`
  - [x] Toast success : "Parcours réactivé — {nom} a été notifié"

- [x] Créer tests unitaires (TDD)
  - [x] Test `requestParcoursAbandonment`: parcours en_cours → success (8 tests)
  - [x] Test `requestParcoursAbandonment`: parcours already completed → error 'PARCOURS_ALREADY_COMPLETED'
  - [x] Test `requestParcoursAbandonment`: validation error, unauthorized, not found
  - [x] Test `reactivateParcours`: parcours abandoned → success (6 tests)
  - [x] Test `reactivateParcours`: notification client envoyée
  - [x] Test composant `AbandonParcoursDialog`: render, raison optionnelle, error toast (7 tests)
  - [x] Test composant `ParcoursOverview`: status abandoned → message pause, bouton visible/hidden (11 tests)
  - [x] Test composant `ReactivateParcoursDialog`: render, confirm, error (4 tests)
  - [x] Test `ElioChat`: parcours abandoned → message pause Lab (4 tests)

- [x] Créer test RLS
  - [x] Migration 00053 ajoute policy `parcours_update_owner` (client ne peut modifier que son propre parcours)
  - [x] Migration 00053 ajoute policy `parcours_select_owner` (client ne peut voir que son propre parcours)
  - [x] Réactivation vérifie l'authentification opérateur via RLS existing policies

## Dev Notes

### Architecture Patterns
- **Pattern data fetching**: Server Action pour mutation (`requestParcoursAbandonment`, `reactivateParcours`)
- **Pattern state**: TanStack Query pour cache parcours
- **Pattern notifications**: Notification MiKL type 'alert' priorité haute
- **Pattern UI**: Dialog confirmation avec mention rassurante (UX empathique)
- **Pattern lecture seule**: Désactiver Elio Lab mais préserver accès documents et chat MiKL

### Source Tree Components
```
packages/modules/parcours-lab/
├── components/
│   ├── parcours-progress.tsx         # MODIFIER: ajouter bouton abandon + état pause
│   ├── parcours-progress.test.tsx
│   ├── abandon-parcours-dialog.tsx   # CRÉER: modale confirmation abandon
│   └── abandon-parcours-dialog.test.tsx
├── actions/
│   ├── request-abandonment.ts        # CRÉER: Server Action abandon
│   ├── request-abandonment.test.ts
│   ├── reactivate-parcours.ts        # CRÉER: Server Action réactivation (MiKL)
│   └── reactivate-parcours.test.ts

packages/modules/crm/
└── components/
    └── client-info-tab.tsx           # MODIFIER: ajouter bouton réactivation parcours

packages/modules/elio/
└── components/
    └── elio-chat.tsx                 # MODIFIER: désactiver input si parcours abandonné

packages/modules/notifications/
└── actions/
    └── notify-operator.ts            # MODIFIER: ajouter notifyOperatorParcoursAbandonment()

apps/client/app/(dashboard)/
└── settings/
    └── page.tsx                      # CRÉER ou MODIFIER: section "Mon parcours Lab"
```

### Testing Standards
- **Unitaires**: Vitest, co-localisés (*.test.ts)
- **Coverage**: >80% pour actions abandon/réactivation
- **RLS**: Test isolation client (ne peut pas abandonner parcours d'un autre)
- **UX**: Test affichage message pause + désactivation Elio

### Project Structure Notes
- Alignement avec module parcours-lab (Story 6.1)
- Utilisation module notifications existant (Story 3.2)
- Fiche client CRM (Story 2.3) — ajouter bouton réactivation
- Elio Lab (Story 6.4) — désactiver si parcours abandonné

### Key Technical Decisions

**1. Statut parcours 'abandoned'**
- Nouveau statut dans enum `parcours_status` : 'not_started' | 'in_progress' | 'completed' | 'abandoned'
- `completed_at` positionné à NOW() lors de l'abandon (date de fin du parcours)
- Champ `abandonment_reason` (TEXT, optionnel) pour stocker raison client
- Données client PRÉSERVÉES (pas d'archivage ni suppression)

**2. Notification MiKL priorité haute**
- Type 'alert' pour attirer attention opérateur
- Priorité haute (affichée en premier dans liste notifications)
- Lien direct vers fiche client pour action rapide
- Metadata : raison + progression (X/Y étapes)

**3. UX empathique**
- Message rassurant : "Vos données seront conservées"
- Bouton "Continuer mon parcours" mis en avant (variant primary, vert)
- Bouton "Confirmer l'abandon" discret (variant destructive, rouge)
- Raison d'abandon optionnelle mais encouragée (suggestions pré-remplies)

**4. État pause vs archivage**
- Parcours abandonné = "en pause" (peut être réactivé)
- Différent de client archivé (Story 9.5c — suppression/anonymisation)
- Elio Lab désactivé mais chat MiKL actif
- Documents et briefs accessibles en lecture

**5. Réactivation par MiKL**
- Seul opérateur owner peut réactiver (RLS check)
- Réactivation instantanée (pas de confirmation client nécessaire)
- Notification client automatique
- Elio Lab réactivé immédiatement (check status dans composant)

### Database Schema Changes

```sql
-- Migration: update parcours_status enum to include 'abandoned'
ALTER TYPE parcours_status ADD VALUE IF NOT EXISTS 'abandoned';

-- Migration: add abandonment_reason column to parcours table
ALTER TABLE parcours
  ADD COLUMN abandonment_reason TEXT;

-- Migration: add index on parcours status for filtering
CREATE INDEX IF NOT EXISTS idx_parcours_status ON parcours(status);

-- NOTE: completed_at column already exists (Story 6.1)
-- Will be set to NOW() when status changes to 'abandoned'
```

### UI/UX Considerations

**Bouton "Quitter le parcours"**
- Placement discret en bas de page parcours (pas mis en avant)
- Style outline ou ghost (pas primary)
- Icon : XCircle ou LogOut
- Visible uniquement si status in_progress ou not_started

**Modale de confirmation**
- Largeur max-w-lg (confortable pour lecture)
- Header avec icon alert (AlertCircle)
- Suggestions raisons en RadioGroup pour faciliter sélection
- "Autre raison" ouvre textarea libre
- Boutons inversés (destructif à gauche, safe à droite) pour pattern confirmation

**État pause parcours**
- Message empathique : "en pause" plutôt que "abandonné"
- Icon Pause au lieu de X
- Couleur warning (orange) plutôt que destructive (rouge)
- CTA : "Contactez MiKL si vous souhaitez reprendre"

### References
- [Source: CLAUDE.md — Architecture Rules]
- [Source: docs/project-context.md — Stack & Versions]
- [Source: _bmad-output/planning-artifacts/architecture/04-implementation-patterns.md — API Response Format, Notifications]
- [Source: _bmad-output/planning-artifacts/epics/epic-9-graduation-lab-vers-one-cycle-de-vie-client-stories-detaillees.md — Story 9.3 Requirements]
- [Source: Story 6.1 — Module parcours Lab structure]
- [Source: Story 3.2 — Module notifications]
- [Source: Story 2.3 — Fiche client CRM]

### Dependencies
- **Bloquée par**: Story 6.1 (module parcours Lab), Story 3.2 (notifications), Story 2.3 (fiche client)
- **Bloque**: Aucune

## Dev Agent Record

### Agent Model Used
Claude Opus 4.6

### Debug Log References
- parcours-overview.test.tsx needed QueryClientProvider mock (AbandonParcoursDialog uses useQueryClient)
- Module name is `parcours` not `parcours-lab` in the codebase
- DB parcours.status uses 'en_cours'/'suspendu'/'termine' (not 'in_progress')
- Notification sent via existing `createNotification` action (no need for separate helper)
- Elio Lab disabled via `parcoursAbandoned` prop (checked at ElioChat export level)

### Completion Notes List
- Migration 00053: adds 'abandoned' status to parcours CHECK constraint + abandonment_reason column + client RLS policies
- Types updated in both parcours module (parcours.types.ts) and CRM module (crm.types.ts)
- requestParcoursAbandonment: validates status, updates parcours, logs activity, notifies MiKL via alert
- reactivateParcours: validates abandoned status, resets to en_cours, logs activity, notifies client
- AbandonParcoursDialog: clickable reason suggestions + custom textarea, reassuring message
- ParcoursOverview: abandon button (bottom, discreet) + abandoned state banner
- Settings page: ParcoursSettingsSection with parcours status + abandon button
- ElioChat: parcoursAbandoned prop disables Lab chat with pause message
- CRM client-info-tab: badge "Abandonné" + "Réactiver le parcours" button
- ReactivateParcoursDialog: confirmation dialog with cache invalidation + toast
- ParcoursStatusBadge: added 'abandoned' variant (destructive)
- get-client-parcours: includes 'abandoned' in status filter
- 44 tests total after CR fixes (was 40)
- CR fixes applied: HIGH-1 unused state, HIGH-2 import paths, HIGH-3 RLS too permissive, HIGH-4 RBAC check reactivate, HIGH-5 test mock parcours_steps, MED-1 button variant outline, MED-2 custom reason test, MED-3 notification body progression test, MED-4 VARCHAR(1000)

### File List
- `supabase/migrations/00053_parcours_abandoned_status.sql` — NEW: migration adding abandoned status + RLS
- `packages/modules/parcours/types/parcours.types.ts` — MODIFIED: added ParcoursStatus, RequestAbandonmentInput, ReactivateParcoursInput, ABANDONMENT_REASONS, abandonmentReason field
- `packages/modules/parcours/utils/parcours-mappers.ts` — MODIFIED: added abandonmentReason mapping
- `packages/modules/parcours/actions/request-abandonment.ts` — NEW: Server Action abandon parcours
- `packages/modules/parcours/actions/request-abandonment.test.ts` — NEW: 9 tests
- `packages/modules/parcours/actions/reactivate-parcours.ts` — NEW: Server Action reactivate parcours
- `packages/modules/parcours/actions/reactivate-parcours.test.ts` — NEW: 7 tests
- `packages/modules/parcours/components/abandon-parcours-dialog.tsx` — NEW: abandon confirmation dialog
- `packages/modules/parcours/components/abandon-parcours-dialog.test.tsx` — NEW: 9 tests
- `packages/modules/parcours/components/parcours-overview.tsx` — MODIFIED: added abandon button + abandoned state
- `packages/modules/parcours/components/parcours-overview.test.tsx` — MODIFIED: added 5 new tests (11 total)
- `packages/modules/parcours/index.ts` — MODIFIED: added new exports
- `packages/modules/elio/components/elio-chat.tsx` — MODIFIED: added parcoursAbandoned prop + Lab pause
- `packages/modules/elio/components/elio-chat-abandoned.test.tsx` — NEW: 4 tests
- `packages/modules/crm/types/crm.types.ts` — MODIFIED: added 'abandoned' to ParcoursStatusEnum + ParcoursDB
- `packages/modules/crm/actions/get-client-parcours.ts` — MODIFIED: includes 'abandoned' in status filter + abandonmentReason
- `packages/modules/crm/components/client-info-tab.tsx` — MODIFIED: added reactivate button + badge
- `packages/modules/crm/components/reactivate-parcours-dialog.tsx` — NEW: reactivation confirmation dialog
- `packages/modules/crm/components/reactivate-parcours-dialog.test.tsx` — NEW: 4 tests
- `packages/modules/crm/components/parcours-status-badge.tsx` — MODIFIED: added 'abandoned' variant
- `apps/client/app/(dashboard)/settings/page.tsx` — MODIFIED: added ParcoursSettingsSection
- `apps/client/app/(dashboard)/settings/parcours-settings-section.tsx` — NEW: parcours Lab section in settings
