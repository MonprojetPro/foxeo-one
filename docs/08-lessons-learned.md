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
| DB | Base de données / Schéma | 2 |
| DEP | Déploiement | 6 |
| GIT | Git / Workflow | 1 |
| SEC | Sécurité / Secrets | 2 |
| UI | Interface / CSS | 1 |
| DRY | Logique dupliquée / Architecture | 1 |

---

## Lecons

### [DB-002] UPDATE filtré par la RLS = 0 ligne modifiée SANS erreur → flag jamais posé → boucle middleware
- **Date** : 2026-07-07
- **Projet** : MonprojetPro
- **Phase** : Bug graduation — « Accéder au dashboard » renvoie en boucle sur l'animation Félicitations
- **Categorie** : Base de données / Schéma (DB)
- **Symptome** : le client gradué clique « Accéder au dashboard » (depuis celebrate, discover-one ou le tour) → toast de succès → retour immédiat sur `/graduation/celebrate`. Boucle infinie, aucun log d'erreur nulle part.
- **Cause racine** : `markGraduationScreenShown()` faisait un `UPDATE clients SET graduation_screen_shown = TRUE` avec le client Supabase **du client connecté**. Or la table `clients` n'a **aucune policy UPDATE owner** (seulement `clients_update_operator`, migration 00012). Un UPDATE dont la clause USING de la RLS filtre toutes les lignes modifie **0 ligne et ne retourne AUCUNE erreur** — le code croyait avoir réussi, le flag restait FALSE, et le middleware (qui redirige tout client `graduated_at != null && !graduation_screen_shown` vers celebrate) rebouclait. Jumelle de la leçon mémoire « INSERT RETURNING bloqué par la RLS SELECT » : les policies RLS échouent en silence sur les lignes filtrées.
- **Solution validee** : RPC `fn_mark_graduation_screen_shown()` SECURITY DEFINER (migration 00143) qui ne pose QUE ce flag, sur la seule row du caller (`auth_user_id = auth.uid() AND graduated_at IS NOT NULL`), et **retourne le row count**. La Server Action vérifie `updated === true`, l'UI vérifie `{ error }` et NE redirige PAS en cas d'échec (rediriger = re-boucler).
- **Regle a suivre** : (1) toute mutation self-service d'un client sur une table où il n'a pas de policy d'écriture passe par une RPC SECURITY DEFINER dédiée qui retourne une preuve d'effet (row count) ; (2) après un UPDATE/DELETE côté user, ne JAMAIS conclure au succès sur la seule absence d'erreur — vérifier l'effet ; (3) un `await serverAction()` dont on ignore le retour dans l'UI est un bug latent : toujours destructurer `{ error }`. ⚠️ Vérifier `complete-onboarding.ts` : même pattern (UPDATE clients self-service) — même bug latent probable.


### [DRY-001] Une décision dupliquée dans N consumers diverge et casse en cascade → résolveur unique
- **Date** : 2026-06-16
- **Projet** : MonprojetPro
- **Phase** : Bug en cascade puis refonte — modèle Lab/One (toggle de mode côté client)
- **Categorie** : Logique dupliquée / Architecture (DRY)
- **Symptome** : MiKL désactive le Lab d'un client depuis le Hub. Selon l'écran : le shell passe bien en One, **mais** la home redirige vers le parcours Lab (One-shell + contenu Lab), et la page `/modules/parcours` reste accessible. Chaque correctif en révélait un autre (4 allers-retours avant stabilisation).
- **Cause racine** : la même décision « quel mode afficher (lab/one) ? » était **réécrite à la main dans 4 fichiers** (`layout.tsx`, `page.tsx`, `modules/parcours/page.tsx`, `modules/elio/page.tsx`), avec des conditions **subtilement différentes** : le layout appliquait le garde `cookie==='lab' && lab_mode_available`, mais la home et la page parcours honoraient le cookie **sans** ce garde. Tant que tous les flags restaient « ouverts » la divergence était invisible ; dès qu'un flag se fermait (`lab_mode_available=false`), les consumers se contredisaient. S'ajoutaient : (a) un **consumer Realtime oublié** — `client_configs` n'était pas dans la publication `supabase_realtime`, donc aucune propagation live ; (b) un **flag d'ADR jamais implémenté** (`one_mode_available`) qui forçait le code à déduire l'accès One depuis `dashboard_type`, modélisant mal la matrice.
- **Solution validee** : extraire **un résolveur unique** `resolveClientMode()` dans `@monprojetpro/utils` (entrées : `dashboardType`, `lab_mode_available`, `one_mode_available`, `cookieMode` ; sorties : `activeMode` + `canSwitch` + `labLocked`/`oneLocked`), importé par les 4 consumers ET par le `ModeToggle`. Ajout du flag manquant `one_mode_available` (migration + backfill). Ajout de `client_configs` à la publication Realtime + écoute dans `RealtimeDashboardRefresh`.
- **Regle a suivre** : dès qu'une **règle de décision** (résolution de mode, calcul de permission, dérivation d'état) doit être lue par **plus d'un endroit**, elle vit dans **une seule fonction pure partagée** — jamais recopiée. Recopier = garantir une divergence future silencieuse. Corollaire : (1) toute table lue en SSR et mutée ailleurs doit être dans `supabase_realtime` + écoutée ; (2) un flag décrit dans un ADR mais absent du schéma est une dette — l'implémenter ou acter explicitement sa non-implémentation, jamais le contourner en silence.


### [UI-001] `field-sizing-content` sur un textarea le fait déborder hors de son conteneur
- **Date** : 2026-06-05
- **Projet** : MonprojetPro
- **Phase** : Patch — formulaire de signalement (module support)
- **Categorie** : Interface / CSS (UI)
- **Symptome** : En tapant un texte long **sans espaces** (« tttttt… ») dans le `Textarea` du dialogue « Signaler un problème », le champ s'élargissait horizontalement et faisait **déborder toute la modale hors de l'écran** (le `max-width` de la modale n'était pas respecté).
- **Cause racine** : Le composant `Textarea` de base (`packages/ui/src/textarea.tsx`) porte la classe `field-sizing-content` (auto-dimensionnement au contenu). Combinée au `min-width: auto` par défaut des éléments de grid/flex, la largeur intrinsèque = celle du mot le plus long. Or en CSS **`min-width` prime sur `max-width`** : la modale (grid) était forcée plus large que son `max-w-2xl`.
- **Solution validee** : Ajouter `min-w-0 max-w-full break-words` au `Textarea` de base (corrige tous les textarea de l'app) + `min-w-0` sur le conteneur (form du dialogue) + `break-words` sur les textes libres affichés (descriptions de tickets).
- **Regle a suivre** : tout `Textarea` (et tout conteneur de texte libre saisi par l'utilisateur) doit avoir `min-w-0` + un retour à la ligne forcé (`break-words`/`overflow-wrap`). Ne jamais supposer que `max-width` suffit à contenir un élément à `field-sizing-content` dans un grid/flex.

---

### [DEP-006] Module importé mais non déclaré dans package.json → cache Turbo périmé → déploiement fantôme
- **Date** : 2026-06-05
- **Projet** : MonprojetPro
- **Phase** : Patch — améliorations module support (boutons statut Hub)
- **Categorie** : Déploiement (DEP)
- **Symptome** : Des modifs commitées + poussées (boutons de statut + badge coloré dans `ClientSupportTab`) ne s'affichaient JAMAIS sur le Hub déployé, alors que Vercel indiquait « success » pour `monprojetpro-hub`. La FAQ (même package `modules-support`, mais rendue dans l'app **client**) se mettait bien à jour. Hard refresh sans effet.
- **Cause racine** : `apps/hub/package.json` importait `@monprojetpro/modules-support` (et 6 autres modules) dans son code **sans les déclarer en `dependencies`**. Turborepo construit son graphe de dépendances à partir des `package.json`, pas des imports réels. Le Hub n'étant pas lié au module support, un changement du module **n'invalidait pas le cache de build du Hub** → Vercel restaurait l'ancien artefact depuis le cache Turbo et reportait « success » en servant l'**ancien code**. L'app client, elle, déclarait bien `modules-support` → cache invalidé → FAQ à jour.
- **Fausses pistes** :
  1. **FAUSSE PISTE — déploiement pas terminé / onglet périmé** : les statuts Vercel montraient « success » bien avant la capture, et un hard refresh ne changeait rien. Le build « réussissait » mais sur cache.
  2. **FAUSSE PISTE — REPLICA IDENTITY pour le Realtime** : supposé qu'il fallait `REPLICA IDENTITY FULL` pour le Realtime client. Vérifié : `validation_requests` (qui marche) utilise `default(PK)` comme `support_tickets`. Donc non.
  3. **FAUSSE PISTE — bug dans le code des boutons** : le code était correct depuis le début et compilait (prouvé : la FAQ du même package s'affichait).
- **Solution validee** : déclarer TOUS les modules importés dans `apps/hub/package.json` (7 ajoutés : `module-core-dashboard`, `module-documents`, `module-parcours`, `module-visio`, `modules-crm`, `modules-email`, `modules-support`), `npm install` pour resync le lockfile, commit → le Hub a alors fait un vrai rebuild (statut Vercel `pending` → `success`).
- **Diagnostic reproductible** : comparer `grep -rhoE "@monprojetpro/module[a-z-]+" apps/<app> --include="*.ts*"` (hors `.next`) avec les `dependencies` du `package.json` de l'app. Tout écart = bombe à retardement de cache.
- **Regle a suivre** : un build Vercel « success » ne prouve PAS que le code récent est servi (cache Turbo). Toute app du monorepo doit déclarer en `dependencies` chaque package `@monprojetpro/*` qu'elle importe. Attention aux noms tronqués (`module-core` ≠ `module-core-dashboard`).

---

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

### [UI-002] Prop optionnel oublié chez un consumer → composant partagé devient une coquille morte
- **Date** : 2026-06-16
- **Projet** : MonprojetPro — Module Documents
- **Categorie** : UI / Composants partagés
- **Symptome** : Dans le dialogue « Gestion des documents » (fiche client CRM), impossible de lire un document — le nom n'était pas cliquable. La même liste fonctionnait pourtant sur les pages plein-écran Hub/One.
- **Cause racine** : `DocumentList` rend le nom en lien viewer **uniquement si** le prop optionnel `viewerBaseHref` est fourni ; sinon en `<span>` inerte. `client-documents-tab.tsx` appelait `DocumentsPageClient` sans ce prop → aucune voie de lecture. Même classe que les « consumers oubliés » Realtime/RGPD : la feature est branchée à un endroit et morte à un autre.
- **Solution validee** : Découpler la lecture du prop optionnel — bouton « Lire » (aperçu EN PLACE via `DocumentPreviewModal`) présent partout, + nom cliquable (lien si `viewerBaseHref`, sinon aperçu). Une capacité essentielle (lire) ne doit pas dépendre d'un prop qu'un consumer peut oublier.
- **Bonus** : Un `header` fourni en **fonction** à `DataTable` ne s'affiche pas — la table rend `{column.header}` brut (pas d'appel). Passer du JSX, pas une fonction.
- **Prevention** : Pour un composant partagé, lister ses consumers (grep) avant de livrer et vérifier que la fonction cœur marche dans CHAQUE contexte d'appel, pas seulement le principal. Un prop optionnel qui désactive une capacité essentielle est un piège — préférer un défaut fonctionnel.
- **Agents impliques** : SPARK (dev), CERBÈRE (gate sécu — RAS), ATLAS (documentation)

---

### [UI-004] Composant codé + testé mais jamais rendu = capacité invisible (coquille inverse)
- **Date** : 2026-06-16
- **Projet** : MonprojetPro — Module CRM (onglet Lab)
- **Categorie** : Architecture UI / Complétude
- **Symptome** : MiKL ne pouvait pas activer le Lab d'un client sans paiement. Pourtant le composant `AccessToggles` (switch Lab/One → `toggleAccess`, avec confirmation + journalisation `activity_logs`) existait et était **entièrement testé**.
- **Cause racine** : `AccessToggles` n'était importé/rendu **dans aucune page** (grep `<AccessToggles` → 0 usage hors test). Une capacité 100% codée mais jamais branchée à l'UI est, du point de vue utilisateur, inexistante — l'inverse de la « coquille vide » (un bouton qui ne fait rien) : ici une fonction qui marche mais sans bouton.
- **Solution validee** : surfacer le composant dans l'onglet pertinent (section « Activation »). + corriger un écart de complétude : l'activation manuelle (`toggleAccess`) ne posait que `dashboard_type` alors que le chemin automatique (paiement) posait aussi `elio_lab_enabled` + `lab_mode_available` → « Lab activé » mais Élio Lab muet. Aligner les deux chemins.
- **Prevention** : après avoir codé un composant exposant une capacité, vérifier par grep qu'il est **réellement rendu** quelque part (pas seulement exporté/testé). Quand deux chemins activent la même chose (manuel vs automatique), ils doivent écrire le MÊME jeu de flags.
- **Agents impliques** : SPARK (dev), ATLAS

---

### [UI-003] Menu/dropdown : rogné par `overflow-auto`, puis non cliquable dans un dialogue Radix modal
- **Date** : 2026-06-16
- **Projet** : MonprojetPro — Module Documents
- **Categorie** : UI / Portals & overlays
- **Symptome** : (1) Le menu ⋯ d'une ligne de tableau s'affichait **tronqué**. (2) Une fois rendu via un portail, ses éléments étaient **visibles mais non cliquables** dans le dialogue « Gestion des documents ».
- **Cause racine** : (1) Le menu en `position:absolute` était rogné par le conteneur `overflow-auto` de la `DataTable`. (2) Porté sur `document.body` pour échapper à l'overflow, il se retrouvait **hors du contenu** d'un dialogue Radix **modal**, qui applique `pointer-events:none` à tout l'extérieur du dialogue → clics ignorés.
- **Solution validee** : Rendre le menu dans un **portal** en `position:fixed` (coordonnées calculées depuis le bouton, ouverture vers le haut si peu de place, fermeture au scroll/resize/clic extérieur) **ET** forcer `style={{ pointerEvents: 'auto' }}` sur le conteneur du menu.
- **Prevention** : Tout dropdown/menu dans un conteneur scrollable → portal + `position:fixed`. Tout élément porté hors d'un dialogue Radix modal → `pointer-events:auto` explicite (sinon non cliquable). Vérifier le clic réel, pas seulement l'affichage.
- **Agents impliques** : SPARK (dev), ATLAS

---

### [RT-001] Realtime ne livre pas un changement qui fait SORTIR une ligne de la visibilité RLS
- **Date** : 2026-06-16
- **Projet** : MonprojetPro — Module Documents
- **Categorie** : Realtime / RLS
- **Symptome** : Retirer le partage d'un document (Hub) ne se synchronisait jamais côté client (Lab) — même en changeant d'onglet ; seul un rechargement complet le faisait disparaître.
- **Cause racine** : la policy `documents_select_merged` ne montre au client que `visibility='shared'`. Au passage `shared → private`, le client perd l'accès SELECT à la ligne. Or Supabase Realtime applique la RLS **sur la ligne livrée (état après UPDATE)** : la nouvelle ligne `private` échoue la RLS → l'event `postgres_changes` n'est **jamais envoyé** au client. Donc un abonnement `postgres_changes` côté client ne peut PAS détecter un retrait de visibilité.
- **Solution validee** : **Broadcast depuis la base** (`realtime.send` dans un trigger `AFTER INSERT/UPDATE/DELETE`) sur un canal par client `documents:<clientId>`. Le broadcast n'est PAS filtré par la visibilité RLS de la ligne → il atteint le client dans tous les cas (partage, retrait, ajout, suppression). Le client invalide alors son cache TanStack Query ; le refetch RLS-filtré renvoie l'état correct. Trigger rendu résilient (`EXCEPTION WHEN OTHERS THEN NULL`) pour ne JAMAIS bloquer le DML si le broadcast échoue.
- **Prevention** : Dès qu'un changement peut faire SORTIR une ligne de la visibilité d'un consumer (unshare, soft-delete, changement de tenant/statut), ne pas compter sur `postgres_changes` côté ce consumer → broadcast DB (ou signal via une table que le consumer voit toujours, ex. `notifications`).
- **Agents impliques** : SPARK (dev), CERBÈRE (sécu), ATLAS

---

### [SEC-RLS-002] Policy `visibility='shared'` sans contrôle de propriétaire = fuite inter-locataires
- **Date** : 2026-06-16
- **Projet** : MonprojetPro — Module Documents
- **Categorie** : Sécurité / RLS
- **Symptome** : (trouvé en revue, non signalé) La policy SELECT client `documents_select_merged` contenait une branche `visibility='shared' AND deleted_at IS NULL` **sans condition de propriété** → tout client authentifié pouvait lire les documents partagés de TOUS les autres clients via l'API directe (PostgREST). L'app ne l'exploitait pas (filtre `client_id` côté requête) mais l'exposition RLS était réelle.
- **Cause racine** : une branche permissive `OR (visibility=...)` sans rattachement au `auth.uid()` ouvre la lecture à tous les rôles `authenticated`.
- **Solution validee** : restreindre la branche au propriétaire : `AND client_id IN (SELECT id FROM clients WHERE auth_user_id = (SELECT auth.uid()))`. Opérateurs non affectés (policy `documents_select_operator` séparée, combinée en OR).
- **Prevention** : Toute branche de policy basée sur un attribut de la ligne (statut, visibilité, type) doit AUSSI ancrer la propriété/tenant via `auth.uid()`. Auditer les policies `OR (<attribut> = ...)` sans clause d'appartenance. Le filtrage applicatif (`.eq('client_id', ...)`) ne remplace JAMAIS la RLS.
- **Agents impliques** : CERBÈRE (détection), SPARK (fix), ATLAS

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

---

### [RSC-007] Redirection dans le middleware → « unexpected response » en navigation interne (soft-nav RSC)
- **Date** : 2026-06-06
- **Projet** : MonprojetPro
- **Categorie** : Next.js Server/Client (RSC)
- **Symptome** : Un interstitiel forcé (re-consentement IA) redirigé via `NextResponse.redirect()` dans le middleware lançait « An unexpected response was received from the server » lors d'une **navigation interne** (clic dans l'app, déjà connecté). L'utilisateur restait piégé sur une page d'erreur, incapable de se déconnecter (chaque navigation re-déclenchait la redirection cassée).
- **Cause racine** : Les navigations App Router internes sont des requêtes **RSC**. Une redirection émise par le middleware sur ce type de requête n'est pas correctement suivie par le routeur client → réponse non-RSC interprétée comme « unexpected response ». La même redirection passait au **login** (navigation document classique).
- **Fausse piste écartée (méthode TILT)** : la page cible (`/ia-consent-update`) et le verrou serveur étaient sains — prouvé en tapant l'URL à la main (la page s'affichait correctement). Seule la **redirection middleware en soft-nav** échouait. On n'a pas corrigé à l'aveugle : une seule sonde (accès direct vs redirection) a isolé la cause certaine.
- **Solution** : déplacer le déclenchement de l'interstitiel du middleware vers le **layout serveur** (`app/(dashboard)/layout.tsx`) avec `redirect()` de `next/navigation` — fonctionne en navigation interne ET au login. Cible hors du groupe de routes concerné → pas de boucle.
- **Regle a suivre** : Pour un interstitiel/redirection forcé déclenché par une condition de données (consentement, onboarding, statut), préférer `redirect()` dans un layout/page serveur plutôt qu'une redirection middleware. ⚠️ Le re-consentement **CGU** (`checkConsentVersion`) garde ce même bug latent (jamais déclenché car rarement activé) — à migrer de la même façon avant tout bump de `CURRENT_CGU_VERSION`.
- **Leçon connexe (KIT COMPLET / RGPD)** : un consentement « tracé en base » n'a aucune valeur tant qu'il n'est pas **branché sur tous ses consumers**. Ici `ia_processing` était enregistré mais aucun gate ne vérifiait `hasIaConsent()` → Élio continuait d'appeler Claude malgré un refus (coquille vide juridique). Recenser les consumers d'une décision avant de la livrer. À noter aussi : la politique affichée annonçait **DeepSeek** alors que le code appelait **Claude/Anthropic** → un texte légal doit refléter le code réel.
- **Agents impliques** : FIX, SPARK, ATLAS

---

### [RSC-008] `router.refresh()` ne rafraîchit PAS le cache TanStack Query (consumer figé en Realtime)
- **Date** : 2026-06-17
- **Projet** : MonprojetPro
- **Categorie** : Next.js Server/Client (RSC) + Realtime
- **Symptome** : Couper/réactiver un agent du parcours depuis le Hub se voyait côté client **seulement après rechargement manuel** (« il faut réactualiser »). La donnée changeait bien en base, l'event Realtime arrivait, mais la grille « Mon Parcours » restait figée ~30s.
- **Cause racine** : deux mécanismes de rafraîchissement coexistent et ne couvrent pas la même chose. `RealtimeDashboardRefresh` recevait bien l'event `client_parcours_agents` et appelait `router.refresh()` — mais `router.refresh()` ne re-fetch que les **Server Components (RSC)**. La grille était rendue par `useParcours` (**TanStack Query**, `staleTime 30s`), un cache **client** que `router.refresh()` **n'invalide jamais**. Le consumer TanStack n'avait aucune invalidation Realtime propre.
- **Solution** : hook dédié `useParcoursRealtimeRefresh(clientId)` branché sur le composant, abonné à `client_parcours_agents` / `parcours` / `step_submissions` (filtrés `client_id`), qui appelle `queryClient.invalidateQueries({ queryKey: ['parcours', clientId] })`. Mise à jour instantanée. La table était déjà dans la publication Realtime (preuve : `RealtimeDashboardRefresh` recevait déjà les events) → aucune migration.
- **Regle a suivre** : **`router.refresh()` ≠ invalidation TanStack Query.** Pour CHAQUE consumer d'une donnée modifiée à distance, identifier son mode : SSR → `router.refresh()` suffit ; **TanStack Query → il FAUT un `invalidateQueries` Realtime dédié** (le SSR refresh ne le touche pas). Ne jamais supposer qu'un `RealtimeDashboardRefresh` global couvre les grilles rendues en TanStack. ⚠️ Voir **RSC-009** : l'invalidation dédiée était nécessaire MAIS pas suffisante ici — le `postgres_changes` sous-jacent ne délivrait rien.
- **Agents impliques** : SPARK, ATLAS

---

### [RSC-009] postgres_changes ne délivre PAS les UPDATE quand la RLS filtre via une sous-requête → utiliser le BROADCAST DB
- **Date** : 2026-06-18
- **Projet** : MonprojetPro
- **Categorie** : Supabase Realtime + RLS
- **Symptome** : Couper un agent du parcours depuis le Hub ne se reflétait côté client qu'au rechargement / changement d'onglet (refetch focus TanStack). Canal Realtime **SUBSCRIBED**, mais **aucun event reçu** sur `client_parcours_agents`.
- **Diagnostic (sondes console, méthode TILT)** : ajout de logs `[PARCOURS-RT]` (montage / status / event reçu). Observé : `montage hook` + `token présent ? true` + `subscribe status = SUBSCRIBED`, mais **jamais** `event reçu` lors d'une coupure. Vérifié en base : l'UPDATE `is_enabled=false` était bien commité (donc problème de **délivrance**, pas d'écriture). Table bien dans la publication `supabase_realtime`, RLS SELECT OK pour le client.
- **Cause racine** : la policy RLS SELECT de `client_parcours_agents` filtre `client_id` via une **sous-requête vers `clients`** (`client_id IN (SELECT id FROM clients WHERE auth_user_id = auth.uid())`). Realtime applique la RLS **par-ligne** sur les events `postgres_changes` et **n'évalue pas correctement les policies qui référencent une autre table** sur les **UPDATE** → l'event est silencieusement jeté. (Les tables qui « marchaient » — `notifications`, `messages` — ont une policy **self-contained** `col = auth.uid()` et des events live de type **INSERT**.)
- **Fausses pistes écartées (mais utiles à connaître)** :
  1. `setAuth` manquant : le socket rejoignait en `anon` (aucun `setAuth` dans le code). Corrigé (`getSession` → `realtime.setAuth(token)` avant `subscribe`) — **nécessaire mais insuffisant** ici.
  2. `REPLICA IDENTITY` : passé en `FULL` sur les tables filtrées par colonne hors-PK (requis pour filtrer/évaluer la RLS sur les UPDATE) — **utile en général, insuffisant ici** à cause de la sous-requête.
- **Solution** : **broadcast depuis la base** (même pattern éprouvé que `broadcast_documents_change`) — triggers `realtime.send(payload, '<event>', '<topic>:'||client_id, false)` :
  - `broadcast_parcours_change` sur `client_parcours_agents` / `parcours` / `step_submissions` → canal `parcours:{clientId}` (event `parcours_changed`) ; le hook `useParcoursRealtimeRefresh` invalide `['parcours', clientId]`.
  - `broadcast_client_config_change` sur `client_configs` → canal `client_configs:{clientId}` (event `client_configs_changed`) ; `RealtimeDashboardRefresh` fait `router.refresh()` → la **pause globale du Lab** (elio_lab_enabled), la graduation et les modules se reflètent en direct (ces valeurs sont lues en SSR).
  Le broadcast contourne la RLS par-ligne ; la donnée réelle reste re-fetchée via une requête serveur RLS-protégée (aucune fuite : le payload est un simple signal de refetch).
- **Regle a suivre** : Pour du Realtime sur une table dont la **RLS référence une autre table** (sous-requête) : ne PAS compter sur `postgres_changes` (surtout pour les UPDATE). **Utiliser le broadcast DB** (`realtime.send` dans un trigger, canal public par client, payload = simple ping de refetch). Et pour diagnostiquer un « SUBSCRIBED mais rien » : sonder `subscribe status` + présence d'`event reçu`, et vérifier que le DML est bien commité avant d'accuser la délivrance.
- **Agents impliques** : SPARK, ATLAS

---

### [BUILD-001] Un fichier `'use server'` ne peut exporter QUE des fonctions async — un `export const` casse le build Next (invisible en tsc/vitest)
- **Date** : 2026-06-20
- **Projet** : MonprojetPro
- **Categorie** : Next.js Server Actions / build
- **Symptome** : LOT D livré, tests verts (vitest) et tsc « OK » en local, mais les déploiements Vercel passaient en **Error** (rouge) → l'ancien code restait en ligne → MiKL ne voyait pas le nouvel onglet « Pilote ».
- **Diagnostic (TILT, build local avant fix)** : `npx turbo run build --filter=@monprojetpro/hub` → `Build failed because of webpack errors`, caret pointant sur `export const INACTIVITY_THRESHOLD_DAYS = 7` dans `get-client-activity-snapshot.ts` (fichier `'use server'`).
- **Cause racine** : un module avec la directive `'use server'` ne peut **exporter que des fonctions async**. Tout `export const`/`export let`/valeur non-fonction est rejeté par le compilateur Next (règle webpack/SWC, **pas** tsc). Les **types** restent exportables (ex. `get-client-instance.ts` exporte `type ClientInstanceStatus` sans souci).
- **Pourquoi non détecté avant le push** : ni `vitest` ni `tsc --noEmit` n'appliquent la contrainte `'use server'` ; seul `next build` la voit. Les 717 erreurs `never` (types Supabase non générés en local) noient par ailleurs tout signal tsc utile.
- **Solution** : retirer le `export` → constante locale au fichier (`const INACTIVITY_THRESHOLD_DAYS = 7`). Build reconfirmé `EXIT_CODE=0`.
- **Regle a suivre** : (1) Dans un fichier `'use server'`, n'exporter QUE des fonctions async (+ types) — toute constante/objet partagé va dans un fichier `constants.ts`/`types.ts` séparé, ou reste local. (2) Pour toute story touchant un fichier `'use server'` ou un export de package, **lancer `next build` (ou `turbo run build --filter=...`) avant le push** — les tests ciblés et tsc ne suffisent pas à garantir un déploiement Vercel vert.
- **Agents impliques** : SPARK, ATLAS

---

### [RLS-010] fn_get_operator_id() renvoie toujours NULL → policies opérateur cassées (Soumissions vide, activité fausse)
- **Date** : 2026-06-20
- **Projet** : MonprojetPro
- **Categorie** : Supabase RLS
- **Symptome** : Onglet « Soumissions » du Hub vide alors que le Validation Hub affiche bien la soumission ; « dernière activité » du cockpit figée la veille. Bref, l'opérateur ne voyait pas des données pourtant présentes (13 step_submissions en base).
- **Diagnostic (TILT, requêtes MCP sur la vraie base)** : (1) step_submissions a bien 13 lignes dont une du jour ; (2) la policy SELECT de step_submissions = `client_id IN (clients WHERE operator_id = fn_get_operator_id())` ; (3) `fn_get_operator_id()` lit `auth.users.raw_app_meta_data->>'operator_id'` — **NULL pour tous les opérateurs** (aucun n'a cette clé). Donc la clause opérateur ne matche jamais → 0 ligne lisible côté Hub.
- **Cause racine** : deux mécanismes de détection opérateur cohabitent. Le bon = `is_operator()` / `is_operator(operator_id)` (EXISTS dans la table `operators` WHERE auth_user_id = auth.uid()) — utilisé par `clients`, `validation_requests` (qui marchent). Le cassé = `fn_get_operator_id()` (via raw_app_meta_data jamais renseigné) — utilisé par `step_submissions` (SELECT+UPDATE) et `activity_logs` (SELECT).
- **Solution** : migration `20260620120000` — remplacer `fn_get_operator_id()` par `is_operator()` (join via clients) dans les 3 policies. WITH CHECK inchangés (NULL). Vérifié : `is_operator('00000000-0000-0000-0000-000000000001')` matche bien l'opérateur MiKL.
- **Regle a suivre** : pour toute policy RLS « accès opérateur », utiliser **`is_operator(operator_id)`** (table `operators`), **jamais** `fn_get_operator_id()` (raw_app_meta_data non peuplé). Si un onglet Hub affiche « vide » alors que la donnée existe : suspecter la RLS opérateur AVANT le code — comparer la policy à celle d'une table qui marche (`clients`/`validation_requests`), et vérifier en MCP que la donnée est bien là.
- **Agents impliques** : CERBÈRE (détection), SPARK, ATLAS

---

### [SEC-002] `CREATE OR REPLACE FUNCTION` efface le `search_path` figé (régression sécu silencieuse)
- **Date** : 2026-06-21
- **Projet** : MonprojetPro
- **Categorie** : Supabase / sécurité fonctions
- **Symptome** : (anticipé, pas un incident) — au LOT E, besoin de modifier le corps de la RPC `approve_validation_request` (SECURITY DEFINER). Un simple `CREATE OR REPLACE` aurait réintroduit la vuln que la migration `security_fix_function_search_path` avait corrigée.
- **Cause racine** : en Postgres, `CREATE OR REPLACE FUNCTION` qui ne répète pas la clause `SET search_path = ...` **réinitialise `proconfig` à NULL** → la fonction SECURITY DEFINER redevient vulnérable au search_path hijacking. Le réglage posé par un `ALTER FUNCTION ... SET search_path` antérieur est perdu au replace.
- **Solution** : avant le replace, lire `pg_proc.proconfig` (`SELECT proname, proconfig FROM pg_proc WHERE proname = '...'`) et **ré-inclure la même clause** dans la définition : `... $$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;`. Vérifier après coup que `proconfig` vaut toujours `["search_path=public"]` et qu'il n'y a pas de surcharge en double (sinon PostgREST 300).
- **Regle a suivre** : pour CHAQUE `CREATE OR REPLACE FUNCTION` sur une fonction SECURITY DEFINER existante → check `proconfig` AVANT, re-déclarer `SET search_path` DANS la définition, re-check `proconfig` APRÈS. Gate CERBÈRE permanente.
- **Agents impliques** : CERBÈRE (gate), SPARK, ATLAS

### [SEC-003] REVOKE FROM anon ne suffit pas — le grant PUBLIC implicite laisse la RPC exécutable
- **Date** : 2026-07-03
- **Projet** : MonprojetPro
- **Categorie** : Supabase / sécurité fonctions
- **Symptome** : après `REVOKE EXECUTE ON FUNCTION approve_validation_request FROM anon`, l'ACL (`pg_proc.proacl`) contenait encore `=X/postgres` = grant **PUBLIC** par défaut de Postgres sur les fonctions → `anon` héritait toujours du droit d'exécution malgré le REVOKE ciblé.
- **Cause racine** : Postgres accorde EXECUTE à PUBLIC par défaut à la création d'une fonction. Révoquer un rôle précis (anon) ne retire pas l'héritage via PUBLIC.
- **Solution** : migration complémentaire `REVOKE EXECUTE ... FROM PUBLIC;` (sans risque si `authenticated`/`service_role` ont leurs grants explicites). Vérifier ensuite `proacl` : ni `anon=`, ni entrée commençant par `=X`.
- **Regle a suivre** : pour verrouiller une RPC : (1) `REVOKE ... FROM PUBLIC` ET `FROM anon`, (2) grants explicites aux rôles voulus, (3) vérif `proacl`. ⚠️ Probable dette générale : la plupart des 32 fonctions SECURITY DEFINER du schéma ont ce grant PUBLIC implicite (cf. docs/audit-2026-07-03-a-etudier.md §⑤.4).
- **Agents impliques** : CERBÈRE, SPARK, ATLAS

### [DB-006] Notification silencieusement perdue : type hors CHECK — pattern récurrent (3 occurrences)
- **Date** : 2026-07-06
- **Projet** : MonprojetPro (Hub + Client)
- **Phase** : Chantier Élio Hub / Coaching One+
- **Catégorie** : Base de données (DB)
- **Symptôme** : une feature « marche » (la row métier est créée) mais le client/opérateur ne reçoit jamais la cloche ni l'email. Aucun crash visible : l'INSERT `notifications` échoue sur la contrainte `notifications_type_check` et l'erreur est avalée par le try/catch best-effort.
- **Occurrences** : ① `elio_escalation` (perdu par 00056, réintégré par 00109) ; ② `meeting_scheduled` (calcom-webhook + create-meeting — TOUTES les notifs visio perdues depuis l'origine, découvert le 2026-07-06) ; ③ `billing_payment_failed`/`billing_payment_received`/`lab_payment_received`/`billing_sync_alert` (billing-sync — corrigé par 20260706124000).
- **Cause racine** : la CHECK `notifications_type_check` est recréée intégralement par chaque migration qui ajoute un type (drop + re-add avec liste complète). Tout code qui invente un type sans étendre la CHECK, ou toute migration qui recrée la liste sans un type utilisé ailleurs, casse silencieusement les notifs.
- **Solution durable** : avant tout INSERT `notifications` avec un type nouveau : vérifier la contrainte réelle en prod (`pg_get_constraintdef`) — pas les fichiers de migration. Préférer un type existant (`system`, `payment`) quand le besoin n'exige pas de filtrage dédié. Si nouveau type : migration qui étend la CHECK dans le MÊME commit.
- **Détection** : grep périodique des `type:` insérés dans `notifications` vs la liste de la contrainte prod.

### [CFG-003] Le déploiement CLI d'une Edge Function réinitialise verify_jwt
- **Date** : 2026-07-07
- **Symptôme** : le webhook calcom-webhook (auth HMAC, verify_jwt=false posé via MCP) s'est retrouvé verify_jwt=true après un simple redéploiement CLI → Cal.com bloqué en 401 au gateway, silencieusement.
- **Cause racine** : `supabase functions deploy` applique verify_jwt=true par défaut si aucun config.toml ne dit le contraire ; le réglage posé au déploiement précédent n'est PAS conservé.
- **Solution** : chaque fonction appelée sans JWT (webhooks externes, fonctions à auth custom) DOIT avoir son `config.toml` avec `verify_jwt = false` commité à côté de l'index.ts. Vérifier `verify_jwt` dans list_edge_functions après tout déploiement d'un webhook.

---

### [UI-005] Un raccourci de rendu « lecture seule » court-circuite en silence un état riche déjà construit
- **Date** : 2026-07-10
- **Projet** : MonprojetPro — App client (page Mon Parcours, mode Lab, client gradué)
- **Categorie** : Architecture UI / Régression
- **Symptome** : Un client gradué en MODE LAB voyait un résumé condensé en lecture seule (`LabHistoryView` : liste d'étapes cochées, sans conversations, docs réduits à un lien) au lieu du parcours entier grisé attendu (visuel conservé, étapes cliquables, Élio « en pause », réouverture par MiKL). MiKL : « on avait déjà réglé cette partie… pourquoi ce retour en arrière ? ».
- **Cause racine** : un « Lot » ultérieur (commit `c96fe4a`, « Lot 3 : consultation historique vs Lab entier ») a ajouté une branche `labReadOnly = graduated && !elio_lab_enabled → return <LabHistoryView>` **avant** le rendu normal. Or l'état « pause/grisé » riche existait déjà dans `ParcoursOverview` via `agentsPaused` (bouton Générer masqué, cartes cliquables, conversations + docs consultables). Le raccourci interceptait donc les gradués et les privait de l'état déjà construit. Régression **invisible en tests** (les tests couvraient chaque composant isolément, pas la bascule de la page).
- **Solution validee** : retrait de la branche `labReadOnly → LabHistoryView`. Les gradués passent par le même `ParcoursPageClient` que les Lab natifs, avec `agentsPaused = !elio_lab_enabled`. Composant `LabHistoryView` conservé mais dé-référencé.
- **Prevention** : avant d'ajouter une vue « simplifiée » parallèle pour un sous-cas, vérifier si l'état visuel voulu existe déjà (grep de l'état/prop concerné, ex. `agentsPaused`) et le **réutiliser** plutôt que de le court-circuiter. Une branche `if (sousCas) return <VueDépouillée>` en tête de composant est un drapeau rouge de régression : elle masque tout le rendu riche en aval.
- **Agents impliques** : SPARK (dev), ATLAS


## UI-006 — Vague d'agents parallèles : guillemets courbes + fausse alerte git (chantier design cockpit)

**Contexte** : refonte design du Hub (style MenuFacile généralisé) via 8 agents Sonnet en parallèle sur le même working tree.

- **Piège 1 — guillemets courbes comme délimiteurs** : un agent a émis des `‘…’` (U+2018/U+2019) à la place de `'…'` comme **délimiteurs de chaînes JS** (`className={… ? ‘border-cyan-500/60’ : …}`), cassant `next build` (« Expected '</', got 'border' »). Invisible pour tsc/vitest tant que le fichier n'est pas parsé par SWC/Next.
  - **Détection** : `grep -nP "[\x{2018}\x{2019}\x{201C}\x{201D}]"` sur les fichiers de `git diff --name-only`.
  - **Ne PAS remplacer aveuglément** : une apostrophe courbe *dans* une chaîne à guillemets droits (`'…n’a pas…'`) est **valide** — n'y toucher que quand le courbe est un **délimiteur**. Cas mixte (`‘…l’instant…’`) → repasser la chaîne en guillemets droits doubles.
- **Piège 2 — fausse alerte « débordement » git** : un agent a lancé `git status`, vu les 65 fichiers modifiés par ses **collègues parallèles**, et conclu à tort qu'il avait débordé — proposant un `git checkout HEAD -- packages/modules/chat crm …` qui aurait **détruit le travail des 7 autres agents**. STOP : sur un tree partagé, un sous-agent ne doit jamais raisonner sur `git status` global ni reverter des fichiers hors de son périmètre. Seul l'orchestrateur a la vue d'ensemble.
- **Prévention vague parallèle** : (1) toujours 1 `turbo build` global APRÈS la vague, en capturant le vrai code retour (`… > log 2>&1; echo $?` — un `| tail` masque l'exit de turbo) ; (2) scanner les guillemets courbes avant commit ; (3) briefer les agents : « ne lance pas de build, ne commite pas, ne reverte rien, ignore le git status global ».
- **Agents impliqués** : MAX (orchestration), PIXEL ×8 (vague), ATLAS

---

### [RT-001] Event Realtime DELETE (et UPDATE filtré) non délivré sans REPLICA IDENTITY FULL — alerte fantôme dans la cloche
- **Date** : 2026-07-11
- **Projet** : MonprojetPro
- **Categorie** : Supabase Realtime
- **Symptome** : MiKL — « j'ai des alertes système dans ma cloche alors que le monitoring est tout vert ». Les alertes du health-check-cron restaient affichées après le rétablissement du service (fantômes non-actionnables).
- **Cause (2 volets)** : (1) **Conception** — l'ancien code envoyait une notif dès qu'un service était `error` 2 cycles, mais ne la refermait JAMAIS ; une notif est permanente jusqu'à lecture → un blip transitoire de 10 min laissait un fantôme éternel. (2) **Réalisation Realtime** — pour auto-résoudre, on supprime la notif côté serveur ; MAIS le hook cloche n'écoutait que `INSERT`, et surtout la table `notifications` était en `REPLICA IDENTITY default` (PK seule) → sur un `DELETE`, le `old` record ne contient que `id`, donc le filtre `recipient_id=eq.<id>` ne matche jamais et l'event est **silencieusement jeté** (le navigateur ne voit pas la suppression).
- **Solution** : suivi d'incidents par service (`system_config.health_incidents` = `errorSince` + `notificationId`) → alerte seulement si l'erreur DURE ≥ 15 min, puis **auto-résolution** (DELETE de la notif) au retour à la normale. Côté client : hook Realtime étendu à `UPDATE` + `DELETE`, et migration `ALTER TABLE notifications REPLICA IDENTITY FULL`. L'historique reste tracé dans `activity_logs` (`system_alert` / `system_alert_resolved`).
- **Regle a suivre** : (1) Pour qu'un event Realtime `DELETE` (ou `UPDATE` filtré sur une colonne **hors PK**) soit délivré, la table doit être en `REPLICA IDENTITY FULL` — sinon le `old` record n'a que la PK et le filtre ne matche pas. (cf. [RSC-009], même prérequis). (2) Toute notification/alerte a un **cycle de vie complet** : elle doit pouvoir se FERMER (auto-résolution), pas seulement s'ouvrir — sinon la cloche accumule des fantômes. (3) Une alerte non-actionnable (blip qui se soigne seul) ne devrait jamais notifier : exiger une **panne durable** avant d'alerter.
- **Agents impliques** : SCOUT (reco surveillance externe Better Stack), SPARK, ATLAS

---

### [NAV-001] Boucle de redirection infinie entre deux gardes qui vérifient des conditions différentes
- **Date** : 2026-07-15
- **Projet** : MonprojetPro
- **Categorie** : Next.js / Navigation / Cohérence des gardes
- **Symptome** : MiKL — « quand je vais sur Lab ça alterne la page d'accueil avec la page d'erreur toutes les 3 secondes » (client Dev Test). Page blanche « Application error: a client-side exception has occurred » en alternance avec la home.
- **Cause racine** : deux gardes de redirection aux conditions disjointes se renvoyaient la balle. La home `/` redirigeait vers `/modules/parcours` si le **mode** résolu était `lab` (resolveClientMode), sans vérifier les modules actifs. La page parcours (`requireActiveModule('parcours')`) redirigeait vers `/` si le **module** n'était pas dans `active_modules`. Le client Dev Test avait `lab_mode_available=true` + cookie `mpp_active_view=lab` MAIS `parcours` absent d'`active_modules` → ping-pong infini de redirects RSC → crash navigateur.
- **Solution validee** : (1) donnée : `parcours` ajouté aux `active_modules` de Dev Test ; (2) code : la home ne redirige vers `/modules/parcours` que si `activeModules.includes('parcours')` — sinon elle affiche la home One (état dégradé sans boucle).
- **Regle a suivre** : toute redirection serveur doit vérifier que sa **cible est atteignable** (mêmes conditions que les gardes de la cible). Quand deux pages se redirigent mutuellement sous conditions, les conditions doivent être **mutuellement exclusives** — sinon il existe un état de données qui boucle. Symptôme signature : alternance page/erreur en continu = chercher un ping-pong de `redirect()`.
- **Agents impliques** : SPARK (fix), ATLAS

### [ASSET-001] Les dossiers `public/` ne sont pas partagés entre apps du monorepo
- **Date** : 2026-07-15
- **Projet** : MonprojetPro
- **Categorie** : Monorepo / Assets statiques
- **Symptome** : dans le catalogue Élio Lab du Hub, seul Élio Dev affichait son avatar — les 11 autres cartes montraient l'icône robot de secours, alors que tous les `image_path` étaient corrects en base.
- **Cause racine** : les PNG d'agents n'existaient que dans `apps/client/public/elio/agents/`. Chaque app Next.js sert **son propre** dossier `public/` : le Hub renvoyait 404 sur `/elio/agents/*.png` (sauf `elio-dev.png`, seul copié) → `onError` → fallback icône.
- **Solution validee** : copie des 14 PNG dans `apps/hub/public/elio/agents/`.
- **Regle a suivre** : un asset référencé par un chemin absolu (`/elio/...`) affiché par PLUSIEURS apps du monorepo doit exister dans le `public/` de CHAQUE app (ou être déplacé vers un stockage partagé type Supabase Storage). Un fallback `onError` silencieux masque le 404 — vérifier l'onglet Réseau au moindre avatar manquant.
- **Agents impliques** : SPARK (fix), ATLAS

### [SEC-002] Une feature de « connexion en tant que » qui n'échange aucune session : coquille vide à 3 étages
- **Date** : 2026-07-25
- **Projet** : MonprojetPro
- **Categorie** : Sécurité / Auth / Coquille vide
- **Symptome** : MiKL — « Se connecter comme le client » : le dialogue de confirmation s'affiche correctement (email, log, expiration 1 h annoncés), puis `ERR_CONNECTION_REFUSED` sur `localhost`. Symptôme visible = une URL ; problème réel = la fonction n'avait jamais connecté personne.
- **Cause racine** : trois manques empilés, chacun invisible en test unitaire. (1) `NEXT_PUBLIC_CLIENT_URL` n'existait nulle part dans le repo → `?? 'http://localhost:3000'`, seul fallback du projet à ne pas viser la prod. (2) **Aucun échange de session** : la Server Action créait la row `impersonation_sessions`, envoyait l'email, puis ouvrait l'app client avec `?impersonation_session=<id>` ; côté client, un `useEffect` posait un cookie et **affichait la bannière rouge** — rien de plus. `supabase.auth.getUser()` renvoyait soit rien (→ `/login`), soit la session opérateur (qui n'a pas de row `clients`). Les tests validaient la row créée et la présence du sessionId dans l'URL : exactement les deux choses qui marchaient. (3) « Fermer la session » : UPDATE sur `impersonation_sessions` alors que 00087 n'avait créé **que** des policies UPDATE opérateur → 0 ligne, 0 erreur (cf. DB-002), session éternellement `active` → toute nouvelle impersonation refusée en CONFLICT ; et aucun `signOut`, on effaçait juste le cookie de bannière.
- **Solution validee** : jeton de connexion à usage unique du compte client via l'API admin (`generateLink` type `magiclink`, service role) + route publique `/auth/impersonation` qui le consomme avec `verifyOtp()` **côté serveur** (pas de dépendance au flow PKCE/implicite : aucun token dans le fragment d'URL) → vraie session client. Cookie d'impersonation en **httpOnly**, bannière alimentée par le layout serveur. Policy RLS UPDATE client ajoutée (restreinte à sa propre session et aux statuts `ended`/`expired`) + `signOut` réel. Cookie porté à 2 h alors que la session logique expire à 1 h : c'est ce décalage qui permet au middleware de **détecter** la fenêtre écoulée et de déconnecter.
- **Regle a suivre** : (a) « se connecter comme X » n'est fait que si une **session d'authentification de X** est créée — une bannière qui dit « tu es en impersonation » n'est pas une impersonation ; vérifier `auth.getUser()` dans le contexte cible, pas la présence d'un cookie. (b) Une session d'emprunt doit avoir ses **quatre** maillons : ouverture, marqueur visible, fermeture qui ferme vraiment (row + signOut), expiration qui expire vraiment. Un marqueur qui disparaît sans déconnecter est un trou de sécurité. (c) **Toute étape « une seule fois » du parcours client doit être neutralisée en impersonation** — sans quoi l'opérateur consomme les données du client : `first_login_at` écrit par MiKL, écran de graduation grillé, CGU acceptées à sa place. Recenser ces one-shots (middleware compris) fait partie de l'inspection des consumers. (d) Un fallback `localhost` dans du code qui tourne en prod est un bug en attente : viser la prod par défaut, comme le reste du repo.
- **Agents impliques** : SPARK (fix), CERBÈRE (revue impersonation), ATLAS
