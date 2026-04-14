# Epic 8 : Agents IA Elio (Hub, Lab, One) — Stories detaillees

**Objectif :** MiKL et les clients beneficient d'une assistance IA contextuelle adaptee a leur role (Hub, Lab, One) avec profil de communication personnalise, historique persistant, feedback et fonctionnalites avancees (recherche, correction, generation, actions).

**FRs couverts:** FR21, FR22, FR23, FR24, FR25, FR44, FR45, FR46, FR47, FR48, FR49, FR50, FR51, FR66, FR67, FR68, FR69, FR83, FR87, FR122, FR123, FR124, FR125, FR126

**NFRs pertinentes:** NFR-P1, NFR-P3, NFR-I2, NFR-S7, NFR-S8, NFR-A1 a NFR-A4, NFR-M1 a NFR-M5

**Note architecturale :** **Story 8.1 (fondation Elio unifiee) doit etre implementee AVANT les Stories 6.4-6.6** afin que les fonctionnalites Elio Lab soient construites directement sur l'architecture multi-dashboard unifiee. Les tables `elio_conversations` et `elio_messages` (migration 00011) sont creees en Story 6.4. La configuration Orpheus et l'historique de config existent depuis Story 6.6. Story 8.1 cree le module unifie `modules/elio/` (targets: ['hub', 'client-lab', 'client-one']), les composants reutilisables et la gestion des erreurs. Les Stories 6.4-6.6 construisent ensuite les fonctionnalites Lab-specifiques sur cette fondation. Les Stories 8.2-8.9 ajoutent les variantes Hub et One (One + One+). Le modele LLM est DeepSeek V3.2 via Supabase Edge Function ; les cles API ne transitent jamais cote client (NFR-S8).

---

## Story 8.1 : Consolidation infrastructure Elio — Module unifie, composants partages & gestion des erreurs

> **Technical Enabler** — Consolidation technique, benefice indirect pour tous les utilisateurs d'Elio.

As a **client MonprojetPro (Lab ou One)**,
I want **qu'Elio fonctionne de maniere fiable et coherente quel que soit le dashboard**,
So that **mon experience avec l'assistant IA est fluide, sans bugs ni incoherences entre les contextes**.

**Acceptance Criteria :**

**Given** le module Elio doit etre cree avec une architecture unifiee multi-dashboard (prerequis des Stories 6.4-6.6)
**When** le module unifie est cree
**Then** le module `modules/elio/` est restructure avec une architecture unifiee :
```
modules/elio/
  index.ts                       # Export public du module
  manifest.ts                    # { id: 'elio', targets: ['hub', 'client-lab', 'client-one'], dependencies: [] }
  components/
    elio-chat.tsx                # Chat unifie (dashboard-agnostic)
    elio-thinking.tsx            # Indicateur de reflexion (FR122)
    elio-message.tsx             # Composant message individuel
  hooks/
    use-elio-chat.ts             # Hook principal (conversation, envoi, reception)
    use-elio-config.ts           # Hook resolution config par dashboard_type
  actions/
    send-to-elio.ts              # Server Action existante (refactoree pour multi-dashboard)
  types/
    elio.types.ts                # Types partages
  config/
    system-prompts.ts            # Construction de system prompts par dashboard_type
```
**And** le manifest est mis a jour avec targets: ['hub', 'client-lab', 'client-one']

**Given** le composant elio-chat.tsx est refactorise
**When** il est utilise dans un dashboard
**Then** il recoit un prop `dashboardType: 'hub' | 'lab' | 'one'` qui determine :
- La palette de couleurs Minimal Futuriste (Hub: cyan/turquoise, Lab: violet/purple, One: orange vif/bleu-gris — sur base dark mode)
- Le system prompt de base (via config/system-prompts.ts)
- Les capacites disponibles (guidage parcours pour Lab, FAQ pour One, recherche pour Hub)
**And** les composants internes (message, input, header) s'adaptent au dashboard_type
**And** cette architecture sert de fondation pour les Stories 6.4-6.6 (Elio Lab) et 8.5-8.9 (Elio Hub/One)

**Given** le composant elio-thinking.tsx est extrait (FR122)
**When** Elio genere une reponse
**Then** un indicateur visuel anime s'affiche :
- Animation de type "pulsation" ou "dots" avec le texte "Elio reflechit..."
- L'indicateur est visible dans la zone de chat, a la position ou la reponse va apparaitre
- L'indicateur disparait quand le premier token de la reponse arrive
**And** le composant est reutilisable dans tous les dashboards
**And** le texte est configurable (ex : "Elio analyse votre question..." pour le Hub)

**Given** la gestion des erreurs et timeouts Elio (FR83)
**When** un appel au LLM echoue ou expire
**Then** le systeme gere gracieusement les cas suivants :
- **Timeout (> 60s, NFR-I2)** : Message "Elio est temporairement indisponible. Reessayez dans quelques instants." avec un bouton "Reessayer"
- **Erreur reseau** : Message "Probleme de connexion. Verifiez votre connexion internet." avec bouton "Reessayer"
- **Erreur LLM (500, rate limit)** : Message "Elio est surcharge. Reessayez dans quelques minutes."
- **Erreur inattendue** : Message generique avec log de l'erreur (NFR-R5)
**And** l'indicateur elio-thinking.tsx se masque en cas d'erreur
**And** le message d'erreur s'affiche dans une bulle speciale (icone warning, style distinct)
**And** le champ de saisie reste actif (le client peut reessayer immediatement)
**And** ces comportements sont partages via un composant `elio-error-message.tsx` ou integres dans elio-chat.tsx

**Given** le hook use-elio-config.ts
**When** il est utilise dans un dashboard
**Then** il resout la configuration Elio en fonction du dashboard_type :
- **Lab** : charge `client_configs.elio_config` (profil comm, parcours_context, custom_prompts)
- **One** : charge `client_configs.elio_config` + `client_configs.elio_tier` ('one' | 'one_plus') + documentation modules actifs
- **Hub** : charge la config Hub globale (pas de profil client, config operateur)
**And** la config est mise en cache via TanStack Query

**Given** la construction des system prompts (config/system-prompts.ts)
**When** un message est envoye a Elio
**Then** le system prompt est construit dynamiquement selon le dashboard_type :
- **Base commune** : role Elio, ton adapte au profil communication, contraintes generales
- **Lab** : + etape active du parcours, questions guidees, contexte metier client
- **One** : + documentation modules actifs, capacites FAQ/guidance uniquement
- **One+** : + capacites actions/generation/alertes
- **Hub** : + contexte operateur, fonctionnalites Hub, base de donnees clients accessible
**And** le system prompt est assemble dans `send-to-elio.ts` avant l'appel au LLM

---

## Story 8.2 : Conversations Elio — Liste, commutation & historique persistant complet

As a **utilisateur (MiKL ou client)**,
I want **voir la liste de mes conversations Elio, en demarrer de nouvelles sans perdre les anciennes, et retrouver tout l'historique**,
So that **je peux revenir sur des echanges precedents et organiser mes conversations par sujet**.

**Acceptance Criteria :**

**Given** l'historique des conversations Elio est stocke dans `elio_conversations` + `elio_messages` (Story 6.4) (FR123)
**When** un utilisateur ouvre le module Elio
**Then** ses conversations precedentes sont disponibles et persistantes entre sessions :
- Les conversations sont fetches via TanStack Query avec queryKey `['elio-conversations', userId, dashboardType]`
- L'historique complet des messages est charge a la demande (lazy loading par conversation)
- Les conversations sont triees par date de derniere activite (la plus recente en haut)
**And** la conversation la plus recente est ouverte par defaut

**Given** l'utilisateur veut voir ses conversations (FR123)
**When** il ouvre le panneau de conversations
**Then** une liste laterale (sidebar ou drawer mobile) affiche :
- Chaque conversation avec : titre (auto-genere ou editable), date de dernier message (format relatif), apercu du dernier message (30 caracteres max)
- La conversation active est surlignee
- Un bouton "Nouvelle conversation" en haut de la liste
**And** sur mobile (< 768px), la liste s'affiche en plein ecran avec retour au chat au clic
**And** sur desktop, la liste est un panneau lateral collapsible

**Given** l'utilisateur clique sur "Nouvelle conversation" (FR124)
**When** la Server Action `newConversation(userId, dashboardType)` s'execute (new-conversation.ts)
**Then** :
1. Une nouvelle entree est creee dans `elio_conversations` avec title='Nouvelle conversation', dashboard_type correspondant
2. L'ancienne conversation n'est PAS supprimee ni modifiee
3. Le chat s'ouvre sur la nouvelle conversation vide
4. Elio affiche un message d'accueil adapte au dashboard_type :
   - Lab : "Salut ! On reprend ton parcours ? Sur quoi tu veux bosser ?"
   - One : "Bonjour ! Comment puis-je vous aider aujourd'hui ?"
   - Hub : "Hey MiKL ! Qu'est-ce que je peux faire pour toi ?"
**And** le message d'accueil utilise le profil de communication si disponible (tutoiement/vouvoiement)
**And** le cache TanStack Query est invalide pour ['elio-conversations']

**Given** l'utilisateur navigue entre les conversations
**When** il clique sur une conversation dans la liste
**Then** le chat affiche l'historique complet de cette conversation
**And** le scroll se positionne sur le dernier message
**And** le chargement est progressif si > 50 messages (pagination inverse avec "Charger les messages precedents")
**And** la transition entre conversations est fluide (< 500ms, NFR-P2)

**Given** une conversation accumule plusieurs echanges
**When** le titre est encore "Nouvelle conversation"
**Then** apres 3 messages utilisateur, le titre est auto-genere par le LLM en un appel leger :
- Prompt : "Resume cette conversation en 5 mots max : {3 premiers messages}"
- Le titre est mis a jour dans `elio_conversations.title`
**And** l'utilisateur peut editer le titre manuellement (double-clic ou icone edit)

---

## Story 8.3 : Feedback reponses Elio, documents dans le chat & historique configs

As a **utilisateur (MiKL ou client)**,
I want **donner un feedback sur les reponses d'Elio, voir les documents generes directement dans le chat, et (pour MiKL) consulter l'historique des configs Elio**,
So that **Elio s'ameliore grace aux retours, les documents sont accessibles sans quitter la conversation, et MiKL garde la tracabilite des configs**.

**Acceptance Criteria :**

**Given** Elio envoie une reponse dans le chat
**When** la reponse est affichee (FR126)
**Then** chaque message d'Elio affiche en bas de bulle deux boutons discrets :
- 👍 (utile) / 👎 (pas utile)
- Les boutons apparaissent au survol (desktop) ou sont toujours visibles (mobile)
- Un seul choix possible par message (toggle : cliquer a nouveau desactive)
**And** au clic, la Server Action `submitFeedback(messageId, rating: 'useful' | 'not_useful')` est executee (submit-feedback.ts)
**And** le feedback est stocke dans `elio_messages.metadata.feedback` : `{ rating: 'useful' | 'not_useful', created_at: timestamp }`
**And** un micro-feedback visuel confirme le choix (le bouton selectionne change de couleur)
**And** aucune notification n'est envoyee — le feedback est collecte silencieusement pour analyse

**Given** Elio genere ou partage un document dans la conversation (FR125)
**When** le message contient un document (brief, livrable, export)
**Then** le composant `elio-document.tsx` affiche dans la bulle de chat :
- Le nom du document avec une icone de type (PDF, DOC, image)
- Un apercu inline si possible (markdown rendu, image thumbnail)
- Un bouton "Voir le document complet" qui ouvre le module documents (Epic 4)
- Un bouton "Telecharger" (PDF)
**And** le document est reference via `elio_messages.metadata.document_id` (FK vers la table `documents`)
**And** si le document est un brief genere par Elio Lab, il affiche le badge "Brief genere par Elio"

**Given** MiKL veut consulter l'historique des configurations Elio d'un client (FR87)
**When** il accede a la fiche client dans le Hub (section "Configuration Elio", Story 6.6)
**Then** en plus du formulaire d'edition existant, un onglet "Historique" affiche :
- La liste chronologique des modifications de config Elio (date, champs modifies, ancienne valeur → nouvelle valeur)
- Les donnees proviennent de la table `elio_config_history` (ou du versionning JSON mis en place en Story 6.6)
- Chaque entree est collapsible (clic pour voir le detail)
- Un bouton "Restaurer cette version" permet de revenir a une config precedente
**And** la restauration declenche une confirmation modale avant execution
**And** le cache TanStack Query est invalide apres restauration

---

## Story 8.4 : Profil de communication — Stockage, affinement & transmission graduation

As a **operateur ou agent IA**,
I want **un systeme de profil de communication par client qui est stocke, affine par Elio Lab, et transmis a Elio One lors de la graduation**,
So that **chaque client beneficie d'une communication adaptee a son style tout au long de son parcours MonprojetPro**.

**Acceptance Criteria :**

**Given** le systeme de profil de communication doit etre formalise (FR66)
**When** la structure est mise en place
**Then** le profil de communication est stocke dans `client_configs.elio_config.communication_profile` avec la structure suivante :
```typescript
type CommunicationProfile = {
  levelTechnical: 'beginner' | 'intermediaire' | 'advanced'
  styleExchange: 'direct' | 'conversationnel' | 'formel'
  adaptedTone: 'formel' | 'pro_decontracte' | 'chaleureux' | 'coach'
  messageLength: 'court' | 'moyen' | 'detaille'
  tutoiement: boolean
  concreteExamples: boolean
  avoid: string[]          // ex: ["jargon technique", "questions ouvertes"]
  privilege: string[]      // ex: ["listes a puces", "questions fermees"]
  styleNotes: string       // notes libres
}
```
**And** un schema Zod `communicationProfileSchema` valide cette structure
**And** un profil par defaut existe dans `@monprojetpro/utils` (DEFAULT_COMMUNICATION_PROFILE) : `{ levelTechnical: 'intermediaire', styleExchange: 'conversationnel', adaptedTone: 'pro_decontracte', messageLength: 'moyen', tutoiement: false, concreteExamples: true, avoid: [], privilege: [], styleNotes: '' }`

**Given** Orpheus (hors perimetre applicatif) genere un profil de communication pour un client (FR67)
**When** MiKL injecte ce profil via la fiche client (Story 6.6)
**Then** le profil est stocke dans `client_configs.elio_config.communication_profile`
**And** le profil est immediatement utilise par Elio Lab pour adapter ses reponses

**Given** Elio Lab interagit avec un client pendant le parcours (FR67 — affinement)
**When** Elio Lab detecte des preferences de communication non explicites
**Then** le system prompt d'Elio Lab inclut une instruction d'observation :
- "Si tu detectes une preference de communication (longueur, ton, style), note-la dans le champ metadata du message avec la cle 'profile_observation'"
- Exemples : "client prefere les listes", "client frustre par les questions repetitives", "client repond mieux le matin"
**And** ces observations sont stockees dans `elio_messages.metadata.profile_observation` (chaine de texte libre)
**And** MiKL peut consulter ces observations dans la fiche client (section "Observations Elio")
**And** MiKL peut valider une observation pour l'integrer au profil officiel (ajout dans `avoid` ou `privilege` ou `styleNotes`)

**Given** tous les agents Elio doivent adapter leur ton selon le profil (FR69)
**When** un message est envoye a Elio (quel que soit le dashboard)
**Then** le system prompt construit par `config/system-prompts.ts` inclut le bloc suivant :
```
# Profil de communication du client
- Niveau technique : {levelTechnical}
- Style d'echange : {styleExchange}
- Ton adapte : {adaptedTone}
- Longueur des messages : {messageLength}
- Tutoiement : {oui/non}
- Exemples concrets : {oui/non}
- A eviter : {avoid.join(', ')}
- A privilegier : {privilege.join(', ')}
- Notes : {styleNotes}

Adapte TOUTES tes reponses selon ce profil.
```
**And** si aucun profil n'existe, le DEFAULT_COMMUNICATION_PROFILE est utilise
**And** le profil est resolu par le hook `use-elio-config.ts` (Story 8.1)

**Given** un client Lab est diplome vers One (FR68)
**When** la graduation est declenchee (Epic 9)
**Then** le profil de communication est automatiquement transmis :
1. Le `communication_profile` de `client_configs.elio_config` est preserve tel quel (pas de copie — le meme champ est lu par Elio One)
2. Les observations d'Elio Lab (stockees dans les metadata des messages) sont compilees dans un champ `communication_profile.lab_learnings: string[]`
3. L'historique des conversations Lab reste accessible (meme table `elio_conversations`, filtre `dashboard_type='lab'`)
**And** Elio One utilise ce profil des la premiere interaction post-graduation
**And** aucune rupture de ton n'est ressentie par le client

---

## Story 8.5 : Elio Hub — Interface chat MiKL, aide fonctionnalites & recherche client

As a **MiKL (operateur)**,
I want **converser avec Elio Hub pour obtenir de l'aide sur les fonctionnalites, rechercher des informations clients et optimiser mon workflow quotidien**,
So that **j'ai un assistant IA dans mon cockpit qui me fait gagner du temps au quotidien**.

**Acceptance Criteria :**

**Given** MiKL accede au module Elio dans le Hub (FR21)
**When** le chat Elio Hub se charge
**Then** l'interface unifiee elio-chat.tsx s'affiche avec `dashboardType='hub'` :
- Palette Hub : cyan/turquoise (Minimal Futuriste dark mode)
- Header : "Elio Hub — Votre assistant" avec avatar Elio Hub
- Zone de chat avec historique
- Champ de saisie avec placeholder : "Demande-moi n'importe quoi sur MonprojetPro..."
- Panneau de conversations lateral (Story 8.2)
**And** un message d'accueil s'affiche si c'est la premiere conversation : "Hey MiKL ! Je suis Elio Hub, ton assistant. Je peux t'aider a naviguer dans le Hub, chercher des infos clients, corriger tes textes ou generer des brouillons. Qu'est-ce que tu veux faire ?"

**Given** MiKL demande de l'aide sur une fonctionnalite du Hub (FR22)
**When** il pose une question comme "Comment je cree un nouveau client ?" ou "Ou je vois les demandes en attente ?"
**Then** Elio Hub repond avec :
- Une explication claire de la fonctionnalite
- Le chemin de navigation pour y acceder (ex : "Va dans Clients → Nouveau client")
- Un lien cliquable vers la page concernee si possible
**And** le system prompt de Elio Hub inclut un bloc de documentation des fonctionnalites du Hub :
```
# Fonctionnalites Hub disponibles
- Gestion clients : /clients → creer, modifier, voir fiche complete
- Validation Hub : /modules/validation-hub → examiner et traiter les demandes
- Chat clients : /modules/chat → echanger avec les clients
- Documents : /modules/documents → partager et gerer les documents
- Visio : /modules/visio → planifier et lancer des visioconferences
- Analytics : /modules/analytics → consulter les statistiques
```
**And** si MiKL pose une question hors du perimetre Hub, Elio indique : "Ca sort un peu de mon perimetre, mais je peux essayer de t'aider quand meme !"

**Given** MiKL demande des informations sur un client (FR23)
**When** il pose une question comme "Ou en est Sandrine ?" ou "Quel est le parcours de Thomas ?"
**Then** Elio Hub effectue une recherche dans Supabase via une fonction dediee dans le system prompt :
- Le system prompt inclut un bloc d'instructions : "Tu as acces a la base de donnees clients. Utilise les fonctions disponibles pour chercher des informations."
- La Server Action `sendToElio()` detecte les intentions de recherche et execute les requetes Supabase correspondantes (clients, parcours, validation_requests, documents)
- Elio repond avec les informations trouvees formatees clairement :
  - Nom, entreprise, type de client, statut
  - Parcours actuel (si Lab) avec progression
  - Dernieres demandes de validation
  - Derniers messages echanges
**And** les requetes respectent les policies RLS (operateur voit tous ses clients)
**And** si aucun client ne correspond, Elio repond : "Je n'ai trouve aucun client correspondant a '{recherche}'. Tu veux verifier l'orthographe ?"

**Given** l'implementation technique de la recherche client
**When** Elio Hub recoit une question client
**Then** l'approche technique est la suivante :
1. Le LLM recoit le system prompt avec les schemas de donnees disponibles
2. Le LLM genere une intention structuree (ex : `{ action: 'search_client', query: 'Sandrine' }`)
3. La Server Action parse la reponse LLM, detecte l'intention, execute la requete Supabase
4. Les resultats sont reinjectes dans le contexte LLM pour formulation de la reponse finale
**And** cette mecanique de "tool use / function calling" est implementee dans `send-to-elio.ts` comme un pattern reutilisable

---

## Story 8.6 : Elio Hub — Correction redaction & generation de brouillons

As a **MiKL (operateur)**,
I want **qu'Elio Hub corrige et adapte mes textes au profil de communication du client, et genere des brouillons de reponses**,
So that **ma communication avec les clients est toujours professionnelle et adaptee a leur personnalite**.

**Acceptance Criteria :**

**Given** MiKL veut corriger et adapter un texte au profil d'un client (FR24)
**When** il ecrit dans le chat Elio Hub un message comme "Corrige ca pour Thomas : salu thomas, je tenvoi le devis cmme convenu" ou "Adapte ce texte pour Sandrine : Voici le devis demande."
**Then** Elio Hub :
1. Identifie le client mentionne dans le message
2. Charge le profil de communication du client (`client_configs.elio_config.communication_profile`)
3. Corrige l'orthographe, la grammaire et la ponctuation
4. Adapte le ton selon le profil (tutoiement/vouvoiement, longueur, style)
5. Repond avec le texte corrige et adapte, clairement delimite :
```
Voici la version corrigee et adaptee au profil de Thomas :

---
Salut Thomas ! Je t'envoie le devis comme convenu. Dis-moi si t'as des questions !
---

J'ai corrige l'orthographe et adapte au profil "decontracte + tutoiement" de Thomas.
```
**And** MiKL peut copier le texte corrige en un clic (bouton "Copier")
**And** si le client n'est pas trouve, Elio demande : "Quel client ? Je n'ai pas trouve '{nom}' dans ta base."

**Given** MiKL veut generer un brouillon de reponse (FR25)
**When** il demande "Genere un email pour Sandrine pour lui dire que son devis est pret" ou "Ecris une reponse Validation Hub pour Thomas"
**Then** Elio Hub :
1. Identifie le client et le type de communication (email, message Validation Hub, chat)
2. Charge le profil de communication du client
3. Charge le contexte recent (derniers echanges, dernieres demandes)
4. Genere un brouillon complet adapte :
```
Voici un brouillon pour Sandrine :

---
Objet : Votre devis est pret

Bonjour Sandrine,

J'ai le plaisir de vous informer que le devis pour l'ajout du module SMS a ete finalise. Vous le trouverez en piece jointe.

N'hesitez pas a me contacter si vous avez des questions.

Cordialement,
MiKL — MonprojetPro
---

J'ai utilise le ton "formel + vouvoiement" du profil de Sandrine. Tu veux modifier quelque chose ?
```
**And** le brouillon est affiche dans une bulle speciale avec les boutons :
- "Copier" — copie dans le presse-papier
- "Modifier" — MiKL peut demander des ajustements ("Plus court", "Ajoute une mention sur le delai")
- "Envoyer" — si c'est un message chat, possibilite d'envoyer directement via le module chat (Epic 3)
**And** les brouillons generes sont stockes dans `elio_messages.metadata.draft_type: 'email' | 'validation_hub' | 'chat'`

**Given** MiKL demande des ajustements sur un brouillon
**When** il ecrit "Plus court" ou "Ajoute la date de livraison" ou "Passe au tutoiement"
**Then** Elio Hub regenere le brouillon en tenant compte de la modification demandee
**And** le nouveau brouillon remplace l'ancien dans la conversation (ou s'affiche en dessous avec mention "Version 2")
**And** le contexte de la conversation est conserve (Elio sait qu'on parle du meme brouillon)

---

## Story 8.7 : Elio One — Chat, FAQ, guidance dashboard & heritage Lab

As a **client One (etabli)**,
I want **converser avec Elio One qui repond a mes questions sur les fonctionnalites, me guide dans mon dashboard et connait mon historique Lab**,
So that **j'ai un assistant qui me connait et m'aide a utiliser efficacement mes outils metier**.

**Acceptance Criteria :**

**Given** un client One accede au module Elio dans son dashboard (FR44)
**When** le chat Elio One se charge
**Then** l'interface unifiee elio-chat.tsx s'affiche avec `dashboardType='one'` :
- Palette One : orange vif + bleu-gris (dark mode)
- Header : "Elio — Votre assistant" avec avatar Elio One
- Zone de chat avec historique
- Champ de saisie avec placeholder adapte au profil communication
- Panneau de conversations lateral (Story 8.2)
**And** le message d'accueil adapte au profil s'affiche :
- Si config custom (Story 6.6) : utilise `custom_prompts.greeting`
- Sinon : "Bonjour ! Je suis Elio, votre assistant. Comment puis-je vous aider ?" (vouvoiement par defaut)
**And** le first token de reponse apparait en moins de 3 secondes (NFR-P3)

**Given** le client One pose une question sur une fonctionnalite (FR45)
**When** il ecrit "Comment je cree un evenement ?" ou "A quoi sert le module calendrier ?"
**Then** Elio One repond en s'appuyant sur la documentation des modules actifs :
- Le system prompt inclut la documentation de chaque module actif du client (injectee par MiKL via FR43, Epic 10)
- La documentation suit la structure : description, parametres, questions_client_possibles, problemes_courants
- Elio repond avec des instructions claires et contextuelles
**And** si la question concerne un module non active, Elio repond : "Cette fonctionnalite n'est pas encore activee pour vous. Vous pouvez demander a MiKL de l'activer."

**Given** le client One demande de l'aide pour naviguer (FR46)
**When** il ecrit "Ou sont mes factures ?" ou "Comment je vois mes documents ?"
**Then** Elio One guide le client :
- Explication du chemin de navigation
- Description de ce qu'il va trouver a cet endroit
- Ton adapte au profil de communication
**And** le system prompt inclut une cartographie des modules et routes du dashboard One

**Given** un client a ete diplome du Lab vers One (FR51)
**When** il utilise Elio One pour la premiere fois
**Then** Elio One herite du contexte Lab :
1. Le profil de communication est deja en place (FR68, Story 8.4) — pas de rupture de ton
2. Les conversations Lab restent consultables (dans la liste des conversations, filtrees par `dashboard_type='lab'`, affichees dans une section "Historique Lab")
3. Les briefs Lab valides sont referenciables par Elio One : "D'apres votre brief sur le branding, vous aviez mentionne..."
4. Les decisions de MiKL pendant le Lab sont connues d'Elio One (integrees dans le system prompt via `parcours_context`)
**And** Elio One ne repose jamais les memes questions que pendant le Lab
**And** le ton est coherent avec celui utilise pendant le parcours Lab

**Given** le client One pose une question hors du perimetre d'Elio (fonctionnalite inexistante, question trop complexe)
**When** la confiance de la reponse est basse
**Then** Elio One propose l'escalade vers MiKL :
- "Je ne suis pas certain de pouvoir vous aider la-dessus. Voulez-vous que je transmette votre question a MiKL ?"
- Si le client accepte : une notification est envoyee a MiKL avec le contexte (question + historique recent)
**And** le meme mecanisme d'escalade que Story 6.4 (Lab) est reutilise

---

## Story 8.8 : Elio One — Collecte d'evolutions & soumission Validation Hub

As a **client One (etabli)**,
I want **qu'Elio One collecte mon besoin d'evolution en quelques questions et le soumette automatiquement a MiKL via le Validation Hub**,
So that **je peux demander de nouvelles fonctionnalites sans effort et sans sortir de ma conversation**.

**Acceptance Criteria :**

**Given** un client One exprime un besoin d'evolution via Elio (FR47)
**When** il ecrit "Je voudrais pouvoir envoyer des SMS de rappel" ou "On pourrait ajouter une fonction export Excel"
**Then** Elio One detecte l'intention d'evolution (mot-cles : "je voudrais", "on pourrait", "il faudrait", "ajouter", "nouveau") et passe en mode collecte :
1. **Question 1 (Clarification besoin)** : "D'accord, je comprends. Pouvez-vous me decrire plus precisement ce que vous attendez ? Par exemple, dans quel contexte vous utiliseriez cette fonction ?"
2. **Question 2 (Priorite)** : "Sur une echelle de 1 a 3, a quel point c'est urgent pour vous ? (1 = ce serait bien, 2 = ca me manque souvent, 3 = ca bloque mon activite)"
3. **Question 3 (optionnelle, si le besoin n'est pas clair)** : "Avez-vous un exemple concret d'un moment ou vous avez eu besoin de cette fonctionnalite ?"
**And** Elio pose les questions une a la fois, en attendant la reponse
**And** le nombre de questions est limite a 3 maximum (pas d'interrogatoire)
**And** le ton s'adapte au profil de communication du client

**Given** Elio One a collecte les reponses du client
**When** la collecte est terminee (2-3 questions posees)
**Then** Elio genere un mini-brief structure :
```
J'ai bien compris votre demande. Voici le resume que je vais envoyer a MiKL :

---
**Demande d'evolution : {titre auto-genere}**
- Besoin : {description structuree}
- Contexte : {reponse question 1}
- Priorite client : {1/2/3}
- Exemple concret : {reponse question 3 si posee}
---

Vous validez ? Je l'envoie a MiKL pour evaluation.
```
**And** le client peut valider ("Oui envoie") ou modifier ("Change le titre" / "Ajoute que...")

**Given** le client valide le mini-brief
**When** Elio One soumet la demande
**Then** les operations suivantes sont effectuees :
1. Un enregistrement est cree dans `validation_requests` avec :
   - type='evolution_one'
   - title={titre auto-genere}
   - content={mini-brief structure}
   - client_id, operator_id
   - status='pending'
2. Une notification est envoyee a MiKL : "Nouvelle demande d'evolution de {client} — {titre}"
3. Elio confirme au client : "C'est envoye ! MiKL va examiner votre demande et vous tiendra informe."
**And** le mini-brief est stocke dans `elio_messages.metadata.evolution_brief: true`
**And** le cache TanStack Query est invalide pour ['validation-requests']

**Given** le client veut annuler pendant la collecte
**When** il ecrit "Non laisse tomber" ou "En fait non"
**Then** Elio One sort du mode collecte : "Pas de souci ! N'hesitez pas si vous changez d'avis."
**And** aucune demande n'est creee dans validation_requests

**Given** Elio One detecte une demande d'evolution mais le besoin est deja couvert
**When** le LLM identifie que la fonctionnalite existe deja (dans la documentation modules actifs)
**Then** Elio One repond : "En fait, cette fonctionnalite existe deja ! Voici comment y acceder : {instructions}"
**And** aucune collecte d'evolution n'est lancee
**And** Elio bascule en mode FAQ/guidance (FR45, FR46)

---

## Story 8.9a : Elio One+ — Systeme de tiers & actions modules

As a **client One+**,
I want **qu'Elio One execute des actions sur mes modules actifs apres verification de mon tier d'abonnement**,
So that **Elio est un veritable co-pilote qui agit sur mes outils a ma demande**.

**Acceptance Criteria :**

**Given** le systeme de tiers Elio (One vs One+)
**When** un client One utilise Elio
**Then** le tier est determine par `client_configs.elio_tier` (valeurs : 'one' | 'one_plus', defaut : 'one')
**And** le system prompt de send-to-elio.ts adapte les capacites :
- **One** : FAQ, guidance, collecte d'evolutions uniquement
- **One+** : tout One + actions, generation, alertes
**And** si un client One tente une action One+, Elio repond :
"Cette fonctionnalite fait partie de l'offre Elio One+. Contactez MiKL pour en savoir plus !"
**And** le check de tier est effectue AVANT l'appel LLM (pas de gaspillage de tokens)

**Given** un client One+ demande une action sur un module actif (FR48)
**When** il ecrit "Envoie un rappel de cotisation aux membres en retard" ou "Cree un evenement pour samedi prochain"
**Then** Elio One+ :
1. Identifie le module cible (adhesions, evenements, etc.) et l'action demandee
2. Verifie que le module est actif pour ce client
3. **Demande TOUJOURS confirmation avant execution** :
```
Je vais envoyer un rappel de cotisation a 12 membres en retard de paiement.

Voici la liste :
- Dupont Marie (3 mois de retard)
- Martin Jean (1 mois de retard)
[...]

Vous confirmez l'envoi ? (Oui / Non / Modifier)
```
4. Sur confirmation, execute l'action via la Server Action du module concerne
5. Confirme l'execution : "C'est fait ! 12 rappels envoyes. Vous serez notifie des reponses."
**And** l'action est logguee dans `activity_logs` avec l'acteur 'elio_one_plus'
**And** les actions destructives (suppression, envoi masse) necessitent une double confirmation
**And** si l'action echoue, un message d'erreur clair est affiche avec option de reessayer

---

## Story 8.9b : Elio One+ — Generation de documents

As a **client One+**,
I want **qu'Elio genere des documents (attestations, recapitulatifs, exports) a ma demande**,
So that **je gagne du temps sur les taches administratives repetitives**.

**Acceptance Criteria :**

**Given** un client One+ demande la generation d'un document (FR49)
**When** il ecrit "Genere une attestation de presence pour Marie Dupont" ou "Cree un recapitulatif des evenements du mois"
**Then** Elio One+ :
1. Collecte les informations manquantes (si besoin, 1-2 questions max)
2. Genere le document via le LLM (contenu structure)
3. Affiche le document dans le chat via elio-document.tsx (Story 8.3, FR125)
4. Propose les actions : "Telecharger en PDF" / "Enregistrer dans vos documents" / "Envoyer par email"
**And** le document est cree dans la table `documents` avec source='elio_generated'
**And** le document est lie a la conversation via `elio_messages.metadata.document_id`

---

## Story 8.9c : Elio One+ — Alertes proactives

As a **client One+**,
I want **qu'Elio m'alerte proactivement quand quelque chose requiert mon attention**,
So that **je suis informe en temps reel sans avoir a surveiller moi-meme tous mes indicateurs**.

**Acceptance Criteria :**

**Given** le systeme d'alertes proactives Elio One+ (FR50)
**When** des conditions specifiques sont detectees
**Then** Elio One+ envoie des alertes proactives au client :
- **Alertes basees sur les donnees** : "3 feuilles d'emargement manquent pour les cours d'hier" / "Vous avez 5 cotisations impayees depuis plus de 30 jours"
- **Alertes basees sur le calendrier** : "Rappel : evenement 'Assemblee Generale' dans 2 jours — 12 inscrits" / "Votre abonnement MonprojetPro est renouvele dans 7 jours"
- **Alertes basees sur l'activite** : "Vous n'avez pas publie de contenu depuis 2 semaines"
**And** les alertes sont implementees via un systeme de regles configurables :
```typescript
type ProactiveAlert = {
  id: string
  moduleId: string
  condition: string          // SQL-like condition evaluated periodically
  message: string            // Template de message avec variables
  frequency: 'daily' | 'weekly' | 'on_event'
  lastTriggered: string | null
}
```
**And** les alertes sont evaluees par une Supabase Edge Function (cron job quotidien)
**And** les alertes generent une notification in-app de type 'alert' ET un message dans la conversation Elio One
**And** le client peut desactiver une alerte specifique : "Arrete de me rappeler pour les feuilles d'emargement"
**And** les preferences d'alertes sont stockees dans `client_configs.elio_alerts_preferences`

**Given** les alertes proactives sont evaluees
**When** le cron job s'execute (quotidien, 8h00)
**Then** pour chaque client One+ :
1. Les regles d'alerte actives sont evaluees contre les donnees Supabase
2. Les alertes declenchees sont envoyees comme messages Elio + notifications
3. Le `lastTriggered` est mis a jour pour eviter les doublons
**And** le cron job est une Supabase Edge Function planifiee
**And** les alertes sont limitees a 3 par jour par client (anti-spam)

---

## Resume Epic 8 — Couverture FRs

| Story | Titre | FRs couvertes |
|-------|-------|---------------|
| 8.1 | Consolidation infrastructure Elio — module unifie & gestion erreurs | FR83, FR122 |
| 8.2 | Conversations Elio — liste, commutation & historique persistant | FR123, FR124 |
| 8.3 | Feedback reponses, documents dans le chat & historique configs | FR87, FR125, FR126 |
| 8.4 | Profil de communication — stockage, affinement & transmission | FR66, FR67, FR68, FR69 |
| 8.5 | Elio Hub — chat MiKL, aide fonctionnalites & recherche client | FR21, FR22, FR23 |
| 8.6 | Elio Hub — correction redaction & generation brouillons | FR24, FR25 |
| 8.7 | Elio One — chat, FAQ, guidance & heritage Lab | FR44, FR45, FR46, FR51 |
| 8.8 | Elio One — collecte d'evolutions & soumission Validation Hub | FR47 |
| 8.9a | Elio One+ — systeme de tiers & actions modules | FR48 |
| 8.9b | Elio One+ — generation de documents | FR49 |
| 8.9c | Elio One+ — alertes proactives | FR50 |

**Toutes les 24 FRs de l'Epic 8 sont couvertes.**

---
