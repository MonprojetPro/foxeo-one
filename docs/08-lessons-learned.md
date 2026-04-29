# MonprojetPro One — Registre des Lecons Apprises (ATLAS)

> Maintenu par ATLAS "l'Historien" — Ne jamais supprimer d'entrees, marquer OBSOLETE si necessaire.
> Chaque entree documente un probleme reel qui a fait perdre du temps.

---

## Index par categorie

| Code | Categorie | Nb lecons |
|------|-----------|-----------|
| CFG | Configuration | 3 |
| DL | Téléchargement / Storage | 5 |
| API | Intégration API externe | 5 |
| RSC | Next.js Server/Client | 6 |
| DB | Base de données / Schéma | 1 |
| DEP | Déploiement | 5 |
| GIT | Git / Workflow | 1 |
| SEC | Sécurité / Secrets | 1 |

---

## Lecons

### [CFG-003] vi.mock('fs/promises') ne fonctionne pas — utiliser vi.mock('fs') + méthodes sync
- **Date** : 2026-04-21
- **Projet** : MonprojetPro One
- **Phase** : Story 14.2 — Catalogue agents Élio Lab
- **Categorie** : Configuration (CFG)
- **Symptome** : `vi.mock('fs/promises', async (importOriginal) => { ... readdir: vi.fn() })` ne mock pas réellement `readdir` dans l'environnement `happy-dom` de Vitest. Les tests retournaient toujours `NOT_FOUND` malgré `vi.mocked(readdir).mockResolvedValue(...)`. La fonction réelle était appelée → ENOENT → catch → NOT_FOUND.
- **Cause racine** : Le pattern `vi.mock('fs/promises')` avec `importOriginal` ne fonctionne pas de façon fiable dans Vitest avec `environment: 'happy-dom'`. C'est un module natif Node.js ESM — l'interception Vitest n'est pas garantie.
- **Solution** : Utiliser `readdirSync`/`readFileSync` depuis `'fs'` (sync) + `vi.mock('fs')` dans les tests. Ce pattern est éprouvé dans tout le projet (`check-module-docs.test.ts`, `export-client-data.test.ts`, `load-module-documentation.test.ts`).
- **Impact** : 3 tests bloqués, 1 fix commit supplémentaire.
- **Regle a suivre** : Dans ce projet, pour toute Server Action qui lit des fichiers, utiliser les méthodes sync de `'fs'` et mocker `'fs'` dans les tests — jamais `'fs/promises'`.

---

### [CFG-001] Supabase Edge Function echoue depuis Next.js mais marche depuis le dashboard
- **Date** : 2026-03-25
- **Projet** : MonprojetPro One
- **Phase** : Integration Elio Hub (Edge Function elio-chat)
- **Categorie** : Configuration (CFG)
- **Symptome** : L'appel a la Edge Function `elio-chat` via `supabase.functions.invoke()` depuis le Hub Next.js retournait une erreur. Aucun log visible cote Edge Function. La fonction testee directement depuis le dashboard Supabase fonctionnait parfaitement.
- **Cause racine** : Supabase Edge Functions ont `verify_jwt = true` par defaut. L'appel depuis Next.js via `supabase.functions.invoke()` n'envoyait pas de JWT valide, causant un rejet d'authentification silencieux avant meme que le code de la fonction ne s'execute.
- **Fausses pistes** :
  1. **FAUSSE PISTE — API key Anthropic** : On a d'abord soupconne que l'ANTHROPIC_API_KEY n'etait pas configuree dans les secrets Supabase. Verification faite : la cle etait bien presente. Ca n'a PAS marche parce que le probleme etait en amont de l'execution de la fonction.
  2. **FAUSSE PISTE — Probleme cote client Next.js** : On a ensuite soupconne un probleme dans le code `send-to-elio.ts` (mauvais URL, mauvais params). L'amelioration des messages d'erreur a montre que l'erreur venait bien de l'invocation elle-meme, pas du code client.
  3. **FAUSSE PISTE — Logs vides** : Les logs Supabase etaient vides, ce qui suggerait que la fonction ne s'executait pas du tout — indice cle que le probleme etait au niveau auth/gateway, pas dans le code.
- **Solution validee** : Creer un fichier `supabase/functions/elio-chat/config.toml` avec `verify_jwt = false`, puis redeployer avec `npx supabase functions deploy elio-chat --project-ref <ref> --no-verify-jwt`.
- **Temps perdu** : ~2 sessions de debug (~1h30 cumule)
- **Prevention** :
  - Pour toute nouvelle Edge Function, toujours se poser la question : "le client qui appelle envoie-t-il un JWT valide ?"
  - Si la fonction est appelee par un Server Action (pas par le browser directement), considerer `verify_jwt = false` d'emblee
  - Si les logs Edge Function sont vides, c'est un indice fort que la requete est rejetee AVANT l'execution (auth gateway)
  - Toujours tester une Edge Function depuis le dashboard ET depuis l'app pour detecter les differences d'authentification
- **Agents impliques** : SPARK (dev), ATLAS (documentation)

---

### [DL-001] Téléchargement cross-origin — link.download et window.open ne fonctionnent pas
- **Date** : 2026-04-08
- **Projet** : MonprojetPro Hub — Module Documents
- **Categorie** : Téléchargement / Storage (DL)
- **Symptome** : Cliquer "Télécharger" ouvrait le fichier (image, PDF) dans le navigateur au lieu de le télécharger, quelle que soit l'approche côté client.
- **Cause racine** : Les URLs Supabase Storage sont cross-origin. Par spécification W3C, l'attribut `download` d'un `<a>` est ignoré pour les URLs cross-origin. `window.open` et `window.location.href` affichent le fichier si le navigateur peut le rendre (images, PDFs). La tentative fetch + blob échouait aussi (CORS ou fallback silencieux).
- **Fausses pistes** :
  1. **FAUSSE PISTE — `link.download = filename`** : Ajout de l'attribut download sur le lien. Ignoré par le navigateur pour les URLs cross-origin.
  2. **FAUSSE PISTE — `window.open(url, '_blank')`** : Ouvre dans un nouvel onglet mais affiche le fichier.
  3. **FAUSSE PISTE — `window.location.href = url`** : Même comportement.
  4. **FAUSSE PISTE — fetch + blob + createObjectURL** : Tentative de contourner en chargeant en mémoire. Résultat identique ou erreur silencieuse.
  5. **FAUSSE PISTE — Supabase `createSignedUrl({ download: true })`** : Ajoute `Content-Disposition: attachment` côté Supabase, mais le navigateur l'ignore quand il reçoit la réponse cross-origin via `window.open`.
- **Solution validee** : Créer une route API proxy Next.js (`/api/documents/download/[documentId]`) qui fetch le fichier côté serveur et le renvoie avec `Content-Disposition: attachment` depuis le **même domaine** que l'app. Le navigateur respecte alors le header. Côté client : simple clic sur un `<a>` pointant vers cette route.
- **Code solution** :
  ```typescript
  // route.ts
  const buffer = await fileRes.arrayBuffer()
  return new NextResponse(buffer, {
    headers: { 'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(name)}` }
  })
  // client
  const a = document.createElement('a'); a.href = `/api/documents/download/${id}`; a.click()
  ```
- **Temps perdu** : ~1h (4 tentatives)
- **Prevention** : Pour tout téléchargement de fichier stocké sur un domaine externe (Supabase, S3, CDN), toujours passer par une route API proxy same-origin. Ne jamais compter sur `link.download` pour les URLs cross-origin.
- **Agents impliques** : SPARK (dev), FIX (debug), ATLAS (documentation)

---

### [DL-002] Supabase Storage — noms de fichiers avec espaces et caractères spéciaux rejetés
- **Date** : 2026-04-08
- **Projet** : MonprojetPro Hub — Module Documents
- **Categorie** : Téléchargement / Storage (DL)
- **Symptome** : Upload d'un fichier nommé `Capture d'écran 2026-04-05 221424.png` retourne `StorageApiError: Invalid key` (status 400).
- **Cause racine** : Supabase Storage refuse les clés de stockage contenant des espaces, apostrophes, accents et autres caractères spéciaux. Le path de stockage est `operatorId/clientId/uuid-nomFichier` — le nom de fichier original est utilisé tel quel.
- **Solution validee** : Sanitiser le nom de fichier avant de construire le `storagePath` :
  ```typescript
  const sanitizedName = file.name
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // supprimer accents
    .replace(/[^a-zA-Z0-9._-]/g, '-')                 // remplacer caractères spéciaux
    .replace(/-{2,}/g, '-').replace(/^-|-$/g, '')      // nettoyer tirets
  ```
- **Temps perdu** : ~15min
- **Prevention** : Toujours sanitiser les noms de fichiers avant upload vers Supabase Storage. Appliquer ce pattern dans toute action `uploadDocument`.
- **Agents impliques** : SPARK (dev), ATLAS (documentation)

---

### [DL-003] Next.js App Router — streaming ReadableStream instable dans NextResponse
- **Date** : 2026-04-08
- **Projet** : MonprojetPro Hub — Module Documents
- **Categorie** : Téléchargement / Storage (DL)
- **Symptome** : `new NextResponse(fileRes.body, ...)` dans une route API causait des comportements imprévisibles (corps vide, réponse tronquée).
- **Cause racine** : Le streaming direct de `Response.body` (ReadableStream) vers `NextResponse` n'est pas toujours stable dans Next.js App Router selon la version et le runtime.
- **Solution validee** : Charger le fichier en mémoire avec `await fileRes.arrayBuffer()` puis passer le buffer à `NextResponse`. Plus simple, plus fiable pour des fichiers de taille raisonnable.
- **Prevention** : Pour les routes de téléchargement de fichiers (< 50 Mo), toujours préférer `arrayBuffer()` au streaming direct.
- **Agents impliques** : SPARK (dev), ATLAS (documentation)

---

### [API-001] Gmail OAuth — metadataHeaders doit être un paramètre répété, pas une valeur CSV
- **Date** : 2026-04-08
- **Projet** : MonprojetPro Hub — Module Email
- **Categorie** : Intégration API externe (API)
- **Symptome** : Tous les threads Gmail affichaient "(sans objet)" alors que les emails avaient bien un sujet.
- **Cause racine** : L'API Gmail attend `metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date` (paramètre répété). Le code passait `metadataHeaders=Subject,From,Date` (valeur CSV) via `url.searchParams.set()`. L'API ignorait le paramètre mal formé et ne retournait aucun header.
- **Solution validee** : Modifier `gmailGet()` pour accepter `string | string[]` et utiliser `url.searchParams.append()` pour les tableaux.
- **Temps perdu** : ~20min
- **Prevention** : Pour toute API Google, toujours vérifier si un paramètre est "repeatable" dans la doc — utiliser `append()` et non `set()`.
- **Agents impliques** : SPARK (dev), ATLAS (documentation)

---

### [API-002] Gmail OAuth — scope gmail.modify requis pour mettre à la corbeille
- **Date** : 2026-04-08
- **Projet** : MonprojetPro Hub — Module Email
- **Categorie** : Intégration API externe (API)
- **Symptome** : L'action "Supprimer" ne faisait rien (pas d'erreur visible, pas de suppression).
- **Cause racine** : L'API Gmail `/threads/{id}/trash` requiert le scope `gmail.modify`. Seuls `gmail.readonly` et `gmail.send` étaient demandés lors de l'OAuth. L'appel API échouait silencieusement côté Google.
- **Solution validee** : Ajouter `https://www.googleapis.com/auth/gmail.modify` aux scopes dans `auth/route.ts`, puis demander à l'utilisateur de déconnecter et reconnecter Gmail pour obtenir le nouveau scope.
- **Prevention** : Toujours lister exhaustivement les scopes Gmail nécessaires dès le départ. Chaque opération d'écriture (envoyer, supprimer, marquer) a son propre scope. Un scope manquant échoue silencieusement.
- **Agents impliques** : SPARK (dev), ATLAS (documentation)

---

### [API-003] Gmail OAuth — sujet vide dans le formulaire de réponse
- **Date** : 2026-04-08
- **Projet** : MonprojetPro Hub — Module Email
- **Categorie** : Intégration API externe (API)
- **Symptome** : En cliquant "Répondre", le champ sujet restait vide et le bouton Envoyer était désactivé.
- **Cause racine** : `useState(replyTo ? ... : '')` s'initialise une seule fois au montage du composant. `EmailComposer` est toujours monté (Dialog contrôlé par `open`), donc quand `replyTo` passe de `null` à un message, `useState` ne se réinitialise pas.
- **Solution validee** : Ajouter un `useEffect` synchronisant le state `subject` à chaque changement de `replyTo` :
  ```typescript
  useEffect(() => {
    setSubject(replyTo ? `Re: ${replyTo.subject}` : '')
  }, [replyTo])
  ```
- **Prevention** : Pour tout Dialog/Modal toujours monté (contrôlé par `open`), ne jamais se fier à `useState(prop)` pour des valeurs qui changent — toujours utiliser `useEffect`.
- **Agents impliques** : SPARK (dev), ATLAS (documentation)

---

### [RSC-001] Next.js — objets Error non sérialisables entre Server et Client Components
- **Date** : 2026-04-08
- **Projet** : MonprojetPro Hub
- **Categorie** : Next.js Server/Client (RSC)
- **Symptome** : Erreur console `Only plain objects can be passed to Client Components from Server Components. Error objects are not supported.`
- **Cause racine** : Les actions serveur retournaient `errorResponse('...', 'CODE', error)` où `error` était une instance d'`Error` ou un objet Supabase non-sérialisable. Quand la page RSC passait le résultat (même partiellement) à un Client Component, Next.js ne pouvait pas sérialiser l'objet Error.
- **Solution validee** : Dans tous les `catch` et retours d'erreur des Server Actions, sérialiser explicitement le `details` :
  ```typescript
  errorResponse('msg', 'CODE', { message: err instanceof Error ? err.message : String(err) })
  ```
- **Prevention** : Ne jamais passer d'objet `Error` ou d'objet Supabase brut en `details` d'une `errorResponse`. Toujours extraire `.message` en string.
- **Extension (2026-04-20)** : même pattern avec `ZodError` — `.parse()` lève une ZodError (objet complexe non-sérialisable) attrapée dans le `catch` et passée en `details`. RSC crash silencieux : l'UI affiche vide. **Règle dérivée** : dans les Server Actions listant des entités (map/transform), toujours utiliser `.safeParse()` (jamais `.parse()`) pour ne jamais lever d'exception Zod attrapée par le catch global.
- **Agents impliques** : SPARK (dev), ATLAS (documentation)

---

### [DB-001] CRM ClientDocumentsTab — colonnes inexistantes dans la table documents
- **Date** : 2026-04-08
- **Projet** : MonprojetPro Hub — Module CRM
- **Categorie** : Base de données / Schéma (DB)
- **Symptome** : L'onglet "Documents" dans la fiche client CRM affichait "Erreur de chargement".
- **Cause racine** : `getClientDocuments` dans le module CRM requêtait des colonnes `type`, `url`, `visible_to_client` qui correspondaient à un ancien schéma de table. La vraie table `documents` (créée par le module documents) a un schéma différent : `file_type`, `file_path`, `visibility`, `tags` — sans `type`, `url` ni `visible_to_client`.
- **Solution validee** : Remplacer `ClientDocumentsTab` pour utiliser `getDocuments` du module documents (bon schéma) et afficher une liste simple cohérente avec le design.
- **Prevention** : Quand deux modules requêtent la même table, toujours vérifier que les deux utilisent le même schéma. Éviter les actions dupliquées (`getClientDocuments` vs `getDocuments`) — un seul point d'accès par table.
- **Agents impliques** : SPARK (dev), ATLAS (documentation)

---

### [RSC-003] Constantes exportées depuis un fichier `'use client'` arrivent `undefined` au RSC
- **Date** : 2026-04-23
- **Projet** : MonprojetPro (apps/client — toggle Mode Lab/One)
- **Categorie** : Next.js Server/Client (RSC)
- **Symptome** : Le toggle Mode Lab/One posait bien le cookie `mpp_active_view=one` (confirmé DevTools + logs middleware), mais le layout serveur retournait toujours `activeMode='lab'`. La page `/` redirigeait systématiquement vers `/modules/parcours`. Bug invisible à la lecture du code — la logique `cookieStore.get(MODE_TOGGLE_COOKIE)` semblait correcte.
- **Cause racine** : `MODE_TOGGLE_COOKIE` était exporté depuis `packages/ui/src/components/mode-toggle.tsx` (marqué `'use client'`), puis ré-exporté par `packages/ui/src/index.ts`. Quand le layout serveur (RSC) faisait `import { MODE_TOGGLE_COOKIE } from '@monprojetpro/ui'`, **Next.js 15 transformait la constante en référence client et la valeur arrivait `undefined` côté serveur**. Le layout faisait donc `cookieStore.get(undefined)` → retournait `undefined` pour TOUTES les requêtes. Seules les FONCTIONS (Server Actions, composants React) passent correctement le pont client/serveur — les constantes, types, et primitives deviennent `undefined` quand elles transitent via un fichier `'use client'`.
- **Temps perdu** : ~2h de bobologie avant d'appeler FIX — j'ai testé 4 hypothèses incorrectes (cache RSC, `NextResponse.next({ request })`, Supabase SSR `setAll` qui masquait les cookies, race condition middleware/RSC). La cause n'est devenue évidente qu'en loggant la constante elle-même : `console.log('[FIX:LAYOUT-CONSTANT] MODE_TOGGLE_COOKIE =', MODE_TOGGLE_COOKIE)` → `undefined`.
- **Solution validee** :
  1. Créer un fichier dédié SANS `'use client'` : `packages/ui/src/components/mode-toggle-constants.ts` qui exporte uniquement les constantes (`MODE_TOGGLE_COOKIE`)
  2. Dans `packages/ui/src/index.ts`, exporter les constantes depuis ce fichier (pas depuis `mode-toggle.tsx`) :
     ```ts
     export { ModeToggle, type ModeToggleProps } from './components/mode-toggle'
     export { MODE_TOGGLE_COOKIE } from './components/mode-toggle-constants'
     ```
  3. Les Server Actions (fichiers `'use server'`) et les composants Server (RSC) importent depuis le fichier constants, pas depuis le composant client.
- **Prevention** :
  - **Jamais** mettre de constantes, types, ou primitives exportées dans un fichier `'use client'` qui sera consommé par des RSC
  - Organisation recommandée pour un composant client + sa Server Action + ses constantes partagées :
    - `xxx.tsx` ← `'use client'` : composant React + interfaces de props uniquement
    - `xxx-action.ts` ← `'use server'` : Server Actions (async functions only)
    - `xxx-constants.ts` ← aucune directive : constantes partagées côté serveur ET client
  - Règle de détection : si l'import vient d'un fichier `'use client'` ET que le consumer est un RSC/Server Action, tout ce qui n'est pas une fonction devient `undefined` en silence
  - À checker en code review : `grep -n "^'use client'" <fichier> && grep -n "^export const" <fichier>` — si les deux existent, c'est suspect
- **Agents impliques** : SPARK (dev initial), FIX (diagnostic méthodique via sondes de log), ATLAS (documentation)

---

### [RSC-002] Thread email non rafraîchi après envoi d'une réponse
- **Date** : 2026-04-08
- **Projet** : MonprojetPro Hub — Module Email
- **Categorie** : Next.js Server/Client (RSC)
- **Symptome** : Après avoir envoyé une réponse à un email, le nouveau message n'apparaissait pas dans la conversation sans recharger la page.
- **Cause racine** : `EmailComposer` appelait `onClose()` après envoi, mais personne n'invalidait la query TanStack `['email-thread', thread.id]`. Le cache restait sur les anciens messages.
- **Solution validee** : Ajouter une prop `onSent?: () => void` à `EmailComposer`, appelée après succès. Dans `EmailThreadView`, passer `onSent={() => refetch()}`.
- **Prevention** : Après toute mutation (envoi, suppression, modification), toujours invalider ou refetch les queries TanStack concernées. Ne pas compter sur `onClose` seul — close et refresh sont deux responsabilités distinctes.
- **Agents impliques** : SPARK (dev), ATLAS (documentation)

---

### [DEP-001] Deploiement Vercel cassé pendant 2 jours — rebrand foxeo→monprojetpro non committé
- **Date** : 2026-04-14
- **Projet** : MonprojetPro (monorepo foxeo-one)
- **Phase** : Maintenance infra + rework Lab/One
- **Categorie** : Deploiement (DEP)
- **Symptome** :
  - Depuis ~2 jours (8 commits consécutifs), chaque push sur `master` déclenchait un build Vercel qui fail en ~1m15s
  - Message d'erreur générique : `Build failed because of webpack errors`
  - Mails d'alerte Vercel qui s'accumulent sans action corrective
  - L'URL de prod `foxeo-one.vercel.app` affichait encore la vieille appli "product brief" (précurseur du projet actuel)
  - Build local `npm run build` : PASSAIT sans erreur (ce qui a masqué le problème)
- **Cause racine** :
  - **1172 fichiers modifiés localement sur le disk mais jamais committés dans Git**. C'était un rebrand massif `foxeo → monprojetpro` + du WIP modules (agenda, elio, auth, documents) qui s'était accumulé sans commit
  - Les fichiers locaux utilisaient `@monprojetpro/ui`, les fichiers dans Git utilisaient encore `@foxeo/ui`
  - Tous les commits récents (ADRs, Phase 2 rework, Epic 13 stories) avaient été ajoutés avec des imports `@monprojetpro/*` mais greffés sur un repo dont les packages s'appelaient encore `@foxeo/*`
  - Webpack ne résolvait pas les imports → compilation fail
  - Le build local marchait parce qu'il utilisait le disk (fichiers rebrandés visibles). Vercel clone depuis Git → fichiers rebrandés invisibles → fail
- **Fausses pistes** :
  1. **FAUSSE PISTE — `typescript.ignoreBuildErrors: true` manquant sur apps/client** : Ajouté dans `next.config.ts` pour aligner sur apps/hub. Bon fix mais pas la cause principale. Révélé au passage 524 erreurs TS pré-existantes liées à `database.types.ts` incomplet (voir CFG-002).
  2. **FAUSSE PISTE — Imports cassés dans pages onboarding** : `apps/client/app/onboarding/welcome/page.tsx` et `tour/page.tsx` avaient `../../../components/...` au lieu de `../../components/...`. Fix réel nécessaire mais symptôme secondaire, pas la cause racine.
  3. **FAUSSE PISTE — Type narrowing cassé dans (dashboard)/layout.tsx** : Ternaire `user ? await query : { data: null }` unifiait `clientRecord` à `never`. Remplacé par un `if (user)` explicite. Fix réel nécessaire mais symptôme secondaire.
  4. **FAUSSE PISTE — Projet Vercel mal configuré** : L'ancien projet `foxeo-one` sur Vercel avait `rootDirectory: null` (tentait de builder la racine du monorepo au lieu de apps/hub ou apps/client), et était historiquement lié à l'ancien repo `foxeo-appli-brief`. Suppression + création de 2 nouveaux projets `monprojetpro-hub` et `monprojetpro-client` avec Root Directory. Bon fix infra mais Vercel continuait à fail ensuite sur les nouveaux projets pour la même cause racine (rebrand).
- **Solution validee** :
  - Commit `63b55e6 chore: rebrand foxeo → monprojetpro + sync WIP non committé` — 1190 fichiers, +12422 / -3502 lignes
  - `git add -A && git commit -m "chore: rebrand..."` après avoir ajouté `.playwright-mcp/` au `.gitignore`
  - Renumérotation préalable de 5 story files Epic 13 conflictuels (13.2-13.5 + 13.1-renommage devenus 13.6-13.10) pour éviter une collision de numéros avec les stories déjà committées
  - Push sur master → Vercel build vert en ~5 minutes sur les 2 projets (Hub + Client)
- **Temps perdu** : ~1h30 d'investigation multi-layer, 4 commits intermédiaires, 1 reconfig Vercel complète
- **Prevention** (garde-fous critiques pour la suite) :
  1. **Réflexe #1 quand un build Vercel/CI échoue alors que le local passe** : immédiatement `git status | wc -l`. Si > 10 fichiers modifiés non committés, **c'est quasi sûr** que le build local utilise du code absent de Git. Ce reflex aurait économisé 1h sur cet incident.
  2. **Ne jamais laisser s'accumuler plus de 24h d'alertes Vercel** sans action. Si un fix demande plus de 5 min, créer immédiatement une Story ou tâche pour ne pas l'oublier. Plus le temps passe, plus les commits s'empilent et cachent la cause racine.
  3. **Quand plusieurs fixes semblent résoudre chacun un bout du problème**, ne PAS s'arrêter après le premier fix local qui passe — toujours push + vérifier Vercel avant de proclamer victoire. Ici, les 3 premiers fixes étaient réels mais aucun n'était LA cause.
  4. **Toujours lire le MESSAGE D'ERREUR Vercel en détail**, pas juste le code 1. Dans le log turbo de cet incident, `@foxeo/hub:build` apparaissait au lieu de `@monprojetpro/hub:build` — c'était le signal direct du désalignement disk/Git, visible dès le premier fail si on avait lu le log ligne par ligne.
  5. **Avant toute création de fichiers Stories avec numéros**, lancer `ls _bmad-output/implementation-artifacts/ | grep "^NN-"` ET `git status` pour voir ce qui existe DÉJÀ en Git + en WIP non committé. Les collisions de numéros ont été un effet secondaire de ce même désalignement.
- **Agents impliques** : SPARK (dev), ATLAS (documentation), LEO (orchestration infra Vercel)

---

### [GIT-001] Build local OK mais CI échoue — toujours vérifier `git status` en premier
- **Date** : 2026-04-14
- **Projet** : MonprojetPro
- **Categorie** : Git / Workflow (GIT)
- **Symptome** : Un build local (`npm run build`) réussit, mais le même commit échoue sur Vercel, GitHub Actions, ou tout autre CI.
- **Cause racine** : Le build local compile les fichiers du **disk** (incluant des modifications non committées et non stagées), alors que le CI clone le repo Git depuis le remote et compile uniquement ce qui est commité. Tout fichier modifié localement et non pushé est invisible au CI.
- **Solution validee** :
  ```bash
  git status | wc -l           # rapide diagnostic
  git status --short | head    # liste les fichiers désynchronisés
  git diff --stat              # volumétrie des changements
  ```
  Si > 10 fichiers modifiés, investiguer pourquoi (find/replace pas committé, WIP accumulé, rebrand partiel).
- **Prevention** :
  - **Réflexe obligatoire** : devant tout "local OK, CI KO", commencer par `git status` AVANT de toucher à next.config.ts, tsconfig, les projets CI, ou tout autre config technique
  - Pour les opérations de rebrand/renommage à grande échelle, faire un `git status` + commit **immédiatement après** la phase de find/replace, pas "quand on aura fini"
  - Si un commit contient des changements sur > 500 fichiers, c'est acceptable mais doit être un commit dédié `chore: rebrand` ou `refactor: rename` — pas mélangé à du WIP fonctionnel
- **Agents impliques** : SPARK, LEO, ATLAS

---

### [DEP-002] Vercel monorepo — 1 projet Vercel par app, Root Directory obligatoire
- **Date** : 2026-04-14
- **Projet** : MonprojetPro (monorepo Turborepo)
- **Categorie** : Deploiement (DEP)
- **Symptome** : Build Vercel qui fail en ~1m15s sans message clair, avec des imports `@monprojetpro/*` non résolus. Ou : projet Vercel qui tente de builder la racine du monorepo mais n'y trouve pas de `next.config.ts`.
- **Cause racine** : Un projet Vercel configuré par défaut (sans Root Directory) tente de build la racine du repo comme une simple app Next.js. Pour un monorepo Turborepo + Next.js avec plusieurs apps, cette config n'a aucun sens — la racine contient `turbo.json`, `package.json` workspace, mais pas de `next.config.ts`.
- **Solution validee** :
  - Créer **un projet Vercel par app** : `monprojetpro-hub` pour `apps/hub`, `monprojetpro-client` pour `apps/client`
  - Pour chaque projet, configurer :
    - `framework: "nextjs"`
    - `rootDirectory: "apps/hub"` (ou `apps/client`) — **obligatoire**
    - `sourceFilesOutsideRootDirectory: true` — permet à Vercel d'inclure `packages/*` dans le build context
    - Liaison GitHub au même repo, même branche (`master`) — Vercel détecte automatiquement quels fichiers appartiennent à quel projet
- **Commandes utiles (API REST Vercel)** :
  ```bash
  # Créer un projet
  curl -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
    "https://api.vercel.com/v11/projects?teamId=$TEAM_ID" \
    -d '{"name":"monprojetpro-hub","framework":"nextjs","rootDirectory":"apps/hub","gitRepository":{"type":"github","repo":"MonprojetPro/foxeo-one"}}'

  # Inspecter un projet existant
  curl -H "Authorization: Bearer $TOKEN" "https://api.vercel.com/v9/projects/$NAME?teamId=$TEAM_ID"

  # Supprimer un projet mal configuré
  curl -X DELETE -H "Authorization: Bearer $TOKEN" "https://api.vercel.com/v9/projects/$NAME?teamId=$TEAM_ID"
  ```
- **Token Vercel CLI** (Windows) : `C:\Users\{user}\AppData\Roaming\com.vercel.cli\Data\auth.json`, extraire avec `grep -oP '"token"\s*:\s*"\K[^"]+'`
- **Prevention** : Pour tout nouveau monorepo Next.js déployé sur Vercel, créer les projets avec Root Directory **dès le départ**. Ne jamais se fier à l'auto-détection Vercel pour les monorepos — elle casse silencieusement. Documenter les IDs de projets et le TEAM_ID quelque part d'accessible (mais pas en clair dans le chat).
- **Agents impliques** : LEO (orchestration infra), SPARK, ATLAS

---

### [DEP-003] Vercel Ignored Build Step — les commits vides sont CANCELED en 0 seconde
- **Date** : 2026-04-14
- **Projet** : MonprojetPro
- **Categorie** : Deploiement (DEP)
- **Symptome** : Un `git commit --allow-empty && git push` déclenche un deploy Vercel qui passe immédiatement en `state: CANCELED` sans avoir buildé. `buildingAt` et `canceledAt` sont identiques (même timestamp).
- **Cause racine** : Vercel a un système "Ignored Build Step" activé par défaut pour les projets monorepo. Si aucun fichier dans le Root Directory (ni ses dépendances `packages/*` avec `sourceFilesOutsideRootDirectory: true`) n'a été modifié dans le commit, le build est skippé automatiquement pour économiser des minutes. Un commit vide tombe dans ce cas.
- **Solution validee** : Forcer un deploy via l'API REST Vercel plutôt que par push :
  ```bash
  # Récupérer le repoId depuis le projet
  REPO_ID=$(curl -s -H "Authorization: Bearer $TOKEN" \
    "https://api.vercel.com/v9/projects/$PROJ?teamId=$TEAM_ID" | \
    python -c 'import json,sys; print(json.load(sys.stdin)["link"]["repoId"])')

  # Déclencher un deploy forcé
  curl -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
    "https://api.vercel.com/v13/deployments?teamId=$TEAM_ID&forceNew=1&skipAutoDetectionConfirmation=1" \
    -d "{\"name\":\"$PROJ\",\"project\":\"$PROJ\",\"target\":\"production\",\"gitSource\":{\"type\":\"github\",\"repoId\":$REPO_ID,\"ref\":\"master\",\"sha\":\"$SHA\"}}"
  ```
- **Gotcha** : la propriété `repoId` dans `gitSource` est **obligatoire** et doit être un **int** (pas un string). Sans ça, l'API retourne `Invalid request: gitSource missing required property repoId`.
- **Prevention** : Ne pas utiliser `git commit --allow-empty` pour déclencher un redeploy Vercel — ça sera cancelé. Préférer l'API REST pour un deploy forcé, ou faire un vrai changement dans le Root Directory. Note : c'est un comportement VOULU de Vercel, pas un bug.
- **Agents impliques** : LEO, ATLAS

---

### [SEC-001] Pousser des variables d'env Vercel sans exposer les valeurs dans le chat
- **Date** : 2026-04-14
- **Projet** : MonprojetPro
- **Categorie** : Sécurité / Secrets (SEC)
- **Symptome** : Besoin de configurer des env vars (Supabase, Pennylane, Google, etc.) sur un nouveau projet Vercel via CLI/agent, sans jamais afficher les valeurs dans le terminal ou le chat (risque d'exposition, logs, capture d'écran).
- **Solution validee** — Pattern "read file + JSON encode + POST silencieux" :
  ```bash
  push_var() {
    local project="$1" key="$2" env_file="$3"
    # Lire la valeur sans l'echo
    local value=$(grep -oP "^${key}=\K.*" "$env_file" | sed 's/^"//;s/"$//' | head -1)
    if [ -z "$value" ]; then echo "  ⚠ $key absent"; return; fi
    # Construire le body JSON en Python (echappement safe des chars spéciaux)
    local body=$(python -c "import json,sys; print(json.dumps({'key':sys.argv[1],'value':sys.argv[2],'type':'encrypted','target':['production','preview','development']}))" "$key" "$value")
    # POST silencieux
    local response=$(curl -s -X POST \
      -H "Authorization: Bearer $VERCEL_TOKEN" \
      -H "Content-Type: application/json" \
      "https://api.vercel.com/v10/projects/$project/env?teamId=$TEAM_ID" \
      -d "$body")
    # Sortie : uniquement la clé + status (jamais la valeur)
    if echo "$response" | grep -q '"key"'; then echo "  ✓ $key"
    elif echo "$response" | grep -q 'already exists'; then echo "  ↻ $key (existait déjà)"
    else echo "  ✗ $key"; fi
  }
  for k in NEXT_PUBLIC_SUPABASE_URL SUPABASE_SERVICE_ROLE_KEY ...; do
    push_var "monprojetpro-hub" "$k" "apps/hub/.env.local"
  done
  ```
- **Règles strictes à respecter** :
  - La valeur n'est JAMAIS echo, printf, ou passée par `$value` dans une commande visible
  - Les valeurs sont passées en argv à Python (pas via env var, pas via string interpolation bash)
  - Le stdout ne contient que `✓ KEY` / `✗ KEY` / `⚠ KEY` / `↻ KEY`
  - `curl -s` (silent) pour ne pas afficher les progress bars
  - Parser les réponses JSON via Python pour éviter les logs verbeux
- **Prevention** :
  - Quand un utilisateur dit "jamais les clés dans le chat", ce pattern est la référence
  - Toujours lire les secrets depuis `.env.local` local (qui est gitignored) et pousser via API
  - Whitelist explicite des clés à pusher — éviter `for k in $(grep -oP '...' file)` qui pourrait pousser des vars imprévues (NODE_ENV, TEST_VAR, etc.)
  - Filtrer les URLs localhost (NEXT_PUBLIC_HUB_URL=http://localhost:3000) avant push prod
- **Agents impliques** : LEO, SPARK, ATLAS

---

### [CFG-002] database.types.ts incomplet → queries Supabase résolues à `never` par TypeScript
- **Date** : 2026-04-14
- **Projet** : MonprojetPro
- **Categorie** : Configuration (CFG)
- **Symptome** : `npx tsc --noEmit` remonte des centaines d'erreurs `Property 'id' does not exist on type 'never'` sur chaque `.from('clients').select(...).single()` ou `.maybeSingle()`. Le build Next.js fail en strict mode, le dev mode masque le problème.
- **Cause racine** : Le fichier `packages/types/src/database.types.ts` est maintenu manuellement et ne décrit que 7 tables sur ~30+ réellement présentes dans les migrations Supabase. Les tables non typées (`parcours`, `documents`, `meetings`, `quotes`, `invoices`, `billing_sync`, `client_instances`, `validation_requests`, `chat_messages`, etc.) retournent `never` quand on query via le client Supabase typé. Cette cascade propage `never` à toutes les destructurations suivantes.
- **Fausses pistes** :
  1. **FAUSSE PISTE — Type narrowing ternaire** : On peut rewriter `user ? await query : { data: null }` en `if (user) { ... }` pour contourner localement. Ça marche page par page mais ne résout pas la cause (524 erreurs restent).
  2. **FAUSSE PISTE — Casting manuel** : `as any` ou définir des types locaux. Fonctionne mais crée une dette énorme et n'est pas scalable sur toute la codebase.
- **Solution validee (pragmatique/temporaire)** : Ajouter `typescript: { ignoreBuildErrors: true }` dans `next.config.ts` de chaque app concernée. C'était déjà en place sur `apps/hub/next.config.ts`, il manquait sur `apps/client/next.config.ts`. Cette solution :
  - Désactive le type-check Next.js au build (le code est compilé quand même)
  - Les tests Vitest continuent de type-check leurs propres fichiers normalement
  - Le dev mode affiche toujours les erreurs TS dans l'éditeur
  - Crée une dette technique documentée (commentaire dans next.config.ts)
- **Solution définitive (à planifier)** :
  - Lancer Supabase local : `npx supabase start`
  - Régénérer le fichier : `npx supabase gen types typescript --local > packages/types/src/database.types.ts`
  - Commit le fichier régénéré
  - Retirer `ignoreBuildErrors` de `next.config.ts`
  - **Dette technique à tracker** : créer une Story dédiée "Regenerate database.types.ts from local Supabase" dans un sprint infra
- **Prevention** :
  - Ne jamais modifier `database.types.ts` à la main au-delà d'ajustements mineurs — toujours régénérer après chaque migration significative
  - Quand un nouveau projet Next.js est ajouté au monorepo, copier la config `ignoreBuildErrors: true` depuis les projets existants si cette dette n'est pas encore résolue
  - Documenter la dette dans CLAUDE.md ou dans un README infra pour que les nouveaux contributeurs la connaissent
- **Agents impliques** : SPARK, ATLAS

---

### [DL-003] Bucket Supabase Storage à créer dans la migration — sans ça, l'upload échoue silencieusement
- **Date** : 2026-04-22
- **Projet** : MonprojetPro One
- **Phase** : Story 14.6 — Nourrir Élio par étape
- **Categorie** : Téléchargement / Storage (DL)
- **Symptome** : `supabase.storage.from('step-contexts').upload(...)` retourne `StorageError: Bucket not found`. L'erreur est catchée dans un `if (uploadError)` et retourne `STORAGE_ERROR`. Toutes les injections fichier échouent au premier déploiement.
- **Cause racine** : Le bucket n'est pas créé automatiquement à l'upload. Il faut l'insérer dans `storage.buckets` via une migration SQL. Sans ça, le bucket n'existe pas en production même si le code l'utilise.
- **Solution** : Ajouter dans la migration correspondante (même fichier `.sql`) un `INSERT INTO storage.buckets (...) ON CONFLICT (id) DO NOTHING` avec les paramètres `public: false`, `file_size_limit`, `allowed_mime_types`, suivi de la policy RLS Storage.
- **Regle a suivre** : Toute feature qui introduit un nouveau bucket Storage DOIT créer ce bucket dans la migration associée. Ne jamais compter sur la création manuelle via le dashboard Supabase.
- **Agents impliques** : SPARK, SCAN, ATLAS

---

### [DL-004] Validation MIME dans extractFileText — utiliser MIME uniquement, pas OR avec extension
- **Date** : 2026-04-22
- **Projet** : MonprojetPro One
- **Phase** : Story 14.6 — Nourrir Élio par étape
- **Categorie** : Téléchargement / Storage (DL)
- **Symptome** : Pattern `const isTxt = ext === 'txt' || mime === 'text/plain'` permet à un fichier image PNG avec extension `.txt` de passer la validation de type. Il est décodé en UTF-8 → données corrompues en base.
- **Cause racine** : L'extension `.ext` côté client est falsifiable. Le MIME type `file.type` est la seule valeur que le navigateur renseigne à partir du fichier réel (même si non-garanti sur certains OS). La validation externe dans `inject-step-context.ts` valide déjà le MIME — l'utilitaire interne doit faire pareil.
- **Solution** : Dans les fonctions d'extraction, utiliser `mime === 'text/plain'`, `mime === 'application/pdf'`, etc. — jamais de OR avec l'extension.
- **Regle a suivre** : La validation MIME est toujours prioritaire sur l'extension. L'extension peut être un indice UI (affichage utilisateur) mais pas une décision de sécurité.
- **Agents impliques** : SPARK, SCAN, ATLAS

---

### [DL-005] Nettoyage Storage orphelin sur delete et rollback DB — toujours les deux
- **Date** : 2026-04-22
- **Projet** : MonprojetPro One
- **Phase** : Story 14.6 — Nourrir Élio par étape
- **Categorie** : Téléchargement / Storage (DL)
- **Symptome** : Sans nettoyage explicite, chaque suppression de contexte-fichier laisse un fichier orphelin dans le bucket. Idem si l'upload réussit mais l'insert DB échoue : le fichier reste sans référence.
- **Cause racine** : Supabase Storage n'a pas de CASCADE automatique depuis une table SQL. La cohérence entre DB et Storage est gérée uniquement par le code applicatif.
- **Solution** :
  1. À la suppression d'un contexte : récupérer `file_path` avant le DELETE, puis appeler `storage.from(bucket).remove([filePath])` si non-null.
  2. Si l'insert DB échoue après un upload réussi : appeler `storage.from(bucket).remove([filePath]).catch(() => {})` avant de retourner l'erreur.
- **Regle a suivre** : Chaque action qui écrit dans Storage ET en DB doit prévoir les deux opérations de nettoyage (rollback upload si DB fail, cleanup Storage si delete DB).
- **Agents impliques** : SPARK, SCAN, ATLAS

---

### [API-004] Google Workspace — Service Account désactivé par la politique org (iam.disableServiceAccountKeyCreation)
- **Date** : 2026-04-22
- **Projet** : MonprojetPro One
- **Phase** : Story 15.1 — Auth Google Meet API
- **Categorie** : Intégration API externe (API)
- **Symptome** : Tentative de créer une clé JSON pour un Service Account → erreur `iam.disableServiceAccountKeyCreation` bloquée par la politique Google Workspace.
- **Cause racine** : Google Workspace peut interdire la création de clés Service Account au niveau org. C'est une pratique de sécurité courante.
- **Solution** : Utiliser OAuth2 Web Application avec refresh token à la place. L'OAuth Playground (`https://developers.google.com/oauthplayground`) permet de générer un refresh_token long-durée. L'URL de redirect `https://developers.google.com/oauthplayground` doit être dans les URIs autorisées de l'OAuth client.
- **Regle a suivre** : Pour les Google Workspace APIs, préférer OAuth2 + refresh token dès le départ. Vérifier si les Service Accounts sont autorisés avant de baser l'architecture dessus.
- **Agents impliques** : SPARK, ARCH, ATLAS

---

### [API-005] Dependency injection dans les composants partagés pour les Server Actions Hub-spécifiques
- **Date** : 2026-04-22
- **Projet** : MonprojetPro One
- **Phase** : Story 15.2 — Migration OpenVidu → Google Meet
- **Categorie** : Intégration API externe (API)
- **Symptome** : Le module `packages/modules/visio` ne peut pas importer `apps/hub/lib/google-meet-client.ts` — une app ne peut pas être importée depuis un package dans une architecture Turborepo.
- **Cause racine** : Dans un monorepo, les packages ne connaissent pas les apps. La logique Hub-spécifique (appel Google Meet API) ne peut pas être dans le module partagé.
- **Solution** : Pattern de dependency injection via prop `createMeetingAction?: CreateMeetingFn` sur le composant partagé `MeetingScheduleDialog`. Le Hub passe sa propre action `createHubMeeting` (qui appelle Google Meet + createMeeting). Le module garde son action `createMeeting` par défaut.
- **Regle a suivre** : Quand un composant partagé doit avoir un comportement différent selon l'app (Hub vs Client), utiliser une prop d'action injectable plutôt que de mettre la logique d'app dans le package.
- **Agents impliques** : SPARK, ARCH, SCAN, ATLAS

---

### [DEP-004] Tailwind v4 — @source non hérité des fichiers importés sur Vercel
- **Date** : 2026-04-24
- **Projet** : MonprojetPro One
- **Categorie** : Déploiement (DEP)
- **Symptome** : Après un commit ajoutant `OneElioBox`, l'intégralité du CSS disparaît sur Vercel (HTML brut sans styles). En local, tout fonctionne correctement.
- **Cause racine** : `apps/client/app/globals.css` importait `@monprojetpro/ui/globals.css` qui lui contenait les directives `@source`. Sur Vercel, le compilateur Tailwind v4 ne résout les `@source` que depuis le **fichier CSS racine** — pas depuis les fichiers importés. Le Hub avait les `@source` directement dans son propre `globals.css`, pas le client.
- **Solution** : Ajouter les directives `@source` explicitement dans `apps/client/app/globals.css` (même pattern que `apps/hub/app/globals.css`).
- **Regle a suivre** : Chaque app (`hub`, `client`) doit avoir ses propres directives `@source` dans son `globals.css` racine. Ne jamais compter sur les `@source` d'un fichier importé pour le build Vercel.
- **Agents impliques** : SPARK, FIX, ATLAS

---

### [DEP-005] Layout client sans guard — compte Hub operator génère un dashboard Lab cassé
- **Date** : 2026-04-24
- **Projet** : MonprojetPro One
- **Categorie** : Déploiement (DEP)
- **Symptome** : En se connectant avec un compte Hub operator sur l'app client (`localhost:3000`), on atterrit sur un dashboard Lab vide (sidebar avec seulement "Dashboard", contenu noir, avatar "CL"), et on ne peut plus se déconnecter normalement.
- **Cause racine** : `apps/client/app/(dashboard)/layout.tsx` ne vérifiait pas si l'user authentifié avait un enregistrement dans la table `clients`. En l'absence d'enregistrement, il defaultait en mode Lab avec `activeModules: ['core-dashboard']` au lieu de rediriger vers `/login`.
- **Solution** : Ajouter deux guards dans le layout : `if (!user) redirect('/login')` et `if (!clientRecord) redirect('/login')`.
- **Regle a suivre** : Tout layout de dashboard client DOIT vérifier l'existence du record client après l'auth, avant de rendre quoi que ce soit. Un user authentifié sans record client ne doit jamais voir de dashboard — il doit être renvoyé au login.
- **Agents impliques** : SPARK, FIX, ATLAS

---

### [RSC-004] PostgREST join imbriqué échoue silencieusement si la colonne n'existe pas → count ≠ résultats
- **Date** : 2026-04-29
- **Projet** : MonprojetPro
- **Categorie** : Next.js Server/Client (RSC)
- **Symptome** : Widget "Messages non lus" du Hub affichait un badge count=1 mais l'encart montrait "Aucun message en attente". La requête count (sans join) retournait 1. La requête data (avec join `clients(company_name)`) retournait [].
- **Cause racine** : La colonne `company_name` n'existe pas dans la table `clients` (la colonne s'appelle `company`). PostgREST échoue silencieusement sur un join avec une colonne inconnue → INNER JOIN → zéro résultats. Le count sans join fonctionnait normalement.
- **Solution** : Supprimer le join `clients(company_name)` et construire un `clientNameMap` depuis la requête clients déjà disponible (sans join supplémentaire).
- **Regle a suivre** : Toujours vérifier le nom exact des colonnes avant d'utiliser un embed PostgREST. Un join sur une colonne inexistante ne remonte pas d'erreur — il filtre silencieusement tous les résultats.

---

### [RSC-005] Server Action → router auto-refresh → crash client-side (React #310)
- **Date** : 2026-04-29
- **Projet** : MonprojetPro
- **Categorie** : Next.js Server/Client (RSC)
- **Symptome** : Page blanche client-side ~1 sec lors du toggle One → Lab. React error #310 "Rendered more hooks than during the previous render."
- **Cause racine** : Next.js déclenche un router auto-refresh après chaque Server Action. La Server Action `setActiveViewMode` + `revalidatePath` déclenchait un re-render RSC en background en race avec `window.location.replace('/')`. Même sans `revalidatePath`, le router auto-refresh suffisait.
- **Fausses pistes** :
  1. Supprimer `revalidatePath` → toujours en erreur (le router auto-refresh persiste)
  2. Poser le cookie côté client (sans Server Action) + `window.location.replace('/')` → résoud la Server Action mais `/` redirecte vers `/modules/parcours` côté serveur → React #310 sur le redirect intermédiaire
- **Solution** : Cookie posé via `document.cookie` JS (httpOnly=false), puis `window.location.replace(destination)` vers la page FINALE directement (`/modules/parcours` pour Lab, `/` pour One). Zéro Server Action, zéro redirect intermédiaire, zéro hooks mismatch.
- **Regle a suivre** : Quand une page fait `redirect()` côté serveur, ne jamais naviguer vers elle via une Server Action — aller directement à la destination finale pour éviter les navigations client en cascade.

---

### [RSC-006] RLS client session bloque les lookups cross-user dans les Server Actions
- **Date** : 2026-04-29
- **Projet** : MonprojetPro
- **Categorie** : Next.js Server/Client (RSC)
- **Symptome** : Notification jamais créée quand le client envoie un message au Hub. La cloche Hub restait vide.
- **Cause racine** : `createServerSupabaseClient()` utilise l'ANON KEY + session utilisateur → RLS appliquée. Quand la Server Action tourne dans le contexte du client, la requête `operators.auth_user_id` est bloquée par RLS. `operatorRow` retourne null → bloc `if (operatorRow?.auth_user_id)` jamais exécuté → notification jamais insérée.
- **Solution** : Utiliser `createServiceRoleSupabaseClient()` (bypass RLS) pour les lookups cross-user et les inserts de notifications dans les Server Actions. Le `createServerSupabaseClient()` reste pour la vérification d'identité de l'appelant.
- **Regle a suivre** : Toute opération nécessitant de lire des données d'un autre utilisateur (operator → client, client → operator) doit utiliser le service role. Ne jamais supposer que la session de l'appelant a accès aux tables de l'autre partie.
- **Agents impliques** : FIX, SPARK, ATLAS
