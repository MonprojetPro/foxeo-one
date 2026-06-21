# Flows — Suivi de l'outil

## Flow 1 : Publication d'une mise à jour (Opérateur → Client)

```
Opérateur (Hub)
│
├─ Navigue vers la fiche client → onglet "Suivi de l'outil"
├─ Remplit le formulaire : titre (optionnel), corps (requis), images (max 5)
├─ Clique "Publier"
│
├─ Server Action createToolPost()
│   ├─ Auth check (opérateur)
│   ├─ Validation Zod
│   ├─ Upload images → Supabase Storage (bucket tool-screenshots)
│   ├─ INSERT tool_posts
│   ├─ createNotification (type: tool_update) → client
│   └─ Email si pref client email=true → supabase.functions.invoke('send-email')
│
Client (One)
├─ Reçoit notification in-app (cloche)
├─ Realtime postgres_changes invalide ['tool-posts', clientId]
└─ Le fil affiche instantanément la nouvelle mise à jour
```

## Flow 2 : Consultation du fil (Client)

```
Client (One) — module /modules/suivi-outil
│
├─ useSuiviOutilRealtime() s'abonne à postgres_changes sur tool_posts
├─ useToolPosts() → getToolPosts(clientId)
│   ├─ Auth check (client vérifié OU opérateur)
│   ├─ SELECT tool_posts WHERE client_id = clientId ORDER BY created_at DESC
│   └─ createSignedUrls() pour chaque image (expire 3600s)
│
└─ ToolPostsFeed affiche les posts (plus récent en premier)
    └─ Si aucun post : empty state "Votre opérateur publiera bientôt des nouvelles"
```

## Flow 3 : Modification d'un post (Opérateur)

```
Opérateur (Hub)
│
├─ Clique "Modifier" sur un post existant
├─ Édite le titre / corps dans le formulaire inline
├─ Clique "Sauvegarder"
│
└─ Server Action updateToolPost()
    ├─ Auth check + ownership check (operator_id = user.id)
    ├─ UPDATE tool_posts SET title, body, updated_at
    └─ Retour camelCase → invalidation cache TanStack côté opérateur
```

## Flow 4 : Suppression d'un post (Opérateur)

```
Opérateur (Hub)
│
├─ Clique "Supprimer" sur un post
├─ Confirmation modale
│
└─ Server Action deleteToolPost()
    ├─ Auth check + ownership check
    ├─ SELECT image_paths (pour cleanup)
    ├─ DELETE tool_posts (RLS garantit l'isolation)
    └─ storage.remove(image_paths) — best effort, non bloquant
```

## Flow 5 : Toggle notification email (Client)

```
Client (One) — composant EmailToggle
│
├─ Montage : useQuery → getNotificationPrefs() → lit pref 'tool_update'
├─ Affiche l'état courant du switch (email activé / désactivé)
│
└─ Toggle switch
    └─ useMutation → updateNotificationPrefs({ type: 'tool_update', channel_email: bool })
        └─ Sauvegarde instantanée → switch reflète le nouvel état
```
