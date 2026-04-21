# Story 14.1 : Onglet "Élio" dans la sidebar Hub

Status: done

## Story

En tant qu'**opérateur MiKL**,
je veux **un onglet "Élio" dédié dans la sidebar du Hub**,
afin d'**accéder à tout ce qui concerne les agents Élio (Lab, One, Hub) depuis un point central**.

## Acceptance Criteria

**Given** MiKL est connecté au Hub
**When** il regarde la sidebar
**Then** un nouvel onglet "Élio" est visible avec une icône dédiée (Bot ou Sparkles)

**Given** MiKL clique sur l'onglet "Élio"
**When** la page s'ouvre
**Then** trois sous-onglets sont affichés : "Élio Lab" / "Élio One" / "Élio Hub"

**Given** MiKL clique sur "Élio Lab"
**When** le contenu s'affiche
**Then** un placeholder "Catalogue d'agents — Story 14.2" est visible (page vide avec titre)

**Given** MiKL clique sur "Élio One" ou "Élio Hub"
**When** le contenu s'affiche
**Then** un placeholder "À venir" est visible (page vide avec titre)

## Tasks / Subtasks

- [ ] Task 1 — Route Hub (AC: #1, #2)
  - [ ] 1.1 Créer `apps/hub/app/(dashboard)/elio/page.tsx` — redirect vers `/elio/lab` par défaut
  - [ ] 1.2 Créer `apps/hub/app/(dashboard)/elio/lab/page.tsx` — placeholder
  - [ ] 1.3 Créer `apps/hub/app/(dashboard)/elio/one/page.tsx` — placeholder
  - [ ] 1.4 Créer `apps/hub/app/(dashboard)/elio/hub/page.tsx` — placeholder

- [ ] Task 2 — Sidebar (AC: #1)
  - [ ] 2.1 Ajouter l'item "Élio" dans la config de navigation de la sidebar Hub
  - [ ] 2.2 Icône : `Bot` ou `Sparkles` (lucide-react), couleur accent Hub cyan
  - [ ] 2.3 Sous-items : Élio Lab / Élio One / Élio Hub avec icônes distinctes

- [ ] Task 3 — Layout sous-onglets (AC: #2, #3, #4)
  - [ ] 3.1 Créer `apps/hub/app/(dashboard)/elio/layout.tsx` — tabs navigation Lab/One/Hub
  - [ ] 3.2 Style cohérent avec le design Hub (dark, compact, accent cyan)

- [ ] Task 4 — Tests
  - [ ] 4.1 Test de navigation entre les sous-onglets

## Dev Notes

- Aucune logique métier dans cette story — uniquement navigation et structure
- Les pages Lab/One/Hub seront remplies dans les stories suivantes
- Respecter le pattern de navigation existant du Hub (voir autres sections sidebar)
- Route : `/elio/lab`, `/elio/one`, `/elio/hub`

## File List

- `apps/hub/components/hub-sidebar-client.tsx` (modifié — icône Bot + item Élio)
- `apps/hub/components/hub-sidebar-client.test.tsx` (modifié — mock facturation + tests Élio)
- `apps/hub/app/(dashboard)/elio/page.tsx`
- `apps/hub/app/(dashboard)/elio/layout.tsx`
- `apps/hub/app/(dashboard)/elio/layout.test.tsx`
- `apps/hub/app/(dashboard)/elio/lab/page.tsx`
- `apps/hub/app/(dashboard)/elio/one/page.tsx`
- `apps/hub/app/(dashboard)/elio/hub/page.tsx`

## Completion Notes

Commit: `639da86` — 2026-04-21.
15 tests (11 sidebar + 4 layout), 8 fichiers, +141 lignes nettes.
Fix collatéral : mock manquant `usePendingRemindersCount` dans le test sidebar existant (pre-existing failure).
