# Module Documents — Guide

## Vue d'ensemble

Le module Documents permet aux clients et operateurs de gerer des fichiers sur la plateforme MonprojetPro. Les fichiers sont stockes dans Supabase Storage avec validation cote client et serveur.

## Fonctionnalites

- **Upload de documents** : Drag & drop ou bouton parcourir avec validation automatique (type + taille)
- **Liste des documents** : DataTable avec nom, type (icone), taille formatee, date, visibilite
- **Suppression** : Suppression du fichier Storage + enregistrement DB
- **Visibilite** : `private` (visible uniquement par l'uploadeur) ou `shared` (visible par client et operateur)
- **Validation** : Types autorises (PDF, DOCX, XLSX, PNG, JPG, SVG, MD, TXT, CSV), taille max 10 Mo
- **Viewer de documents** : Visualisation directe dans le dashboard (Markdown en HTML, PDF en iframe, images)
- **Telechargement PDF** : Telechargement direct ou generation PDF depuis Markdown avec branding MonprojetPro
- **Signed URLs** : Acces securise aux fichiers via URLs temporaires (1h)
- **Organisation en dossiers** : Arborescence de dossiers pour classer les documents
- **Recherche** : Filtre en temps reel sur nom, type et tags

## Acces

| Dashboard | Route | Acces |
|-----------|-------|-------|
| Hub | `/modules/documents/[clientId]` | Operateur voit tous les docs d'un client |
| Hub | `/modules/documents/[clientId]/[documentId]` | Viewer document avec badge visibilite |
| Lab / One | `/modules/documents` | Client voit ses docs + docs partages |
| Lab / One | `/modules/documents/[documentId]` | Viewer document client |

## Organisation en dossiers

La page documents affiche un panneau lateral gauche avec l'arborescence de dossiers.

### Noeuds speciaux

- **Tous les documents** : Affiche tous les documents sans filtre (selection par defaut)
- **Non classes** : Affiche uniquement les documents sans dossier (`folderId = null`)

### Creer un dossier

Cliquer sur **"+ Nouveau dossier"** en bas du panneau. Une boite de dialogue s'ouvre pour saisir le nom. Le dossier apparait immediatement dans l'arborescence.

### Renommer un dossier

Survoler un dossier pour afficher les icones d'action. Cliquer sur l'icone crayon. La meme boite de dialogue que la creation s'ouvre avec le champ pre-rempli.

### Supprimer un dossier

Survoler un dossier et cliquer sur l'icone corbeille. Une boite de confirmation s'affiche. **Important** : seuls les dossiers vides (0 documents) peuvent etre supprimes. Si un dossier contient des documents, deplacer d'abord les documents.

### Deplacer un document

Ouvrir le menu contextuel du document (ou utiliser l'option "Deplacer vers..."). Selectionner le dossier cible. Le document est deplace immediatement. Choisir "Non classes" pour retirer le document de tout dossier.

## Recherche

La barre de recherche en haut de la liste filtre en temps reel (debounce 200ms) sur :
- **Nom** du document
- **Type** de fichier (ex : pdf, png)
- **Tags** associes

La recherche s'effectue sur **toutes les donnees deja chargees** (cache TanStack Query) — aucune requete DB supplementaire n'est effectuee. Les resultats apparaissent en moins de 1 seconde (NFR-P4).

La recherche n'est pas limitee au dossier actif : elle traverse tous les documents du client.

## Autosave & Annulation d'actions

### Sauvegarde automatique des brouillons

Les formulaires longs (upload document, creation dossier, edition nom) sauvegardent automatiquement votre travail toutes les **30 secondes** dans le navigateur (localStorage).

**Comment ca marche :**
1. Vous commencez a remplir un formulaire
2. Apres 30 secondes d'edition, un brouillon est sauvegarde automatiquement
3. Si vous fermez la page ou rechargez, un bandeau s'affiche : *"Un brouillon a ete trouve (sauvegarde le {date})"*
4. Cliquez **"Reprendre"** pour restaurer vos donnees, ou **"Non, recommencer"** pour ignorer le brouillon
5. Le brouillon est supprime automatiquement apres une soumission reussie

**Note :** Les fichiers binaires (PDF, images) ne sont PAS sauvegardes dans le brouillon — uniquement les champs texte (nom, tags, etc.).

### Annulation d'actions recentes

Certaines actions peuvent etre annulees pendant **5 secondes** apres leur execution :
- **Suppression de document**
- **Retrait de partage**
- **Suppression de dossier**

**Comment ca marche :**
1. Vous executez une action (ex : suppression d'un document)
2. Un message de confirmation s'affiche avec un bouton **"Annuler"** et un timer de 5 secondes
3. Si vous cliquez **"Annuler"** avant expiration, l'action est inversee immediatement
4. Si vous ne faites rien, l'action devient definitive apres 5 secondes

**Important :** L'annulation n'est possible que pendant les 5 secondes apres l'action. Passé ce délai, il faudra recreer manuellement le document ou dossier supprime.

## Partager des documents avec votre client

L'operateur (MiKL) peut partager des documents prives avec son client via le Hub.

### Partage individuel

Chaque document de la liste dispose d'un bouton **"Partager"**. Un clic passe le document de `private` a `shared` : le client le voit immediatement dans son dashboard. Le client est notifie automatiquement.

Pour retirer le partage, le meme bouton affiche **"Partage actif"**. Un clic ouvre une boite de confirmation avant de repasser le document en `private`.

### Partage en lot (batch)

La liste Hub propose des cases a cocher (`showBatchActions=true`). Apres selection de plusieurs documents, la barre d'actions batch apparait avec le bouton **"Partager la selection (N)"**. Un seul clic partage tous les documents selectionnes en une requete. La selection est effacee automatiquement apres succes.

### Comportement visibilite

| Etat | Client voit | Operateur voit |
|------|-------------|----------------|
| `private` | Non | Oui |
| `shared` | Oui | Oui |

## Synchroniser les documents vers BMAD

L'operateur (MiKL) peut telecharger une archive ZIP de tous les documents `shared` d'un client pour les integrer dans son dossier BMAD local (utilise par Orpheus dans Cursor).

### Comment utiliser

1. Ouvrir la page Documents d'un client dans le Hub (`/modules/documents/[clientId]`)
2. Cliquer sur le bouton **"Sync vers BMAD (N docs partages)"** en haut a droite
3. Le ZIP est genere automatiquement cote serveur et le telechargement demarre
4. Extraire le ZIP dans le dossier BMAD du client (ex: `{workspace}/clients/{clientId}/documents/`)
5. Orpheus (dans Cursor) peut maintenant acceder aux derniers documents valides

### Quels documents sont inclus ?

Uniquement les documents avec `visibility = 'shared'`. Les documents prives (`private`) ne sont **jamais** inclus dans le ZIP.

### Badge "Synce"

Apres une synchronisation reussie, chaque document inclus affiche un badge **"Synce le {date}"** dans la colonne "Sync BMAD" de la liste. Le badge devient gris apres 7 jours (sync ancienne).

### Limite de taille

Si le total des documents depasse 50 Mo, un avertissement est logue mais le ZIP est genere quand meme. Pour les archives de grande taille, privilegiez un acces direct au bucket Supabase Storage.

### Trace d'activite

Chaque synchronisation est enregistree dans `activity_logs` : `{ action: 'documents_synced', metadata: { count, documentIds, syncedAt } }`.

## Composants disponibles

- `DocumentUpload` — Zone de depot avec validation
- `DocumentList` — Tableau de documents (+ checkboxes batch si `showBatchActions=true`, + filtre `searchQuery`)
- `DocumentIcon` — Icone par type de fichier
- `DocumentSkeleton` — Skeleton loader
- `DocumentsPageClient` — Page complete (upload + arborescence + recherche + liste)
- `DocumentViewer` — Viewer selon type (Markdown, PDF, image, fallback)
- `DocumentViewerSkeleton` — Skeleton loader du viewer
- `DocumentMetadataPreview` — Apercu metadonnees pour fichiers non visualisables
- `DocumentDownloadButton` — Bouton telechargement / generation PDF
- `DocumentVisibilityBadge` — Badge visibilite (Hub)
- `DocumentViewerPageClient` — Page viewer complete
- `DocumentShareButton` — Bouton partager/retirer partage individuel
- `FolderTree` — Arborescence de dossiers avec creation/renommage/suppression
- `FolderTreeSkeleton` — Skeleton loader de l'arborescence
- `CreateFolderDialog` — Dialog de creation/renommage de dossier
- `DocumentSearch` — Champ de recherche avec debounce et clear
- `SyncToZipButton` — Bouton de synchronisation ZIP vers BMAD (Hub uniquement)
- `DocumentSyncBadge` — Badge "Synce le {date}" par document
- `DocumentExportMenu` — Menu deroulant d'export (CSV, JSON, PDF)

## Exporter vos documents

Le module Documents permet d'exporter la liste de vos documents ou un document individuel dans plusieurs formats standards.

### Bouton "Exporter"

Un bouton **"Exporter"** (icone Download) est disponible dans la barre d'outils au-dessus de la liste de documents. Un clic ouvre un menu deroulant avec les options disponibles.

### Export CSV — Liste de documents

Cliquer sur **"Exporter la liste en CSV"** dans le menu export.

- Le serveur genere un fichier CSV avec BOM UTF-8 (compatible Excel)
- Colonnes exportees : Nom, Type, Taille, Dossier, Visibilite, Date creation, Date modification
- Le fichier se telecharge automatiquement dans votre navigateur
- Nom du fichier : `documents-{clientId8}-{date}.csv`

### Export JSON — Liste de documents

Cliquer sur **"Exporter la liste en JSON"** dans le menu export.

- Format JSON structure avec metadonnees completes (camelCase)
- Structure racine : `{ exportedAt, exportedBy, clientId, totalCount, documents: [...] }`
- Le fichier se telecharge automatiquement
- Nom du fichier : `documents-{clientId8}-{date}.json`

### Telecharger en PDF — Document individuel

Cette option n'est disponible que sur la page viewer d'un document individuel.

- **Fichier PDF natif** : telechargement direct via signed URL Supabase Storage
- **Fichier Markdown** : generation serveur avec branding MonprojetPro (header logo, footer date) via `generatePdf()` — identique au bouton telechargement de la story 4.2

### Indicateur de progression

Si l'export prend plus d'une seconde, le bouton affiche **"Export en cours..."** avec un indicateur rotatif (Loader2). Vous pouvez continuer a naviguer pendant la generation — l'export se termine en arriere-plan.

## Securite

- **RLS** : Isolation complete entre clients. Un client ne voit jamais les documents prives d'un autre.
- **Storage** : Bucket prive avec politiques RLS. Chemins : `{operatorId}/{clientId}/{filename}`
- **Triple couche** : RLS (DB) + validation serveur (Server Action) + validation client (composant)
- **Dossiers** : Memes politiques RLS que les documents — isolation par `client_id` et `operator_id`
