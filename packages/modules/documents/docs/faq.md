# Module Documents — FAQ

## Quels types de fichiers sont acceptes ?

PDF, DOCX, XLSX, PNG, JPG, JPEG, SVG, MD, TXT, CSV. La validation se fait sur l'extension du fichier.

## Quelle est la taille maximale ?

10 Mo par fichier. Cette constante (`MAX_FILE_SIZE`) est definie dans `@monprojetpro/utils`.

## Ou sont stockes les fichiers ?

Dans Supabase Storage, bucket `documents` (prive). Chemin : `{operatorId}/{clientId}/{uuid}-{filename}`.

## Un client peut-il voir les documents d'un autre client ?

Non. L'isolation est garantie par RLS au niveau de la base de donnees ET du Storage.

## Quelle est la difference entre prive et partage ?

- **Prive** : visible uniquement par l'uploadeur (client ou operateur)
- **Partage** : visible par le client ET l'operateur

## Que se passe-t-il si le Storage echoue pendant un upload ?

L'erreur est retournee a l'utilisateur. Aucun enregistrement n'est cree en base.

## Que se passe-t-il si la DB echoue apres un upload Storage reussi ?

Le fichier uploade est supprime automatiquement du Storage (cleanup). L'erreur DB est retournee.

## Quels formats sont visualisables dans le viewer ?

- **Markdown** (.md) : rendu HTML directement dans le dashboard
- **PDF** (.pdf) : affiche dans un iframe embarque
- **Images** (.png, .jpg, .jpeg, .svg) : affichage direct
- **Autres** (.docx, .xlsx, .csv, .txt) : apercu des metadonnees avec bouton telecharger

## Comment fonctionne le telechargement PDF ?

- Si le document est deja un PDF, il est telecharge directement via signed URL Supabase Storage
- Si le document est un Markdown, un PDF est genere cote serveur avec le branding MonprojetPro (header logo, footer date)

## Qu'est-ce qu'un signed URL ?

Une URL temporaire (expire apres 1h) generee cote serveur pour acceder a un fichier dans Supabase Storage. Les chemins internes ne sont jamais exposes au client.

## Puis-je retirer un partage apres l'avoir accorde ?

Oui. Cliquez sur **"Partage actif"** dans la liste du Hub. Une boite de confirmation s'affiche avant de repasser le document en `private`. Le client ne verra plus le document dans son dashboard.

## Le client est-il notifie quand je partage un document ?

Oui. Lors du partage individuel (`shareDocument`), une notification est inseree automatiquement en base de donnees. Cette insertion est "fire-and-forget" : si elle echoue, le partage reste valide (l'erreur de notification ne bloque pas l'action).

## Comment fonctionne le partage en lot ?

Selectionnez plusieurs documents avec les cases a cocher dans le Hub, puis cliquez **"Partager la selection"**. Une seule requete SQL met a jour tous les documents selectionnes en `shared`. La selection est automatiquement effacee apres le succes.

## Puis-je partager des documents uploades par le client ?

Oui. L'operateur a toujours acces a tous les documents de son client (policy RLS `documents_select_operator`). Il peut changer leur visibilite en `shared` ou `private`.

## Puis-je supprimer un dossier non vide ?

Non. Un dossier doit etre vide (0 documents) avant de pouvoir etre supprime. L'action `deleteFolder` retourne une erreur `FOLDER_NOT_EMPTY` si des documents sont encore dans le dossier. Deplacez d'abord les documents dans un autre dossier ou dans "Non classes".

## Que devient un document quand son dossier est supprime ?

Le document n'est pas supprime. La colonne `folder_id` est mise a `NULL` automatiquement (contrainte `ON DELETE SET NULL`). Le document apparait dans la vue "Non classes".

## La recherche interroge-t-elle la base de donnees a chaque frappe ?

Non. La recherche s'effectue uniquement sur les donnees deja en cache TanStack Query (filtre JavaScript cote client). Aucune requete DB supplementaire n'est effectuee. La recherche respecte NFR-P4 (< 1 seconde).

## La recherche est-elle limitee au dossier selectionne ?

Non. La recherche traverse tous les documents du client, independamment du dossier actif. C'est un choix delibere : si vous cherchez "contrat" vous trouvez tous vos contrats, meme dans des dossiers differents.

## Quels documents sont inclus dans le ZIP de synchronisation BMAD ?

Uniquement les documents avec `visibility = 'shared'`. Les documents prives (`visibility = 'private'`) ne sont jamais inclus. Le bouton affiche le nombre de documents partages pour que vous sachiez combien seront inclus avant de cliquer.

## Comment utiliser le ZIP avec Cursor/Orpheus ?

1. Cliquer sur **"Sync vers BMAD"** dans le Hub
2. Extraire le ZIP telecharge dans le dossier BMAD du client (ex: `.bmad/clients/{clientId}/documents/`)
3. Orpheus (context IA de Cursor) peut maintenant lire les documents lors des sessions de travail

Le format ZIP utilise la methode "stored" (non compresse) pour une compatibilite maximale avec tous les outils d'extraction.

## Qu'est-ce que la sync automatique (Phase 2) ?

La story 4.5 livre uniquement le mecanisme manuel (bouton ZIP). Une future Phase 2 implementera la synchronisation automatique via une Supabase Edge Function declenchee a chaque partage de document. Cette fonctionnalite necessite un acces reseau au dossier BMAD local (VPN, mount NFS, ou API agent local) et n'est pas encore implementee.

## Combien de temps dure un brouillon sauvegarde ?

Le brouillon est stocke dans le `localStorage` du navigateur. Il persiste tant que vous n'avez pas:
- Soumis le formulaire avec succes (suppression automatique)
- Clique sur "Non, recommencer" (suppression manuelle)
- Vide le cache/cookies du navigateur

En pratique, le brouillon peut persister plusieurs jours ou semaines jusqu'a l'une de ces actions.

## L'annulation est-elle possible apres fermeture du navigateur ?

Non. L'annulation (undo) est uniquement disponible dans les **5 secondes** suivant l'action, via le toast affiche a l'ecran. Si vous fermez la page ou si le delai expire, l'action devient definitive et ne peut plus etre annulee. C'est voulu : l'undo est concu pour corriger des erreurs immediates (clic accidentel), pas pour restaurer des donnees apres coup.

## Quels formats d'export sont disponibles ?

Trois formats sont disponibles via le bouton "Exporter" dans la barre d'outils :
- **CSV** : export de la liste de documents (compatible tableurs)
- **JSON** : export de la liste avec metadonnees completes (camelCase)
- **PDF** : telechargement d'un document individuel (uniquement sur la page viewer)

## Le CSV est-il compatible Excel ?

Oui. Le fichier CSV est genere avec un BOM UTF-8 en debut de fichier (`\uFEFF`). Ce BOM indique a Excel l'encodage du fichier, ce qui permet d'afficher correctement les caracteres accentues (e, a, o, etc.) sans avoir a importer manuellement l'encodage.

## L'export inclut-il les documents prives ?

Oui. L'export CSV et JSON inclut tous vos documents (prives et partages), soumis aux regles RLS habituelles. Le champ "Visibilite" dans le CSV indique "Prive" ou "Partage" pour chaque document. Les documents supprimes (`deleted_at IS NOT NULL`) sont exclus.

## Quelles actions sont reversibles avec l'undo ?

Actuellement, 3 actions supportent l'undo :
1. **Suppression de document** : Le document est "soft deleted" (marque `deleted_at`) et peut etre restaure pendant 5 secondes
2. **Retrait de partage** : Le document repasse en `private` mais peut etre re-partage pendant 5 secondes
3. **Suppression de dossier** : Le dossier vide est supprime mais peut etre recree avec le meme nom pendant 5 secondes

Les autres actions (upload, creation dossier, renommage) ne supportent pas l'undo car elles ne sont pas destructives.
