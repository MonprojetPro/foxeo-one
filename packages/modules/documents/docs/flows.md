# Module Documents — Flows

## Flow 1: Upload d'un document

```
Utilisateur selectionne fichier (drag & drop ou bouton)
  → Validation client (type + taille)
  → Si invalide → Message d'erreur, pas d'upload
  → Si valide → Optimistic update (affichage immediat)
  → Server Action uploadDocument()
    → Validation serveur (defense en profondeur)
    → Verification identite (operateur ou client)
    → Upload Supabase Storage
    → Insert DB table documents
    → Si erreur DB → Cleanup Storage
  → Toast "Document uploade"
  → Invalidation cache TanStack Query ['documents', clientId]
```

## Flow 2: Liste des documents

```
Page chargee (Server Component)
  → getDocuments({ clientId })
  → RLS filtre automatiquement selon le role
  → DocumentList affiche DataTable
  → TanStack Query maintient le cache
```

## Flow 3: Suppression d'un document

```
Utilisateur clique supprimer
  → Optimistic update (retrait immediat)
  → Server Action deleteDocument({ documentId })
    → Recuperer document (RLS verifie l'acces)
    → Suppression Storage
    → Suppression DB
  → Si erreur → Rollback optimistic update
  → Invalidation cache ['documents', clientId]
```

## Flow 4: Visibilite des documents

```
Document uploade par operateur → visibility = 'private' (defaut)
  → Client ne voit PAS le document
  → Operateur change visibility → 'shared'
  → Client voit le document

Document uploade par client → visibility = 'private' (defaut)
  → Operateur voit TOUJOURS (policy documents_select_operator)
  → Client ne voit que ses propres uploads + documents partages
```

## Flow 5: Visualisation d'un document

```
Utilisateur clique sur un document dans la liste
  → Navigation vers /modules/documents/[documentId]
  → Server Action getDocumentUrl({ documentId })
    → RLS verifie l'acces
    → Genere signed URL (1h)
  → Selon le type de fichier :
    → Markdown → fetch contenu via signed URL → rendu HTML (react-markdown)
    → PDF → affichage iframe avec signed URL
    → Image → affichage <img> avec signed URL
    → Autre → apercu metadonnees + bouton telecharger
```

## Flow 6: Partage individuel MiKL → Client

```
Operateur clique "Partager" sur un document prive (Hub)
  → Server Action shareDocument(documentId)
    → Verification auth (getUser)
    → Verification operateur (operators.auth_user_id)
    → UPDATE documents SET visibility='shared' WHERE id=documentId
    → RLS verifie que l'operateur possede ce document
    → Fire-and-forget : INSERT notifications (client_id, type='document_shared')
  → Invalidation cache TanStack Query ['documents', clientId]
  → Badge passe "Prive" → "Partage"
  → Bouton passe "Partager" → "Partage actif"
  → Client voit le document dans son dashboard

Operateur clique "Partage actif" → AlertDialog confirmation
  → Si confirme : Server Action unshareDocument(documentId)
    → UPDATE documents SET visibility='private'
  → Badge repasse "Prive"
  → Client ne voit plus le document
```

## Flow 7: Partage en lot (batch) MiKL → Client

```
Operateur coche N documents dans la liste Hub
  → Barre batch apparait : "N documents selectionnes"
  → Operateur clique "Partager la selection (N)"
  → Server Action shareDocumentsBatch({ documentIds: [N ids], clientId })
    → Validation Zod (array.min(1))
    → Verification auth
    → Verification operateur (possede le clientId)
    → UPDATE documents SET visibility='shared' WHERE id IN (N ids)
    → Retourne { count: N, documentIds: [...] }
  → Invalidation cache ['documents', clientId]
  → Selection effacee automatiquement (onSuccess callback)
  → Barre batch disparait
  → N documents passent en "Partage"
```

## Flow 8: Telechargement / Generation PDF

```
Utilisateur clique "Telecharger" ou "Telecharger en PDF"
  → Si PDF natif → telechargement direct via signed URL
  → Si Markdown → Server Action generatePdf({ documentId })
    → Telecharge contenu Markdown depuis Storage
    → Convertit Markdown → HTML
    → Enveloppe dans template PDF brande MonprojetPro
    → Retourne HTML brande
    → Telechargement cote client
  → Toast "Document telecharge"
```

## Flow 9: Creation d'un dossier

```
Utilisateur clique "+ Nouveau dossier" dans FolderTree
  → Dialog s'ouvre avec champ nom
  → Utilisateur saisit le nom (min 1 char, max 100)
  → Clic "Creer"
  → useFolderMutations.useCreateFolder.mutate({ clientId, operatorId, name })
    → Server Action createFolder()
      → Verification auth
      → Validation Zod
      → INSERT document_folders
    → Invalidation cache ['folders', clientId]
  → Nouveau dossier apparait dans l'arborescence
```

## Flow 10: Deplacement d'un document

```
Utilisateur survole un document → Menu contextuel "Deplacer vers..."
  → Selection du dossier cible (ou "Non classes" = null)
  → useFolderMutations.useMoveDocument.mutate({ documentId, folderId })
    → Server Action moveDocument()
      → Verification auth
      → Verification document existe (RLS)
      → Verification dossier existe (si folderId non null)
      → UPDATE documents SET folder_id = folderId
    → Invalidation cache ['folders', clientId] + ['documents', clientId]
  → Toast "Document deplace dans {nom_dossier}"
```

## Flow 11: Synchronisation manuelle ZIP vers BMAD

```
Operateur clique "Sync vers BMAD (N docs partages)" dans la page Hub
  → SyncToZipButton.handleSync() (useTransition — non bloquant)
  → Server Action syncDocumentsToZip(clientId)
    → Verification auth (getUser)
    → Verification operateur (operators.auth_user_id)
    → Verification client (appartient a l'operateur)
    → SELECT documents WHERE client_id=? AND visibility='shared'
    → Si 0 documents → retourne ZIP vide base64 (count=0)
    → Pour chaque document : createSignedUrl (5 min TTL)
    → Si erreur signed URL → retourne STORAGE_ERROR
    → generateZipFromDocuments([{ name, url }])
      → Telecharge chaque fichier via fetch(signedUrl)
      → Construit ZIP format "stored" (sans compression)
      → Retourne Buffer ZIP
    → zipBuffer.toString('base64')
    → UPDATE documents SET last_synced_at=now WHERE id IN (documentIds)
    → INSERT activity_logs { actor_type='operator', action='documents_synced', metadata }
    → Retourne { zipBase64, count }
  → SyncToZipButton decode base64 → Blob
  → URL.createObjectURL(blob) → telechargement automatique
  → Toast "Archive ZIP prete (N documents)"
  → Invalidation cache TanStack Query ['documents', clientId]
  → DocumentList raffraichit → badges "Synce le {date}" apparaissent

Note: Limite de taille > 50 Mo → warning logue, ZIP genere quand meme
```

## Flow 11b: Extension Phase 2 — Sync automatique (non implemente)

```
TODO Phase 2: Sync automatique via Supabase Edge Function
Trigger: UPDATE sur documents WHERE visibility='shared'
Edge Function: supabase/functions/sync-document/index.ts
  - Recupere le fichier depuis Storage
  - Ecrit dans le dossier BMAD via API filesystem ou mount partage
  - Met a jour last_synced_at
Prerequis: acces reseau au dossier BMAD local (VPN, mount NFS, ou API agent local)
```

## Flow 15: Export CSV de la liste de documents

```
Utilisateur clique "Exporter" → "Exporter la liste en CSV"
  → DocumentExportMenu.exportCSV() appele
  → useExportDocuments.exportCSV() (useTransition — non bloquant)
  → Server Action exportDocumentsCSV(clientId, filters?)
    → Verification auth (getUser)
    → Validation Zod (clientId UUID)
    → SELECT documents WHERE client_id=? AND deleted_at IS NULL ORDER BY created_at DESC
    → Application filtres en memoire si fournis (folderId, visibility, uploadedBy)
    → SELECT document_folders WHERE client_id=?
    → generateDocumentsCsv(documents, folders)
      → Genere en-tete CSV (Nom, Type, Taille, Dossier, Visibilite, Date creation, Date modification)
      → Pour chaque document : ligne CSV avec echappement des virgules/guillemets
      → Prefixe BOM UTF-8 (\uFEFF)
    → Retourne { csvContent, fileName, count }
  → Cote client: Blob CSV → URL.createObjectURL → lien <a> download
  → Telechargement automatique du fichier
  → URL.revokeObjectURL apres 1 seconde (cleanup)
  → Toast "Export CSV telecharge (N documents)"
  → Log "[DOCUMENTS:EXPORT_CSV] N documents exportes"
```

## Flow 16: Export JSON de la liste de documents

```
Utilisateur clique "Exporter" → "Exporter la liste en JSON"
  → DocumentExportMenu.exportJSON() appele
  → useExportDocuments.exportJSON() (useTransition — non bloquant)
  → Server Action exportDocumentsJSON(clientId, filters?)
    → Verification auth (getUser)
    → Validation Zod (clientId UUID)
    → SELECT documents WHERE client_id=? AND deleted_at IS NULL ORDER BY created_at DESC
    → Application filtres en memoire si fournis
    → generateDocumentsJson(documents, metadata)
      → Payload JSON: { exportedAt, exportedBy, clientId, totalCount, documents: [...] }
      → Chaque document en camelCase: id, name, fileType, fileSize, formattedSize, folderId, visibility, uploadedBy, tags, createdAt, updatedAt
    → Retourne { jsonContent, fileName, count }
  → Cote client: Blob JSON → URL.createObjectURL → lien <a> download
  → Telechargement automatique du fichier
  → Toast "Export JSON telecharge (N documents)"
  → Log "[DOCUMENTS:EXPORT_JSON] N documents exportes"
```

## Flow 17: Telechargement PDF d'un document individuel

```
Utilisateur (sur page viewer) ouvre "Exporter" → "Telecharger en PDF"
  → DocumentExportMenu.handleDownloadPdf() appele
  → useTransition (non bloquant)
  → Si document.fileType = 'pdf' (natif) :
    → Server Action getDocumentUrl({ documentId })
      → Signed URL Supabase Storage (1h)
    → Lien <a href=signedUrl download target='_blank'>
    → Telechargement direct du fichier PDF
    → Log "[DOCUMENTS:EXPORT_PDF] {filename}"
  → Si document.fileType = 'md' (Markdown) :
    → Server Action generatePdf({ documentId }) [reutilise story 4.2]
      → Telecharge contenu Markdown depuis Storage
      → Convertit Markdown → HTML
      → Enveloppe dans template brande MonprojetPro
      → Retourne { htmlContent, fileName }
    → Blob HTML → URL.createObjectURL → lien <a> download
    → Toast "PDF telecharge : {filename}"
    → Log "[DOCUMENTS:EXPORT_PDF] {filename}"
  → URL.revokeObjectURL apres 1 seconde
```

## Flow 12: Recherche dans les documents

```
Utilisateur tape dans DocumentSearch (debounce 200ms)
  → searchQuery propagee a DocumentsPageClient
  → DocumentList recoit searchQuery prop
  → filteredDocuments = documents.filter(d =>
      d.name.includes(q) || d.fileType.includes(q) || d.tags.some(t => t.includes(q))
    )
  → AUCUNE requete DB supplementaire
  → Resultats < 1 seconde (cache TanStack Query deja charge)
  → Si 0 resultats → "Aucun document trouve"
  → Clic X → clear, tous les documents reapparaissent
```

## Flow 13: Autosave de brouillon (formulaires longs)

```
Utilisateur commence a remplir un formulaire (ex: upload document)
  → Hook useDraftForm('document-upload', clientId, form) active
  → form.watch() ecoute les changements de valeurs
  → Chaque modification → debounce 30 secondes
  → Apres 30s inactivite → localStorage.setItem(
      `draft:document-upload:${clientId}`,
      JSON.stringify({ values: formData, timestamp: Date.now() })
    )
  → Log console: "[DOCUMENTS:DRAFT_SAVE] Brouillon sauvegarde"

Utilisateur ferme la page et revient plus tard
  → Page se charge → useDraftForm detecte brouillon dans localStorage
  → DraftRestoreBanner s'affiche: "Un brouillon a ete trouve (sauvegarde le {date})"
  → Utilisateur clique "Reprendre"
    → form.reset(brouillonValues)
    → Bandeau disparait
    → Formulaire pre-rempli
  → Utilisateur clique "Non, recommencer"
    → localStorage.removeItem(draftKey)
    → Bandeau disparait
    → Formulaire vide

Utilisateur soumet le formulaire avec succes
  → form.formState.isSubmitSuccessful = true
  → useEffect detecte isSubmitSuccessful
  → localStorage.removeItem(draftKey)
  → Log console: "[DOCUMENTS:DRAFT_CLEAR] Brouillon efface apres soumission"
```

## Flow 14: Annulation d'action (undo)

```
Utilisateur clique "Supprimer" sur un document
  → Hook useUndoableAction() active
  → Execute l'action immediatement:
    → Server Action deleteDocument(documentId)
      → UPDATE documents SET deleted_at=NOW() WHERE id=documentId (soft delete)
      → Fichier Storage reste present (pour restauration eventuelle)
    → Optimistic update → document disparait de la liste
  → Toast.success("Document supprime", {
      duration: 5000,
      action: { label: "Annuler", onClick: undoAction }
    })
  → Timer 5 secondes visible dans le toast

Utilisateur clique "Annuler" (dans les 5 secondes)
  → undoAction() execute:
    → Server Action restoreDocument(documentId)
      → UPDATE documents SET deleted_at=NULL WHERE id=documentId
    → Optimistic update → document reapparait
  → Toast.success("Annulee")
  → Log console: "[DOCUMENTS:UNDO] Action annulee"

Utilisateur ne clique PAS "Annuler" (timer expire)
  → Toast disparait apres 5 secondes
  → Action devient definitive
  → Document reste marque deleted_at=NOW()
  → Note: Un job de nettoyage pourrait hard-delete les documents apres X jours

Autres actions undoables:
- Retrait de partage → undoAction = shareDocument(documentId)
- Suppression de dossier → undoAction = createFolder({ name, clientId })
```
