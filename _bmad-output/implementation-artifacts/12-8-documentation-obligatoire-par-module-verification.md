# Story 12.8: Documentation obligatoire par module & verification

Status: done

## Story

As a **MiKL (operateur) et client One**,
I want **que chaque module deploye ait une documentation utilisateur obligatoire (guide, FAQ, flows) verifiable et accessible**,
so that **les clients peuvent utiliser leurs outils en autonomie et Elio One dispose d'une base de connaissances precise**.

## Acceptance Criteria

**Given** chaque module doit avoir une documentation obligatoire (FR158)
**When** un module est cree
**Then** `docs/guide.md`, `docs/faq.md`, `docs/flows.md` sont obligatoires
**And** `ModuleManifest` est etendu avec :
  ```typescript
  documentation: {
    hasGuide: boolean
    hasFaq: boolean
    hasFlows: boolean
  }
  ```
**And** script `scripts/check-module-docs.ts` verifie tous les modules actifs
**And** script execute en CI — module sans docs bloque le deploy

**Given** la documentation est accessible au client (FR159)
**When** un client One consulte la section "Documentation"
**Then** :
- Organisee par module actif (accordeon ou onglets)
- `guide.md` rendu en HTML (markdown → HTML)
- FAQ en accordeon (question → reponse)
- Flows comme diagrammes/images
- Recherche textuelle dans toute la doc

**Given** la documentation alimente Elio One (FR160)
**When** Elio One repond a une question
**Then** :
- System prompt inclut `guide.md`, `faq.md`, `flows.md` des modules actifs
- Reponse basee sur la doc ; si pas couvert : "Je transmets a MiKL"
- Doc cachee en memoire, refreshed au deploy
- Seuls les fichiers du module concerne injectes (pas toute la doc a chaque conv)

**Given** l'export client inclut la documentation (FR161)
**When** un client quitte Foxeo
**Then** export inclut dossier `documentation/` avec un sous-dossier par module + README.md

## Tasks / Subtasks

- [x] Etendre le type `ModuleManifest` (AC: #1)
  - [x] Modifier `packages/types/src/module.types.ts` (ou l'equivalent) : ajouter `documentation: { hasGuide: boolean, hasFaq: boolean, hasFlows: boolean }`
  - [x] Mettre a jour tous les `manifest.ts` existants (auto-calcule au runtime en verifiant l'existence des fichiers) OU setter les valeurs manuellement dans chaque manifest

- [x] Creer le script de validation documentation (AC: #1)
  - [x] Creer `scripts/check-module-docs.ts`
  - [x] Lire tous les dossiers dans `packages/modules/`
  - [x] Pour chaque module : verifier existence et contenu non-vide de `docs/guide.md`, `docs/faq.md`, `docs/flows.md`
  - [x] Afficher un rapport : OK (vert) / MISSING (rouge) par module + fichier
  - [x] Exit code 1 si un module actif manque de docs (bloquant CI)
  - [x] Ajouter dans `package.json` root : `"check:docs": "ts-node scripts/check-module-docs.ts"`

- [x] Combler les manques de documentation des modules existants (AC: #1)
  - [x] Verifier tous les modules existants : `admin`, `chat`, `core-dashboard`, `crm`, `documents`, `elio`, `notifications`, `parcours`, `support`, `validation-hub`, `visio`, `facturation` (nouveau), `templates` (nouveau), `analytics` (nouveau)
  - [x] Creer les fichiers manquants (`guide.md`, `faq.md`, `flows.md`) pour chaque module qui en manque
  - [x] Contenu minimal acceptable : au moins 3 sections dans guide.md, 5 Q&R dans faq.md, 1 flux dans flows.md

- [x] Creer la page Documentation client One (AC: #2)
  - [x] Creer `apps/client/app/(dashboard)/modules/documentation/page.tsx` — RSC
  - [x] Charger les fichiers `docs/` de chaque module actif (via `fs.readFileSync` cote serveur Next.js)
  - [x] Rendre le Markdown en HTML : utiliser `marked` ou `remark` (verifier si installe, sinon implementation simple avec regex)
  - [x] Composant `documentation-accordion.tsx` : un accordeon par module, guide/faq/flows dedans
  - [x] Champ de recherche : filtrer les modules dont la doc contient le terme cherche

- [x] Integrer la documentation dans le context Elio One (AC: #3)
  - [x] Modifier `packages/modules/elio/actions/get-elio-context.ts` (ou equivalent)
  - [x] Ajouter `loadModuleDocumentation(activeModules: string[])` : lit `guide.md` + `faq.md` + `flows.md` pour les modules actifs
  - [x] Injecter dans le system prompt de Elio One comme section "DOCUMENTATION MODULES"
  - [x] Cache en memoire Node.js (Map<moduleId, docContent>) invalidee au restart
  - [x] Injection selective : si la question mentionne un module specifique, injecter uniquement sa doc

- [x] Integrer la documentation dans l'export RGPD (AC: #4)
  - [x] Modifier `packages/modules/admin/actions/export-client-data.ts`
  - [x] Ajouter un dossier `documentation/` dans le ZIP d'export
  - [x] Copier `guide.md`, `faq.md`, `flows.md` de chaque module actif du client
  - [x] Creer `documentation/README.md` listant les modules documentes

- [x] Creer les tests unitaires
  - [x] Test `check-module-docs.ts` : detection modules, rapports OK/MISSING, exit code (10 tests)
  - [x] Test page documentation client : rendu accordeons, recherche (6 tests)
  - [x] Test `loadModuleDocumentation` : chargement cache, injection selective (6 tests)
  - [x] Test export avec documentation : presence dossier doc dans ZIP (4 tests)

## Dev Notes

### Architecture Patterns

- **`ModuleManifest.documentation`** : pour eviter de mettre a jour manuellement chaque manifest, auto-calculer `hasGuide/hasFaq/hasFlows` dans une fonction utilitaire `checkModuleDocumentation(moduleId)` qui verifie l'existence des fichiers au runtime. Setter les valeurs dans le manifest une fois au demarrage.
- **Markdown → HTML** : verifier si `marked` ou `remark` est deja dans les dependencies. Si oui, utiliser. Si non : pour un MVP acceptable, utiliser un parser minimal (pas de XSS — le contenu est des fichiers internes, pas user-generated).
- **Cache documentation Elio** : `const docCache = new Map<string, string>()` dans le module elio. Populated au premier appel, invalide si `process.env.BUILD_ID` change (Next.js redeploiement).
- **Injection selective Elio** : si la question de l'utilisateur contient un keyword d'un module, injecter uniquement la doc de ce module. Sinon, injecter les guides de tous les modules actifs (pas les FAQ ni flows pour economiser les tokens).

### Source Tree

```
scripts/
└── check-module-docs.ts               # CREER: validation CI

packages/types/src/
└── module.types.ts                    # MODIFIER: ajouter documentation field

apps/client/app/(dashboard)/modules/documentation/
├── page.tsx                           # CREER
└── loading.tsx                        # CREER

packages/modules/*/docs/               # COMBLER les manques (guide/faq/flows)

packages/modules/elio/actions/
└── get-elio-context.ts               # MODIFIER: injection documentation

packages/modules/admin/actions/
└── export-client-data.ts             # MODIFIER: ajouter dossier documentation

packages/modules/facturation/docs/    # DEJA CREES (Story 11.1)
packages/modules/templates/docs/      # DEJA CREES (Story 12.3)
packages/modules/analytics/docs/      # DEJA CREES (Story 12.4)
packages/modules/admin/docs/          # DEJA EXISTENT (MVP)
```

### Existing Code Findings

- **Module Admin docs** : `packages/modules/admin/docs/` existe deja avec `guide.md`, `faq.md`, `flows.md` (MVP).
- **`export-client-data.ts`** : DEJA IMPLEMENTE (Stories 9.5a + 12.2). Ajouter uniquement la partie documentation au ZIP.
- **`ModuleManifest`** : localiser dans `packages/types/src/` — trouver le type exact avant de le modifier.
- **Elio One context** : voir les actions Elio crees en Epic 8 (Stories 8.7, 8.8) pour identifier ou injecter la doc.

### Technical Constraints

- **Lecture fichiers en Next.js App Router** : `fs.readFileSync` fonctionne uniquement dans les Server Components et Server Actions (pas cote client). Les chemins doivent etre absolus depuis `process.cwd()`.
- **Tokens Elio** : injecter toute la documentation de tous les modules peut consommer beaucoup de tokens. Limiter a 2000 tokens par module (truncate si plus long) et prioriser `guide.md` + les sections FAQ les plus pertinentes.

### References

- [Source: epic-12-administration-analytics-templates-stories-detaillees.md#Story 12.8]
- [Source: packages/modules/admin/actions/export-client-data.ts] — a modifier
- [Source: packages/modules/admin/docs/] — exemple de documentation existante

## Dev Agent Record

### Agent Model Used
claude-sonnet-4-6

### Debug Log References
- Cache test corrigé : global path ne lit que guide.md (pas faq.md) → 1 readFileSync call attendu, pas 2
- scripts/ pas dans vitest.config.ts → ajout du pattern `scripts/**/*.test.ts`
- admin/docs/{guide,faq}.md : contenus insuffisants (2 sections guide, 2 Q&Rs faq) → enrichis

### Completion Notes List
- ✅ Resolved review finding [HIGH]: Supprimé `'use server'` de `load-module-documentation.ts` — fonction interne, pas une Server Action
- ✅ Resolved review finding [HIGH]: `[...activeModules].sort()` au lieu de mutation en place dans `load-module-documentation.ts:74`
- ✅ Resolved review finding [MEDIUM]: Queries séquentielles dans `page.tsx` avec early return sur null client
- ✅ Resolved review finding [MEDIUM]: Groupement correct des `<li>` consécutifs dans un seul `<ul>` dans `renderMarkdown`
- ✅ Resolved review finding [MEDIUM]: Documentation markdown injectée aussi pour le path `module_action` dans `send-to-elio.ts`
- `ModuleDocumentation` type ajouté dans `packages/types/src/module-manifest.ts`, exporté depuis `index.ts`
- 14 manifests mis à jour avec `documentation: { hasGuide: true, hasFaq: true, hasFlows: true }`
- `scripts/check-module-docs.ts` : validation CI avec rapport OK/MISSING/THIN, exit code 1 bloquant, `check:docs` dans package.json root
- `vitest.config.ts` : pattern `scripts/**/*.test.ts` ajouté
- `admin/docs/guide.md` : 4 sections (Fonctionnalités, Provisioning, Monitoring, Logs) ; `admin/docs/faq.md` : 7 Q&Rs
- Page documentation client One : RSC `page.tsx` + `loading.tsx` + `documentation-accordion.tsx` (accordéon par module, tabs guide/faq/flows, parser markdown regex sans dépendance externe) + `documentation-search.tsx`
- `load-module-documentation.ts` : cache Map<string,string>, injection sélective par mention de module, truncation 2000 tokens max
- `send-to-elio.ts` : documentation markdown injectée dans system prompt One
- `export-client-data.ts` : `buildDocumentationPayload()` lit docs modules actifs côté Next.js (fs accessible), passe `documentationFiles` à l'Edge Function
- Edge Function `generate-client-export` : intègre `documentationFiles` dans le ZIP
- 37 tests : 10 (check-module-docs) + 6 (accordion) + 6 (load-module-documentation) + 15 (export-client-data, dont 4 nouveaux)

### File List
packages/types/src/module-manifest.ts
packages/types/src/index.ts
packages/modules/admin/manifest.ts
packages/modules/core-dashboard/manifest.ts
packages/modules/chat/manifest.ts
packages/modules/crm/manifest.ts
packages/modules/notifications/manifest.ts
packages/modules/support/manifest.ts
packages/modules/documents/manifest.ts
packages/modules/visio/manifest.ts
packages/modules/parcours/manifest.ts
packages/modules/validation-hub/manifest.ts
packages/modules/elio/manifest.ts
packages/modules/facturation/manifest.ts
packages/modules/templates/manifest.ts
packages/modules/analytics/manifest.ts
packages/modules/admin/docs/guide.md
packages/modules/admin/docs/faq.md
packages/modules/elio/actions/load-module-documentation.ts
packages/modules/elio/actions/load-module-documentation.test.ts
packages/modules/elio/actions/send-to-elio.ts
packages/modules/admin/actions/export-client-data.ts
packages/modules/admin/actions/export-client-data.test.ts
supabase/functions/generate-client-export/index.ts
scripts/check-module-docs.ts
scripts/check-module-docs.test.ts
apps/client/app/(dashboard)/modules/documentation/page.tsx
apps/client/app/(dashboard)/modules/documentation/loading.tsx
apps/client/app/(dashboard)/modules/documentation/documentation-accordion.tsx
apps/client/app/(dashboard)/modules/documentation/documentation-accordion.test.tsx
apps/client/app/(dashboard)/modules/documentation/documentation-search.tsx
package.json
vitest.config.ts
_bmad-output/implementation-artifacts/sprint-status.yaml
