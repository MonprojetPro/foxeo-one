# Epic 5 : Visioconference & Onboarding Prospect — Stories detaillees

**Objectif :** MiKL conduit des visios enregistrees/transcrites avec prospects/clients via OpenVidu, et les nouveaux prospects vivent un parcours d'onboarding fluide (Cal.com, salle d'attente, post-visio).

**FRs couverts:** FR58, FR59, FR60, FR70, FR71, FR72

**NFRs pertinentes:** NFR-P1, NFR-I2, NFR-I5, NFR-S7, NFR-R6, NFR-A1 a NFR-A4, NFR-M1 a NFR-M5

**Services self-hosted requis:** OpenVidu (visio + enregistrement + transcription), Cal.com (prise de RDV)

---

## Story 5.1 : Module Visio — Migration meetings & salle de visio OpenVidu

As a **MiKL (operateur)**,
I want **lancer des visios avec mes clients et prospects via OpenVidu integre dans le Hub**,
So that **je conduis mes rendez-vous directement depuis MonprojetPro sans outil externe**.

**Acceptance Criteria :**

**Given** les besoins en donnees de cette story
**When** la migration 00008_meetings.sql est executee
**Then** la table `meetings` est creee avec : id (UUID PK), client_id (FK clients nullable — null pour les prospects pas encore clients), operator_id (FK operators NOT NULL), prospect_name (TEXT nullable), prospect_email (TEXT nullable), status (TEXT CHECK IN ('scheduled', 'in_progress', 'completed', 'cancelled') DEFAULT 'scheduled'), scheduled_at (TIMESTAMP WITH TIME ZONE), started_at (TIMESTAMP nullable), ended_at (TIMESTAMP nullable), duration_seconds (INTEGER nullable), openvidu_room_id (TEXT nullable), recording_url (TEXT nullable), transcript_url (TEXT nullable), notes (TEXT nullable), created_at (TIMESTAMP DEFAULT NOW()), updated_at (TIMESTAMP DEFAULT NOW())
**And** un index `idx_meetings_operator_id_scheduled_at` est cree
**And** les policies RLS :
- `meetings_select_owner` : un client ne voit que ses propres meetings
- `meetings_select_operator` : un operateur voit tous ses meetings
- `meetings_insert_operator` : seul l'operateur peut creer un meeting
- `meetings_update_operator` : seul l'operateur peut modifier un meeting

**Given** le module Visio n'existe pas encore
**When** la story est completee
**Then** le module `packages/modules/visio/` est structure :
- `manifest.ts` avec id: `visio`, targets: `['hub', 'client-lab', 'client-one']`, requiredTables: `['meetings']`
- `components/` : visio-room.tsx, visio-controls.tsx
- `hooks/` : use-visio-room.ts
- `actions/` : create-room.ts
- `types/` : visio.types.ts
- `index.ts` barrel export

**Given** MiKL veut lancer une visio
**When** il cree une salle depuis le Hub (bouton "Nouvelle visio" ou depuis la fiche client)
**Then** une Server Action `createRoom()` cree une session OpenVidu via l'API serveur
**And** un enregistrement `meetings` est cree avec le `openvidu_room_id`
**And** un lien d'acces est genere pour le client/prospect
**And** MiKL est redirige vers la salle de visio (visio-room.tsx)

**Given** MiKL est dans la salle de visio
**When** la visio est en cours
**Then** les controles video s'affichent (visio-controls.tsx) : camera on/off, micro on/off, partage d'ecran, quitter
**And** le flux video utilise le SDK OpenVidu cote client (WebRTC)
**And** le statut du meeting passe a 'in_progress' et `started_at` est enregistre

**Given** un client/prospect rejoint la visio
**When** il clique sur le lien d'acces
**Then** il rejoint la salle sans avoir besoin de compte (acces par token temporaire OpenVidu)
**And** les deux participants se voient et s'entendent
**And** la connexion est en HTTPS/TLS (NFR-S1)

**Given** la visio se termine
**When** MiKL ou le dernier participant quitte
**Then** le statut du meeting passe a 'completed'
**And** `ended_at` et `duration_seconds` sont calcules et enregistres
**And** une entree est creee dans `activity_logs`

**Given** le service OpenVidu est indisponible
**When** la creation de salle echoue
**Then** un message explicite s'affiche ("Le service de visioconference est temporairement indisponible") (NFR-I5, NFR-R6)
**And** MiKL peut reessayer ou planifier la visio plus tard

---

## Story 5.2 : Enregistrement visio, transcription automatique & historique

As a **client MonprojetPro**,
I want **consulter l'historique de mes visios avec MiKL et acceder aux transcriptions**,
So that **je peux revoir les points discutes et retrouver les decisions prises**.

**Acceptance Criteria :**

**Given** MiKL lance une visio
**When** la visio demarre
**Then** l'enregistrement audio/video demarre automatiquement via OpenVidu Egress (Server Action `startRecording()` — Hub uniquement)
**And** un indicateur visuel informe tous les participants que la visio est enregistree
**And** le consentement a l'enregistrement a ete donne par le prospect en salle d'attente (Story 5.4)

**Given** la visio se termine et l'enregistrement est disponible
**When** OpenVidu Egress notifie via webhook (`/api/webhooks/openvidu/route.ts`)
**Then** le fichier d'enregistrement est stocke dans Supabase Storage (bucket `recordings/{operator_id}/{meeting_id}/`)
**And** le champ `recording_url` du meeting est mis a jour avec le chemin Storage

**Given** un enregistrement est disponible
**When** la transcription automatique est declenchee
**Then** une Supabase Edge Function traite le fichier audio via un service de transcription (Deepgram ou equivalent)
**And** la transcription est stockee dans Supabase Storage (format texte/JSON)
**And** le champ `transcript_url` du meeting est mis a jour
**And** le traitement se fait en arriere-plan (pas de blocage utilisateur)
**And** le timeout est de 60 secondes max (NFR-I2)

**Given** un client accede au module Visio (FR58)
**When** il consulte l'historique de ses visios
**Then** il voit la liste de ses meetings avec : date, duree, statut (avec/sans enregistrement, avec/sans transcription)
**And** les donnees sont fetches via TanStack Query avec queryKey `['meetings', clientId]`
**And** la liste est ordonnee du plus recent au plus ancien
**And** un skeleton loader s'affiche pendant le chargement

**Given** un client clique sur un meeting avec transcription (FR59)
**When** le viewer de transcription se charge (transcription-viewer.tsx)
**Then** la transcription s'affiche en texte formatte avec horodatage si disponible
**And** si un enregistrement existe, un player audio/video integre permet de reecouter
**And** une option "Telecharger la transcription" (PDF ou TXT) est disponible

**Given** MiKL consulte l'historique dans le Hub
**When** il voit la liste des meetings
**Then** il peut filtrer par client, par date, par statut (avec/sans transcription)
**And** il peut ajouter des notes post-visio sur chaque meeting (champ `notes`)

---

## Story 5.3 : Demande de visio, prise de RDV Cal.com & salle d'attente

As a **client MonprojetPro**,
I want **demander une visio avec MiKL et prendre rendez-vous facilement**,
So that **je peux planifier un echange video quand j'en ai besoin**.

**Acceptance Criteria :**

**Given** un client authentifie sur son dashboard
**When** il clique sur "Demander une visio" (FR60)
**Then** un composant Cal.com embarque (iframe ou SDK) s'affiche avec les creneaux disponibles de MiKL
**And** le client peut selectionner un creneau et confirmer la reservation
**And** les informations du client (nom, email) sont pre-remplies depuis sa fiche

**Given** un prospect (pas encore client) veut prendre RDV
**When** il accede au lien Cal.com MonprojetPro (via QR code, LinkedIn, site web)
**Then** il voit les creneaux disponibles de MiKL sur la page Cal.com
**And** il saisit les informations legeres : prenom, nom, email, societe (optionnel)
**And** il recoit un email de confirmation avec le lien de la visio

**Given** un RDV est confirme via Cal.com
**When** le webhook Cal.com est recu (`/api/webhooks/cal-com/route.ts`)
**Then** un enregistrement `meetings` est cree dans Supabase avec : scheduled_at, prospect_name/email (si prospect) ou client_id (si client existant), status='scheduled'
**And** une notification est envoyee a MiKL ("Nouveau RDV planifie avec {nom}")
**And** si le prospect est un client existant (match par email), le client_id est associe automatiquement

**Given** un prospect arrive 5 minutes avant le RDV
**When** il clique sur le lien de la visio
**Then** il accede a la salle d'attente (page publique dans apps/hub ou page dediee)
**And** la salle d'attente affiche un formulaire complementaire :
- Telephone (obligatoire)
- SIRET si entreprise (obligatoire, avec auto-complete via API INSEE Sirene)
- OU Ville si pas d'entreprise (obligatoire)
- Consentement enregistrement (obligatoire, avec explication du benefice : "Vous recevrez la transcription")
**And** le message "C'est la seule fois qu'on vous le demande" rassure le prospect
**And** une fois le formulaire valide, le prospect rejoint la salle de visio OpenVidu

**Given** le formulaire de salle d'attente est soumis
**When** le SIRET est saisi
**Then** l'API INSEE Sirene est appelee pour auto-completer : raison sociale, adresse, code NAF/APE
**And** en cas d'echec de l'API INSEE (timeout, indisponibilite), le prospect peut saisir manuellement les informations (NFR-I5)

---

## Story 5.4 : Flux post-visio & onboarding prospect

As a **MiKL (operateur)**,
I want **qualifier un prospect apres une visio avec un statut et un email adapte, et creer automatiquement sa fiche client**,
So that **chaque prospect est traite rapidement et integre dans mon CRM sans double saisie**.

**Acceptance Criteria :**

**Given** une visio se termine avec un prospect
**When** MiKL revient sur le Hub
**Then** un ecran post-visio s'affiche automatiquement (ou via notification) avec :
- Resume genere par Elio Hub (modifiable par MiKL) — si le module Elio est disponible, sinon champ resume vide a remplir
- Informations du prospect (pre-remplies depuis la salle d'attente : nom, email, telephone, societe, SIRET)
- Choix du statut prospect (obligatoire) : Chaud, Tiede, Froid, Non

**Given** MiKL selectionne un statut prospect
**When** il valide le formulaire post-visio
**Then** le comportement s'adapte au statut choisi :

| Statut | Email envoye | Relance auto | Action CRM |
|--------|-------------|-------------|------------|
| Chaud | Resume + lien creation espace | Non | → Fiche client creee (type selon decision MiKL) |
| Tiede | Resume commercial | Auto J+3, J+7 (configurable) | → Prospect chaud dans CRM |
| Froid | Resume + "A disposition" | Non | → Prospect froid dans CRM |
| Non | Remerciement + transcription | Non | → Prospect ferme dans CRM |

**And** un email adapte au statut est genere (apercu modifiable avant envoi)
**And** MiKL peut choisir : "Envoyer maintenant", "Programmer", "Standby"

**Given** le statut est "Chaud"
**When** MiKL valide
**Then** une fiche client est creee automatiquement dans la table `clients` avec les informations du prospect (nom, email, entreprise, telephone, secteur deduit du code NAF)
**And** MiKL choisit le type de client (Complet / Direct One) et le parcours (Lab ou One direct)
**And** le client recoit un email avec ses identifiants de connexion
**And** le meeting est associe au client_id nouvellement cree

**Given** le statut est "Tiede"
**When** la relance automatique est activee
**Then** un rappel est cree dans la table `reminders` (Story 2.7) aux dates configurees (J+3, J+7)
**And** un email de relance est envoye automatiquement aux dates prevues (via Edge Function cron)
**And** MiKL peut desactiver la relance a tout moment

**Given** le meeting post-visio est traite
**When** le flux est termine
**Then** une entree est creee dans `activity_logs` (type: 'prospect_qualified', details: statut choisi)
**And** le meeting est mis a jour avec les notes de MiKL

---

## Story 5.5 : Ecran de bienvenue premiere connexion & tutoriel Lab

As a **nouveau client Lab**,
I want **voir un ecran de bienvenue a ma premiere connexion et acceder a un tutoriel de prise en main**,
So that **je comprends immediatement comment fonctionne mon espace et par ou commencer**.

**Acceptance Criteria :**

**Given** un nouveau client Lab se connecte pour la premiere fois (FR70)
**When** le dashboard client se charge
**Then** une modale de bienvenue s'affiche (welcome-screen.tsx dans core-dashboard) avec :
- Message d'accueil personnalise avec le prenom du client
- Presentation d'Elio ("Voici Elio, votre assistant IA disponible 24/7")
- Explication du fonctionnement de l'espace Lab (3-4 points cles en visuel)
- Bouton "C'est parti !" pour fermer la modale
**And** la premiere connexion est detectee via un flag `first_login` dans `client_configs` ou via l'absence d'activite dans `activity_logs`
**And** la modale ne s'affiche qu'une seule fois (le flag est mis a jour apres affichage)
**And** l'animation est fluide avec la palette Lab (Violet/Purple sur fond #020402)

**Given** le client a ferme la modale de bienvenue
**When** il veut revoir les explications
**Then** un lien "Tutoriel" est accessible dans le menu utilisateur ou la FAQ (FR71)

**Given** le client accede au tutoriel (FR71)
**When** la page ou le panneau tutorial se charge
**Then** un guide pas-a-pas s'affiche avec les etapes cles :
1. "Voici votre parcours" — explication du parcours Lab et des etapes
2. "Discutez avec Elio" — comment utiliser le chat IA
3. "Soumettez vos briefs" — comment envoyer un travail a MiKL pour validation
4. "Echangez avec MiKL" — comment utiliser le chat direct
5. "Consultez vos documents" — ou trouver les livrables
**And** chaque etape est illustree (screenshot ou illustration)
**And** un bouton "Passer" permet de sauter le tutoriel
**And** le tutoriel est stocke en dur dans le code (composant React, pas de CMS V1)

---

## Story 5.6 : Ecran de graduation Lab vers One

As a **client MonprojetPro qui termine son parcours Lab**,
I want **voir un ecran de celebration avec le recapitulatif de mon parcours Lab lors de ma graduation vers One**,
So that **je ressens la progression accomplie et je suis motive pour utiliser mon nouvel espace**.

**Acceptance Criteria :**

**Given** un client Lab est gradue vers One par MiKL (Epic 9)
**When** le client se connecte a son dashboard apres la graduation (FR72)
**Then** un ecran de graduation s'affiche (welcome-screen.tsx mode graduation dans core-dashboard) avec :
- Animation de celebration (confetti, transition de couleur subtile Lab→One)
- Message "Felicitations {prenom} ! Votre espace professionnel est pret"
- Recapitulatif du parcours Lab : nombre d'etapes completees, briefs valides, duree du parcours
- Apercu de ce qui est nouveau dans One : modules actives, fonctionnalites supplementaires
- Bouton "Decouvrir mon espace One"
**And** la transition visuelle passe progressivement de la palette Lab (Violet/Purple) a la palette One (Orange vif + Bleu-gris) — pas de changement brutal

**Given** le client ferme l'ecran de graduation
**When** il arrive sur le dashboard One
**Then** ses donnees Lab sont accessibles via l'onglet "Historique Lab" (module historique-lab, Epic 10)
**And** Elio One l'accueille avec un message contextualise qui fait reference a son parcours Lab
**And** le flag de graduation est enregistre pour ne plus afficher l'ecran (une seule fois)

**Given** MiKL dans le Hub
**When** il consulte la fiche du client gradue
**Then** l'historique affiche l'evenement de graduation avec la date et les metriques (duree Lab, etapes completees)

---

## Resume Epic 5 — Couverture FRs

| Story | Titre | FRs couvertes |
|-------|-------|---------------|
| 5.1 | Module Visio — migration meetings & salle de visio OpenVidu | — (fondation technique visio) |
| 5.2 | Enregistrement, transcription & historique visios | FR58, FR59 |
| 5.3 | Demande de visio, prise de RDV Cal.com & salle d'attente | FR60 |
| 5.4 | Flux post-visio & onboarding prospect | — (flux UX onboarding) |
| 5.5 | Ecran de bienvenue premiere connexion & tutoriel Lab | FR70, FR71 |
| 5.6 | Ecran de graduation Lab vers One | FR72 |

**Toutes les 6 FRs de l'Epic 5 sont couvertes.** Les stories 5.1 et 5.4 couvrent les fondations techniques et le flux onboarding prospect defini dans la specification UX.

---
