# Story 12.3: Templates reutilisables — Parcours Lab & emails automatiques

Status: done

## Story

As a **MiKL (operateur)**,
I want **creer des templates de parcours Lab reutilisables et personnaliser les emails automatiques de la plateforme**,
so that **je peux onboarder chaque nouveau client avec un parcours pre-configure et garder une communication email coherente**.

## Acceptance Criteria

**Given** MiKL accede au module Templates (FR137)
**When** il consulte la liste des templates parcours
**Then** :
- Liste : nom, nb etapes, nb clients utilisant, date creation/modif
- Actions : Modifier, Dupliquer, Archiver
- Bouton "Nouveau template"

**Given** MiKL cree ou modifie un template parcours
**When** il ouvre l'editeur
**Then** :
- Nom + description
- Etapes avec drag & drop pour reordonner
- Par etape : titre, description, ordre, actif par defaut, prompts Elio Lab
- Stocke dans `parcours_templates` (table existante depuis Story 6.1)
- Validation Zod : min 2 etapes
- Un template modifie ne touche PAS les parcours en cours (copie au moment de l'assignation)

**Given** MiKL personnalise les emails automatiques (FR138)
**When** il accede a la section "Emails"
**Then** il peut modifier sujet + contenu (editeur texte) de ces templates :
| Template | Declencheur |
|----------|-------------|
| bienvenue_lab | Premiere connexion Lab |
| brief_valide | Brief valide par MiKL |
| brief_refuse | Brief refuse par MiKL |
| graduation | Graduation Lab → One |
| facture_envoyee | Facture envoyee |
| echec_paiement | Paiement echoue |
| rappel_parcours | Client Lab inactif |
- Variables injectables via boutons ({prenom}, {entreprise}, etc.)
- Apercu du rendu
- Bouton "Reinitialiser au defaut"
- Stocke dans `email_templates` (migration 00064, creee Story 11.5)

## Tasks / Subtasks

- [x] Creer le module Templates (AC: #1)
  - [x] Creer `packages/modules/templates/manifest.ts` : `{ id: 'templates', targets: ['hub'], dependencies: [] }`
  - [x] Creer `packages/modules/templates/index.ts` barrel export
  - [x] Creer `packages/modules/templates/docs/guide.md`, `faq.md`, `flows.md`

- [x] Creer l'editeur de templates parcours (AC: #1, #2)
  - [x] Creer `packages/modules/templates/components/parcours-template-editor.tsx` — 'use client'
  - [x] Liste des templates : fetch depuis `parcours_templates` via TanStack Query
  - [x] Drag & drop reordonnancement des etapes : utiliser `@dnd-kit/core` si disponible, sinon boutons up/down manuels
  - [x] Server Action `saveParcourTemplate(templateId?, templateData)` : UPSERT dans `parcours_templates`
  - [x] Server Action `duplicateParcourTemplate(templateId)` : copie du template
  - [x] Server Action `archiveParcourTemplate(templateId)` : soft delete

- [x] Creer l'editeur de templates emails (AC: #3)
  - [x] Creer `packages/modules/templates/components/email-template-editor.tsx`
  - [x] Liste des 7 templates depuis `email_templates`
  - [x] Editeur texte simple (textarea) avec boutons variables
  - [x] Preview : render markdown-like → afficher dans une div stylisee
  - [x] Server Action `saveEmailTemplate(templateKey, subject, body)` : UPDATE `email_templates`
  - [x] Server Action `resetEmailTemplate(templateKey)` : restaurer les valeurs par defaut
  - [x] Les templates par defaut sont seeds en migration 00067 (7 templates story 12.3)

- [x] Integrer les templates email dans l'Edge Function `send-email` (AC: #3)
  - [x] Modifier `supabase/functions/send-email/handler.ts` : avant d'appliquer un template hardcode, verifier si une version personnalisee existe dans `email_templates`
  - [x] Si oui : utiliser le template DB + substitution variables {prenom}, {entreprise}, etc.
  - [x] Si non : fallback sur le template hardcode HTML existant

- [x] Creer la page Admin Hub pour Templates (AC: #1, #3)
  - [x] Creer `apps/hub/app/(dashboard)/modules/templates/page.tsx`
  - [x] Onglets "Parcours Lab" / "Emails"

- [x] Creer les tests unitaires
  - [x] Test `saveParcourTemplate` : validation min 2 etapes, auth, UPSERT (10 tests)
  - [x] Test `saveEmailTemplate` : auth, mise a jour, reset (7 tests)
  - [x] Test `email-template-editor.tsx` : rendu templates, editeur, variables (7 tests)
  - [x] Test `parcours-template-editor.tsx` : rendu, edition, actions (6 tests)

## Dev Notes

### Architecture Patterns

- **`parcours_templates` existe deja** : creee en Story 6.1. Verifier le schema exact avant d'implementer. Les colonnes probables : id, name, description, steps (JSONB array), is_archived, created_at.
- **Pas de rich text editor** : utiliser un `<textarea>` simple avec pre-visualisation. Pas d'editeur WYSIWYG complexe (pas de librairie additionnelle).
- **Variables dans les templates email** : substitution cote serveur dans `send-email/handler.ts` avec un pattern simple : `template.replace(/{prenom}/g, data.prenom)`. Escape HTML obligatoire sur toutes les variables injectees (`escapeHtml()`).
- **Drag & drop** : si `@dnd-kit/core` n'est pas installe, utiliser des boutons "Monter" / "Descendre" — ne pas ajouter de dependance pour une feature secondaire.

### Source Tree

```
packages/modules/templates/
├── manifest.ts                         # CREER
├── index.ts                            # CREER
├── docs/guide.md                       # CREER
├── docs/faq.md                         # CREER
├── docs/flows.md                       # CREER
├── components/
│   ├── parcours-template-editor.tsx    # CREER
│   ├── parcours-template-editor.test.tsx  # CREER
│   ├── email-template-editor.tsx       # CREER
│   └── email-template-editor.test.tsx  # CREER
└── actions/
    ├── save-parcours-template.ts       # CREER
    ├── save-email-template.ts          # CREER
    └── *.test.ts                       # CREER

apps/hub/app/(dashboard)/modules/templates/
└── page.tsx                            # CREER

supabase/functions/send-email/
└── handler.ts                          # MODIFIER: lire email_templates DB
```

### Existing Code Findings

- **`email_templates` table** : creee en migration 00064 (Story 11.5). Seeds des templates par defaut inclus dans cette migration.
- **`parcours_templates`** : verifier `supabase/migrations/` pour le schema exact (Story 6.1).
- **`send-email/handler.ts`** : `supabase/functions/send-email/handler.ts` — MODIFIER pour lire les templates DB. Garder les templates HTML hardcodes comme fallback.
- **`escapeHtml()`** : disponible dans `supabase/functions/_shared/email-templates/base.ts` — OBLIGATOIRE sur toutes les substitutions variables.

### References

- [Source: epic-12-administration-analytics-templates-stories-detaillees.md#Story 12.3]
- [Source: supabase/functions/send-email/handler.ts] — a modifier
- [Source: supabase/functions/_shared/email-templates/base.ts] — escapeHtml()

## Dev Agent Record

### Agent Model Used
claude-sonnet-4-6

### Debug Log References
- Tests `save-parcours-template.test.ts` initialement echoues (5 fails) a cause de : (1) templateId 'tmpl-1' non-UUID valide rejecte par Zod z.string().uuid(), (2) `vi.clearAllMocks()` ne vide pas la queue `mockReturnValueOnce` → refactoring tests avec pattern factory `makeSupabaseMock` par table (pattern du module admin).
- @dnd-kit absent → boutons up/down utilises comme prevu.
- Migration 00067 creee pour seeder les 7 templates email de la story (00064 avait uniquement les templates billing).
- `parcours_templates.is_active` (bool) = colonne d'archivage (pas is_archived comme dit en story).

### Completion Notes List
- Module `@monprojetpro/module-templates` cree : manifest, index, docs (guide/faq/flows), hooks, actions, composants
- `ParcourTemplateEditor` : liste + CRUD complet (create/edit/duplicate/archive) avec reordonnancement up/down
- `EmailTemplateEditor` : liste 7+ templates, editeur textarea, boutons variables, preview, save/reset
- Actions server : `saveParcourTemplate` (UPSERT), `duplicateParcourTemplate`, `archiveParcourTemplate`, `saveEmailTemplate`, `resetEmailTemplate`
- Integration `send-email/handler.ts` : `resolveTemplateKey()` mappe notification.type → template_key ; `fetchDbEmailTemplate()` lit email_templates ; `substituteTemplateVars()` remplace {variable} avec escapeHtml ; fallback automatique sur templates hardcodes si template absent en DB
- Migration 00067 : seed 7 templates email story 12.3
- Page `/modules/templates` avec onglets Parcours Lab / Emails
- 30 tests — 100% passing
- **CR fixes (Opus):** (1) XSS preview — escapeForPreview() avant substitutions variables dans renderPreview() ; (2) variable {entreprise} ajoutee partout (UI, handler.ts, migration) conformement aux AC ; (3) imports dupliques fusionnes dans page.tsx ; (4) confirmation window.confirm() avant archivage ; (5) substituteTemplateVars() echappe maintenant le texte litteral du template (pas seulement les variables)

### File List
- packages/modules/templates/manifest.ts
- packages/modules/templates/index.ts
- packages/modules/templates/package.json
- packages/modules/templates/docs/guide.md
- packages/modules/templates/docs/faq.md
- packages/modules/templates/docs/flows.md
- packages/modules/templates/actions/save-parcours-template.ts
- packages/modules/templates/actions/save-parcours-template.test.ts
- packages/modules/templates/actions/save-email-template.ts
- packages/modules/templates/actions/save-email-template.test.ts
- packages/modules/templates/hooks/use-parcours-templates.ts
- packages/modules/templates/hooks/use-email-templates.ts
- packages/modules/templates/components/parcours-template-editor.tsx
- packages/modules/templates/components/parcours-template-editor.test.tsx
- packages/modules/templates/components/email-template-editor.tsx
- packages/modules/templates/components/email-template-editor.test.tsx
- apps/hub/app/(dashboard)/modules/templates/page.tsx
- apps/hub/package.json
- supabase/functions/send-email/handler.ts
- supabase/migrations/00067_seed_email_templates_story123.sql
- _bmad-output/implementation-artifacts/sprint-status.yaml
