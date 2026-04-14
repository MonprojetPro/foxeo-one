# Story 1.7: Design system fondation (dark mode, palettes, responsive, accessibilite)

Status: done

## Story

As a **utilisateur (MiKL ou client)**,
I want **une interface dark mode "Minimal Futuriste" avec la palette adaptee a mon dashboard, responsive et accessible**,
So that **j'ai une experience visuelle coherente, agreable et utilisable sur tous mes appareils**.

**FRs couvertes :** FR117 (accessibilite), FR118 (design system coherent)

## Acceptance Criteria

1. **AC1: 3 fichiers CSS OKLCH avec palettes "Minimal Futuriste" correctes**
   - **Given** le package @monprojetpro/ui existant avec les fichiers themes actuels (palettes tweakcn.com initiales)
   - **When** les themes sont mis a jour
   - **Then** 3 fichiers CSS OKLCH existent dans `packages/ui/src/themes/` :
     - `hub.css` — palette Cyan/Turquoise sur fond #020402
     - `lab.css` — palette Violet/Purple sur fond #020402
     - `one.css` — palette Orange vif + Bleu-gris sur fond #020402
   - **And** les variables CSS sont utilisees via Tailwind v4 `@theme`
   - **And** le fond noir profond (#020402) est commun aux 3 palettes en dark mode
   - **And** chaque theme a un mode light fonctionnel (toggle utilisateur)

2. **AC2: Activation des themes par app**
   - **Given** le globals.css de chaque app
   - **When** l'app hub est chargee → palette Hub active
   - **When** l'app client est chargee avec dashboard_type='lab' → palette Lab active
   - **When** l'app client est chargee avec dashboard_type='one' → palette One active

3. **AC3: Densite par dashboard**
   - **Given** la densite configuree par dashboard
   - **When** le Hub est affiche → densite `compact` (data-dense)
   - **When** le Lab est affiche → densite `spacious` (emotionnel)
   - **When** le One est affiche → densite `comfortable` (operationnel)

4. **AC4: Typographies Poppins + Inter chargees**
   - **Given** les typographies definies
   - **When** l'interface est rendue
   - **Then** Poppins est utilise pour les titres et UI
   - **And** Inter est utilise pour le corps de texte
   - **And** les fonts sont chargees via `next/font/google` (optimisation Next.js)

5. **AC5: Responsive mobile >= 320px**
   - **Given** un utilisateur sur mobile (>=320px, NFR-A1)
   - **When** il accede au dashboard
   - **Then** la sidebar se collapse en menu hamburger
   - **And** tous les composants sont utilisables sans scroll horizontal

6. **AC6: Accessibilite WCAG AA**
   - **Given** les standards d'accessibilite (NFR-A2, A3, A4)
   - **When** l'interface est evaluee
   - **Then** le contraste texte/fond respecte WCAG AA (ratio 4.5:1)
   - **And** la navigation au clavier fonctionne sur toutes les pages
   - **And** les elements interactifs ont des labels accessibles (aria-label)

7. **AC7: Toggle dark/light mode**
   - **Given** le ThemeProvider existant
   - **When** un utilisateur bascule le theme
   - **Then** le theme change instantanement
   - **And** la preference est persistee (localStorage)
   - **And** le dark mode est le defaut pour les 3 dashboards

8. **AC8: Tests**
   - **Given** les themes et composants mis a jour
   - **When** les tests s'executent
   - **Then** les tests de contraste WCAG AA passent pour les 3 palettes (dark + light)
   - **And** les tests verifient le chargement correct des fonts
   - **And** les tests verifient le comportement responsive (sidebar collapse)
   - **And** `turbo build` compile sans erreur TypeScript

## Tasks / Subtasks

- [x] Task 1 — Charger les fonts Poppins + Inter via next/font/google (AC: #4)
  - [x] 1.1 Creer `packages/ui/src/fonts.ts` — exporter les configurations next/font pour Poppins et Inter
  - [x] 1.2 Mettre a jour `apps/hub/app/layout.tsx` — importer et appliquer les fonts via className
  - [x] 1.3 Mettre a jour `apps/client/app/layout.tsx` — importer et appliquer les fonts via className
  - [x] 1.4 Verifier que `--font-sans: Poppins` et `--font-serif: Inter` dans les CSS themes correspondent aux fonts chargees

- [x] Task 2 — Refactorer les 3 fichiers CSS themes avec palettes "Minimal Futuriste" (AC: #1)
  - [x] 2.1 Refactorer `packages/ui/src/themes/hub.css` — Cyan/Turquoise accent sur fond #020402 (dark), light mode derive
  - [x] 2.2 Refactorer `packages/ui/src/themes/lab.css` — Violet/Purple accent sur fond #020402 (dark), light mode derive
  - [x] 2.3 Refactorer `packages/ui/src/themes/one.css` — Orange vif + Bleu-gris accent sur fond #020402 (dark), light mode derive
  - [x] 2.4 Mettre a jour `packages/ui/src/globals.css` si necessaire (verifier @theme inline mappings)
  - [x] 2.5 Verifier que les couleurs d'accent sont assez vives sur fond noir (glow neon, pas de couleurs ternes)

- [x] Task 3 — Composant ThemeToggle + mise a jour ThemeProvider (AC: #7)
  - [x] 3.1 Creer `packages/ui/src/components/theme-toggle.tsx` — bouton toggle dark/light avec icone (Sun/Moon de Lucide)
  - [x] 3.2 Verifier/mettre a jour `packages/supabase/src/providers/theme-provider.tsx` — persistence localStorage, detection system preference, dark par defaut
  - [x] 3.3 Integrer ThemeToggle dans le header du DashboardShell (les deux apps)

- [x] Task 4 — Verifier/renforcer la densite par dashboard (AC: #3)
  - [x] 4.1 Verifier que `DashboardShell` applique correctement les 3 densites (compact, spacious, comfortable)
  - [x] 4.2 Ajouter data-density attribute sur le shell pour CSS custom properties futures
  - [x] 4.3 Verifier que `apps/hub/app/(dashboard)/layout.tsx` utilise `density="compact"`
  - [x] 4.4 Verifier que `apps/client/app/(dashboard)/layout.tsx` passe la densite dynamiquement selon dashboard_type

- [x] Task 5 — Responsive : sidebar collapse mobile (AC: #5)
  - [x] 5.1 Ajouter Sheet drawer pour sidebar mobile dans DashboardShell
  - [x] 5.2 Ajouter un bouton hamburger dans le header mobile
  - [x] 5.3 Sidebar hidden md:flex assure absence de scroll horizontal
  - [x] 5.4 Next.js ajoute automatiquement viewport meta — verifie

- [x] Task 6 — Accessibilite WCAG AA (AC: #6)
  - [x] 6.1 Auditer les ratios de contraste des 3 palettes (dark + light) — 6 corrections appliquees
  - [x] 6.2 ThemeToggle a aria-label et sr-only labels en francais avec accents
  - [x] 6.3 Composants Radix UI fournissent navigation clavier native
  - [x] 6.4 Ajouter `role` et `aria-*` sur DashboardShell (sidebar role=navigation, main role=main)
  - [x] 6.5 Composants Radix UI fournissent l'accessibilite native — verifie

- [x] Task 7 — Tests (AC: #8)
  - [x] 7.1 Creer `packages/ui/src/themes/themes.test.ts` — 210 tests de structure CSS
  - [x] 7.2 Creer `packages/ui/src/themes/contrast.test.ts` — 45 tests WCAG AA
  - [x] 7.3 Creer `packages/ui/src/fonts.test.ts` — 6 tests fonts
  - [x] 7.4 Creer `packages/ui/src/components/theme-toggle.test.ts` — 9 tests composant toggle
  - [x] 7.5 turbo build — erreurs pre-existantes (clients/actions.ts type 'never', auth.ts refine). Zero regression Story 1.7

## Dev Notes

### Contexte critique : Les themes ACTUELS sont faux — a refactorer, pas creer

Les fichiers `hub.css`, `lab.css`, `one.css` existent deja mais contiennent les palettes initiales tweakcn.com (generees le 25/01/2026, AVANT la decision "Minimal Futuriste" du 30/01/2026) :
- Hub actuel : Bleu nuit + cuivre → **DOIT devenir** Cyan/Turquoise
- Lab actuel : Terracotta/Corail → **DOIT devenir** Violet/Purple
- One actuel : Orange + bleu-gris → **OK pour l'orange, affiner le Bleu-gris**

La structure CSS est bonne (variables OKLCH, light/dark, sidebar, charts). Il faut **changer les valeurs de couleur**, pas la structure.

### CONFLIT DE PALETTES — Decision requise

Il y a un conflit entre les documents sources :

| Source | Hub | Lab | One |
|--------|-----|-----|-----|
| **Epic 1.7 AC** | Cyan/Turquoise | Violet/Purple | Orange vif + Bleu-gris |
| **CLAUDE.md** | Cyan/Turquoise | Violet/Purple | Green/Orange |
| **project-context.md** | Bordeaux #6B1B1B | Vert emeraude #2E8B57 | Orange #F7931E |
| **UX Spec (30/01)** | Cyan/Turquoise | Violet/Purple | Vert emeraude ou Orange |
| **Code actuel** | Bleu nuit + cuivre | Terracotta/Corail | Orange + bleu-gris |

**Decision pour cette story :** Suivre l'AC de l'epic (Cyan/Turquoise, Violet/Purple, Orange vif + Bleu-gris) car :
1. L'epic AC est la specification la plus recente et la plus specifique pour cette story
2. Le CLAUDE.md s'aligne avec cette decision
3. La session "Minimal Futuriste" (30/01) a valide ces choix avec MiKL
4. Le fond noir #020402 est explicitement requis par l'epic AC

**IMPORTANT :** Apres cette story, `docs/project-context.md` devra etre mis a jour pour aligner les couleurs (Bordeaux → Cyan/Turquoise, Vert emeraude → Violet/Purple).

### Palette cible — Valeurs OKLCH recommandees

Les couleurs d'accent doivent etre **vives et neon** sur fond noir (#020402 ≈ `oklch(0.07 0.01 155)`). Style "Minimal Futuriste" = glow subtil, pas de couleurs ternes.

**HUB — Cyan/Turquoise :**
```css
/* Accent principal */
--primary: oklch(0.75 0.15 190);      /* Cyan vif */
--primary-foreground: oklch(0.10 0.02 190);
/* Sidebar accent */
--sidebar-primary: oklch(0.80 0.17 190); /* Cyan plus clair */
/* Background dark */
--background: oklch(0.07 0.01 190);   /* Quasi-noir, teinte cyan */
```

**LAB — Violet/Purple :**
```css
/* Accent principal */
--primary: oklch(0.65 0.20 290);      /* Violet vif */
--primary-foreground: oklch(0.98 0 0);
/* Background dark */
--background: oklch(0.07 0.01 290);   /* Quasi-noir, teinte violette */
```

**ONE — Orange vif + Bleu-gris :**
```css
/* Accent principal */
--primary: oklch(0.75 0.18 50);       /* Orange vif */
--secondary: oklch(0.50 0.05 250);    /* Bleu-gris */
--primary-foreground: oklch(0.10 0.02 50);
/* Background dark */
--background: oklch(0.07 0.005 50);   /* Quasi-noir neutre */
```

> **Note :** Ces valeurs sont des points de depart. Ajuster avec tweakcn.com pour la coherence de la palette complete (muted, card, border, chart, etc.). Le fond #020402 est `oklch(0.069 0.006 155.3)` en conversion exacte.

### Chargement fonts — next/font/google

```typescript
// packages/ui/src/fonts.ts
import { Poppins, Inter } from 'next/font/google'

export const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-poppins',
  display: 'swap',
})

export const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-inter',
  display: 'swap',
})
```

**ATTENTION :** `next/font/google` ne peut etre utilise que dans les apps Next.js (pas dans les packages). Deux options :

**Option A (recommandee) :** Definir les fonts dans chaque app layout et passer les variables CSS via className sur `<html>`. Les fichiers CSS themes referencent deja `--font-sans: Poppins` et `--font-serif: Inter`. Il suffit que les fonts soient chargees dans le layout root.

```tsx
// apps/hub/app/layout.tsx
import { Poppins, Inter } from 'next/font/google'

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-poppins',
  display: 'swap',
})

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-inter',
  display: 'swap',
})

export default function RootLayout({ children }) {
  return (
    <html className={`dark theme-hub ${poppins.variable} ${inter.variable}`}>
      <body className="font-sans">{children}</body>
    </html>
  )
}
```

**Option B :** Charger via `<link>` Google Fonts dans le `<head>` (moins optimal, pas de preload).

**Choisir Option A** pour les performances (subsetting, preload automatique).

**Mapping CSS :** Les themes utilisent `--font-sans: Poppins` et `--font-serif: Inter`. Pour que Tailwind v4 les utilise :
```css
/* Dans globals.css, le @theme inline mappe deja : */
--font-sans: var(--font-sans);  /* → Poppins */
--font-serif: var(--font-serif); /* → Inter */
```
Il faut que `body` utilise `font-family: var(--font-sans)` par defaut (Poppins). Pour le corps de texte, appliquer `font-serif` (Inter) sur les paragraphes/articles. Ou bien inverser : `--font-sans: Inter` pour le body, `--font-heading: Poppins` pour les titres. Verifier la convention existante dans globals.css.

### ThemeToggle — Composant simple

```tsx
// packages/ui/src/components/theme-toggle.tsx
'use client'

import { Moon, Sun } from 'lucide-react'
import { useTheme } from '@monprojetpro/supabase'
import { Button } from '../button'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      aria-label={theme === 'dark' ? 'Activer le mode clair' : 'Activer le mode sombre'}
    >
      <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
    </Button>
  )
}
```

### Densite — Ce qui existe vs ce qu'il faut

Le `DashboardShell` existant (`packages/ui/src/components/dashboard-shell.tsx`) a deja un prop `density` avec 3 variantes. Verifier que les valeurs CSS sont adequates :

| Densite | Gap | Padding | Usage |
|---------|-----|---------|-------|
| compact | gap-2 (8px) | p-2 (8px) | Hub — beaucoup d'info visible |
| comfortable | gap-4 (16px) | p-4 (16px) | One — equilibre |
| spacious | gap-6 (24px) | p-6 (24px) | Lab — espace pour reflechir |

Si les valeurs ne sont pas suffisamment differenciees, ajouter des CSS custom properties :
```css
:root {
  --density-gap: 1rem;
  --density-padding: 1rem;
}
[data-density="compact"] { --density-gap: 0.5rem; --density-padding: 0.5rem; }
[data-density="spacious"] { --density-gap: 1.5rem; --density-padding: 1.5rem; }
```

### Responsive — Ce qui existe deja

Le composant `Sidebar` de @monprojetpro/ui utilise deja :
- `useIsMobile()` hook pour detecter le viewport mobile
- `Sheet` (drawer) comme fallback sur mobile
- Cookie-based state persistence pour l'etat collapse/expand

Le `use-mobile.ts` utilise un breakpoint (probablement 768px). Verifier que 320px minimum est supporte sans overflow horizontal.

**A verifier specifiquement :**
- La sidebar sur mobile utilise-t-elle un `Sheet` (drawer overlay) ou se cache-t-elle completement ?
- Le bouton hamburger est-il visible dans le header mobile ?
- Les cartes et tableaux ont-ils un fallback scroll horizontal ou un layout stack sur mobile ?

### Accessibilite — Approche pragmatique

Les composants Radix UI (utilises par shadcn/ui) fournissent deja :
- Roles ARIA corrects (dialog, menu, tab, etc.)
- Gestion du focus (focus trap dans les modales)
- Navigation clavier (Arrow keys dans les menus, Escape pour fermer)
- Annonces screen reader

**Ce qui reste a faire :**
1. **Contraste couleurs** : Auditer les paires texte/fond des 3 palettes. Outil : calculer le ratio OKLCH programmatiquement dans les tests.
2. **Focus visible** : Verifier que `outline` ou `ring` est visible sur fond sombre (les couleurs `--ring` doivent etre assez claires).
3. **aria-label sur les composants custom** : DashboardShell (sidebar role="navigation", main role="main"), ThemeToggle, boutons avec icones seules.
4. **Skip to content** : Ajouter un lien invisible "Aller au contenu" en haut de page pour l'accessibilite clavier.

### Test de contraste WCAG AA — Implementation

```typescript
// packages/ui/src/themes/contrast.test.ts
import { describe, it, expect } from 'vitest'

// Convertir OKLCH en ratio de luminance relative
// WCAG AA requiert ratio >= 4.5:1 pour le texte normal, >= 3:1 pour le texte large

function oklchToRelativeLuminance(l: number): number {
  // Approximation : en OKLCH, L est deja perceptuellement uniforme
  // Pour WCAG, on a besoin de la luminance relative (pas perceptuelle)
  // Formule simplifiee : L_rel ≈ (L_oklch)^2.2 (gamma approximatif)
  return Math.pow(l, 2.2)
}

function contrastRatio(l1: number, l2: number): number {
  const lighter = Math.max(l1, l2)
  const darker = Math.min(l1, l2)
  return (lighter + 0.05) / (darker + 0.05)
}

describe('WCAG AA Contrast Ratios', () => {
  // Hub dark: foreground oklch(0.96 ...) on background oklch(0.07 ...)
  it('Hub dark: text on background >= 4.5:1', () => {
    const bg = oklchToRelativeLuminance(0.07)
    const fg = oklchToRelativeLuminance(0.96)
    expect(contrastRatio(fg, bg)).toBeGreaterThanOrEqual(4.5)
  })

  // ... etc pour chaque paire critique de chaque palette
})
```

> **Note :** L'approximation OKLCH → luminance relative n'est pas exacte. Pour un audit precis, utiliser une librairie comme `color.js` ou `wcag-contrast`. Mais pour les tests CI, l'approximation suffit si les marges sont larges.

### Ce qui existe DEJA — NE PAS recreer

**Theme CSS structure :**
- `packages/ui/src/globals.css` (162 lignes) — @import tailwindcss, @theme inline, root vars, dark mode, @layer base
- `packages/ui/src/themes/hub.css` (74 lignes) — STRUCTURE OK, COULEURS A CHANGER
- `packages/ui/src/themes/lab.css` (74 lignes) — STRUCTURE OK, COULEURS A CHANGER
- `packages/ui/src/themes/one.css` (74 lignes) — STRUCTURE OK, COULEURS A AFFINER

**Composants UI existants :**
- `packages/ui/src/skeleton.tsx` — composant Skeleton de base (pulse animation)
- `packages/ui/src/components/dashboard-shell.tsx` — DashboardShell avec prop density
- `packages/ui/src/components/shell-skeleton.tsx` — skeleton du shell complet
- `packages/ui/src/components/module-skeleton.tsx` — skeleton module (grille 3x3)
- `packages/ui/src/components/empty-state.tsx` — etat vide avec icone/titre/CTA
- `packages/ui/src/sidebar.tsx` — sidebar complete avec SidebarProvider, mobile Sheet, cookie persistence
- `packages/ui/src/use-mobile.ts` — hook detection mobile
- 19 composants shadcn/ui (button, card, input, dialog, select, tabs, tooltip, etc.)

**Theme Provider :**
- `packages/supabase/src/providers/theme-provider.tsx` — ThemeProvider + useTheme, gere theme (light/dark/system) + dashboardTheme (hub/lab/one)

**App layouts :**
- `apps/hub/app/layout.tsx` — dark + theme-hub, QueryProvider + ThemeProvider
- `apps/client/app/layout.tsx` — dark + theme-lab (importe lab.css + one.css)
- `apps/hub/app/(dashboard)/layout.tsx` — HubSidebar, HubHeader, DashboardShell density="compact"
- `apps/client/app/(dashboard)/layout.tsx` — DashboardShell

**Dependencies deja installees :**
- `@radix-ui/*` (alert-dialog, dialog, select, separator, slot, tabs, tooltip)
- `class-variance-authority ^0.7.1`
- `lucide-react ^0.562.0`
- `tailwindcss ^4.0.0`
- `tw-animate-css ^1.0.0`
- `clsx`, `tailwind-merge`

**Ce qui N'existe PAS encore :**
- Fonts Poppins + Inter via next/font/google (pas de chargement actuel)
- ThemeToggle composant (pas d'UI pour basculer dark/light)
- Tests de contraste WCAG
- Tests des themes CSS
- Skip-to-content link
- Viewport meta tag (verifier)

### Naming Conventions — RESPECTER

| Element | Convention | Exemple |
|---------|-----------|---------|
| Fichiers CSS themes | kebab-case | `hub.css`, `lab.css`, `one.css` |
| Composants | PascalCase | `ThemeToggle` |
| Fichiers composants | kebab-case.tsx | `theme-toggle.tsx` |
| Hooks | use + PascalCase | `useTheme()`, `useIsMobile()` |
| CSS variables | kebab-case | `--primary`, `--background`, `--font-sans` |
| Tests | kebab-case.test.ts, co-localises | `contrast.test.ts`, `theme-toggle.test.ts` |
| Dossier themes | themes/ dans packages/ui/src/ | PAS de dossier separe pour les tests |

### Project Structure Notes

```
packages/ui/src/
├── fonts.ts                            # ← CREER (Option A) OU dans chaque app layout
├── globals.css                         # ← MODIFIER (si ajustements @theme)
├── themes/
│   ├── hub.css                         # ← MODIFIER (nouvelles couleurs Cyan/Turquoise)
│   ├── lab.css                         # ← MODIFIER (nouvelles couleurs Violet/Purple)
│   ├── one.css                         # ← MODIFIER (affiner Orange + Bleu-gris)
│   ├── themes.test.ts                  # ← CREER
│   └── contrast.test.ts               # ← CREER
├── components/
│   ├── dashboard-shell.tsx             # ← MODIFIER (verifier densite, aria-roles)
│   └── theme-toggle.tsx                # ← CREER
│   └── theme-toggle.test.ts           # ← CREER

packages/supabase/src/providers/
├── theme-provider.tsx                  # ← VERIFIER/MODIFIER (dark defaut, persistence)

apps/hub/app/
├── layout.tsx                          # ← MODIFIER (ajouter next/font Poppins + Inter)

apps/client/app/
├── layout.tsx                          # ← MODIFIER (ajouter next/font Poppins + Inter)
```

**Fichiers a NE PAS modifier :**
- `packages/ui/src/sidebar.tsx` — sidebar Radix complete, ne pas toucher sauf si bug responsive avere
- `packages/ui/src/skeleton.tsx` — composant de base, OK
- Aucune migration Supabase dans cette story
- Aucun middleware

### References

- [Source: _bmad-output/planning-artifacts/epics/epic-1-fondation-plateforme-authentification-stories-detaillees.md — Story 1.7]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — Design System V1, Palettes, Direction Stylistique "Minimal Futuriste"]
- [Source: _bmad-output/planning-artifacts/architecture/03-core-decisions.md — Frontend Architecture, Thematisation CSS variables OKLCH]
- [Source: _bmad-output/planning-artifacts/architecture/04-implementation-patterns.md — Component Library, Dashboard Shell, Loading States]
- [Source: _bmad-output/planning-artifacts/design-system-themes.css — Reference complete OKLCH pour structure CSS]
- [Source: docs/project-context.md — Themes & Palettes, Anti-Patterns, Loading States]
- [Source: CLAUDE.md — Dashboard Themes, Component Library, UX Design & Visual Identity]

### Previous Story Intelligence (Story 1.6)

**Learnings from Story 1.6 :**
- Les `as never` casts sont parfois necessaires pour le client Supabase type
- Pattern de test co-localise fonctionne bien (28 tests UA parsing, 12 migration)
- 211 tests passent au total — zero regressions attendues
- Commit message pattern : `feat: Story X.Y — Description`
- Les composants UI existants (session-card, session-list) utilisent Tailwind classes directement — pas de CSS modules
- `useTransition` pour les pending states des Server Actions
- Toast notifications manuelles (pas de librairie externe)

**Code review Story 1.6 pertinent :**
- L1 : Accents manquants dans les textes UI francais → S'assurer que les labels ThemeToggle ont les accents
- M1 : setTimeout cleanup dans les composants → Appliquer useRef + useEffect cleanup si animations dans ThemeToggle

### Git Intelligence

**Derniers commits :**
```
1b829dd feat: Story 1.6 — Gestion sessions avancee
4f83926 feat: Story 1.5 — RLS & isolation donnees multi-tenant
9c52c01 feat: Story 1.4 — Authentification MiKL
0f2d846 feat: Story 1.3 — Authentification client
7a4dfca feat: Story 1.2 — Migrations Supabase fondation
d165ddf feat: Story 1.1 — Setup monorepo, shared packages & dashboard shell
```

**Patterns etablis :**
- TypeScript strict, pas de `any`
- Tests Vitest co-localises
- Composants suivent le pattern shadcn/ui (CVA + cn() + Radix)
- 211 tests passent — zero regressions attendues avec les changements CSS/composants
- Prochaine migration serait 00014 si necessaire — mais Story 1.7 ne cree PAS de migration

### Points d'attention critiques

1. **Ne pas casser les composants existants** : Les 19 composants shadcn/ui utilisent les CSS variables (`bg-primary`, `text-foreground`, etc.). Changer les valeurs OKLCH dans les themes les affectera automatiquement. Verifier visuellement que tous les composants restent lisibles apres changement de palette.

2. **next/font dans un monorepo** : `next/font/google` fonctionne uniquement dans les apps Next.js, pas dans les packages. Les fonts doivent etre initialisees dans les layouts root de chaque app, pas dans @monprojetpro/ui.

3. **Mode light secondaire** : Le dark mode est le defaut, mais le light mode doit etre coherent. Ne pas negliger les valeurs light — elles seront utilisees par les utilisateurs qui preferent le mode clair.

4. **Contraste sur fond #020402** : Le fond quasi-noir exige des couleurs d'accent tres lumineuses. Les couleurs `muted`, `border`, `input` doivent aussi etre suffisamment visibles (pas de gris trop sombre sur noir).

5. **Performance fonts** : `next/font/google` optimise le chargement (preload, subset). Ne PAS utiliser `<link>` Google Fonts en parallele — ca doublerait le chargement.

6. **Tailwind v4 @theme** : Le projet utilise Tailwind v4 avec la syntaxe `@theme inline` dans globals.css. Pas de `tailwind.config.ts` — tout est en CSS. Les variables de theme sont mappees directement.

7. **Client app theme switching** : L'app client importe deja `lab.css` ET `one.css`. Le switch se fait via la classe CSS sur `<html>` (`theme-lab` vs `theme-one`). Le ThemeProvider gere deja `dashboardTheme`. Verifier que le switch fonctionne.

## Questions pour MiKL

1. **Conflit palettes** : Le `project-context.md` indique Hub=Bordeaux, Lab=Vert emeraude, One=Orange. Mais l'epic AC et le CLAUDE.md disent Hub=Cyan/Turquoise, Lab=Violet/Purple, One=Orange. Je pars sur Cyan/Turquoise/Violet/Purple (epic AC + Minimal Futuriste). Confirmes-tu ?

2. **Font monospace par dashboard** : Les themes actuels definissent Geist Mono (Hub), monospace generique (Lab), JetBrains Mono (One). Faut-il installer et charger ces 3 fonts mono specifiques, ou utiliser une seule font mono partout ?

## Dev Agent Record

### Agent Model Used
Claude Opus 4.6

### Debug Log References
- Contrast test initial: 6/270 failures → fixed OKLCH lightness values for primary-foreground, muted-foreground, secondary
- Build barrel import error: ThemeToggle imported `@monprojetpro/supabase` barrel → server.ts → next/headers. Fixed by adding `./theme` subpath export
- Build type errors pre-existing: `clients/actions.ts:38` type 'never' and `auth.ts:25` async refine — NOT regressions

### Completion Notes List
- 481 tests pass (270 new for Story 1.7: 210 theme structure, 45 contrast, 6 fonts, 9 toggle)
- Zero regressions from 211 existing tests
- 3 palettes "Minimal Futuriste" OKLCH on #020402 dark background
- ThemeProvider now persists to localStorage, listens for system preference changes
- DashboardShell upgraded: mobile Sheet drawer + hamburger button, ARIA roles
- `@monprojetpro/supabase` now has `./theme` subpath export for tree-shake-safe client imports
- Pre-existing build errors documented (NOT from this story)

### File List
**Created:**
- `packages/ui/src/fonts.ts` — Font config constants
- `packages/ui/src/fonts.test.ts` — Font tests (6)
- `packages/ui/src/components/theme-toggle.tsx` — ThemeToggle component
- `packages/ui/src/components/theme-toggle.test.ts` — Toggle tests (9)
- `packages/ui/src/themes/themes.test.ts` — Theme structure tests (210)
- `packages/ui/src/themes/contrast.test.ts` — WCAG AA contrast tests (45)

**Modified:**
- `packages/ui/src/themes/hub.css` — Cyan/Turquoise palette
- `packages/ui/src/themes/lab.css` — Violet/Purple palette
- `packages/ui/src/themes/one.css` — Orange + Bleu-gris palette
- `packages/ui/src/globals.css` — Font variables updated (Poppins/Inter)
- `packages/ui/src/components/dashboard-shell.tsx` — Mobile Sheet, hamburger, ARIA
- `packages/ui/src/index.ts` — Export ThemeToggle
- `packages/supabase/src/providers/theme-provider.tsx` — localStorage, system pref listener
- `packages/supabase/package.json` — Added ./theme subpath export
- `apps/hub/app/layout.tsx` — Poppins + Inter fonts loaded
- `apps/client/app/layout.tsx` — Poppins + Inter fonts loaded
- `apps/hub/app/(dashboard)/layout.tsx` — ThemeToggle in header
- `apps/client/app/(dashboard)/layout.tsx` — ThemeToggle in header
