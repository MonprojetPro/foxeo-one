# Doctrine de la bibliothèque de modules — appliquée par FORGE

> **Document de référence** que l'agent **FORGE « le Forgeron »** applique pour décider si un
> module entre dans la bibliothèque réutilisable `packages/modules/`.
> Base stratégique : `docs/one-vision-v2-2026-06-24.md` (§3 « bibliothèque de modules + FORGE »).
> Base technique : `CLAUDE.md` projet (« Module System — plug & play », « Checklist ajout d'un
> module client »), `packages/types/src/module-manifest.ts`.
> Statut : doctrine **active**. Mise à jour par FORGE (ATLAS capitalise les leçons récurrentes).

---

## 0. Pourquoi cette doctrine existe

Chaque module développé pour un client **nourrit une bibliothèque réutilisable**. Une commande
similaire plus tard = on **rebranche une brique existante** au lieu de recoder. Le sur-mesure est
dans l'**assemblage**, pas dans la fabrication de chaque brique (principe Lego 🧱).

**Sans discipline, la bibliothèque devient un cimetière de code** : du sur-mesure jetable, avec des
noms de clients en dur, impossible à resservir. La doctrine ci-dessous est le garde-fou. FORGE en est
le gardien : il **audite et conseille, il ne code pas** (les correctifs sont dispatchés vers ruflo).

---

## 1. La RÈGLE D'OR (absolue, non négociable)

> **Un module ne connaît JAMAIS un client en particulier.**
> Toute spécificité client — URL, couleurs, logo, textes/contenus, clés API, identifiants, slug,
> source de métriques, comportement « pour ce client-là » — vit en **base de données ou en
> configuration**, **jamais en dur dans le code du module**.

**Test de la règle d'or** : si je retire toute la config/données, le module doit rester un module
**générique fonctionnel** (avec des états vides), et **aucun nom de client ne doit apparaître** dans
le code. Si ce n'est pas le cas → **rejet**.

### Ce qui DOIT vivre en base/config (jamais en dur)

| Spécificité | Où elle vit | Jamais |
|---|---|---|
| URL du site/app du client | `client_configs` / table de config dédiée | ❌ en dur dans le code |
| Couleur de marque, logo | `client_configs` (ex. `--brand-accent` injecté runtime) | ❌ valeur hex hardcodée |
| Textes, libellés métier client | base / config | ❌ chaîne en dur |
| Clés API, secrets, tokens | variables d'env (`.env*.local`), jamais committées | ❌ dans le code ni le manifest |
| Source de métriques (analytics, visites) | config par projet (décidée projet par projet) | ❌ endpoint hardcodé |
| Identifiants client (slug, id) | passés en props depuis la page `/modules/[id]` | ❌ `if (clientId === 'xxx')` |

---

## 2. Les deux familles : RELATION vs COCKPIT

Tout module appartient à **une seule** famille.

| | 🔵 **RELATION** (socle universel) | 🟢 **COCKPIT** (sur-mesure) |
|---|---|---|
| **Rôle** | Gère le lien client ↔ MiKL | Pilote les livrables du client (son site, son app, ses métriques) |
| **Nature** | Identique pour tous | Branché selon le projet |
| **Réutilisabilité** | **Tel quel** par construction | **Via configuration** (coque générique, branchement spécifique) |
| **Exemples** | chat, documents, suivi-outil, support, notifications, élio | Cockpit Site, Cockpit App, métriques produit |
| **Droit à la config** | Minimal (préférences UI) | Oui — mais **toujours via base/config**, jamais en dur |

**Le base = la relation. Le cockpit = le produit.**

### Règles de classement (appliquées au gate)

- Un **RELATION** doit être **100 % générique**. S'il contient une once de logique « pour un client
  qui a un site web / une app », c'est un **Cockpit déguisé** → rejeté comme Relation.
- Un **COCKPIT** peut être paramétrable par projet (sources de métriques, libellés, raccourcis), mais
  la **coque** (UI, structure, hooks, états vides) reste universelle ; seul le **branchement** change,
  et il vient de la config/base.

> ⚠️ Rejet #1 historique : un Cockpit qui hardcode l'URL, la couleur ou l'endpoint de métriques d'un
> client. La coque « Cockpit Site » est générique ; URL + source de visites viennent de la config.

---

## 3. Critères d'un « bon module bibliothèque »

Un module est **labellisable** s'il coche **tous** ces critères :

1. **Générique** — aucun client connu en dur (règle d'or §1).
2. **Configurable** — toute spécificité vient de la base/config, injectée au runtime via props/hooks.
3. **Autonome** — n'importe **aucun autre module** directement (communication via Supabase/Realtime).
4. **Manifesté** — `manifest.ts` valide (§5).
5. **Documenté** — `docs/guide.md` + `docs/faq.md` + `docs/flows.md` présents et non vides.
6. **Testé** — tests `*.test.ts` co-localisés, chemins critiques couverts.
7. **Conforme** — conventions de nommage + 3 patterns de data fetching (§6).
8. **Famille claire** — Relation OU Cockpit, sans ambiguïté.

---

## 4. GATE D'ENTRÉE — checklist cochable

> FORGE déroule cette checklist **mécaniquement** sur chaque module candidat. Les portes 🔴 sont
> **bloquantes** : une seule échouée = pas de labellisation.

### Porte 1 — Règle d'or : zéro client en dur 🔴 (bloquant)

- [ ] `grep` sur le module : **aucun** nom/slug de client en dur
- [ ] **aucune** URL de client en dur (les URL viennent de la config)
- [ ] **aucune** couleur hex de marque en dur (thème/accent injecté runtime)
- [ ] **aucune** clé API / secret / token dans le code ni dans le manifest
- [ ] **aucun** `if (clientId === '...')` ni branche conditionnelle « pour ce client »
- [ ] **aucun** endpoint de métriques en dur (source décidée par config projet)

### Porte 2 — Famille déclarée

- [ ] Le module est classé **Relation** OU **Cockpit** (jamais les deux)
- [ ] Si Relation : 100 % générique, zéro logique « type de projet »
- [ ] Si Cockpit : coque générique, branchement via config uniquement

### Porte 3 — Manifest valide 🔴 (bloquant)

- [ ] `manifest.ts` présent (1er fichier du module)
- [ ] Conforme au type `ModuleManifest` (`@monprojetpro/types`) : `id`, `name`, `version`,
      `description`, `navigation`, `routes`, `requiredTables`, `targets`, `dependencies`,
      `documentation`
- [ ] `id` == nom du dossier
- [ ] `targets` cohérents avec la famille (`hub` / `client-lab` / `client-one`)
- [ ] `requiredTables` listées (toutes les tables lues/écrites)
- [ ] `requiredEnv` listées si le module a des dépendances externes (clés via env, jamais en dur)

### Porte 4 — Docs obligatoires 🔴 (bloquant — gate CI projet)

- [ ] `docs/guide.md` présent et non vide
- [ ] `docs/faq.md` présent et non vide
- [ ] `docs/flows.md` présent et non vide
- [ ] `manifest.documentation` (`hasGuide`/`hasFaq`/`hasFlows`) reflète la réalité

### Porte 5 — Tests co-localisés

- [ ] `*.test.ts` **à côté** des sources (jamais de dossier `__tests__/`)
- [ ] Chemins critiques couverts (mutations, RLS, états limites)

### Porte 6 — Conventions de nommage

- [ ] Tables DB : snake_case, pluriel (`client_configs`)
- [ ] Colonnes : snake_case · Policies RLS : `{table}_{action}_{role}`
- [ ] Composants : PascalCase · fichiers : kebab-case.tsx
- [ ] Hooks : `useX` · stores Zustand : `useXStore`
- [ ] Frontière DB ↔ API : `toCamelCase()` / `toSnakeCase()` (`@monprojetpro/utils`)

### Porte 7 — Data fetching (3 patterns, aucune exception)

- [ ] Lecture → **Server Component** (`@monprojetpro/supabase` server client)
- [ ] Mutation → **Server Action** `'use server'` retournant `{ data, error }` (jamais de `throw`)
- [ ] Webhook externe uniquement → **API Route** `app/api/webhooks/[service]/route.ts`
- [ ] État serveur → **TanStack Query** (source unique) · UI state → **Zustand** (jamais de données serveur)
- [ ] Realtime → invalide le cache TanStack (`invalidateQueries`), pas de sync manuelle
- [ ] **Aucun** import direct d'un autre module (communication via Supabase/Realtime)

### Checklist d'activation client (rappel CLAUDE.md — si le module cible un client)

- [ ] Manifest ajouté à `ALL_CLIENT_MANIFESTS` (`apps/client/app/(dashboard)/layout.tsx`)
- [ ] Page dédiée créée : `apps/client/app/(dashboard)/modules/[id]/page.tsx`
- [ ] Route sidebar `/modules/${id}` cohérente avec l'`id` du manifest
- [ ] Ne jamais ajouter côté client un manifest qui cible uniquement `hub`

---

## 5. Le manifest — référence

Type source : `packages/types/src/module-manifest.ts`.

```ts
export type ModuleManifest = {
  id: string                 // == nom du dossier, kebab/snake selon convention
  name: string               // libellé humain
  version: string
  description: string        // générique, jamais un nom de client
  navigation: { icon, label, position }
  routes: { path, component }[]
  apiRoutes?: { path, method }[]   // webhooks externes uniquement
  requiredTables: string[]   // toutes les tables lues/écrites
  targets: ('hub'|'client-lab'|'client-one')[]
  dependencies: string[]     // packages internes, jamais un autre module métier
  documentation: { hasGuide, hasFaq, hasFlows }
}
```

Règle FORGE : le manifest **décrit** le module mais **ne contient aucune spécificité client**.
`description` reste générique. Les clés externes vont dans `requiredEnv` (par nom, via `.env`), jamais
en valeur.

---

## 6. Exemples concrets — BIEN vs MAL

### Exemple A — Cockpit Site

❌ **MAL** (rejeté — règle d'or violée) :
```tsx
// packages/modules/cockpit-site/components/site-preview.tsx
const SITE_URL = 'https://boulangerie-dupont.fr'        // ❌ client en dur
const ACCENT = '#e63946'                                // ❌ couleur client en dur
export function SitePreview() {
  return <iframe src={SITE_URL} style={{ borderColor: ACCENT }} />
}
```

✅ **BIEN** (labellisable) :
```tsx
// La coque est générique. URL + couleur viennent de la config client (base).
export function SitePreview({ siteUrl, accent }: { siteUrl: string; accent: string }) {
  if (!siteUrl) return <EmptyState message="Aucun site branché pour le moment." />
  return <iframe src={siteUrl} style={{ borderColor: accent }} />
}
// siteUrl / accent sont chargés depuis client_configs dans la page /modules/cockpit-site
```

### Exemple B — branche conditionnelle « pour ce client »

❌ **MAL** :
```ts
if (clientId === 'dev-test-sarl') {            // ❌ logique spécifique à UN client
  showLegacyDashboard()
}
```
✅ **BIEN** : un **flag** en base (`client_configs.feature_x_enabled`) lu génériquement, valable pour
tous les clients qui l'activent.

### Exemple C — clé API

❌ **MAL** : `const RESEND_KEY = 're_123abc...'` en dur dans le module.
✅ **BIEN** : `requiredEnv: ['RESEND_API_KEY']` dans le manifest, lecture via `process.env`, valeur en
`.env.local` (jamais committée).

### Exemple D — Relation déguisé en Cockpit (et l'inverse)

❌ **MAL** : un module `chat` (Relation) qui contient `if (project.type === 'ecommerce') …`. Le chat
est un **socle universel** : aucune notion de type de projet. → Rejeté comme Relation.
✅ **BIEN** : `chat` reste 100 % générique ; toute logique « produit » vit dans un **Cockpit** séparé.

### Exemple E — import inter-modules

❌ **MAL** : `import { useInvoices } from '@monprojetpro/modules/facturation'` depuis le module `crm`.
✅ **BIEN** : le `crm` lit la donnée via Supabase / reçoit l'événement via Realtime. Les modules ne se
connaissent jamais directement.

---

## 7. Procédure FORGE résumée

```
Nouveau module / activation client
        │
        ▼
[FORGE gate] ── checklist 7 portes (§4)
        │
   ┌────┴─────┬─────────────┐
   ▼          ▼             ▼
✅ LABELLISÉ  🟠 CONDITIONNEL  🔴 REJETÉ
   │          │ (corrections    │ (règle d'or violée /
   │          │  → ruflo,       │  pas générique →
   │          │  re-gate)       │  refactor ruflo)
   ▼          ▼                 ▼
Catalogue mis à jour (docs/module-library-catalog.md)
```

FORGE ne code pas : toute correction est **dispatchée vers ruflo**, puis FORGE re-passe le gate.
