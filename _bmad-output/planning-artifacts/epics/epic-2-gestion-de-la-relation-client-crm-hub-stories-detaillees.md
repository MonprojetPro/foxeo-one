# Epic 2 : Gestion de la Relation Client (CRM Hub) — Stories detaillees

**Objectif :** MiKL peut creer, gerer et piloter l'ensemble de son portefeuille clients depuis le Hub avec recherche, rappels, statistiques et gestion du cycle de vie.

**FRs couverts:** FR1, FR2, FR3, FR4, FR5, FR6, FR7, FR79, FR80, FR81, FR84, FR85, FR89, FR90, FR106, FR130, FR131, FR132, FR133, FR149

**NFRs pertinentes:** NFR-P1, NFR-P2, NFR-P4, NFR-S7, NFR-A1 a NFR-A4, NFR-M1 a NFR-M5

---

## Story 2.1 : Module CRM — Liste clients, filtres & recherche rapide

As a **MiKL (operateur)**,
I want **voir la liste de tous mes clients avec leur statut, les filtrer et rechercher rapidement un client**,
So that **j'ai une vision d'ensemble de mon portefeuille et je retrouve instantanement n'importe quel client**.

**Acceptance Criteria :**

**Given** MiKL est authentifie sur le Hub
**When** il accede au module CRM (`/modules/crm`)
**Then** le module CRM est enregistre dans le module registry avec son manifest (id: `crm`, targets: `['hub']`, navigation, routes, requiredTables: `['clients', 'client_configs']`)
**And** le dossier `packages/modules/crm/` est structure selon le pattern standard (index.ts, manifest.ts, components/, hooks/, actions/, types/)
**And** la page par defaut affiche la liste de tous ses clients (filtres par `operator_id` via RLS)
**And** un skeleton loader s'affiche pendant le chargement (loading.tsx, jamais de spinner)

**Given** la liste des clients est chargee
**When** MiKL visualise la liste
**Then** chaque ligne affiche : nom, entreprise, type de client (Complet / Direct One / Ponctuel), statut (Lab actif, One actif, Inactif, Suspendu), date de creation
**And** la liste utilise le composant `DataTable` de @monprojetpro/ui
**And** la liste est paginee (20 elements par page par defaut)
**And** la liste est triable par nom, entreprise, type, statut, date de creation
**And** les donnees sont fetched via TanStack Query avec queryKey `['clients', operatorId]`
**And** la densite est `compact` (data-dense, palette Hub Cyan/Turquoise)

**Given** MiKL sur la liste clients
**When** il saisit du texte dans le champ de recherche rapide
**Then** la liste se filtre en temps reel (cote client si < 500 clients, sinon requete serveur avec debounce 300ms)
**And** la recherche porte sur : nom, entreprise, email, secteur (FR106)
**And** les resultats apparaissent en moins de 1 seconde (NFR-P4)

**Given** MiKL sur la liste clients
**When** il utilise les filtres
**Then** il peut filtrer par : type de client (Complet / Direct One / Ponctuel), statut (Lab actif / One actif / Inactif / Suspendu), secteur d'activite
**And** les filtres sont combinables entre eux et avec la recherche

**Given** la liste affichee avec resultats
**When** MiKL clique sur un client
**Then** il est redirige vers la fiche complete du client (`/modules/crm/clients/[clientId]`)

**Given** aucun client ne correspond aux filtres ou a la recherche
**When** la liste est vide
**Then** un etat vide explicatif s'affiche avec message engageant et CTA "Creer un client" (composant EmptyState de @monprojetpro/ui)

---

## Story 2.2 : Creation & edition de fiche client

As a **MiKL (operateur)**,
I want **creer et modifier une fiche client avec toutes les informations de base et definir son type**,
So that **chaque nouveau client est enregistre dans mon portefeuille avec les donnees necessaires a son suivi**.

**Acceptance Criteria :**

**Given** MiKL sur la page liste clients ou la fiche client
**When** il clique sur "Creer un client" (bouton CTA)
**Then** un formulaire de creation s'affiche (dialog modal ou page dediee)
**And** le formulaire contient les champs : nom (obligatoire), email (obligatoire, unique par operateur), entreprise, telephone, secteur d'activite, type de client (Complet / Direct One / Ponctuel, obligatoire, defaut: Ponctuel) (FR1, FR2)
**And** le formulaire utilise react-hook-form avec validation Zod
**And** les schemas de validation sont dans @monprojetpro/utils/validation-schemas.ts

**Given** MiKL remplit le formulaire de creation
**When** il soumet le formulaire avec des donnees valides
**Then** une Server Action `createClient()` est executee
**And** la reponse suit le pattern `{ data, error }` (jamais de throw)
**And** un enregistrement est cree dans la table `clients` avec `operator_id` = MiKL
**And** un enregistrement `client_configs` est cree avec les modules par defaut (`['core-dashboard']`)
**And** un toast de confirmation s'affiche ("Client cree avec succes")
**And** le cache TanStack Query `['clients', operatorId]` est invalide
**And** MiKL est redirige vers la fiche du nouveau client

**Given** MiKL sur la fiche d'un client existant
**When** il clique sur "Modifier"
**Then** le formulaire d'edition s'affiche, prerempli avec les donnees actuelles
**And** il peut modifier tous les champs y compris le type de client (FR2)

**Given** MiKL soumet le formulaire d'edition avec des donnees valides
**When** la Server Action `updateClient()` s'execute
**Then** la fiche est mise a jour en base
**And** un toast de confirmation s'affiche ("Client mis a jour")
**And** le cache TanStack Query est invalide pour la liste et la fiche

**Given** MiKL soumet un formulaire avec un email deja utilise par un autre client du meme operateur
**When** la validation echoue
**Then** un message d'erreur clair s'affiche a cote du champ email ("Cet email est deja associe a un client")

**Given** MiKL tente de creer un client
**When** une erreur serveur survient
**Then** un toast d'erreur s'affiche avec un message explicite (FR82)
**And** le formulaire reste affiche avec les donnees saisies (pas de perte de donnees)

---

## Story 2.3 : Fiche client complete (vue detaillee multi-onglets)

As a **MiKL (operateur)**,
I want **consulter la fiche complete d'un client avec ses informations, son historique, ses documents et ses echanges dans une vue a onglets**,
So that **j'ai une vision 360° de chaque client sans naviguer entre plusieurs pages**.

**Acceptance Criteria :**

**Given** MiKL clique sur un client dans la liste CRM
**When** la fiche client se charge (`/modules/crm/clients/[clientId]`)
**Then** la page affiche un header avec : nom du client, entreprise, type (badge couleur), statut (badge), date de creation (FR4)
**And** un skeleton loader s'affiche pendant le chargement
**And** les donnees sont fetched via TanStack Query avec queryKey `['client', clientId]`

**Given** la fiche client est chargee
**When** MiKL visualise la fiche
**Then** 4 onglets sont disponibles : Informations, Historique, Documents, Echanges
**And** l'onglet actif est "Informations" par defaut
**And** l'etat de l'onglet actif est gere via URL query param (`?tab=informations`) pour permettre le partage de lien

**Given** l'onglet "Informations" est actif
**When** MiKL le consulte
**Then** il voit : coordonnees completes (nom, email, telephone, entreprise, secteur), type de client, statut actuel, parcours Lab assigne (si applicable), modules One actives (si applicable), date de creation, derniere activite
**And** un bouton "Modifier" permet d'editer les informations (formulaire de Story 2.2)

**Given** l'onglet "Historique" est actif
**When** MiKL le consulte
**Then** il voit une timeline chronologique des evenements du client : creation du compte, changements de statut, validations Hub, visios, passages Lab vers One
**And** la timeline est ordonnee du plus recent au plus ancien
**And** les donnees proviennent de la table `activity_logs` (creee en Story 1.2)
**And** le composant `ClientTimeline` (packages/modules/crm/components/client-timeline.tsx) affiche les evenements

**Given** l'onglet "Documents" est actif
**When** MiKL le consulte
**Then** il voit la liste des documents partages avec ce client (briefs, livrables, rapports)
**And** chaque document affiche : nom, type, date, statut (visible/non visible par le client)
**And** cette vue requete Supabase directement (table `documents`, filtre par client_id) — pas d'import du module Documents

**Given** l'onglet "Echanges" est actif
**When** MiKL le consulte
**Then** il voit l'historique des echanges : messages chat recents, resumes Elio, notifications echangees
**And** un lien rapide "Ouvrir le chat" redirige vers le module Chat avec le contexte client

---

## Story 2.4 : Assignation parcours Lab & gestion des acces

As a **MiKL (operateur)**,
I want **assigner un parcours Lab a un client et activer ou desactiver ses acces Lab et One**,
So that **je controle precisement le niveau de service de chaque client**.

**Acceptance Criteria :**

**Given** MiKL sur la fiche d'un client (onglet Informations)
**When** il clique sur "Assigner un parcours Lab"
**Then** un dialog s'ouvre avec : selection du type de parcours (a partir des templates existants dans `parcours_templates`, migration 00009), liste des etapes du parcours selectionne, possibilite d'activer/desactiver des etapes individuelles (FR5)
**And** si aucun template de parcours n'existe encore, un etat vide suggere d'en creer un (info contextuelle mentionnant le module Templates — Epic 12)

**Given** MiKL selectionne un parcours et valide
**When** la Server Action `assignParcours()` s'execute
**Then** un enregistrement est cree dans la table `parcours` (migration 00009) avec : client_id, template_id, etapes actives, statut "en_cours"
**And** la `client_configs` est mise a jour avec `dashboard_type: 'lab'` et `parcours_config` contenant la configuration
**And** un toast confirme "Parcours Lab assigne avec succes"
**And** le cache TanStack Query est invalide (`['client', clientId]`, `['clients', operatorId]`)

**Given** MiKL sur la fiche d'un client
**When** il clique sur le toggle "Acces Lab" ou "Acces One" (FR6)
**Then** l'acces correspondant est active ou desactive
**And** la `client_configs` est mise a jour (`dashboard_type` ajuste)
**And** si desactivation : une boite de dialogue de confirmation s'affiche ("Le client perdra l'acces a son dashboard Lab/One")
**And** un toast confirme l'action
**And** l'action est tracee dans `activity_logs`

**Given** MiKL desactive l'acces Lab d'un client en cours de parcours
**When** la desactivation est confirmee
**Then** le parcours est suspendu (pas supprime) avec son etat courant preserve
**And** si MiKL reactive l'acces, le parcours reprend la ou il en etait

---

## Story 2.5 : Integration Cursor (ouverture dossier BMAD client)

As a **MiKL (operateur)**,
I want **ouvrir le dossier BMAD d'un client directement dans Cursor depuis la fiche CRM**,
So that **je peux travailler avec Orpheus sur les documents du client sans quitter mon flux de travail**.

**Acceptance Criteria :**

**Given** MiKL sur la fiche d'un client
**When** il clique sur le bouton "Ouvrir dans Cursor" (FR7)
**Then** le systeme genere un lien avec le protocole custom `cursor://file/` pointant vers le dossier BMAD du client
**And** le chemin du dossier est construit a partir d'une convention configurable (defaut : `{bmad_base_path}/clients/{client_slug}/`)
**And** le `client_slug` est derive du nom de l'entreprise ou du nom du client (kebab-case)
**And** Cursor s'ouvre avec le dossier du client

**Given** le dossier BMAD du client n'existe pas encore
**When** MiKL clique sur "Ouvrir dans Cursor"
**Then** un message informe que le dossier n'a pas encore ete cree
**And** un bouton "Copier le chemin" permet de copier le chemin attendu dans le presse-papier
**And** des instructions indiquent comment initialiser le dossier BMAD

**Given** la fonctionnalite depend d'une app desktop installee (Cursor)
**When** le protocole custom n'est pas supporte par le navigateur
**Then** un fallback affiche le chemin complet du dossier avec un bouton "Copier dans le presse-papier"
**And** un message explique comment ouvrir manuellement dans Cursor

---

## Story 2.6 : Notes privees, epinglage & "a traiter plus tard"

As a **MiKL (operateur)**,
I want **ajouter des notes privees sur un client, epingler des clients prioritaires et marquer des elements a traiter plus tard**,
So that **j'organise mon travail quotidien et conserve mes observations sans que le client les voie**.

**Acceptance Criteria :**

**Given** les besoins en donnees de cette story
**When** les migrations sont executees
**Then** la table `client_notes` est creee avec : id (UUID PK), client_id (FK clients), operator_id (FK operators), content (TEXT NOT NULL), created_at (TIMESTAMP DEFAULT NOW()), updated_at (TIMESTAMP DEFAULT NOW())
**And** les colonnes `is_pinned` (BOOLEAN DEFAULT false) et `deferred_until` (TIMESTAMP nullable) sont ajoutees a la table `clients`
**And** un trigger `trg_client_notes_updated_at` est en place
**And** les policies RLS assurent que seul l'operateur proprietaire voit les notes : `client_notes_select_operator`, `client_notes_insert_operator`, `client_notes_update_operator`, `client_notes_delete_operator`

**Given** MiKL sur la fiche d'un client, onglet Informations
**When** il accede a la section "Notes privees"
**Then** il voit la liste de ses notes, ordonnees de la plus recente a la plus ancienne (FR79)
**And** chaque note affiche le contenu et la date de creation
**And** un badge "Prive" indique clairement que le client n'y a pas acces
**And** les donnees sont fetched via TanStack Query avec queryKey `['client-notes', clientId]`

**Given** MiKL veut ajouter une note
**When** il saisit du texte dans le champ de saisie et valide
**Then** une Server Action `createClientNote()` cree la note dans `client_notes`
**And** la reponse suit le pattern `{ data, error }`
**And** un toast confirme "Note ajoutee"
**And** le cache TanStack Query `['client-notes', clientId]` est invalide

**Given** MiKL veut modifier ou supprimer une note existante
**When** il clique sur le menu contextuel de la note
**Then** il peut editer le contenu en place ou supprimer la note (avec confirmation)
**And** les Server Actions `updateClientNote()` et `deleteClientNote()` sont utilisees

**Given** MiKL sur la liste clients
**When** il clique sur l'icone epingle d'un client (FR131)
**Then** le champ `is_pinned` du client est mis a jour via Server Action `togglePinClient()`
**And** les clients epingles apparaissent en haut de la liste avec un indicateur visuel (icone epingle, fond subtil accent)
**And** le tri "Epingles d'abord" est applique par defaut

**Given** MiKL sur une fiche client ou la liste clients
**When** il marque un client "A traiter plus tard" avec une date (FR130)
**Then** le champ `deferred_until` est mis a jour via Server Action `deferClient()`
**And** le client reste visible dans la liste mais avec un indicateur visuel "Reporte" et la date
**And** quand la date est atteinte, l'element reapparait sans le flag "Reporte"

---

## Story 2.7 : Rappels personnels & calendrier deadlines

As a **MiKL (operateur)**,
I want **creer des rappels personnels avec une tache et une date, et visualiser mes rappels et deadlines dans un calendrier**,
So that **je n'oublie aucune action importante et je planifie mon travail efficacement**.

**Acceptance Criteria :**

**Given** les besoins en donnees de cette story
**When** les migrations sont executees
**Then** la table `reminders` est creee avec : id (UUID PK), operator_id (FK operators NOT NULL), client_id (FK clients nullable), title (TEXT NOT NULL), description (TEXT nullable), due_date (TIMESTAMP WITH TIME ZONE NOT NULL), completed (BOOLEAN DEFAULT false), created_at (TIMESTAMP DEFAULT NOW()), updated_at (TIMESTAMP DEFAULT NOW())
**And** un index `idx_reminders_operator_id_due_date` est cree pour les requetes calendrier
**And** un trigger `trg_reminders_updated_at` est en place
**And** les policies RLS assurent que seul l'operateur proprietaire voit ses rappels : `reminders_select_operator`, `reminders_insert_operator`, `reminders_update_operator`, `reminders_delete_operator`

**Given** MiKL dans le module CRM ou sur une fiche client
**When** il clique sur "Nouveau rappel" (FR132)
**Then** un dialog s'ouvre avec les champs : titre (obligatoire), description (optionnel), date d'echeance (obligatoire, date picker), client associe (optionnel, auto-rempli si cree depuis une fiche client)
**And** le formulaire utilise react-hook-form avec validation Zod

**Given** MiKL soumet un rappel valide
**When** la Server Action `createReminder()` s'execute
**Then** le rappel est cree dans la table `reminders`
**And** la reponse suit le pattern `{ data, error }`
**And** un toast confirme "Rappel cree"
**And** le cache TanStack Query `['reminders', operatorId]` est invalide

**Given** MiKL accede a la vue calendrier des rappels (FR133)
**When** la page se charge
**Then** un calendrier mensuel affiche les rappels et deadlines sous forme de points/badges sur les jours concernes
**And** un clic sur un jour affiche la liste detaillee des rappels de ce jour
**And** les rappels passes non completes sont visuellement marques en rouge (en retard)
**And** les rappels completes sont barres ou grises
**And** une navigation mois precedent / mois suivant est disponible

**Given** MiKL consulte un rappel
**When** il le marque comme complete
**Then** le champ `completed` est mis a jour via Server Action `toggleReminderComplete()`
**And** le rappel passe en style "complete" (barre/grise)
**And** le cache TanStack Query est invalide

**Given** MiKL consulte la liste des rappels
**When** il filtre par statut
**Then** il peut voir : Tous, A venir, En retard, Completes
**And** le filtre par defaut est "A venir"

---

## Story 2.8 : Statistiques globales & temps passe par client

As a **MiKL (operateur)**,
I want **voir des statistiques globales sur mon portefeuille (clients actifs, taux de graduation, revenus) et le temps passe estime par client**,
So that **je pilote mon activite avec des donnees concretes et je mesure la rentabilite de chaque client**.

**Acceptance Criteria :**

**Given** MiKL accede a la section statistiques du module CRM
**When** la page se charge
**Then** un dashboard de KPIs s'affiche avec les indicateurs suivants (FR80) :
- Nombre total de clients (avec repartition actifs / inactifs / suspendus)
- Repartition par type (Complet / Direct One / Ponctuel) sous forme de donut chart ou barres
- Nombre de clients Lab actifs
- Nombre de clients One actifs
- Taux de graduation Lab vers One (pourcentage, nombre total de graduations)
- Revenus recurrents mensuels estimes (MRR, si donnees facturation disponibles — sinon afficher "Module Facturation requis")
**And** les KPIs utilisent des cards avec sparklines ou indicateurs de tendance (composants Tremor)
**And** les donnees sont calculees cote serveur via Server Component (RSC) avec requete agregee Supabase
**And** un skeleton loader specifique aux stats s'affiche pendant le calcul

**Given** les statistiques sont affichees
**When** MiKL survole un KPI
**Then** un tooltip affiche le detail de calcul (ex: "12 clients Lab actifs sur 25 clients total")

**Given** MiKL consulte la section temps passe (FR81)
**When** la page se charge
**Then** une liste par client affiche le temps passe estime
**And** le temps est calcule a partir des activites loguees dans `activity_logs` : duree des visios, nombre de messages, nombre de validations Hub
**And** le calcul utilise des durees moyennes parametrables par type d'activite (ex: visio = duree reelle, message = 2 min, validation = 5 min)
**And** chaque ligne affiche : nom du client, type, temps total estime, derniere activite
**And** un tri par "plus de temps passe" est disponible

**Given** les statistiques sont chargees
**When** la page s'affiche
**Then** le chargement respecte NFR-P1 (< 2 secondes)

---

## Story 2.9a : Suspendre & reactiver un client

As a **MiKL (operateur)**,
I want **suspendre temporairement un client et le reactiver quand necessaire**,
So that **je peux gerer les situations ou un client doit etre temporairement desactive sans perdre ses donnees**.

**Acceptance Criteria :**

**Given** les besoins en donnees de cette story
**When** les migrations sont executees
**Then** la colonne `archived_at` (TIMESTAMP nullable) est ajoutee a la table `clients`
**And** les statuts possibles pour un client sont : 'actif', 'suspendu', 'cloture' (via contrainte CHECK ou enum)

**Given** MiKL sur la fiche d'un client actif
**When** il clique sur "Suspendre le client" (FR89)
**Then** une boite de dialogue de confirmation s'affiche avec : raison de la suspension (optionnel), consequences listees ("Le client ne pourra plus acceder a son dashboard")
**And** si confirme, la Server Action `suspendClient()` met le statut a "suspendu"
**And** le middleware client bloque l'acces au dashboard pour ce client (verification du statut)
**And** un toast confirme "Client suspendu"
**And** une entree est creee dans `activity_logs` (type: 'client_suspended')
**And** le cache TanStack Query est invalide

**Given** MiKL sur la fiche d'un client suspendu
**When** il clique sur "Reactiver le client"
**Then** la Server Action `reactivateClient()` repasse le statut a "actif"
**And** le client retrouve l'acces a son dashboard avec toutes ses donnees intactes
**And** une entree est creee dans `activity_logs` (type: 'client_reactivated')

---

## Story 2.9b : Cloturer un client & archiver les donnees

As a **MiKL (operateur)**,
I want **cloturer definitivement un client avec archivage automatique de ses donnees**,
So that **le client est proprement desactive et ses donnees sont conservees en lecture seule**.

**Acceptance Criteria :**

**Given** MiKL sur la fiche d'un client
**When** il clique sur "Cloturer le client" (FR89)
**Then** une boite de dialogue de confirmation avec double validation s'affiche (saisir le nom du client pour confirmer)
**And** le message indique : "Cette action archivera toutes les donnees du client. Le client ne pourra plus se connecter."
**And** si confirme, la Server Action `closeClient()` met le statut a "cloture" et `archived_at` a la date courante (FR85)
**And** le client n'apparait plus dans la liste par defaut (filtre "Clotures" necessaire pour le voir)
**And** une entree est creee dans `activity_logs` (type: 'client_closed')

**Given** un client cloture avec des donnees archivees
**When** MiKL consulte la fiche d'un client cloture (via filtre "Clotures")
**Then** les donnees sont accessibles en lecture seule (tous les boutons d'edition sont desactives)
**And** un bandeau informe "Client cloture le {date}" avec un bouton "Reactiver" qui repasse le statut a "actif" et supprime le flag `archived_at`

---

## Story 2.9c : Upgrader un client Ponctuel vers Lab ou One

As a **MiKL (operateur)**,
I want **upgrader un client Ponctuel vers un parcours Lab ou un dashboard One**,
So that **je peux faire evoluer la relation client selon ses besoins**.

**Acceptance Criteria :**

**Given** MiKL sur la fiche d'un client Ponctuel
**When** il clique sur "Upgrader vers Lab" ou "Upgrader vers One" (FR90)
**Then** un dialog s'affiche avec : type cible (Lab ou One, preselectionne selon le bouton clique), configuration initiale selon le type :
- Lab : selection du template de parcours, etapes a activer
- One : selection des modules a activer, dashboard_type
**And** si confirme, la Server Action `upgradeClient()` met a jour : `client_type`, `client_configs` (dashboard_type, active_modules ou parcours_config)
**And** un toast confirme "Client upgrade vers Lab/One"
**And** une entree est creee dans `activity_logs` (type: 'client_upgraded')

---

## Story 2.10 : Alertes inactivite Lab & import clients CSV

As a **MiKL (operateur)**,
I want **etre alerte quand un client Lab est inactif depuis trop longtemps et pouvoir importer des clients en masse via CSV**,
So that **aucun client Lab ne tombe dans l'oubli et je peux migrer rapidement ma base clients existante**.

**Acceptance Criteria :**

**Given** le systeme de detection d'inactivite est configure
**When** un client Lab n'a eu aucune activite (login, message, soumission) depuis X jours (configurable par operateur, defaut: 7 jours) (FR84)
**Then** une notification est creee dans la table `notifications` a destination de MiKL
**And** la notification contient : nom du client, nombre de jours d'inactivite, derniere activite, lien vers la fiche client
**And** la detection est geree par une Supabase Edge Function declenchee par `pg_cron` (execution quotidienne)
**And** l'alerte n'est envoyee qu'une seule fois par periode d'inactivite (flag `inactivity_alert_sent` dans `client_configs` ou table dediee)
**And** si le client redevient actif, le flag est reinitialise pour permettre une future alerte

**Given** MiKL recoit une alerte d'inactivite
**When** il consulte l'alerte dans le centre de notifications
**Then** il peut : ouvrir la fiche client, envoyer un message au client via Chat, marquer "A traiter plus tard" (Story 2.6), ou ignorer l'alerte

**Given** MiKL veut importer des clients en masse (FR149)
**When** il accede a la fonctionnalite "Import CSV" dans le module CRM (bouton dans le header de la liste clients)
**Then** il peut uploader un fichier CSV
**And** un template CSV telecharger est fourni avec les colonnes attendues : nom (obligatoire), email (obligatoire), entreprise, telephone, secteur, type_client (Complet/Direct One/Ponctuel, defaut: Ponctuel)

**Given** MiKL uploade un fichier CSV
**When** le fichier est traite cote client (parsing)
**Then** le systeme valide chaque ligne : email au format valide, email unique (non present en base pour cet operateur), champs obligatoires presents
**And** un apercu s'affiche sous forme de tableau avec : nombre de lignes valides (vert), nombre de lignes en erreur (rouge), detail des erreurs par ligne
**And** MiKL peut exclure les lignes en erreur avant de confirmer

**Given** MiKL confirme l'import apres apercu
**When** la Server Action `importClientsCSV()` s'execute
**Then** les clients valides sont crees en batch (insertion multiple Supabase)
**And** chaque client recoit une `client_configs` par defaut (`['core-dashboard']`, dashboard_type selon type_client)
**And** un resume s'affiche : "X clients importes avec succes, Y ignores"
**And** le cache TanStack Query `['clients', operatorId]` est invalide
**And** une entree dans `activity_logs` trace l'import (type: 'csv_import', nombre de clients, date, operateur)

**Given** le fichier CSV depasse 500 lignes
**When** MiKL tente l'import
**Then** un message informe que l'import sera traite en arriere-plan (Supabase Edge Function)
**And** MiKL sera notifie quand l'import sera termine (notification in-app)

---

## Resume Epic 2 — Couverture FRs

| Story | Titre | FRs couvertes |
|-------|-------|---------------|
| 2.1 | Module CRM — Liste clients, filtres & recherche | FR3, FR106 |
| 2.2 | Creation & edition de fiche client | FR1, FR2 |
| 2.3 | Fiche client complete (vue detaillee multi-onglets) | FR4 |
| 2.4 | Assignation parcours Lab & gestion des acces | FR5, FR6 |
| 2.5 | Integration Cursor (ouverture dossier BMAD client) | FR7 |
| 2.6 | Notes privees, epinglage & "a traiter plus tard" | FR79, FR130, FR131 |
| 2.7 | Rappels personnels & calendrier deadlines | FR132, FR133 |
| 2.8 | Statistiques globales & temps passe par client | FR80, FR81 |
| 2.9a | Suspendre & reactiver un client | FR89 |
| 2.9b | Cloturer un client & archiver les donnees | FR85, FR89 |
| 2.9c | Upgrader un client Ponctuel vers Lab/One | FR90 |
| 2.10 | Alertes inactivite Lab & import clients CSV | FR84, FR149 |

**Toutes les 20 FRs de l'Epic 2 sont couvertes.**

---
