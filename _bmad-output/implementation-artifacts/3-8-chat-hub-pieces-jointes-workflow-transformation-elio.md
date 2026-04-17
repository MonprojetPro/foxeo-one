# Story 3.8: Chat Hub — Pièces jointes & Workflow Transformation Élio

Status: done

## Story

As a **MiKL (opérateur Hub)**,
I want **joindre des fichiers/screenshots à mes messages et bénéficier d'une transformation automatique de mes messages bruts par Élio, adapté au profil de communication du client**,
so that **mes messages sont toujours bien rédigés, adaptés au client, et je peux partager des visuels directement dans le chat**.

## Acceptance Criteria

1. **AC1 — Pièces jointes** : Bouton 📎 dans la zone de saisie. Fichiers acceptés : images (jpg, png, gif, webp) + PDF. Taille max 10 Mo. Upload vers bucket Supabase Storage `chat-attachments`. L'URL signée est stockée dans `messages.attachment_url`. L'image s'affiche inline dans la bulle message. Un PDF/fichier s'affiche comme lien de téléchargement.

2. **AC2 — Migration DB** : Nouvelle migration `00076_add_chat_attachments.sql` ajoutant à la table `messages` : `attachment_url TEXT NULL`, `attachment_name TEXT NULL`, `attachment_type TEXT NULL`. Bucket Supabase `chat-attachments` avec RLS : operator et client propriétaire peuvent lire.

3. **AC3 — Workflow Transformation Élio** : Quand MiKL (opérateur) clique Envoyer, un panneau s'ouvre **avant l'envoi** avec :
   - ① Ton message brut (affiché tel quel)
   - ↓ Élio reformule (appel `transformMessageForClient`)
   - ② Message formaté et modifiable (textarea éditable)
   - Badge "🤖 Ton adapté" + profil utilisé (tutoiement/vouvoiement...)
   - Boutons : [✏️ Modifier] [✓ Envoyer]
   - Bouton secondaire : [Envoyer sans transformer] (envoi direct du message brut)
   - Le panneau NE s'affiche PAS pour les clients (seulement pour l'opérateur)

4. **AC4 — Mode d'envoi** : Toggle persistant dans l'interface (stocké `localStorage` key `elio_transform_mode`) :
   - **Vérification systématique** (défaut) : panneau toujours affiché
   - **Mode Confiance** : transformation + envoi automatique sans panneau, notification toast discrète

5. **AC5 — Action `transformMessageForClient`** : Nouvelle Server Action dans `packages/modules/elio/actions/transform-message-for-client.ts`. Prend `clientId` (UUID) et `rawMessage`. Charge le profil de communication via `getCommunicationProfile`. Appelle Élio Edge Function. Retourne `{ data: { transformedText, profileUsed }, error }`.

6. **AC6 — Tests** : Tests unitaires co-localisés. Upload action testé (mock storage). Transform action testé (mock Élio edge function). Composant EliTransformPanel testé. Coverage >80%.

## Tasks / Subtasks

- [ ] Task 1 — Migration DB (AC: #2)
  - [ ] 1.1 Créer `supabase/migrations/00076_add_chat_attachments.sql`
  - [ ] 1.2 Ajouter colonnes `attachment_url`, `attachment_name`, `attachment_type` à `messages`
  - [ ] 1.3 Politique RLS bucket `chat-attachments` (SELECT pour operator et client du message)

- [ ] Task 2 — Types & Server Actions Chat (AC: #1, #2)
  - [ ] 2.1 Mettre à jour `packages/modules/chat/types/chat.types.ts` : ajouter champs `attachmentUrl`, `attachmentName`, `attachmentType` optionnels dans `Message` et `SendMessageInput`
  - [ ] 2.2 Mettre à jour `toMessage` dans `utils/to-message.ts`
  - [ ] 2.3 Créer `packages/modules/chat/actions/upload-message-attachment.ts` — upload vers bucket `chat-attachments`, retourne `{ url, name, type }`
  - [ ] 2.4 Mettre à jour `send-message.ts` pour accepter les champs attachment optionnels
  - [ ] 2.5 Tests unitaires `upload-message-attachment.test.ts`

- [ ] Task 3 — Server Action Transformation Élio (AC: #5)
  - [ ] 3.1 Créer `packages/modules/elio/actions/transform-message-for-client.ts`
  - [ ] 3.2 Charger le profil via `getCommunicationProfile({ clientId })`
  - [ ] 3.3 Construire le prompt de reformulation adapté au profil
  - [ ] 3.4 Appeler `supabase.functions.invoke('elio-chat', ...)` avec timeout 30s
  - [ ] 3.5 Parser la réponse et retourner `{ transformedText, profileUsed }`
  - [ ] 3.6 Tests unitaires `transform-message-for-client.test.ts`

- [ ] Task 4 — Composant EliTransformPanel (AC: #3, #4)
  - [ ] 4.1 Créer `packages/modules/chat/components/elio-transform-panel.tsx`
  - [ ] 4.2 Props : `rawMessage`, `clientId`, `onSend(text)`, `onCancel()`, `onSendRaw()`
  - [ ] 4.3 État interne : loading (appel Élio), transformedText (editable), error
  - [ ] 4.4 Afficher : message brut → flèche → message transformé éditable + badge profil
  - [ ] 4.5 Boutons : ✓ Envoyer (le transformedText), ✏️ Envoyer sans transformer, ✕ Annuler
  - [ ] 4.6 Tests `elio-transform-panel.test.tsx` (mock `transformMessageForClient`)

- [ ] Task 5 — Mise à jour ChatInput (AC: #1, #3, #4)
  - [ ] 5.1 Ajouter bouton 📎 dans `chat-input.tsx` (visible seulement si `showAttachment` prop)
  - [ ] 5.2 `<input type="file" hidden>` avec `accept="image/*,.pdf"` + `maxSize 10Mo`
  - [ ] 5.3 Afficher preview du fichier sélectionné (nom + taille) avec bouton ✕ pour retirer
  - [ ] 5.4 Ajouter toggle Mode (Vérification / Confiance) dans le coin bas-droit (opérateur seulement)
  - [ ] 5.5 `onSend` reçoit `{ content, file? }` — ChatInput ne gère pas l'upload direct, juste la sélection
  - [ ] 5.6 Mettre à jour les tests `chat-input.test.tsx`

- [ ] Task 6 — Mise à jour ChatWindow (AC: #1, #3, #4)
  - [ ] 6.1 `handleSend` dans `chat-window.tsx` : si `currentUserType === 'operator'` + mode Vérification → ouvrir `EliTransformPanel`
  - [ ] 6.2 Si `currentUserType === 'operator'` + mode Confiance → appeler `transformMessageForClient` puis envoyer directement (toast discret)
  - [ ] 6.3 Si `currentUserType === 'client'` → envoi direct sans transformation
  - [ ] 6.4 Gérer l'upload du fichier avant envoi (si fichier joint : upload → récupère URL → inclure dans `sendMessage`)
  - [ ] 6.5 Mettre à jour les tests `chat-window.test.tsx`

- [ ] Task 7 — Mise à jour ChatMessage (AC: #1)
  - [ ] 7.1 Si `message.attachmentType.startsWith('image/')` → afficher `<img>` inline (max 300px wide)
  - [ ] 7.2 Sinon → afficher lien de téléchargement avec icône 📎 + nom du fichier
  - [ ] 7.3 Mettre à jour les tests `chat-message.test.tsx`

- [ ] Task 8 — Export index.ts (AC: tous)
  - [ ] 8.1 Exporter `EliTransformPanel` depuis `packages/modules/chat/index.ts`
  - [ ] 8.2 Exporter `transformMessageForClient` depuis `packages/modules/elio/index.ts`
  - [ ] 8.3 Exporter `uploadMessageAttachment` depuis `packages/modules/chat/index.ts`

## Dev Notes

### Architecture patterns MUST follow
- **Server Actions** : pattern `{ data, error }`, jamais `throw`, import `successResponse`/`errorResponse` de `@monprojetpro/types`
- **Upload** : même pattern que `packages/modules/documents/actions/upload-document.ts` — `FormData`, `supabase.storage.from('chat-attachments').upload(path, file)`
- **Transformation Élio** : même pattern que `correct-and-adapt-text.ts` — `supabase.functions.invoke('elio-chat', { body: {...}, signal })` avec timeout 30s
- **Communication profile** : utiliser `getCommunicationProfile({ clientId })` depuis `@monprojetpro/modules-elio` — retourne `CommunicationProfile | null`
- **Pas de framer-motion** : utiliser CSS transitions pour animations du panneau
- **Pas de `Dialog`/`Drawer` manquant** : vérifier ce qui existe dans `@monprojetpro/ui` avant d'importer. Si manquant → composant custom avec `position: fixed` + backdrop

### Fichiers à créer
- `supabase/migrations/00076_add_chat_attachments.sql`
- `packages/modules/chat/actions/upload-message-attachment.ts` + `.test.ts`
- `packages/modules/elio/actions/transform-message-for-client.ts` + `.test.ts`
- `packages/modules/chat/components/elio-transform-panel.tsx` + `.test.tsx`

### Fichiers à modifier
- `packages/modules/chat/types/chat.types.ts`
- `packages/modules/chat/utils/to-message.ts`
- `packages/modules/chat/actions/send-message.ts`
- `packages/modules/chat/components/chat-input.tsx`
- `packages/modules/chat/components/chat-window.tsx`
- `packages/modules/chat/components/chat-message.tsx`
- `packages/modules/chat/index.ts`
- `packages/modules/elio/index.ts`

### Migration num
Dernière migration : `00075_calendar_integrations_color.sql` → nouvelle = `00076`

### Storage bucket `chat-attachments`
Chemin de stockage : `{operatorId}/{clientId}/{uuid}-{filename}`
Même pattern que bucket `documents`.

### Profil de communication → prompt de transformation
- `formal` → vouvoiement, style professionnel
- `casual` → tutoiement, style décontracté  
- `friendly` → tutoiement ou vouvoiement selon préférence, chaleureux
- `technical` → termes précis, vouvoiement
- `concise` → messages courts, directs
- `detailed` → messages complets, explicatifs
- `balanced` → longueur intermédiaire

### Pas de `RadioGroup` dans @monprojetpro/ui
→ Utiliser toggle buttons custom (pattern déjà établi en Story 8.4)

### Mock Supabase storage dans les tests
```typescript
vi.mock('@monprojetpro/supabase', () => ({
  createServerSupabaseClient: vi.fn(() => ({
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } }, error: null }) },
    from: vi.fn().mockReturnThis(),
    storage: { from: vi.fn(() => ({ upload: vi.fn(), remove: vi.fn() })) },
  }))
}))
```

### References
- [Source: packages/modules/chat/actions/send-message.ts] — pattern envoi message
- [Source: packages/modules/documents/actions/upload-document.ts] — pattern upload Supabase Storage
- [Source: packages/modules/elio/actions/correct-and-adapt-text.ts] — pattern appel Élio Edge Function + prompt profil communication
- [Source: packages/modules/elio/actions/get-communication-profile.ts] — récupération profil par clientId
- [Source: packages/modules/elio/types/communication-profile.types.ts] — types CommunicationProfile
- [Source: _bmad-output/excalidraw-diagrams/hub/wireframe-monprojetpro-hub-messages.excalidraw] — maquette UI complète

## Dev Agent Record

### Agent Model Used
claude-sonnet-4-6

### Debug Log References

### Completion Notes List

- Implémentation majoritairement déjà présente (session précédente) — session 2026-04-17 : fix data-testid manquant sur operator-presence-header dans chat-window.tsx
- 53 tests passent — tous les AC couverts

### File List

- supabase/migrations/00076_add_chat_attachments.sql (CRÉÉ)
- packages/modules/chat/actions/upload-message-attachment.ts (CRÉÉ)
- packages/modules/chat/actions/upload-message-attachment.test.ts (CRÉÉ)
- packages/modules/elio/actions/transform-message-for-client.ts (CRÉÉ)
- packages/modules/elio/actions/transform-message-for-client.test.ts (CRÉÉ)
- packages/modules/chat/components/elio-transform-panel.tsx (CRÉÉ)
- packages/modules/chat/components/elio-transform-panel.test.tsx (CRÉÉ)
- packages/modules/chat/components/chat-input.tsx (MODIFIÉ)
- packages/modules/chat/components/chat-input.test.tsx (MODIFIÉ)
- packages/modules/chat/components/chat-window.tsx (MODIFIÉ)
- packages/modules/chat/components/chat-window.test.tsx (MODIFIÉ)
- packages/modules/chat/components/chat-message.tsx (MODIFIÉ)
- packages/modules/chat/components/chat-message.test.tsx (MODIFIÉ)
- packages/modules/chat/index.ts (MODIFIÉ)
- packages/modules/elio/index.ts (MODIFIÉ)
