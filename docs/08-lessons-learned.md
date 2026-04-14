# MonprojetPro One — Registre des Lecons Apprises (ATLAS)

> Maintenu par ATLAS "l'Historien" — Ne jamais supprimer d'entrees, marquer OBSOLETE si necessaire.
> Chaque entree documente un probleme reel qui a fait perdre du temps.

---

## Index par categorie

| Code | Categorie | Nb lecons |
|------|-----------|-----------|
| CFG | Configuration | 1 |
| DL | Téléchargement / Storage | 3 |
| API | Intégration API externe | 3 |
| RSC | Next.js Server/Client | 2 |
| DB | Base de données / Schéma | 1 |

---

## Lecons

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

### [RSC-002] Thread email non rafraîchi après envoi d'une réponse
- **Date** : 2026-04-08
- **Projet** : MonprojetPro Hub — Module Email
- **Categorie** : Next.js Server/Client (RSC)
- **Symptome** : Après avoir envoyé une réponse à un email, le nouveau message n'apparaissait pas dans la conversation sans recharger la page.
- **Cause racine** : `EmailComposer` appelait `onClose()` après envoi, mais personne n'invalidait la query TanStack `['email-thread', thread.id]`. Le cache restait sur les anciens messages.
- **Solution validee** : Ajouter une prop `onSent?: () => void` à `EmailComposer`, appelée après succès. Dans `EmailThreadView`, passer `onSent={() => refetch()}`.
- **Prevention** : Après toute mutation (envoi, suppression, modification), toujours invalider ou refetch les queries TanStack concernées. Ne pas compter sur `onClose` seul — close et refresh sont deux responsabilités distinctes.
- **Agents impliques** : SPARK (dev), ATLAS (documentation)
