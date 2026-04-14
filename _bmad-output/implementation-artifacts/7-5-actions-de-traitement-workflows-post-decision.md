# Story 7.5 : Actions de traitement — workflows post-décision

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **MiKL (opérateur)**,
I want **choisir une action de traitement spécifique après examen d'une demande (réactiver Lab, programmer visio, dev direct, reporter)**,
So that **je peux orienter chaque demande vers le workflow le plus adapté**.

## Acceptance Criteria

### AC 1 : Dropdown "Actions de traitement" affiché

**Given** MiKL consulte une demande de validation (Story 7.2)
**When** il clique sur le bouton "Actions de traitement" (dropdown)
**Then** le composant `action-picker.tsx` s'affiche avec 4 options (FR13) :

**Option A — Réactiver Lab :**
- Icône `RefreshCw` + label "Réactiver le parcours Lab"
- Description : "Le besoin est trop complexe — le client doit passer par un parcours complet"
- **Disponible uniquement** si le client a un parcours Lab existant (parcours_id non null)

**Option B — Programmer Visio :**
- Icône `Video` + label "Programmer une visio"
- Description : "Besoin de clarifier en direct avec le client"
- Ouvre le formulaire de prise de RDV Cal.com (intégration module agenda, Epic 5)

**Option C — Dev direct :**
- Icône `Code` + label "Développer directement"
- Description : "Le besoin est clair — je le développe"
- Affiche un lien "Ouvrir le dossier BMAD dans Cursor" (FR7, Epic 2)

**Option D — Reporter :**
- Icône `Clock` + label "Reporter"
- Description : "Pas maintenant — à traiter plus tard"
- Affiche un champ date optionnel (rappel) et un champ raison

**And** le dropdown utilise le composant DropdownMenu de @monprojetpro/ui

### AC 2 : Option A — Réactiver Lab

**Given** MiKL sélectionne "Réactiver Lab" (option A)
**When** il confirme l'action
**Then** les opérations suivantes sont effectuées :

1. La demande est marquée 'approved' (car le besoin est reconnu)
2. Le `reviewer_comment` est mis à jour avec "Besoin redirigé vers le parcours Lab"
3. Si le parcours était en status 'completed' ou 'suspended' : il est réactivé (status → 'in_progress')
4. Une notification est envoyée au client :
   - `title="MiKL a examiné votre demande — un accompagnement Lab va être mis en place"`
   - `link="/modules/parcours-lab"`

**And** un toast confirme "Parcours Lab réactivé"
**And** MiKL est redirigé vers la file d'attente

### AC 3 : Option B — Programmer Visio

**Given** MiKL sélectionne "Programmer Visio" (option B)
**When** il confirme l'action
**Then** :

1. La demande reste en statut 'pending' (en attente de la visio)
2. Le `reviewer_comment` est mis à jour avec "Visio à programmer"
3. Le formulaire de prise de RDV Cal.com s'ouvre (pré-rempli avec le client)
4. Une notification est envoyée au client :
   - `title="MiKL souhaite en discuter en visio — un RDV va être proposé"`
   - `link="/modules/agenda"`

**And** l'intégration avec le module agenda (Epic 5) est utilisée
**And** MiKL reste sur la page de détail pour finaliser la prise de RDV

### AC 4 : Option C — Dev direct

**Given** MiKL sélectionne "Dev direct" (option C)
**When** il confirme l'action
**Then** :

1. La demande est marquée 'approved'
2. Le `reviewer_comment` est mis à jour avec "Pris en charge — développement direct"
3. Le lien vers le dossier BMAD/Cursor du client est affiché :
   - Si `clients.bmad_project_path` existe : `cursor://${bmad_project_path}`
   - Sinon : message informatif "Le chemin du projet BMAD n'est pas configuré pour ce client"
4. Une notification est envoyée au client :
   - `title="Votre demande '{titre}' est prise en charge par MiKL"`
   - `link="/modules/core-dashboard"`

**And** un toast confirme "Demande prise en charge — bon dev !"
**And** MiKL est redirigé vers la file d'attente

### AC 5 : Option D — Reporter

**Given** MiKL sélectionne "Reporter" (option D)
**When** il confirme l'action avec une raison optionnelle et une date de rappel optionnelle
**Then** :

1. La demande reste en statut 'pending' mais le `reviewer_comment` est mis à jour avec "Reporté : {raison}"
2. **Si une date de rappel est fournie** : un rappel est créé dans le système de notifications :
   - `type='system'`
   - `title="Rappel : demande '{titre}' de {client} à traiter"`
   - `scheduled_at=date de rappel` (notification future)
3. **Aucune notification n'est envoyée au client** (le report est interne)

**And** un toast confirme "Demande reportée"
**And** la demande reste visible dans la file avec une indication visuelle "Reportée"
**And** MiKL est redirigé vers la file d'attente

### AC 6 : Mise à jour cache et historique

**Given** MiKL sélectionne une action de traitement
**When** l'action est exécutée
**Then** le cache TanStack Query est invalidé pour toutes les queries impactées :
- `['validation-requests']`
- `['validation-request', requestId]`
- `['parcours', clientId]` (si option A)

**And** l'historique de la demande est mis à jour avec l'action choisie (visible dans section Échanges)
**And** MiKL est redirigé vers la file d'attente (sauf option B qui reste sur la page)

## Tasks / Subtasks

### Task 1 : Créer le composant action-picker (AC: 1)
- [x] Créer `components/action-picker.tsx` (dropdown 4 options)
- [x] Option A : Réactiver Lab (conditionnelle si parcours_id existe)
- [x] Option B : Programmer Visio
- [x] Option C : Dev direct
- [x] Option D : Reporter
- [x] Utiliser DropdownMenu de @monprojetpro/ui
- [x] Icônes Lucide appropriées pour chaque option
- [x] Écrire test `action-picker.test.tsx`

### Task 2 : Créer les Server Actions (AC: 2-5)
- [x] Créer `actions/reactivate-lab.ts` (Option A)
- [x] Créer `actions/schedule-visio.ts` (Option B)
- [x] Créer `actions/start-dev.ts` (Option C)
- [x] Créer `actions/postpone-request.ts` (Option D)
- [x] Chaque action retourne `{ data, error }` format
- [x] Écrire tests pour chaque action

### Task 3 : Implémenter Option A — Réactiver Lab (AC: 2)
- [x] Valider que parcours_id existe
- [x] Marquer demande 'approved'
- [x] Mettre à jour reviewer_comment
- [x] Si parcours status = 'completed' ou 'suspended' : status → 'in_progress'
- [x] Créer notification client
- [x] Logger avec `[VALIDATION-HUB:REACTIVATE-LAB]`

### Task 4 : Implémenter Option B — Programmer Visio (AC: 3)
- [x] Demande reste 'pending'
- [x] Mettre à jour reviewer_comment
- [x] Créer notification client
- [x] Ouvrir formulaire Cal.com (intégration module agenda Epic 5)
- [x] Pas de redirection (reste sur la page)
- [x] Logger avec `[VALIDATION-HUB:SCHEDULE-VISIO]`

### Task 5 : Implémenter Option C — Dev direct (AC: 4)
- [x] Marquer demande 'approved'
- [x] Mettre à jour reviewer_comment
- [x] Récupérer `clients.bmad_project_path`
- [x] Afficher lien `cursor://${bmad_project_path}` ou message si null
- [x] Créer notification client
- [x] Logger avec `[VALIDATION-HUB:START-DEV]`

### Task 6 : Implémenter Option D — Reporter (AC: 5)
- [x] Créer modale de report avec champs raison (optionnel) et date (optionnel)
- [x] Demande reste 'pending'
- [x] Mettre à jour reviewer_comment avec raison
- [x] Si date fournie : créer notification système avec `scheduled_at`
- [x] Pas de notification client
- [x] Ajouter badge "Reportée" dans la file d'attente
- [x] Logger avec `[VALIDATION-HUB:POSTPONE]`

### Task 7 : Intégrer action-picker dans request-detail (AC: 1)
- [x] Modifier `components/request-detail.tsx`
- [x] Ajouter bouton "Actions de traitement" avec dropdown
- [x] Connecter les 4 options aux Server Actions
- [x] Passer les props nécessaires (requestId, clientId, parcoursId, bmadProjectPath)

### Task 8 : Implémenter invalidation cache (AC: 6)
- [x] Invalider `['validation-requests']` après chaque action
- [x] Invalider `['validation-request', requestId]` après chaque action
- [x] Invalider `['parcours', clientId]` après option A
- [x] Rediriger vers `/modules/validation-hub` (sauf option B)

### Task 9 : Améliorer la file d'attente (AC: 5)
- [x] Modifier `components/validation-queue.tsx`
- [x] Ajouter badge "Reportée" pour les demandes reportées
- [x] Filtrer les demandes reportées si nécessaire
- [x] Tester l'affichage

### Task 10 : Tests d'intégration (AC: 2-6)
- [x] Test Option A : réactivation parcours Lab
- [x] Test Option B : ouverture formulaire Cal.com
- [x] Test Option C : affichage lien Cursor
- [x] Test Option D : création rappel + badge "Reportée"
- [x] Test invalidation cache pour chaque option

## Dev Notes

### Contexte Epic 7

Cette story est la **cinquième** de l'Epic 7. Elle ajoute des **workflows post-décision** pour orienter chaque demande vers le traitement le plus adapté. La dernière story (7.6) ajoutera le temps réel.

**Dépendances** :
- Story 7.1 : Structure du module
- Story 7.2 : Vue détaillée
- Story 7.3 : Pattern Server Actions
- Epic 5 : Module visio + agenda (Cal.com)
- Epic 2 : CRM (champ `bmad_project_path`)

### Architecture : Intégrations inter-modules

Cette story **intègre plusieurs modules** :
- **Parcours Lab** : Réactivation parcours (option A)
- **Agenda** : Prise de RDV Cal.com (option B)
- **CRM** : Lien vers dossier BMAD (option C)
- **Notifications** : Rappels système (option D)

**Communication** : Via Supabase (tables partagées) et notifications.

### Références architecture importantes

#### Pattern DropdownMenu

**Source** : `@monprojetpro/ui` (shadcn/ui)

```typescript
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@monprojetpro/ui'
import { RefreshCw, Video, Code, Clock } from 'lucide-react'

export function ActionPicker({ requestId, clientId, parcoursId, bmadProjectPath }: Props) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">
          Actions de traitement
          <ChevronDown className="ml-2 h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>Choisir une action</DropdownMenuLabel>
        <DropdownMenuSeparator />

        {/* Option A — Réactiver Lab (conditionnelle) */}
        {parcoursId && (
          <DropdownMenuItem onClick={() => handleReactivateLab()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            <div>
              <div className="font-medium">Réactiver le parcours Lab</div>
              <div className="text-xs text-muted-foreground">
                Le besoin est trop complexe
              </div>
            </div>
          </DropdownMenuItem>
        )}

        {/* Option B — Programmer Visio */}
        <DropdownMenuItem onClick={() => handleScheduleVisio()}>
          <Video className="mr-2 h-4 w-4" />
          <div>
            <div className="font-medium">Programmer une visio</div>
            <div className="text-xs text-muted-foreground">
              Besoin de clarifier en direct
            </div>
          </div>
        </DropdownMenuItem>

        {/* Option C — Dev direct */}
        <DropdownMenuItem onClick={() => handleStartDev()}>
          <Code className="mr-2 h-4 w-4" />
          <div>
            <div className="font-medium">Développer directement</div>
            <div className="text-xs text-muted-foreground">
              Le besoin est clair
            </div>
          </div>
        </DropdownMenuItem>

        {/* Option D — Reporter */}
        <DropdownMenuItem onClick={() => handlePostpone()}>
          <Clock className="mr-2 h-4 w-4" />
          <div>
            <div className="font-medium">Reporter</div>
            <div className="text-xs text-muted-foreground">
              Pas maintenant — à traiter plus tard
            </div>
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
```

#### Pattern Notifications système avec scheduled_at

**Source** : Module notifications (Epic 3)

```typescript
// Créer une notification future (rappel)
const { error } = await supabase
  .from('notifications')
  .insert({
    user_id: operatorId,
    type: 'system',
    title: `Rappel : demande '${request.title}' de ${client.name} à traiter`,
    body: reason,
    link: `/modules/validation-hub/${requestId}`,
    scheduled_at: reminderDate.toISOString(), // Date future
    created_at: new Date().toISOString(),
  })
```

**Note** : Le système de notifications (Epic 3) doit gérer l'affichage des notifications scheduled_at à la date prévue.

#### Pattern Lien Cursor

**Source** : Epic 2 — CRM (champ `bmad_project_path`)

```typescript
// Lien vers Cursor (protocol handler)
const cursorLink = `cursor://${client.bmadProjectPath}`

// Affichage conditionnel
{client.bmadProjectPath ? (
  <a href={cursorLink} target="_blank" rel="noopener noreferrer" className="text-primary underline">
    Ouvrir le dossier BMAD dans Cursor
  </a>
) : (
  <p className="text-sm text-muted-foreground">
    Le chemin du projet BMAD n'est pas configuré pour ce client.
  </p>
)}
```

#### Pattern Intégration Cal.com

**Source** : Epic 5 — Module agenda

```typescript
// Ouvrir formulaire Cal.com (iframe ou popup)
const calComUrl = `https://cal.com/mikl/consult?prefill[name]=${client.name}&prefill[email]=${client.email}`

window.open(calComUrl, '_blank', 'width=800,height=600')
```

**Note** : L'intégration complète Cal.com sera faite dans Epic 5.

### Technical Requirements

#### Stack & Versions (identique Stories précédentes)

| Package | Version | Usage |
|---------|---------|-------|
| Next.js | 16.1.1 | Server Actions |
| React | 19.2.3 | UI Components |
| @tanstack/react-query | ^5.90.x | Cache invalidation |
| @supabase/supabase-js | ^2.95.x | Database client |
| lucide-react | Latest | Icons (RefreshCw, Video, Code, Clock) |
| @monprojetpro/ui | Internal | DropdownMenu, Button, Dialog |

#### Composants UI disponibles (@monprojetpro/ui)

- `DropdownMenu`, `DropdownMenuContent`, `DropdownMenuItem`, `DropdownMenuLabel`, `DropdownMenuSeparator`, `DropdownMenuTrigger`
- `Button` : Bouton avec variants
- `Dialog` : Modale pour l'option D (reporter)
- `DatePicker` : Sélecteur de date pour rappel

#### Icons Lucide

- `RefreshCw` : Réactiver
- `Video` : Visio
- `Code` : Dev
- `Clock` : Reporter
- `ChevronDown` : Dropdown

### Architecture Compliance

#### Pattern Server Actions (identique Stories 7.3-7.4)

**Toutes les actions DOIVENT** :
- Valider les inputs avec Zod
- Retourner `{ data, error }` format
- Logger avec format `[VALIDATION-HUB:ACTION]`
- Créer notifications si nécessaire
- Invalider les caches appropriés

#### Pattern Conditional Rendering

**Option A (Réactiver Lab)** est conditionnelle :

```typescript
{parcoursId && (
  <DropdownMenuItem onClick={() => handleReactivateLab()}>
    {/* ... */}
  </DropdownMenuItem>
)}
```

**Ne pas afficher** si le client n'a pas de parcours Lab.

### File Structure Requirements

#### Module validation-hub (ajout Story 7.5)

```
packages/modules/validation-hub/
├── components/
│   ├── action-picker.tsx            # Story 7.5 ← NOUVEAU
│   ├── action-picker.test.tsx       # Story 7.5 ← NOUVEAU
│   ├── postpone-dialog.tsx          # Story 7.5 ← NOUVEAU (option D)
│   └── postpone-dialog.test.tsx     # Story 7.5 ← NOUVEAU
├── actions/
│   ├── reactivate-lab.ts            # Story 7.5 ← NOUVEAU
│   ├── schedule-visio.ts            # Story 7.5 ← NOUVEAU
│   ├── start-dev.ts                 # Story 7.5 ← NOUVEAU
│   ├── postpone-request.ts          # Story 7.5 ← NOUVEAU
│   └── (tests co-localisés)
```

### Testing Requirements

#### Tests à écrire (co-localisés)

| Fichier | Test à écrire | Type |
|---------|---------------|------|
| `action-picker.tsx` | `action-picker.test.tsx` | Component test + conditional rendering |
| `reactivate-lab.ts` | `reactivate-lab.test.ts` | Server Action test |
| `schedule-visio.ts` | `schedule-visio.test.ts` | Server Action test |
| `start-dev.ts` | `start-dev.test.ts` | Server Action test |
| `postpone-request.ts` | `postpone-request.test.ts` | Server Action test |
| `postpone-dialog.tsx` | `postpone-dialog.test.tsx` | Component test |

#### Scénarios de test critiques

1. **Test Option A conditionnelle** : Vérifier que l'option n'apparaît que si parcoursId existe
2. **Test réactivation parcours** : Vérifier status change de 'completed' → 'in_progress'
3. **Test lien Cursor** : Vérifier affichage conditionnel selon bmadProjectPath
4. **Test rappel système** : Vérifier création notification avec scheduled_at
5. **Test badge "Reportée"** : Vérifier affichage dans la file d'attente
6. **Test invalidation cache** : Vérifier caches appropriés invalidés pour chaque option

### Project Structure Notes

#### Alignement avec la structure unifiée

Cette story respecte l'architecture définie dans `architecture/05-project-structure.md` :
- Server Actions dans `actions/`
- Pattern `{ data, error }`
- Communication inter-modules via Supabase
- Tests co-localisés

#### Intégrations externes

Cette story intègre :
- **Cal.com** : Prise de RDV (Epic 5)
- **Cursor** : Protocol handler `cursor://`
- **Notifications système** : Rappels futurs

### References

- [Epic 7 : Validation Hub](_bmad-output/planning-artifacts/epics/epic-7-validation-hub-stories-detaillees.md#story-75)
- [Story 7.1-7.4 : Stories précédentes](.)
- [Architecture Platform](../planning-artifacts/architecture/02-platform-architecture.md)
- [Implementation Patterns](../planning-artifacts/architecture/04-implementation-patterns.md)
- [Epic 5 : Module visio + agenda](../planning-artifacts/epics/epic-5-visioconference-onboarding-prospect-stories-detaillees.md)
- [Epic 2 : CRM](../planning-artifacts/epics/epic-2-gestion-de-la-relation-client-crm-hub-stories-detaillees.md)

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

- `DropdownMenu` absent de `@monprojetpro/ui` → custom dropdown avec `useState` + click-outside detection
- `DatePicker` absent de `@monprojetpro/ui` → `<input type="date">` natif
- Collision de texte dans `postpone-dialog` (titre = bouton "Reporter la demande") → bouton renommé "Confirmer le report"
- `bmadProjectPath` prop supprimée de `ActionPicker` → l'action `startDev` récupère directement en DB

### Completion Notes List

- Créé `action-picker.tsx` : dropdown custom 4 options (A conditionnel parcoursId), click-outside, useTransition
- Créé `postpone-dialog.tsx` : Dialog avec reason (optionnel) + date reminder (optionnel), native `<input type="date">`
- Créé `reactivate-lab.ts` : approve request + reactivate parcours if completed/suspended + notify client
- Créé `schedule-visio.ts` : update reviewer_comment + build calComUrl + notify client (request stays pending)
- Créé `start-dev.ts` : approve request + fetch bmad_project_path → cursorUrl + notify client
- Créé `postpone-request.ts` : update reviewer_comment + create system reminder notification with scheduled_at
- Modifié `request-actions.tsx` : ajout `treatmentActionSlot?: React.ReactNode` prop (backward compatible)
- Modifié `request-detail.tsx` : intégration `ActionPicker` via `treatmentActionSlot`
- Modifié `validation-queue.tsx` : badge "Reportée" (orange) quand status=pending && reviewerComment starts with "Reporté"
- Mis à jour `index.ts` : export nouveaux composants et actions
- 62 nouveaux tests, 2679 total (0 régression)

### File List

- `packages/modules/validation-hub/components/action-picker.tsx` (NOUVEAU)
- `packages/modules/validation-hub/components/action-picker.test.tsx` (NOUVEAU)
- `packages/modules/validation-hub/components/postpone-dialog.tsx` (NOUVEAU)
- `packages/modules/validation-hub/components/postpone-dialog.test.tsx` (NOUVEAU)
- `packages/modules/validation-hub/actions/reactivate-lab.ts` (NOUVEAU)
- `packages/modules/validation-hub/actions/reactivate-lab.test.ts` (NOUVEAU)
- `packages/modules/validation-hub/actions/schedule-visio.ts` (NOUVEAU)
- `packages/modules/validation-hub/actions/schedule-visio.test.ts` (NOUVEAU)
- `packages/modules/validation-hub/actions/start-dev.ts` (NOUVEAU)
- `packages/modules/validation-hub/actions/start-dev.test.ts` (NOUVEAU)
- `packages/modules/validation-hub/actions/postpone-request.ts` (NOUVEAU)
- `packages/modules/validation-hub/actions/postpone-request.test.ts` (NOUVEAU)
- `packages/modules/validation-hub/components/request-actions.tsx` (MODIFIÉ)
- `packages/modules/validation-hub/components/request-detail.tsx` (MODIFIÉ)
- `packages/modules/validation-hub/components/validation-queue.tsx` (MODIFIÉ)
- `packages/modules/validation-hub/components/validation-queue.test.tsx` (MODIFIÉ)
- `packages/modules/validation-hub/index.ts` (MODIFIÉ)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (MODIFIÉ)

## Change Log

- 2026-02-26 : Implémentation Story 7.5 — 4 Server Actions, ActionPicker dropdown, PostponeDialog, badge "Reportée" (62 nouveaux tests, 2679 total)
- 2026-02-26 : Code Review fixes — dual toast bug (showSuccess+showError→single showSuccess), disabled prop pour ActionPicker (requests rejetées), suppression dead prop bmadProjectPath, suppression as casts unsafe, fix test titre dialog postpone (2681 tests)
