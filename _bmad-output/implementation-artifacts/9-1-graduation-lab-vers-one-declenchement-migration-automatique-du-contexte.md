# Story 9.1: Graduation Lab vers One — Déclenchement & migration automatique du contexte

Status: done

## Story

As a **MiKL (opérateur)**,
I want **déclencher la graduation d'un client Lab vers One avec migration automatique de tout le contexte (profil, briefs, historique)**,
so that **le client transite en douceur vers son espace professionnel sans perte d'information**.

## Acceptance Criteria

**Given** MiKL consulte la fiche d'un client Lab dont le parcours est terminé (FR74)
**When** il accède à la section "Parcours Lab" de la fiche client
**Then** un bouton "Graduer vers Foxeo One" est visible si les conditions suivantes sont remplies :
- Le parcours Lab est en statut 'completed' (toutes les étapes validées)
- Le client n'a aucune `validation_request` en statut 'pending'
- Le client n'est pas déjà en statut 'one'
**And** si les conditions ne sont pas remplies, le bouton est désactivé avec un tooltip explicatif :
- "Parcours non terminé — {X} étapes restantes"
- "Demandes de validation en attente — traitez-les d'abord"

**Given** MiKL clique sur "Graduer vers Foxeo One" (FR74)
**When** la modale de confirmation s'affiche
**Then** elle contient :
- Nom et entreprise du client
- Récapitulatif du parcours Lab (durée, étapes complétées, briefs validés)
- Choix du tier One initial : "Ponctuel" / "Essentiel (49€/mois — Elio One)" / "Agentique (99€/mois — Elio One+)"
- Choix des modules à activer pour le client (checkboxes depuis la liste des modules disponibles)
- Champ notes de graduation (optionnel, pour MiKL)
- Boutons "Confirmer la graduation" / "Annuler"
**And** le tier "Essentiel" est pré-sélectionné par défaut

**Given** MiKL confirme la graduation
**When** la Server Action `graduateClient(clientId, tier, activeModules, notes)` s'exécute
**Then** les opérations suivantes sont effectuées (FR75, FR166, FR167) :

**Phase A — Provisioning instance dédiée (FR153, FR166) :**
Le provisioning complet (création Supabase, migrations DB, déploiement Vercel, health check) est exécuté via `provisionOneInstance()` — voir **Story 12.6** pour le processus détaillé en 6 étapes. Dans le contexte de graduation, les paramètres sont dérivés de la modale de graduation :
- `slug` → dérive du nom d'entreprise du client (kebab-case)
- `modules` → modules choisis par MiKL dans la modale
- `tier` → tier sélectionné (Essentiel / Agentique)

**Phase B — Migration des données Lab vers l'instance One (FR167) :**
5. Les données Lab pertinentes sont migrées vers le Supabase dédié du client :
   - Le `communication_profile` est copié dans la DB One
   - Les `elio_conversations` avec `dashboard_type='lab'` sont copiées (consultables dans "Historique Lab")
   - Les `documents` du Lab sont copiés dans le Storage One
   - Le `parcours` complet est copié (lecture seule)
   - Les observations Elio Lab sont compilées dans `communication_profile.lab_learnings`
6. Les données Lab ORIGINALES restent dans la DB Lab partagée (archivage, propriété Foxeo — FR168)

**Phase C — Mise à jour du client dans le Hub :**
7. `clients.client_type` → 'one' (était 'lab')
8. `clients.graduated_at` → NOW()
9. `clients.graduation_notes` → notes de MiKL
10. `client_configs.elio_tier` → tier choisi
11. `client_configs.active_modules` → modules activés
12. `client_configs.graduation_source` → 'lab'

**Phase D — Préparation de l'accueil One :**
13. Un flag `show_graduation_screen` → true est positionné dans la DB One du client
14. L'instance One est prête à recevoir le client

**And** le provisioning est déclenché de manière asynchrone — l'action retourne immédiatement le statut 'provisioning' et la progression est suivie via Realtime (channel: `provisioning:{clientId}`)
**And** un toast confirme "Graduation lancée — provisioning en cours pour {nom}"
**And** le cache TanStack Query est invalidé pour ['clients', clientId], ['parcours', clientId]
**And** un événement de graduation est loggé dans `activity_logs`

**Given** une erreur survient pendant la graduation
**When** la transaction échoue
**Then** un rollback complet est effectué — aucune donnée n'est modifiée
**And** un message d'erreur explicite s'affiche : "Erreur lors de la graduation — aucune modification effectuée. Réessayez."
**And** l'erreur est logguée avec contexte pour diagnostic (NFR-R5)

## Tasks / Subtasks

- [x] Créer le bouton de graduation dans la fiche client (AC: #1, #2)
  - [x] Modifier `packages/modules/crm/components/client-info-tab.tsx` pour ajouter section "Parcours Lab"
  - [x] Afficher statut parcours + bouton "Graduer vers Foxeo One"
  - [x] Implémenter logique de validation des conditions (parcours completed, pas de validation pending)
  - [x] Désactiver bouton + tooltip si conditions non remplies
  - [x] Utiliser composants Button, Tooltip de @foxeo/ui

- [x] Créer la modale de graduation (AC: #2)
  - [x] Créer `packages/modules/crm/components/graduation-dialog.tsx`
  - [x] Utiliser Dialog component de @foxeo/ui (Radix UI)
  - [x] Section récapitulatif : nom, entreprise, stats parcours Lab (durée, étapes, briefs)
  - [x] Section tier : RadioGroup avec 3 options (Ponctuel, Essentiel, Agentique) + descriptions
  - [x] Section modules : Checkbox list des modules disponibles (fetch depuis module registry)
  - [x] Champ notes : Textarea optionnel
  - [x] Boutons "Confirmer la graduation" (destructive) / "Annuler"
  - [x] Valider que au moins 1 module est sélectionné

- [x] Créer la Server Action `graduateClient` (AC: #3)
  - [x] Créer `packages/modules/crm/actions/graduate-client.ts`
  - [x] Signature: `graduateClient(clientId: string, tier: string, activeModules: string[], notes?: string): Promise<ActionResponse<GraduationResult>>`
  - [x] Validation Zod des inputs (schema `GraduateClientSchema`)
  - [x] Vérifier conditions de graduation (parcours completed, pas de validation pending)
  - [x] Si conditions non remplies: retourner error 'GRADUATION_CONDITIONS_NOT_MET'
  - [x] Démarrer transaction Supabase

- [x] Implémenter Phase A — Provisioning instance (AC: #3, Phase A)
  - [x] Créer helper `provisionOneInstance(clientId, slug, tier, modules)` dans `packages/modules/admin/utils/provision-instance.ts`
  - [x] NOTE: Provisioning complet est Story 12.6 — pour MVP, créer stub qui simule provisioning
  - [x] Générer slug depuis entreprise client (kebab-case, unique)
  - [x] Créer entrée dans `client_instances` table : `{ client_id, instance_url, slug, status: 'active', tier, active_modules }`
  - [x] Pour MVP: marquer immédiatement status → 'active' (provisioning réel en Story 12.6)

- [x] Implémenter Phase B — Migration données Lab vers One (AC: #3, Phase B)
  - [x] Créer helper `migrateLabDataToOne(clientId, oneInstanceDb)` dans `packages/modules/crm/actions/migrate-lab-data.ts`
  - [x] NOTE: Migration cross-database requiert credentials des 2 instances — pour MVP, préparer structure sans exécution réelle

- [x] Implémenter Phase C — Mise à jour client Hub (AC: #3, Phase C)
  - [x] UPDATE `clients` SET `graduated_at = NOW()`, `graduation_notes = {notes}`
  - [x] UPDATE `client_configs` SET `dashboard_type = 'one'`, `elio_tier = {tier}`, `active_modules = {modules}`, `graduation_source = 'lab'`
  - [x] Vérifier via RLS que seul opérateur owner peut exécuter

- [x] Implémenter Phase D — Préparation accueil One (AC: #3, Phase D)
  - [x] Créer flag `show_graduation_screen` dans metadata de l'instance (`client_instances.metadata`)
  - [x] Flag sera consommé par Story 5.6 (écran de graduation) et Story 9.2 (notification)

- [x] Implémenter gestion d'erreur et rollback (AC: #4)
  - [x] Si erreur Phase C: rollback clients + marquer instance 'failed'
  - [x] Logger erreur détaillée dans `activity_logs` avec code 'GRADUATION_ERROR'
  - [x] Retourner `{ data: null, error: { message: 'Erreur lors de la graduation...', code: 'GRADUATION_ERROR', details } }`

- [x] Implémenter invalidation cache et notifications (AC: #3)
  - [x] Invalider TanStack Query: `queryClient.invalidateQueries(['clients', clientId])`
  - [x] Invalider TanStack Query: `queryClient.invalidateQueries(['parcours', clientId])`
  - [x] Logger événement dans `activity_logs`: type 'client_graduated', metadata avec tier et modules
  - [x] Afficher toast success: "Graduation lancée — provisioning en cours pour {nom}"

- [x] Créer tests unitaires (TDD)
  - [x] Test `graduateClient` action: conditions remplies → success
  - [x] Test `graduateClient` action: parcours non completed → error 'GRADUATION_CONDITIONS_NOT_MET'
  - [x] Test `graduateClient` action: validation pending → error 'GRADUATION_CONDITIONS_NOT_MET'
  - [x] Test `graduateClient` action: erreur clients update → GRADUATION_ERROR
  - [x] Test composant `GraduationDialog`: tier pré-sélectionné = Essentiel
  - [x] Test composant `GraduationDialog`: validation au moins 1 module sélectionné

- [x] Créer test RLS
  - [x] Test: opérateur A ne peut pas graduer client de opérateur B
  - [x] Test: client Lab ne peut pas déclencher sa propre graduation (fonction Hub only)

## Dev Notes

### Architecture Patterns
- **Pattern data fetching**: Server Action pour mutation (`graduateClient`)
- **Pattern state**: TanStack Query pour cache client + parcours
- **Pattern realtime**: Supabase Realtime channel `provisioning:{clientId}` pour suivi progression asynchrone
- **Pattern error**: Format `{ data, error }` standard, rollback transaction si erreur
- **Pattern transaction**: Wrapper Supabase transaction pour phases C+D (phases A+B sont asynchrones)

### Source Tree Components
```
packages/modules/crm/
├── components/
│   ├── client-info-tab.tsx           # MODIFIER: ajouter section Parcours Lab + bouton graduation
│   ├── graduation-dialog.tsx         # CRÉER: modale graduation avec tier + modules
│   └── graduation-dialog.test.tsx
├── actions/
│   ├── graduate-client.ts            # CRÉER: Server Action principale
│   ├── graduate-client.test.ts
│   ├── migrate-lab-data.ts           # CRÉER: helper migration données Lab → One
│   └── migrate-lab-data.test.ts
└── types/
    └── graduation.types.ts           # CRÉER: types GraduationInput, GraduationResult

packages/modules/admin/utils/
└── provision-instance.ts             # CRÉER: stub provisioning (implémentation complète Story 12.6)

supabase/migrations/
└── [timestamp]_add_graduation_fields.sql  # CRÉER: ajouter colonnes graduated_at, graduation_notes, graduation_source
```

### Testing Standards
- **Unitaires**: Vitest, co-localisés (*.test.ts)
- **Coverage**: >80% pour Server Actions critiques
- **RLS**: Test isolation opérateur (ne peut pas graduer client d'un autre opérateur)
- **Integration**: Tester transaction rollback si provisioning échoue

### Project Structure Notes
- Alignement avec architecture modularisée (modules CRM + Admin)
- Graduation dialog dans module CRM (MiKL-facing)
- Provisioning logic dans module Admin (infrastructure)
- Migration données cross-database (Lab → One) requiert credentials — pour MVP, préparer structure

### Key Technical Decisions

**1. Provisioning asynchrone**
- Provisioning complet (Story 12.6) peut prendre 30-60s
- Action `graduateClient` retourne immédiatement avec status 'provisioning'
- Suivi progression via Realtime channel `provisioning:{clientId}`
- Pour MVP: stub provisioning (simule succès immédiat)

**2. Migration données Lab → One**
- Cross-database copy requiert credentials Supabase des 2 instances
- Données Lab ORIGINALES restent dans DB Lab (archivage, propriété Foxeo)
- Données One COPIÉES dans instance dédiée (propriété client)
- Pour MVP: préparer structure sans exécution réelle (Story 12.6 implémente réellement)

**3. Transaction et rollback**
- Phases C+D (mise à jour Hub) dans transaction Supabase
- Phases A+B asynchrones → pas de rollback possible une fois lancées
- Si erreur provisioning détectée après: créer `client_instances.status = 'failed'` + notification MiKL

**4. Tier par défaut**
- Essentiel (49€/mois, Elio One) pré-sélectionné
- MiKL peut choisir Ponctuel (pas Elio) ou Agentique (Elio One+)
- Tier stocké dans `client_configs.elio_tier` + `client_instances.tier`

**5. Modules à activer**
- Liste des modules disponibles fetch depuis module registry
- Au moins 1 module doit être sélectionné (validation Zod)
- Modules par défaut suggérés: core-dashboard, documents, chat
- Modules stockés dans `client_instances.active_modules` (array)

### Database Schema Changes

```sql
-- Migration: add graduation fields to clients table
ALTER TABLE clients
  ADD COLUMN graduated_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN graduation_notes TEXT;

-- Migration: add graduation_source to client_configs
ALTER TABLE client_configs
  ADD COLUMN graduation_source TEXT CHECK (graduation_source IN ('lab', 'direct', 'upgrade'));

-- Migration: create client_instances table (pour provisioning)
CREATE TABLE client_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  instance_url TEXT UNIQUE NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('provisioning', 'active', 'suspended', 'failed', 'transferred')),
  tier TEXT NOT NULL CHECK (tier IN ('base', 'essentiel', 'agentique')),
  active_modules TEXT[] NOT NULL DEFAULT ARRAY['core-dashboard'],
  supabase_project_id TEXT,
  vercel_project_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  activated_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX idx_client_instances_client_id ON client_instances(client_id);
CREATE INDEX idx_client_instances_status ON client_instances(status);

-- RLS policies pour client_instances
ALTER TABLE client_instances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "client_instances_select_operator"
  ON client_instances FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = client_instances.client_id
      AND clients.operator_id = auth.uid()
    )
    OR is_admin()
  );

CREATE POLICY "client_instances_insert_operator"
  ON client_instances FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = client_instances.client_id
      AND clients.operator_id = auth.uid()
    )
    OR is_admin()
  );

CREATE POLICY "client_instances_update_operator"
  ON client_instances FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = client_instances.client_id
      AND clients.operator_id = auth.uid()
    )
    OR is_admin()
  );
```

### References
- [Source: CLAUDE.md — Architecture Rules]
- [Source: docs/project-context.md — Stack & Versions]
- [Source: _bmad-output/planning-artifacts/architecture/04-implementation-patterns.md — Database Naming, API Response Format]
- [Source: _bmad-output/planning-artifacts/epics/epic-9-graduation-lab-vers-one-cycle-de-vie-client-stories-detaillees.md — Story 9.1 Requirements]
- [Source: Story 2.3 — Pattern fiche client avec onglets]
- [Source: Story 12.6 — Provisioning instance One (référence pour Phase A)]

### Dependencies
- **Bloquée par**: Story 2.3 (fiche client complète), Story 6.1 (module parcours Lab)
- **Bloque**: Story 9.2 (notification client graduation)
- **Référence**: Story 12.6 (provisioning instance One — implémentation complète)
- **Référence**: Story 5.6 (écran de graduation — consommation du flag)

## Dev Agent Record

### Agent Model Used
claude-sonnet-4-6

### Debug Log References
Aucun blocage majeur. Notes clés :
- `clients.client_type` ne contient pas 'lab'/'one' → graduation trackée via `client_configs.dashboard_type` ('lab' → 'one')
- Migration 00036 avait déjà `graduated_at` mais pas `graduation_notes` → ajouté dans 00051
- `elio_tier` mappé : 'agentique' → 'one_plus', 'base'/'essentiel' → 'one'
- Phase D : `show_graduation_screen` stocké dans `client_instances.metadata` (pas de cross-DB sans Story 12.6)
- Modules inter-dépendances interdits → action `getClientPendingValidationsCount` créée dans CRM pour ne pas importer validation-hub

### Completion Notes List
- ✅ Migration 00051 : `graduation_notes` sur clients, `graduation_source` sur client_configs, table `client_instances` avec RLS + trigger `updated_at`
- ✅ Module Admin créé (manifest + docs stub) — provision-instance déplacé dans CRM (pas d'import inter-module)
- ✅ Types graduation : `GraduationTier`, `GraduateClientSchema`, `GraduationResult`
- ✅ `graduateClient` action : validation conditions, 4 phases, rollback sur erreur Phase C
- ✅ `GraduationDialog` : tier pré-sélectionné Essentiel, 6 modules checkboxes, notes optionnelles
- ✅ `client-info-tab.tsx` : section "Graduation vers Foxeo One" + bouton activé/désactivé + tooltips
- ✅ 30 tests unitaires passant : provision-instance (5), migrate-lab-data (2), graduate-client (8), pending-validations (4), graduation-dialog (11)
- ✅ Tests RLS client_instances : isolation opérateurs + client ne peut pas auto-graduer

### Code Review Fixes (Opus adversarial)
- **HIGH** : provision-instance déplacé de admin → CRM pour éliminer violation import inter-module + dépendance circulaire
- **HIGH** : ajout colonne `updated_at` + trigger `trg_client_instances_updated_at` sur `client_instances`
- **MEDIUM** : suppression `updated_at` redondants dans graduate-client.ts (DB trigger le gère)
- **MEDIUM** : suppression types morts `GraduationConditions` + Zod const `GraduationResult` inutilisé
- **MEDIUM** : commentaire ajouté pour clarifier que metadata overwrite est safe (instance vient d'être créée)

### File List
- `supabase/migrations/00051_graduation_client_instances.sql` (CRÉÉ)
- `packages/modules/crm/types/graduation.types.ts` (CRÉÉ)
- `packages/modules/crm/actions/graduate-client.ts` (CRÉÉ)
- `packages/modules/crm/actions/graduate-client.test.ts` (CRÉÉ)
- `packages/modules/crm/actions/migrate-lab-data.ts` (CRÉÉ)
- `packages/modules/crm/actions/migrate-lab-data.test.ts` (CRÉÉ)
- `packages/modules/crm/actions/get-client-pending-validations.ts` (CRÉÉ)
- `packages/modules/crm/actions/get-client-pending-validations.test.ts` (CRÉÉ)
- `packages/modules/crm/hooks/use-client-pending-validations.ts` (CRÉÉ)
- `packages/modules/crm/utils/provision-instance.ts` (CRÉÉ — déplacé depuis admin)
- `packages/modules/crm/utils/provision-instance.test.ts` (CRÉÉ — déplacé depuis admin)
- `packages/modules/crm/components/graduation-dialog.tsx` (CRÉÉ)
- `packages/modules/crm/components/graduation-dialog.test.tsx` (CRÉÉ)
- `packages/modules/crm/components/client-info-tab.tsx` (MODIFIÉ)
- `packages/modules/admin/manifest.ts` (CRÉÉ)
- `packages/modules/admin/index.ts` (CRÉÉ)
- `packages/modules/admin/docs/guide.md` (CRÉÉ)
- `packages/modules/admin/docs/faq.md` (CRÉÉ)
- `packages/modules/admin/docs/flows.md` (CRÉÉ)
- `tests/rls/client-instances-rls.test.ts` (CRÉÉ)

## Change Log
- 2026-03-04 : Story 9.1 implémentée — graduation Lab → One, module Admin stub, 30 tests
- 2026-03-04 : Code review adversarial Opus — 8 issues trouvées, 5 HIGH/MEDIUM corrigées
