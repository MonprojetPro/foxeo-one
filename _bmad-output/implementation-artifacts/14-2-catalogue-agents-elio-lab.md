# Story 14.2 : Catalogue d'Agents Élio Lab

Status: ready-for-dev

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

- [ ] Task 1 — Dossier agents + structure fichiers (AC: #1, #2)
  - [ ] 1.1 Créer `packages/modules/elio/agents/lab/` (dossier vide avec `.gitkeep`)
  - [ ] 1.2 Créer `packages/modules/elio/agents/one/` et `hub/` (vides)
  - [ ] 1.3 Créer un agent exemple `elio-exemple.md` dans `lab/` avec frontmatter complet

- [ ] Task 2 — Migration SQL `elio_lab_agents` (AC: #2, #4, #5)
  - [ ] 2.1 Créer migration `00097_create_elio_lab_agents.sql`
  - [ ] 2.2 Table : `id` (UUID PK), `name` (TEXT NOT NULL), `description` (TEXT), `model` (TEXT DEFAULT 'claude-sonnet-4-6'), `temperature` (NUMERIC DEFAULT 1.0), `image_path` (TEXT), `file_path` (TEXT NOT NULL UNIQUE), `system_prompt` (TEXT), `archived` (BOOLEAN DEFAULT false), `created_at`, `updated_at`
  - [ ] 2.3 RLS : `is_operator()` pour SELECT/INSERT/UPDATE/DELETE
  - [ ] 2.4 Trigger `trg_elio_lab_agents_updated_at`
  - [ ] 2.5 Migration de suppression de `elio_step_configs` (00096) — DROP TABLE CASCADE

- [ ] Task 3 — Server Actions (AC: #2, #4, #5)
  - [ ] 3.1 `packages/modules/elio/actions/sync-elio-lab-agents.ts` — lit les `.md` du dossier, parse frontmatter + body, UPSERT dans `elio_lab_agents`
  - [ ] 3.2 `packages/modules/elio/actions/get-elio-lab-agents.ts` — SELECT tous les agents (filtrable archived)
  - [ ] 3.3 `packages/modules/elio/actions/archive-elio-lab-agent.ts` — UPDATE archived=true
  - [ ] 3.4 `packages/modules/elio/actions/duplicate-elio-lab-agent.ts` — INSERT copie
  - [ ] 3.5 Tests co-localisés pour chaque action

- [ ] Task 4 — Composant carte agent (AC: #3)
  - [ ] 4.1 `packages/modules/elio/components/elio-lab-agent-card.tsx` — carte stylée dark Hub avec image, nom, description, modèle, température, badge, actions
  - [ ] 4.2 Images fox : répertoire `packages/ui/public/elio/agents/` — créer placeholder SVG si image absente
  - [ ] 4.3 Test du composant carte

- [ ] Task 5 — Page catalogue Hub (AC: #1, #2, #6)
  - [ ] 5.1 `apps/hub/app/(dashboard)/elio/lab/page.tsx` — grille de cartes + bouton "Synchroniser"
  - [ ] 5.2 État vide avec instructions skill-creator
  - [ ] 5.3 TanStack Query pour le chargement des agents

- [ ] Task 6 — Export module
  - [ ] 6.1 Mettre à jour `packages/modules/elio/index.ts` avec les nouveaux exports

## Dev Notes

### Parsing frontmatter
Utiliser `gray-matter` (déjà dans le projet ?) ou un parser YAML simple pour lire le frontmatter des `.md`. Le body après le frontmatter = `system_prompt`.

### Chemin des fichiers sur Vercel
`path.join(process.cwd(), 'packages/modules/elio/agents/lab/')` fonctionne dans les Server Actions Next.js car les fichiers sont bundlés avec le déploiement.

### Suppression elio_step_configs
La migration 00097 doit inclure `DROP TABLE IF EXISTS elio_step_configs CASCADE` avant de créer `elio_lab_agents`. Vérifier qu'aucune FK ne pointe vers cette table avant de dropper.

### Image fallback
Si `image_path` est null ou fichier absent → afficher un avatar générique renard (SVG placeholder).

### Architecture modules
Le module `elio` existe déjà (`packages/modules/elio/`). Ajouter les sous-dossiers `agents/` et les nouvelles actions sans casser l'existant.

## File List

*(auto-généré à la complétion)*
