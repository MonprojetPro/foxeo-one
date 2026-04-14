# Epic 4 : Gestion Documentaire — Stories detaillees

**Objectif :** Clients et MiKL peuvent gerer, visualiser, partager et exporter des documents avec viewer HTML, PDF, recherche, autosave et organisation en dossiers.

**FRs couverts:** FR62, FR63, FR64, FR65, FR86, FR107, FR135, FR136, FR144, FR145, FR146, FR150

**NFRs pertinentes:** NFR-P1, NFR-P6, NFR-SC3, NFR-S7, NFR-A1 a NFR-A4, NFR-M1 a NFR-M5

---

## Story 4.1 : Module Documents — Migration, structure & upload avec validation

As a **utilisateur (MiKL ou client)**,
I want **uploader des documents sur la plateforme avec validation automatique du type et de la taille**,
So that **seuls les fichiers autorises et de taille raisonnable sont stockes sur la plateforme**.

**Acceptance Criteria :**

**Given** les besoins en donnees de cette story
**When** la migration 00006_documents.sql est executee
**Then** la table `documents` est creee avec : id (UUID PK), client_id (FK clients NOT NULL), operator_id (FK operators NOT NULL), name (TEXT NOT NULL), file_path (TEXT NOT NULL — chemin Supabase Storage), file_type (TEXT NOT NULL), file_size (INTEGER NOT NULL — en octets), folder_id (UUID nullable FK self-referencing ou table separee), tags (TEXT[] DEFAULT ARRAY[]::TEXT[]), visibility (TEXT CHECK IN ('private', 'shared') DEFAULT 'private'), uploaded_by (TEXT CHECK IN ('client', 'operator') NOT NULL), created_at (TIMESTAMP DEFAULT NOW()), updated_at (TIMESTAMP DEFAULT NOW())
**And** les policies RLS :
- `documents_select_owner` : un client ne voit que ses documents partages (visibility='shared') et ceux qu'il a uploades
- `documents_select_operator` : un operateur voit tous les documents de ses clients
- `documents_insert_authenticated` : client et operateur peuvent inserer
- `documents_update_operator` : seul l'operateur peut modifier (visibility, folder, tags)

**Given** le module Documents n'existe pas encore
**When** la story est completee
**Then** le module `packages/modules/documents/` est structure :
- `manifest.ts` avec id: `documents`, targets: `['hub', 'client-lab', 'client-one']`, requiredTables: `['documents']`
- `components/` : document-list.tsx, document-upload.tsx
- `hooks/` : use-documents.ts
- `actions/` : upload-document.ts
- `types/` : document.types.ts
- `index.ts` barrel export

**Given** un utilisateur (client ou MiKL) veut uploader un document
**When** il utilise le composant document-upload.tsx (drag & drop ou bouton parcourir)
**Then** le systeme valide AVANT l'upload :
- **Type de fichier** (FR145) : seuls les types autorises sont acceptes (PDF, DOCX, XLSX, PNG, JPG, SVG, MD, TXT, CSV)
- **Taille de fichier** (FR144) : maximum 10 Mo par fichier (constante MAX_FILE_SIZE dans @monprojetpro/utils)
**And** si le fichier est invalide, un message d'erreur clair s'affiche ("Type de fichier non autorise" ou "Fichier trop volumineux (max 10 Mo)")

**Given** un fichier valide est selectionne
**When** l'upload demarre
**Then** le fichier est uploade vers Supabase Storage dans le bucket `documents/{operator_id}/{client_id}/`
**And** une barre de progression s'affiche pendant l'upload
**And** une Server Action `uploadDocument()` cree l'enregistrement dans la table `documents` avec les metadonnees
**And** la reponse suit le pattern `{ data, error }`
**And** un toast confirme "Document uploade avec succes"
**And** le cache TanStack Query `['documents', clientId]` est invalide

**Given** la liste des documents est affichee
**When** l'utilisateur la consulte
**Then** chaque document affiche : nom, type (icone), taille formatee, date, tag de visibilite (prive/partage)
**And** la liste utilise le composant DataTable de @monprojetpro/ui
**And** un skeleton loader s'affiche pendant le chargement

---

## Story 4.2 : Visualisation documents (viewer HTML) & telechargement PDF

As a **client MonprojetPro**,
I want **consulter mes documents directement dans le dashboard (rendu HTML) et les telecharger en PDF**,
So that **j'accede a mes livrables sans quitter la plateforme et je peux les conserver hors ligne**.

**Acceptance Criteria :**

**Given** un client clique sur un document dans la liste
**When** le viewer se charge (document-viewer.tsx)
**Then** le document est affiche en rendu HTML dans un panneau ou une page dediee (FR62)
**And** les formats supportes pour le rendu HTML sont : Markdown (rendu HTML natif), PDF (viewer embarque via iframe ou composant), images (PNG, JPG, SVG — affichage direct)
**And** les fichiers non visualisables (DOCX, XLSX, CSV) affichent un apercu des metadonnees avec un bouton "Telecharger"
**And** un skeleton loader s'affiche pendant le chargement du document
**And** le viewer est responsive (fonctionne sur mobile >=320px)

**Given** un client consulte un document
**When** il clique sur "Telecharger en PDF" (FR63)
**Then** si le document est deja un PDF, le fichier est telecharge directement via signed URL Supabase Storage
**And** si le document est un Markdown, un PDF est genere cote serveur (via Server Action `generatePDF()`) et telecharge
**And** la generation PDF prend moins de 5 secondes (NFR-P6)
**And** le PDF genere conserve le branding MonprojetPro (header avec logo, footer avec date)

**Given** MiKL consulte un document dans le Hub
**When** le viewer se charge
**Then** les memes fonctionnalites sont disponibles
**And** MiKL peut voir un badge "Visible par le client" ou "Non visible" sur chaque document

**Given** le document est un fichier volumineux
**When** le viewer se charge
**Then** le fichier est telecharge via signed URL Supabase Storage (URL temporaire, expiration 1h)
**And** le signed URL est genere cote serveur (pas d'exposition des chemins internes)

---

## Story 4.3 : Partage de documents MiKL-client & visibilite

As a **MiKL (operateur)**,
I want **partager un document avec un client et controler sa visibilite (visible ou non visible)**,
So that **je decide precisement ce que le client peut voir dans son espace documents**.

**Acceptance Criteria :**

**Given** MiKL sur le Hub, dans le module Documents ou dans la fiche client (onglet Documents)
**When** il uploade un document pour un client
**Then** le document est cree avec `visibility: 'private'` par defaut et `uploaded_by: 'operator'`
**And** le document n'est PAS visible par le client tant que MiKL ne le partage pas (FR64)

**Given** MiKL consulte un document d'un client
**When** il clique sur "Partager avec le client" (toggle ou bouton)
**Then** une Server Action `shareDocument()` met a jour `visibility: 'shared'`
**And** une notification est envoyee au client ("MiKL a partage un nouveau document avec vous")
**And** un toast confirme "Document partage avec le client"
**And** le cache TanStack Query est invalide

**Given** MiKL veut retirer le partage d'un document
**When** il clique sur "Retirer le partage"
**Then** une boite de dialogue de confirmation s'affiche ("Le client ne pourra plus voir ce document")
**And** si confirme, `visibility` repasse a `'private'`
**And** le document disparait de la vue client (mais pas supprime)
**And** un toast confirme "Partage retire"

**Given** MiKL veut partager plusieurs documents a la fois
**When** il selectionne plusieurs documents dans la liste (checkboxes)
**Then** un bouton "Partager la selection" permet de partager en batch
**And** une Server Action `shareDocumentsBatch()` met a jour tous les documents selectionnes

**Given** un client consulte ses documents
**When** la liste se charge
**Then** il ne voit que les documents avec `visibility: 'shared'` ET les documents qu'il a lui-meme uploades
**And** la RLS garantit ce filtrage au niveau base de donnees

---

## Story 4.4 : Organisation en dossiers & recherche dans les documents

As a **client MonprojetPro**,
I want **organiser mes documents en dossiers et rechercher rapidement dans mes documents**,
So that **je retrouve facilement un document specifique meme avec beaucoup de fichiers**.

**Acceptance Criteria :**

**Given** les besoins en donnees de cette story
**When** la migration est executee
**Then** la table `document_folders` est creee avec : id (UUID PK), client_id (FK clients NOT NULL), operator_id (FK operators NOT NULL), name (TEXT NOT NULL), parent_id (UUID nullable FK document_folders — pour les sous-dossiers), created_at (TIMESTAMP DEFAULT NOW())
**And** la colonne `folder_id` dans `documents` reference `document_folders(id)`
**And** les policies RLS :
- `document_folders_select_owner` : un client ne voit que ses dossiers
- `document_folders_select_operator` : un operateur voit les dossiers de ses clients

**Given** un client accede a ses documents
**When** la page se charge
**Then** une arborescence de dossiers s'affiche a gauche (folder-tree.tsx) avec les dossiers du client (FR146)
**And** les documents sans dossier apparaissent dans un dossier virtuel "Non classes"
**And** un clic sur un dossier filtre la liste de documents a droite
**And** le client peut creer un nouveau dossier (nom obligatoire)
**And** le client peut renommer ou supprimer un dossier vide

**Given** un client veut deplacer un document dans un dossier
**When** il utilise le drag & drop ou le menu contextuel "Deplacer vers..."
**Then** le `folder_id` du document est mis a jour via Server Action `moveDocument()`
**And** un toast confirme "Document deplace dans {nom_dossier}"

**Given** MiKL consulte les documents d'un client dans le Hub
**When** il visualise la structure
**Then** il voit la meme arborescence de dossiers que le client
**And** MiKL peut creer des dossiers et deplacer des documents pour le client

**Given** un utilisateur veut rechercher dans ses documents (FR107)
**When** il saisit du texte dans le champ de recherche
**Then** la recherche porte sur : nom du document, tags, type de fichier
**And** les resultats se filtrent en temps reel
**And** les resultats apparaissent en moins de 1 seconde (NFR-P4)
**And** la recherche fonctionne a travers tous les dossiers (pas limitee au dossier actif)

---

## Story 4.5 : Synchronisation documents vers dossier BMAD local

As a **MiKL (operateur)**,
I want **que les documents valides soient automatiquement synchronises vers le dossier BMAD local du client**,
So that **Orpheus (dans Cursor) a toujours acces aux derniers documents valides sans manipulation manuelle**.

**Acceptance Criteria :**

**Given** un document est valide (via le Validation Hub ou directement par MiKL)
**When** le statut du document passe a "valide"
**Then** le systeme declenche une synchronisation vers le dossier BMAD local du client (FR65, FR86)
**And** le chemin de destination suit la convention : `{bmad_base_path}/clients/{client_slug}/documents/{document_name}`

**Given** l'architecture de synchronisation
**When** le mecanisme est mis en place
**Then** la synchronisation est geree par une Supabase Edge Function declenchee par un trigger sur la table `documents` (event: UPDATE, condition: visibility='shared' ET status='validated')
**And** la Edge Function telecharge le fichier depuis Supabase Storage et l'ecrit dans le dossier BMAD (si accessible — ex: via API filesystem, mount partage, ou notification a un agent local)

**Given** le dossier BMAD local n'est pas accessible depuis le serveur (cas courant — DD externe de MiKL)
**When** la synchronisation ne peut pas se faire automatiquement
**Then** un mecanisme alternatif est prevu :
- Option 1 : Un bouton "Sync vers BMAD" dans le Hub telecharge un ZIP des documents valides du client
- Option 2 : Un script local (CLI) que MiKL peut executer pour pull les documents valides depuis Supabase Storage
**And** le statut de synchronisation est trace : `last_synced_at` dans la fiche client ou les metadonnees du document

**Given** un document deja synchronise est mis a jour
**When** une nouvelle version est uploadee
**Then** l'ancienne version locale est remplacee par la nouvelle
**And** un log de synchronisation est cree dans `activity_logs`

---

## Story 4.6 : Autosave brouillons & undo actions recentes

As a **utilisateur (MiKL ou client)**,
I want **que les formulaires longs sauvegardent automatiquement en brouillon et que je puisse annuler certaines actions recentes**,
So that **je ne perds jamais mon travail en cours et je peux corriger une erreur rapidement**.

**Acceptance Criteria :**

**Given** un utilisateur remplit un formulaire long (creation client, edition de document, signalement, brief Lab)
**When** il commence a saisir des donnees
**Then** le formulaire sauvegarde automatiquement en brouillon toutes les 30 secondes (FR135)
**And** le brouillon est stocke dans le localStorage du navigateur (cle : `draft:{formType}:{entityId}`)
**And** un indicateur discret affiche "Brouillon sauvegarde" avec l'heure de la derniere sauvegarde
**And** Zustand n'est PAS utilise pour ca (localStorage direct via react-hook-form watch + effet)

**Given** un utilisateur revient sur un formulaire avec un brouillon existant
**When** le formulaire se charge
**Then** un bandeau s'affiche : "Un brouillon a ete trouve (sauvegarde le {date}). Reprendre ? [Oui] [Non, recommencer]"
**And** si "Oui" : le formulaire est prerempli avec les donnees du brouillon
**And** si "Non" : le brouillon est supprime et le formulaire est vide

**Given** un utilisateur soumet avec succes un formulaire
**When** la soumission reussit
**Then** le brouillon correspondant est automatiquement supprime du localStorage

**Given** un utilisateur effectue une action reversible (ex: supprimer un document, retirer un partage, supprimer une note)
**When** l'action est executee
**Then** un toast s'affiche avec un bouton "Annuler" pendant 5 secondes (FR136)
**And** si l'utilisateur clique sur "Annuler" dans le delai : l'action est inversee (Server Action undo ou re-creation)
**And** si le delai expire : l'action est definitive

**Given** le pattern d'undo est implemente
**When** il est utilise
**Then** un helper `useUndoableAction()` dans `packages/modules/documents/hooks/` encapsule la logique :
- Execute l'action immediatement (optimistic)
- Affiche le toast avec timer
- Inverse l'action si "Annuler" clique
- Confirme l'action apres expiration du timer
**And** les actions supportant l'undo sont : suppression de document, retrait de partage, suppression de note privee, suppression de rappel

---

## Story 4.7 : Export documents en formats standards

As a **utilisateur (MiKL ou client)**,
I want **exporter mes documents et donnees en formats standards (CSV, JSON, PDF)**,
So that **je peux utiliser mes donnees en dehors de la plateforme et rester conforme aux obligations de portabilite**.

**Acceptance Criteria :**

**Given** un client ou MiKL consulte une liste de documents
**When** il clique sur "Exporter" (FR150)
**Then** un menu propose les formats d'export : PDF (document individuel), CSV (liste des documents avec metadonnees), JSON (liste structuree)
**And** le format par defaut est PDF pour un document unique, CSV pour une liste

**Given** un utilisateur exporte un document individuel en PDF
**When** l'export est declenche
**Then** le fichier PDF est telecharge directement (si deja en PDF) ou genere cote serveur (si Markdown/HTML)
**And** le PDF inclut le branding MonprojetPro (header logo, footer date + "Genere depuis MonprojetPro")
**And** l'export prend moins de 5 secondes (NFR-P6)

**Given** MiKL exporte la liste des documents d'un client en CSV
**When** l'export est declenche
**Then** un fichier CSV est genere cote serveur via Server Action `exportDocumentsCSV()`
**And** le CSV contient les colonnes : nom, type, taille, dossier, visibilite, date_creation, date_modification
**And** l'encodage est UTF-8 avec BOM pour compatibilite Excel
**And** le fichier est telecharge automatiquement

**Given** MiKL exporte les donnees en JSON
**When** l'export est declenche
**Then** un fichier JSON structure est genere avec les metadonnees completes de chaque document
**And** le JSON suit le format camelCase (convention API)
**And** le fichier est telecharge automatiquement

**Given** un export est en cours
**When** le traitement prend du temps (> 1 seconde)
**Then** un indicateur de progression s'affiche
**And** l'utilisateur peut continuer a naviguer pendant l'export (generation en arriere-plan cote serveur)

---

## Resume Epic 4 — Couverture FRs

| Story | Titre | FRs couvertes |
|-------|-------|---------------|
| 4.1 | Module Documents — migration, structure & upload avec validation | FR144, FR145 |
| 4.2 | Visualisation documents (viewer HTML) & telechargement PDF | FR62, FR63 |
| 4.3 | Partage de documents MiKL-client & visibilite | FR64 |
| 4.4 | Organisation en dossiers & recherche dans les documents | FR146, FR107 |
| 4.5 | Synchronisation documents vers dossier BMAD local | FR65, FR86 |
| 4.6 | Autosave brouillons & undo actions recentes | FR135, FR136 |
| 4.7 | Export documents en formats standards | FR150 |

**Toutes les 12 FRs de l'Epic 4 sont couvertes.**

---
