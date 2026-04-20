# Story 14.1: Config Élio par étape (table & CRUD Hub)

Status: ready-for-dev

## Story

As a **opérateur MiKL depuis le Hub**,
I want **configurer un Élio différent pour chaque étape du parcours (persona, system prompt, modèle, température)**,
so that **chaque étape bénéficie d'un agent Élio spécialisé dans la thématique de l'étape (identité visuelle, business plan, pricing, etc.)**.

## Acceptance Criteria

**Given** MiKL accède à la fiche client > onglet Parcours dans le Hub
**When** il clique sur "Configurer Élio" sur une étape
**Then** un panneau s'ouvre avec les champs : persona_name, persona_description, system_prompt_override, model, temperature, max_tokens, custom_instructions — pré-remplis avec les valeurs par défaut

**Given** MiKL remplit le formulaire et sauvegarde
**When** la config est enregistrée
**Then** un INSERT ou UPDATE est effectué dans `elio_step_configs` (UPSERT sur step_id unique) et un toast succès s'affiche

**Given** MiKL ouvre la config d'une étape déjà configurée
**When** le panneau s'ouvre
**Then** les valeurs existantes sont chargées depuis `elio_step_configs`

**Given** aucune `elio_step_configs` n'existe pour une étape
**When** le chat Élio de l'étape est utilisé côté client (Story 14.2)
**Then** le fallback utilise `elio_configs` global du client

**Given** un utilisateur non-opérateur tente d'accéder à `elio_step_configs`
**When** une requête SELECT/INSERT/UPDATE/DELETE est effectuée
**Then** RLS bloque (policies `is_operator()` uniquement)

## Tasks / Subtasks

- [ ] Task 1 — Migration SQL `elio_step_configs` (AC: #1, #4, #5)
  - [ ] 1.1 Créer migration `00096_create_elio_step_configs.sql`
  - [ ] 1.2 Table avec colonnes : id (UUID PK DEFAULT gen_random_uuid()), step_id (UUID FK parcours_steps UNIQUE NOT NULL), persona_name (TEXT DEFAULT 'Élio'), persona_description (TEXT), system_prompt_override (TEXT), model (TEXT DEFAULT 'claude-sonnet-4-6'), temperature (NUMERIC DEFAULT 1.0 CHECK 0-2), max_tokens (INTEGER DEFAULT 2000 CHECK 100-8000), custom_instructions (TEXT), created_at, updated_at
  - [ ] 1.3 RLS policies : `elio_step_configs_select_operator` (SELECT, is_operator()), `elio_step_configs_insert_operator` (INSERT, is_operator()), `elio_step_configs_update_operator` (UPDATE, is_operator()), `elio_step_configs_delete_operator` (DELETE, is_operator())
  - [ ] 1.4 Trigger `trg_elio_step_configs_updated_at` sur `fn_update_updated_at()`
  - [ ] 1.5 Index : `idx_elio_step_configs_step_id` sur step_id (déjà UNIQUE mais explicite)

- [ ] Task 2 — Types TypeScript (AC: #1, #4)
  - [ ] 2.1 Ajouter `ElioStepConfigDB` et `ElioStepConfig` dans `packages/modules/parcours/types/parcours.types.ts`
  - [ ] 2.2 Ajouter schéma Zod `UpsertElioStepConfigInput`

- [ ] Task 3 — Server Actions Hub (AC: #2, #3, #4)
  - [ ] 3.1 Créer `packages/modules/parcours/actions/get-step-elio-config.ts` — SELECT elio_step_configs WHERE step_id
  - [ ] 3.2 Créer `packages/modules/parcours/actions/upsert-step-elio-config.ts` — UPSERT (INSERT ON CONFLICT step_id DO UPDATE)
  - [ ] 3.3 Tests co-localisés pour les 2 actions

- [ ] Task 4 — Composant UI Hub (AC: #1, #2, #3)
  - [ ] 4.1 Créer `packages/modules/parcours/components/step-elio-config-panel.tsx` — formulaire complet avec tous les champs
  - [ ] 4.2 Intégrer dans la page parcours Hub (bouton "Configurer Élio" par étape)
  - [ ] 4.3 Test du composant panel

- [ ] Task 5 — Helper fallback (AC: #4)
  - [ ] 5.1 Créer `packages/modules/parcours/actions/get-effective-elio-config.ts` — retourne elio_step_configs si existe, sinon elio_configs global
  - [ ] 5.2 Test du fallback

## Dev Notes

### Architecture — Règles critiques

- Server Actions pattern `{ data, error }` — JAMAIS throw
- Imports UI depuis `@monprojetpro/ui` (Button, Input, etc.)
- UPSERT via `.upsert({ onConflict: 'step_id' })` Supabase
- Le panneau config est un composant côté Hub uniquement (pas visible côté client)
- `getEffectiveElioConfig(stepId, clientId)` est la seule fonction que le chat client appellera (Story 14.2)

### Base de données

```sql
-- Migration 00096_create_elio_step_configs.sql

CREATE TABLE elio_step_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  step_id UUID NOT NULL UNIQUE REFERENCES parcours_steps(id) ON DELETE CASCADE,
  persona_name TEXT NOT NULL DEFAULT 'Élio',
  persona_description TEXT,
  system_prompt_override TEXT,
  model TEXT NOT NULL DEFAULT 'claude-sonnet-4-6',
  temperature NUMERIC NOT NULL DEFAULT 1.0 CHECK (temperature >= 0 AND temperature <= 2),
  max_tokens INTEGER NOT NULL DEFAULT 2000 CHECK (max_tokens >= 100 AND max_tokens <= 8000),
  custom_instructions TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE elio_step_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY elio_step_configs_select_operator ON elio_step_configs
  FOR SELECT USING (is_operator());
CREATE POLICY elio_step_configs_insert_operator ON elio_step_configs
  FOR INSERT WITH CHECK (is_operator());
CREATE POLICY elio_step_configs_update_operator ON elio_step_configs
  FOR UPDATE USING (is_operator());
CREATE POLICY elio_step_configs_delete_operator ON elio_step_configs
  FOR DELETE USING (is_operator());

CREATE TRIGGER trg_elio_step_configs_updated_at
  BEFORE UPDATE ON elio_step_configs
  FOR EACH ROW EXECUTE FUNCTION fn_update_updated_at();

CREATE INDEX idx_elio_step_configs_step_id ON elio_step_configs(step_id);
```

### Fichiers à créer / modifier

```
supabase/migrations/00096_create_elio_step_configs.sql           # CRÉER

packages/modules/parcours/types/parcours.types.ts                # MODIFIER — ajouter ElioStepConfig types + Zod
packages/modules/parcours/actions/get-step-elio-config.ts        # CRÉER
packages/modules/parcours/actions/get-step-elio-config.test.ts   # CRÉER
packages/modules/parcours/actions/upsert-step-elio-config.ts     # CRÉER
packages/modules/parcours/actions/upsert-step-elio-config.test.ts # CRÉER
packages/modules/parcours/actions/get-effective-elio-config.ts   # CRÉER
packages/modules/parcours/actions/get-effective-elio-config.test.ts # CRÉER
packages/modules/parcours/components/step-elio-config-panel.tsx  # CRÉER
packages/modules/parcours/components/step-elio-config-panel.test.tsx # CRÉER
```

## File List (auto-generated at completion)

## Completion Notes
