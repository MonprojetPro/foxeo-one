# Epic 3 : Communication Temps Reel & Notifications — Stories detaillees

**Objectif :** MiKL et les clients communiquent en temps reel via chat asynchrone avec un systeme de notifications complet (email + in-app), indicateur de presence et support/FAQ.

**FRs couverts:** FR57, FR61, FR99, FR100, FR101, FR109, FR110, FR111, FR127, FR128, FR129

**NFRs pertinentes:** NFR-P2, NFR-P5, NFR-I4, NFR-I5, NFR-S7, NFR-R6, NFR-A1 a NFR-A4, NFR-M1 a NFR-M5

---

## Story 3.1 : Module Chat — Migration messages & messagerie temps reel MiKL-client

As a **client MonprojetPro (Lab ou One)**,
I want **echanger avec MiKL via un chat asynchrone en temps reel depuis mon dashboard**,
So that **je peux poser mes questions et recevoir des reponses directes de MiKL sans delai**.

**Acceptance Criteria :**

**Given** les besoins en donnees de cette story
**When** la migration 00005_messages.sql est executee
**Then** la table `messages` est creee avec : id (UUID PK), client_id (FK clients NOT NULL), operator_id (FK operators NOT NULL), sender_type (TEXT CHECK IN ('client', 'operator') NOT NULL), content (TEXT NOT NULL), read_at (TIMESTAMP nullable), created_at (TIMESTAMP DEFAULT NOW())
**And** un index `idx_messages_client_id_created_at` est cree pour les requetes de conversation
**And** les policies RLS sont appliquees :
- `messages_select_owner` : un client ne voit que ses propres messages
- `messages_select_operator` : un operateur voit les messages de ses clients
- `messages_insert_authenticated` : client et operateur peuvent inserer des messages
**And** un test RLS `message-isolation.test.ts` verifie que le client A ne voit pas les messages du client B

**Given** le module Chat n'existe pas encore
**When** la story est completee
**Then** le module `packages/modules/chat/` est structure selon le pattern standard :
- `manifest.ts` avec id: `chat`, targets: `['hub', 'client-lab', 'client-one']`, requiredTables: `['messages']`
- `components/` : chat-window.tsx, chat-message.tsx, chat-input.tsx, chat-list.tsx
- `hooks/` : use-chat-messages.ts
- `actions/` : send-message.ts
- `types/` : chat.types.ts
- `index.ts` barrel export

**Given** un client authentifie accede au module Chat
**When** la fenetre de chat se charge
**Then** l'historique des messages MiKL-client s'affiche (ordonne chronologiquement, plus ancien en haut)
**And** les messages sont fetches via TanStack Query avec queryKey `['messages', clientId]`
**And** un skeleton loader s'affiche pendant le chargement
**And** les messages du client sont alignes a droite, ceux de MiKL a gauche
**And** chaque message affiche : contenu, heure, indicateur lu/non lu

**Given** le client saisit un message dans le champ de saisie
**When** il envoie le message (bouton ou Entree)
**Then** une Server Action `sendMessage()` cree le message dans la table `messages` avec sender_type='client'
**And** la reponse suit le pattern `{ data, error }`
**And** le message apparait immediatement dans la conversation (optimistic update TanStack Query)
**And** l'action repond en moins de 500ms (NFR-P2)

**Given** MiKL est sur le Hub et accede au Chat
**When** il selectionne un client dans la liste des conversations
**Then** la liste des conversations (chat-list.tsx) affiche tous les clients avec : dernier message, date, indicateur non lu
**And** la conversation selectionnee s'affiche dans la fenetre de chat
**And** MiKL peut envoyer un message avec sender_type='operator'

**Given** un nouveau message est envoye (par le client ou MiKL)
**When** l'autre partie a le chat ouvert
**Then** le message apparait en temps reel via Supabase Realtime (channel: `chat:room:{clientId}`)
**And** le Realtime trigger invalide le cache TanStack Query `['messages', clientId]` — pas de state local
**And** le message apparait en moins de 2 secondes apres l'envoi (NFR-P5)

**Given** un client envoie un message
**When** MiKL n'a pas le chat ouvert
**Then** le compteur de messages non lus s'incremente dans la sidebar du Hub (badge sur le module Chat)

---

## Story 3.2 : Module Notifications — Infrastructure in-app & temps reel

As a **utilisateur (MiKL ou client)**,
I want **recevoir des notifications in-app en temps reel pour les evenements importants (validations, messages, alertes)**,
So that **je suis informe immediatement de ce qui necessite mon attention**.

**Acceptance Criteria :**

**Given** les besoins en donnees de cette story
**When** la migration 00007_notifications.sql est executee
**Then** la table `notifications` est creee avec : id (UUID PK), recipient_type (TEXT CHECK IN ('client', 'operator') NOT NULL), recipient_id (UUID NOT NULL), type (TEXT NOT NULL — 'message', 'validation', 'alert', 'system', 'graduation', 'payment'), title (TEXT NOT NULL), body (TEXT), link (TEXT nullable — URL relative de redirection), read_at (TIMESTAMP nullable), created_at (TIMESTAMP DEFAULT NOW())
**And** un index `idx_notifications_recipient_created_at` est cree
**And** les policies RLS :
- `notifications_select_owner` : chaque utilisateur ne voit que ses propres notifications
- `notifications_update_owner` : chaque utilisateur ne peut marquer comme lues que ses propres notifications

**Given** le module Notifications n'existe pas encore
**When** la story est completee
**Then** le module `packages/modules/notifications/` est structure :
- `manifest.ts` avec id: `notifications`, targets: `['hub', 'client-lab', 'client-one']`, requiredTables: `['notifications']`
- `components/` : notification-center.tsx, notification-badge.tsx
- `hooks/` : use-notifications.ts
- `actions/` : mark-as-read.ts, create-notification.ts (Server Action utilitaire, appelee par d'autres modules)
- `types/` : notification.types.ts

**Given** un utilisateur est authentifie
**When** il voit le header du dashboard
**Then** un badge notification (notification-badge.tsx) affiche le nombre de notifications non lues
**And** les donnees sont fetches via TanStack Query avec queryKey `['notifications', recipientId, 'unread-count']`

**Given** un utilisateur clique sur le badge notification
**When** le centre de notifications s'ouvre (dropdown ou panneau lateral)
**Then** la liste des notifications s'affiche ordonnee de la plus recente a la plus ancienne
**And** chaque notification affiche : icone par type, titre, body (tronque), date relative (formatRelativeDate de @monprojetpro/utils)
**And** les notifications non lues sont visuellement distinguees (fond accent subtil)
**And** un bouton "Tout marquer comme lu" est disponible

**Given** un utilisateur clique sur une notification
**When** la notification a un lien de redirection
**Then** il est redirige vers la page concernee (ex: fiche client, validation Hub, chat)
**And** la notification est marquee comme lue automatiquement (Server Action `markAsRead()`)

**Given** un nouvel evenement genere une notification (ex: nouveau message, validation en attente)
**When** la notification est creee en base
**Then** elle apparait en temps reel via Supabase Realtime (channel: `client:notifications:{recipientId}`)
**And** le Realtime trigger invalide le cache TanStack Query `['notifications', recipientId, 'unread-count']`
**And** la notification apparait en moins de 2 secondes apres l'evenement (NFR-P5)
**And** un toast discret s'affiche brievement avec le titre de la notification (FR61)

---

## Story 3.3 : Notifications email transactionnelles

As a **utilisateur (MiKL ou client)**,
I want **recevoir les notifications importantes par email en plus de l'in-app**,
So that **je suis informe meme quand je ne suis pas connecte a la plateforme**.

**Acceptance Criteria :**

**Given** l'infrastructure d'envoi d'emails n'existe pas encore
**When** la story est completee
**Then** un service d'envoi email est configure via Supabase Edge Functions (ou Resend/Postmark selon le choix technique)
**And** les templates email sont definis dans un dossier `supabase/functions/emails/` ou equivalent
**And** le service gere le retry en cas d'echec d'envoi (NFR-I5)

**Given** les types de notifications email sont definis
**When** un evenement declencheur survient
**Then** un email est envoye pour les types suivants (FR99) :
- `validation` : "Votre brief a ete valide/refuse" (vers client)
- `message` : "Nouveau message de MiKL" (vers client) / "Nouveau message de {client}" (vers MiKL)
- `alert` : "Client Lab inactif depuis X jours" (vers MiKL)
- `graduation` : "Felicitations ! Votre espace One est pret" (vers client)
- `payment` : "Echec de paiement" (vers client + MiKL)
**And** chaque email est envoye en moins de 10 secondes apres l'evenement (NFR-I4)

**Given** un email transactionnel est envoye
**When** le contenu est genere
**Then** l'email utilise un template HTML responsive au branding MonprojetPro
**And** le template inclut : logo MonprojetPro, titre, corps, bouton CTA (lien vers la plateforme), pied de page avec lien de desabonnement
**And** les emails sont envoyes depuis une adresse noreply@monprojet-pro.com (ou similaire)

**Given** la double delivery est active (email + in-app)
**When** un evenement declencheur survient
**Then** une notification in-app EST TOUJOURS creee (Story 3.2)
**And** un email est envoye EN PLUS si les preferences du destinataire l'autorisent (defaut: oui pour tous les types)
**And** la notification in-app ne depend pas du succes de l'email (envoi asynchrone)

**Given** le service email externe est indisponible
**When** un email echoue apres retries
**Then** l'erreur est loguee dans `activity_logs` avec le contexte (destinataire, type, erreur)
**And** la notification in-app reste fonctionnelle (mode degrade, NFR-R6)
**And** MiKL est alerte si le taux d'echec depasse un seuil

---

## Story 3.4 : Preferences de notification (client & MiKL)

As a **client MonprojetPro**,
I want **configurer mes preferences de notification pour choisir quels types de notifications je recois et par quel canal**,
So that **je ne suis pas submerge par des notifications non pertinentes**.

**Acceptance Criteria :**

**Given** les besoins en donnees de cette story
**When** la structure de preferences est mise en place
**Then** la table `notifications` est etendue (ou une table `notification_preferences` est creee) avec : id (UUID PK), user_type (TEXT CHECK IN ('client', 'operator')), user_id (UUID NOT NULL), notification_type (TEXT NOT NULL), channel_email (BOOLEAN DEFAULT true), channel_inapp (BOOLEAN DEFAULT true), created_at, updated_at
**And** les policies RLS assurent que chaque utilisateur ne gere que ses propres preferences

**Given** un client accede a ses parametres de notification (FR100)
**When** il ouvre la page de preferences
**Then** il voit une liste de types de notifications avec pour chacun un toggle email et un toggle in-app :
- Messages de MiKL : email [on/off] | in-app [on/off]
- Validations Hub : email [on/off] | in-app [on/off]
- Alertes systeme : email [on/off] | in-app [on/off]
- Graduation : email [on/off] | in-app [on/off]
**And** les toggles in-app "systeme" et "graduation" ne peuvent pas etre desactives (notifications critiques)
**And** les preferences par defaut sont : tout active

**Given** un client modifie une preference
**When** il change un toggle
**Then** la modification est sauvegardee immediatement via Server Action `updateNotificationPrefs()`
**And** la reponse suit le pattern `{ data, error }`
**And** un toast discret confirme "Preferences mises a jour"

**Given** MiKL veut configurer les notifications pour un client specifique (FR101)
**When** il accede a la fiche client (onglet Informations ou section dediee)
**Then** il peut forcer certains types de notifications pour ce client (ex: activer les alertes meme si le client les a desactivees — cas critique)
**And** les overrides MiKL sont prioritaires sur les preferences client

**Given** un evenement genere une notification
**When** le systeme verifie les preferences avant envoi
**Then** la notification in-app est creee seulement si channel_inapp=true pour ce type
**And** l'email est envoye seulement si channel_email=true pour ce type
**And** les overrides MiKL sont verifies en premier

---

## Story 3.5 : Indicateur de presence en ligne

As a **utilisateur (MiKL ou client)**,
I want **voir si mon interlocuteur est actuellement en ligne**,
So that **je sais si je peux attendre une reponse rapide ou non**.

**Acceptance Criteria :**

**Given** le systeme de presence n'existe pas encore
**When** la story est completee
**Then** le hook `use-chat-presence.ts` dans le module Chat utilise Supabase Realtime Presence API
**And** le channel de presence suit le pattern : `presence:operator:{operatorId}` (FR129)

**Given** un utilisateur est authentifie et a une page ouverte
**When** il est connecte a la plateforme
**Then** son statut est synchronise via Supabase Realtime Presence avec : user_id, user_type ('client' | 'operator'), online_at (timestamp)
**And** le statut est automatiquement retire quand l'utilisateur ferme la page ou perd la connexion

**Given** un client ouvre le Chat MiKL
**When** le chat se charge
**Then** un indicateur visuel affiche le statut de MiKL : en ligne (point vert), hors ligne (point gris)
**And** si MiKL est hors ligne, un message discret indique "MiKL vous repondra des que possible"

**Given** MiKL ouvre le Chat dans le Hub
**When** il consulte la liste des conversations
**Then** chaque client affiche son indicateur de presence (en ligne / hors ligne)
**And** MiKL peut trier la liste par "En ligne d'abord"

**Given** MiKL consulte la liste des clients dans le CRM
**When** la liste se charge
**Then** un point de presence est affiche a cote du nom de chaque client (vert si en ligne, gris sinon)
**And** cette information est mise a jour en temps reel sans rechargement

**Given** un utilisateur perd temporairement sa connexion
**When** la connexion Realtime Presence est interrompue
**Then** le statut passe a hors ligne apres un timeout de 30 secondes (pas instantanement pour eviter les faux negatifs)
**And** quand la connexion revient, le statut repasse automatiquement a en ligne

---

## Story 3.6 : Gestion des conflits de modification concurrente

As a **utilisateur (MiKL ou client)**,
I want **etre prevenu si quelqu'un d'autre a modifie les memes donnees que moi pendant que je les editais**,
So that **je ne perds pas mon travail et les modifications ne s'ecrasent pas silencieusement**.

**Acceptance Criteria :**

**Given** le mecanisme de verrouillage optimiste n'existe pas encore
**When** la story est completee
**Then** un helper `optimisticLock()` est disponible dans @monprojetpro/utils
**And** le pattern est base sur le champ `updated_at` existant sur les tables clients, client_configs, documents

**Given** MiKL ouvre un formulaire d'edition (ex: fiche client, document)
**When** le formulaire se charge
**Then** le `updated_at` de l'enregistrement est stocke comme reference (version du formulaire)

**Given** MiKL soumet une modification
**When** la Server Action execute l'update
**Then** la requete Supabase inclut un filtre `.eq('updated_at', originalUpdatedAt)` (FR128)
**And** si le `updated_at` en base correspond : la modification s'applique normalement
**And** si le `updated_at` en base differe (quelqu'un d'autre a modifie entre-temps) : la requete retourne 0 rows affected

**Given** un conflit de modification est detecte
**When** la Server Action detecte 0 rows affected
**Then** la reponse retourne `{ data: null, error: { message: 'Les donnees ont ete modifiees par un autre utilisateur. Veuillez recharger.', code: 'CONFLICT' } }`
**And** le composant affiche un dialog de conflit avec les options :
- "Recharger les donnees" : recharge la version actuelle (perd les modifications locales)
- "Forcer ma version" : re-soumet avec le nouveau `updated_at` (ecrase l'autre modification)
**And** le choix par defaut est "Recharger les donnees" (principe de prudence)

**Given** les formulaires critiques (fiche client, config modules)
**When** ils sont ouverts simultanement par MiKL sur deux onglets
**Then** le mecanisme de conflit fonctionne entre onglets du meme utilisateur
**And** un message explicatif aide MiKL a comprendre la situation

---

## Story 3.7 : Support client — Signalement de problemes & aide en ligne

As a **client MonprojetPro**,
I want **signaler un probleme ou bug depuis l'interface et acceder a une aide en ligne / FAQ**,
So that **je peux obtenir de l'aide rapidement sans quitter la plateforme**.

**Acceptance Criteria :**

**Given** le systeme de signalement n'existe pas encore
**When** la story est completee
**Then** la table `support_tickets` est creee avec : id (UUID PK), client_id (FK clients NOT NULL), operator_id (FK operators NOT NULL), type (TEXT CHECK IN ('bug', 'question', 'suggestion') DEFAULT 'bug'), subject (TEXT NOT NULL), description (TEXT NOT NULL), screenshot_url (TEXT nullable), status (TEXT CHECK IN ('open', 'in_progress', 'resolved', 'closed') DEFAULT 'open'), created_at (TIMESTAMP DEFAULT NOW()), updated_at (TIMESTAMP DEFAULT NOW())
**And** les policies RLS :
- `support_tickets_select_owner` : un client ne voit que ses propres tickets
- `support_tickets_select_operator` : un operateur voit les tickets de ses clients
- `support_tickets_insert_authenticated` : un client peut creer un ticket

**Given** un client rencontre un probleme
**When** il clique sur le bouton "Signaler un probleme" (accessible depuis le menu utilisateur ou footer de chaque page) (FR109)
**Then** un dialog s'ouvre avec : type (Bug / Question / Suggestion), sujet (obligatoire), description (obligatoire), capture d'ecran (optionnel — upload vers Supabase Storage)
**And** le formulaire utilise react-hook-form avec validation Zod

**Given** le client soumet un signalement
**When** la Server Action `createSupportTicket()` s'execute
**Then** le ticket est cree dans `support_tickets`
**And** une notification est envoyee a MiKL (type: 'alert', titre: "Nouveau signalement de {client}")
**And** un toast confirme "Votre signalement a ete envoye. MiKL vous repondra rapidement."
**And** le client peut voir le statut de ses signalements dans une section "Mes signalements"

**Given** MiKL accede au Hub
**When** il consulte les problemes signales (FR110)
**Then** une vue dans le module CRM ou un onglet dedie affiche la liste des tickets : client, type, sujet, statut, date
**And** les tickets sont triables par statut (priorite aux 'open') et par date
**And** MiKL peut changer le statut d'un ticket (open → in_progress → resolved → closed)
**And** MiKL peut repondre directement au client via le Chat (lien rapide)

**Given** un client cherche de l'aide
**When** il clique sur "Aide" ou "FAQ" (accessible depuis le menu utilisateur) (FR111)
**Then** une page ou un panneau lateral affiche une FAQ structuree par categories :
- Premiers pas (comment fonctionne mon espace, qu'est-ce qu'Elio)
- Mon parcours Lab (comment avancer, comment soumettre)
- Mon espace One (mes modules, comment demander une evolution)
- Compte & securite (mot de passe, sessions, donnees)
- Contact MiKL (comment joindre MiKL, delais de reponse)
**And** une barre de recherche permet de filtrer les questions
**And** les reponses sont stockees en dur dans le code (fichier JSON ou composant) — pas de CMS en V1
**And** un lien "Contacter MiKL" et "Signaler un probleme" sont accessibles en bas de la FAQ

---

## Resume Epic 3 — Couverture FRs

| Story | Titre | FRs couvertes |
|-------|-------|---------------|
| 3.1 | Module Chat — messagerie temps reel MiKL-client | FR57 |
| 3.2 | Module Notifications — infrastructure in-app & temps reel | FR61, FR127 |
| 3.3 | Notifications email transactionnelles | FR99 |
| 3.4 | Preferences de notification (client & MiKL) | FR100, FR101 |
| 3.5 | Indicateur de presence en ligne | FR129 |
| 3.6 | Gestion des conflits de modification concurrente | FR128 |
| 3.7 | Support client — signalement de problemes & aide en ligne | FR109, FR110, FR111 |

**Toutes les 11 FRs de l'Epic 3 sont couvertes.**

---
