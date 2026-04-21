# Story 14.2 : Catalogue d'Agents Élio Lab

Status: done

## Story

En tant qu'**opérateur MiKL**,
je veux **voir et gérer un catalogue d'agents Élio Lab dans le Hub**,
afin d'**avoir une vue centralisée de tous les agents disponibles pour composer les parcours clients**.

## Acceptance Criteria

**Given** MiKL est sur `/elio/lab`
**When** la page se charge
**Then** une grille de cartes stylées affiche les agents disponibles (lus depuis `packages/modules/elio/agents/lab/`)

**Given** un fichier agent `.md` existe dans `packages/modules/elio/agents/lab/`
**When** MiKL clique "Synchroniser les agents"
**Then** un UPSERT est effectué dans `elio_lab_agents` et la carte apparaît dans le catalogue

**Given** un agent est dans le catalogue
**When** sa carte s'affiche
**Then** on voit : image fox personnalisée, nom, description, modèle, température, badge statut (Actif/Archivé)

**Given** MiKL clique "Archiver" sur une carte
**When** la confirmation est validée
**Then** l'agent passe au statut `archived` et disparaît de la sélection lors de l'assemblage de parcours (mais reste visible dans le catalogue avec badge "Archivé")

**Given** MiKL clique "Dupliquer" sur une carte
**When** l'action est exécutée
**Then** une copie de l'entrée DB est créée avec le suffixe " (copie)" dans le nom

**Given** aucun agent n'existe encore
**When** la page s'affiche
**Then** un état vide avec instructions est affiché : "Créez votre premier agent Élio Lab avec le skill-creator dans Claude Code"

## Tasks / Subtasks

- [x] Task 1 — Dossier agents + structure fichiers (AC: #1, #2)
  - [x] 1.1 Créer `packages/modules/elio/agents/lab/` (dossier vide avec `.gitkeep`)
  - [x] 1.2 Créer `packages/modules/elio/agents/one/` et `hub/` (vides)
  - [x] 1.3 Créer un agent exemple `elio-exemple.md` dans `lab/` avec frontmatter complet

- [x] Task 2 — Migration SQL `elio_lab_agents` (AC: #2, #4, #5)
  - [x] 2.1 Créer migration `00097_create_elio_lab_agents.sql`
  - [x] 2.2 Table : `id` (UUID PK), `name` (TEXT NOT NULL), `description` (TEXT), `model` (TEXT DEFAULT 'claude-sonnet-4-6'), `temperature` (NUMERIC DEFAULT 1.0), `image_path` (TEXT), `file_path` (TEXT NOT NULL UNIQUE), `system_prompt` (TEXT), `archived` (BOOLEAN DEFAULT false), `created_at`, `updated_at`
  - [x] 2.3 RLS : `is_operator()` pour SELECT/INSERT/UPDATE/DELETE
  - [x] 2.4 Trigger `trg_elio_lab_agents_updated_at`
  - [x] 2.5 Migration de suppression de `elio_step_configs` (00096) — DROP TABLE CASCADE

- [x] Task 3 — Server Actions (AC: #2, #4, #5)
  - [x] 3.1 `packages/modules/elio/actions/sync-elio-lab-agents.ts` — lit les `.md` du dossier, parse frontmatter + body, UPSERT dans `elio_lab_agents`
  - [x] 3.2 `packages/modules/elio/actions/get-elio-lab-agents.ts` — SELECT tous les agents (filtrable archived)
  - [x] 3.3 `packages/modules/elio/actions/archive-elio-lab-agent.ts` — UPDATE archived=true
  - [x] 3.4 `packages/modules/elio/actions/duplicate-elio-lab-agent.ts` — INSERT copie
  - [x] 3.5 Tests co-localisés pour chaque action

- [x] Task 4 — Composant carte agent (AC: #3)
  - [x] 4.1 `packages/modules/elio/components/elio-lab-agent-card.tsx` — carte stylée dark Hub avec image, nom, description, modèle, température, badge, actions
  - [x] 4.2 Images fox : `apps/hub/public/elio/agents/fox-placeholder.svg` — SVG placeholder renard généré
  - [x] 4.3 Test du composant carte

- [x] Task 5 — Page catalogue Hub (AC: #1, #2, #6)
  - [x] 5.1 `apps/hub/app/(dashboard)/elio/lab/page.tsx` — grille de cartes + bouton "Synchroniser"
  - [x] 5.2 État vide avec instructions skill-creator
  - [x] 5.3 TanStack Query pour le chargement des agents

- [x] Task 6 — Export module
  - [x] 6.1 Mettre à jour `packages/modules/elio/index.ts` avec les nouveaux exports

## File List

**Créés :**
- `packages/modules/elio/agents/lab/.gitkeep`
- `packages/modules/elio/agents/lab/elio-exemple.md`
- `packages/modules/elio/agents/one/.gitkeep`
- `packages/modules/elio/agents/hub/.gitkeep`
- `supabase/migrations/00097_create_elio_lab_agents.sql`
- `packages/modules/elio/actions/sync-elio-lab-agents.ts`
- `packages/modules/elio/actions/sync-elio-lab-agents.test.ts`
- `packages/modules/elio/actions/get-elio-lab-agents.ts`
- `packages/modules/elio/actions/get-elio-lab-agents.test.ts`
- `packages/modules/elio/actions/archive-elio-lab-agent.ts`
- `packages/modules/elio/actions/archive-elio-lab-agent.test.ts`
- `packages/modules/elio/actions/duplicate-elio-lab-agent.ts`
- `packages/modules/elio/actions/duplicate-elio-lab-agent.test.ts`
- `packages/modules/elio/components/elio-lab-agent-card.tsx`
- `packages/modules/elio/components/elio-lab-agent-card.test.tsx`
- `packages/modules/elio/components/elio-lab-catalogue.tsx`
- `apps/hub/public/elio/agents/fox-placeholder.svg`
- `apps/hub/app/(dashboard)/elio/lab/loading.tsx`
- `apps/hub/app/(dashboard)/elio/lab/error.tsx`

**Modifiés :**
- `apps/hub/app/(dashboard)/elio/lab/page.tsx`
- `packages/modules/elio/index.ts`
- `apps/hub/package.json`

## Completion Notes

- Parser frontmatter YAML artisanal (pas de gray-matter — absent du projet)
- Validation Zod sur `model` et `temperature` avant UPSERT
- Validation nom de fichier (H1 security) contre path traversal
- Archive avec `.select().single()` pour détecter les agents inexistants (H2)
- Fallback image via React state `imgError` (M2)
- `crypto.randomUUID()` pour les copies (M3)
- loading.tsx + error.tsx ajoutés (M4)
- `@monprojetpro/module-elio` ajouté aux deps Hub
