# Epic 7 : Validation Hub — Stories detaillees

**Objectif :** MiKL examine, valide ou refuse les soumissions clients (briefs Lab, evolutions One) via un workflow structure avec contexte complet, choix d'actions de traitement et notifications automatiques au client.

**FRs couverts:** FR8, FR9, FR10, FR11, FR12, FR13, FR14

**NFRs pertinentes:** NFR-P1, NFR-P2, NFR-P5, NFR-S7, NFR-A1 a NFR-A4, NFR-M1 a NFR-M5

**Note architecturale :** La table `validation_requests` et ses policies RLS ont ete creees dans Story 6.3 (migration 00010_validation_requests.sql). Cet epic construit le module `modules/validation-hub/` cote Hub (targets: ['hub']) avec les composants, hooks, server actions et types necessaires. L'infrastructure de notifications (table `notifications`, Supabase Realtime) provient de l'Epic 3. L'Epic 7 cree les Server Actions qui declenchent les changements de statut et les notifications associees.

---

## Story 7.1 : Module Validation Hub — Structure, types & file d'attente des demandes

As a **MiKL (operateur)**,
I want **voir la liste des demandes en attente de validation avec des filtres et une vue claire des priorites**,
So that **je peux traiter efficacement les soumissions de mes clients sans en oublier**.

**Acceptance Criteria :**

**Given** le module Validation Hub n'existe pas encore
**When** le module est cree
**Then** la structure suivante est en place :
```
modules/validation-hub/
  index.ts                    # Export public du module
  manifest.ts                 # { id: 'validation-hub', name: 'Validation Hub', targets: ['hub'], dependencies: ['crm', 'notifications'] }
  components/
    validation-queue.tsx      # File d'attente des demandes
  hooks/
    use-validation-queue.ts   # Hook TanStack Query
  actions/
    (vide pour l'instant)
  types/
    validation.types.ts       # Types TypeScript
```
**And** le manifest est enregistre dans le module registry (DB + registre local)
**And** le module est accessible depuis la navigation sidebar du Hub

**Given** les types du Validation Hub
**When** validation.types.ts est cree
**Then** les types suivants sont definis :
```typescript
type ValidationRequestType = 'brief_lab' | 'evolution_one'
type ValidationRequestStatus = 'pending' | 'approved' | 'rejected' | 'needs_clarification'

type ValidationRequest = {
  id: string
  clientId: string
  operatorId: string
  parcoursId: string | null
  stepId: string | null
  type: ValidationRequestType
  title: string
  content: string
  documentIds: string[]
  status: ValidationRequestStatus
  reviewerComment: string | null
  submittedAt: string
  reviewedAt: string | null
  createdAt: string
  updatedAt: string
  // Relations jointes
  client?: ClientSummary
}

type ClientSummary = {
  id: string
  name: string
  company: string | null
  clientType: string
  avatarUrl: string | null
}

type ValidationQueueFilters = {
  status: ValidationRequestStatus | 'all'
  type: ValidationRequestType | 'all'
  sortBy: 'submitted_at' | 'client_name'
  sortOrder: 'asc' | 'desc'
}
```
**And** les types sont exportes depuis @monprojetpro/types si le pattern du projet l'exige, sinon depuis le module local

**Given** le hook use-validation-queue est cree
**When** il est utilise dans un composant
**Then** il expose :
- `requests`: liste des ValidationRequest avec les donnees client jointes
- `filters` / `setFilters`: gestion des filtres actifs
- `isLoading`, `error`: etats de chargement
- `pendingCount`: nombre de demandes en attente (pour badge navigation)
**And** la requete Supabase joint `validation_requests` avec `clients` (select client: clients(id, name, company, client_type, avatar_url))
**And** le hook utilise TanStack Query avec une queryKey `['validation-requests', filters]`
**And** le staleTime est configure a 30 secondes (les demandes peuvent arriver a tout moment)

**Given** MiKL accede au module Validation Hub (FR8)
**When** la page se charge
**Then** le composant `validation-queue.tsx` affiche :
- Un header "Validation Hub" avec le compteur de demandes en attente
- Des filtres : statut (Tous, En attente, Approuve, Refuse, Precisions demandees), type (Tous, Brief Lab, Evolution One)
- La liste des demandes sous forme de cartes avec pour chaque demande :
  - Avatar + nom du client + entreprise
  - Type de demande (badge colore : "Brief Lab" en terracotta, "Evolution One" en orange)
  - Titre de la demande
  - Date de soumission (format relatif : "il y a 2h", "hier")
  - Statut actuel (badge : pending=jaune, approved=vert, rejected=rouge, needs_clarification=bleu)
**And** les demandes sont triees par defaut : en attente en premier, puis par date de soumission (les plus anciennes en haut)
**And** la page se charge en moins de 2 secondes (NFR-P1)
**And** le design suit le theme "Minimal Futuriste" dark mode du Hub

**Given** il n'y a aucune demande en attente
**When** MiKL ouvre le Validation Hub
**Then** un etat vide s'affiche avec un message "Aucune demande en attente — tout est a jour !" et une icone appropriee

**Given** MiKL clique sur une demande dans la file
**When** la navigation s'effectue
**Then** il est redirige vers la page de detail de la demande (route : `/modules/validation-hub/[requestId]`)
**And** la transition est fluide (< 500ms, NFR-P2)

---

## Story 7.2 : Vue detaillee d'une demande avec contexte complet

As a **MiKL (operateur)**,
I want **consulter le contexte complet d'une demande de validation (besoin, historique client, priorite, documents joints)**,
So that **je peux prendre une decision eclairee sans avoir a chercher les informations ailleurs**.

**Acceptance Criteria :**

**Given** MiKL clique sur une demande dans la file d'attente (Story 7.1)
**When** la page de detail s'affiche (request-detail.tsx) (FR9)
**Then** la vue est organisee en sections claires :

**Section 1 — En-tete de la demande :**
- Titre de la demande
- Badge type (Brief Lab / Evolution One)
- Badge statut actuel
- Date de soumission (format complet)
- Bouton retour vers la file d'attente

**Section 2 — Informations client :**
- Avatar, nom, entreprise du client
- Type de client (Complet, Direct One, Ponctuel)
- Lien "Voir la fiche client" qui ouvre le CRM (module crm, Epic 2)
- Si type='brief_lab' : etape du parcours Lab associee (nom + numero)

**Section 3 — Contenu de la demande :**
- Le besoin exprime (champ `content` de validation_requests)
- Les documents joints (liste cliquable, ouvre le document via le module documents, Epic 4)
- Si Elio a pre-qualifie : contexte collecte (questions/reponses, priorite estimee)

**Section 4 — Historique pertinent :**
- Dernieres demandes du meme client (3 max, avec statut)
- Derniers messages chat echanges avec ce client (3 max, resumes)
- Si brief Lab : progression du parcours (barre de progression, etape actuelle)

**And** chaque section utilise un composant Card avec le design system du Hub
**And** la page est responsive (colonne unique sur mobile, 2 colonnes sur desktop)
**And** les donnees sont chargees via TanStack Query avec les jointures necessaires

**Given** la demande a un historique d'echanges (statut='needs_clarification' avec des allers-retours)
**When** MiKL consulte le detail
**Then** une section "Echanges" affiche la chronologie des actions :
- "[date] MiKL a demande des precisions : {commentaire}"
- "[date] Le client a re-soumis avec : {nouveau contenu}"
**And** les echanges sont affiches en ordre chronologique

**Given** le contexte est charge
**When** MiKL a lu le detail
**Then** les boutons d'action sont visibles en bas de page (zone fixe sticky) :
- "Valider" (vert)
- "Refuser" (rouge)
- "Demander des precisions" (bleu)
- "Actions de traitement" (dropdown, gris)
**And** les boutons sont desactives si le statut n'est pas 'pending' ou 'needs_clarification' (sauf pour les actions de traitement qui restent actives sur 'approved')

---

## Story 7.3 : Validation & refus de demande avec commentaire

As a **MiKL (operateur)**,
I want **valider ou refuser une demande avec un commentaire optionnel (validation) ou obligatoire (refus)**,
So that **le client sait clairement si son travail est accepte ou ce qu'il doit modifier**.

**Acceptance Criteria :**

**Given** MiKL consulte une demande en statut 'pending' ou 'needs_clarification' (Story 7.2)
**When** il clique sur "Valider" (FR10)
**Then** une modale de confirmation s'affiche avec :
- Resume de la demande (titre, client, type)
- Champ commentaire optionnel (textarea, placeholder: "Commentaire pour le client (optionnel)")
- Boutons "Confirmer la validation" / "Annuler"

**Given** MiKL confirme la validation
**When** la Server Action `approveRequest(requestId, comment?)` s'execute (approve-request.ts)
**Then** les operations suivantes sont effectuees dans une transaction Supabase :
1. `validation_requests.status` → 'approved'
2. `validation_requests.reviewer_comment` → commentaire (si fourni)
3. `validation_requests.reviewed_at` → NOW()
4. Si type='brief_lab' ET parcours_id + step_id non null :
   - L'etape correspondante dans `parcours.active_steps` passe a 'completed' (avec `completed_at: NOW()`)
   - Le `current_step_id` avance a l'etape suivante active (si elle existe)
   - Si c'etait la derniere etape : `parcours.status` → 'completed', `parcours.completed_at` → NOW()
5. Une notification est creee pour le client (FR14) : type='validation', titre="Votre demande '{titre}' a ete validee !", body=commentaire si present, link="/modules/parcours-lab" (si brief_lab)
**And** l'action repond en moins de 500ms (NFR-P2)
**And** un toast confirme "Demande validee avec succes"
**And** le cache TanStack Query est invalide pour ['validation-requests'] ET ['parcours', clientId] (si applicable)
**And** MiKL est redirige vers la file d'attente

**Given** MiKL clique sur "Refuser" (FR11)
**When** la modale de refus s'affiche
**Then** elle contient :
- Resume de la demande (titre, client, type)
- Champ commentaire obligatoire (textarea, placeholder: "Expliquez au client ce qui doit etre modifie...")
- Validation : minimum 10 caracteres
- Boutons "Confirmer le refus" / "Annuler"
**And** le bouton "Confirmer le refus" est desactive tant que le commentaire n'a pas 10 caracteres minimum

**Given** MiKL confirme le refus avec un commentaire
**When** la Server Action `rejectRequest(requestId, comment)` s'execute (reject-request.ts)
**Then** les operations suivantes sont effectuees :
1. `validation_requests.status` → 'rejected'
2. `validation_requests.reviewer_comment` → commentaire
3. `validation_requests.reviewed_at` → NOW()
4. Une notification est creee pour le client (FR14) : type='validation', titre="MiKL a demande des modifications sur '{titre}'", body=commentaire, link="/modules/parcours-lab" (si brief_lab)
**And** un toast confirme "Demande refusee — le client a ete notifie"
**And** le cache TanStack Query est invalide
**And** MiKL est redirige vers la file d'attente

**Given** une erreur survient pendant l'action (ex : probleme reseau)
**When** la Server Action echoue
**Then** un message d'erreur clair s'affiche dans un toast : "Erreur lors du traitement — veuillez reessayer"
**And** le statut de la demande n'a pas change (transaction rollback)
**And** les boutons d'action restent actifs pour retenter

---

## Story 7.4 : Demande de precisions sur une soumission

As a **MiKL (operateur)**,
I want **demander des precisions au client sur une soumission avant de la valider ou la refuser**,
So that **je peux obtenir les informations manquantes sans bloquer le processus**.

**Acceptance Criteria :**

**Given** MiKL consulte une demande en statut 'pending' (Story 7.2)
**When** il clique sur "Demander des precisions" (FR12)
**Then** une modale s'affiche avec :
- Resume de la demande (titre, client)
- Champ question/commentaire obligatoire (textarea, placeholder: "Quelle information vous manque ?")
- Validation : minimum 10 caracteres
- Suggestions rapides (chips cliquables) : "Pouvez-vous detailler le besoin ?", "Avez-vous un exemple concret ?", "Quel est le budget envisage ?"
- Boutons "Envoyer la question" / "Annuler"

**Given** MiKL envoie sa question
**When** la Server Action `requestClarification(requestId, comment)` s'execute (request-clarification.ts)
**Then** les operations suivantes sont effectuees :
1. `validation_requests.status` → 'needs_clarification'
2. `validation_requests.reviewer_comment` → commentaire de MiKL
3. `validation_requests.reviewed_at` → NOW()
4. Une notification est creee pour le client (FR14) : type='validation', titre="MiKL a une question sur '{titre}'", body=commentaire, link="/modules/parcours-lab" (si brief_lab)
**And** un toast confirme "Question envoyee au client"
**And** le cache TanStack Query est invalide
**And** MiKL est redirige vers la file d'attente

**Given** le client repond a la demande de precisions (via re-soumission cote Lab/One)
**When** le client re-soumet avec du contenu mis a jour
**Then** la `validation_request` est mise a jour avec :
- `content` → nouveau contenu
- `status` → 'pending' (retour en attente)
- `updated_at` → NOW()
**And** une notification est envoyee a MiKL : "Le client {nom} a repondu a votre question sur '{titre}'"
**And** la demande remonte dans la file d'attente de MiKL

**Given** MiKL a deja demande des precisions sur une demande
**When** il consulte cette demande une deuxieme fois
**Then** l'historique des echanges est visible dans la section "Echanges" (Story 7.2) :
- Le commentaire de MiKL avec la date
- La reponse du client (si presente)
**And** MiKL peut a nouveau valider, refuser ou redemander des precisions

---

## Story 7.5 : Actions de traitement — workflows post-decision

As a **MiKL (operateur)**,
I want **choisir une action de traitement specifique apres examen d'une demande (reactiver Lab, programmer visio, dev direct, reporter)**,
So that **je peux orienter chaque demande vers le workflow le plus adapte**.

**Acceptance Criteria :**

**Given** MiKL consulte une demande de validation (Story 7.2)
**When** il clique sur le bouton "Actions de traitement" (dropdown)
**Then** le composant `action-picker.tsx` s'affiche avec 4 options (FR13) :

**Option A — Reactiver Lab :**
- Icone + label "Reactiver le parcours Lab"
- Description : "Le besoin est trop complexe — le client doit passer par un parcours complet"
- Disponible uniquement si le client a un parcours Lab existant (parcours_id non null)

**Option B — Programmer Visio :**
- Icone + label "Programmer une visio"
- Description : "Besoin de clarifier en direct avec le client"
- Ouvre le formulaire de prise de RDV Cal.com (integration module agenda, Epic 5)

**Option C — Dev direct :**
- Icone + label "Developper directement"
- Description : "Le besoin est clair — je le developpe"
- Affiche un lien "Ouvrir le dossier BMAD dans Cursor" (FR7, Epic 2)

**Option D — Reporter :**
- Icone + label "Reporter"
- Description : "Pas maintenant — a traiter plus tard"
- Affiche un champ date optionnel (rappel) et un champ raison

**Given** MiKL selectionne "Reactiver Lab" (option A)
**When** il confirme l'action
**Then** les operations suivantes sont effectuees :
1. La demande est marquee 'approved' (car le besoin est reconnu)
2. Le `reviewer_comment` est mis a jour avec "Besoin redirige vers le parcours Lab"
3. Si le parcours etait en status 'completed' ou 'suspended' : il est reactive (status → 'in_progress')
4. Une notification est envoyee au client : "MiKL a examine votre demande — un accompagnement Lab va etre mis en place"
**And** un toast confirme "Parcours Lab reactive"

**Given** MiKL selectionne "Programmer Visio" (option B)
**When** il confirme l'action
**Then** :
1. La demande reste en statut 'pending' (en attente de la visio)
2. Le `reviewer_comment` est mis a jour avec "Visio a programmer"
3. Le formulaire de prise de RDV Cal.com s'ouvre (pre-rempli avec le client)
4. Une notification est envoyee au client : "MiKL souhaite en discuter en visio — un RDV va etre propose"
**And** l'integration avec le module agenda (Epic 5) est utilisee

**Given** MiKL selectionne "Dev direct" (option C)
**When** il confirme l'action
**Then** :
1. La demande est marquee 'approved'
2. Le `reviewer_comment` est mis a jour avec "Pris en charge — developpement direct"
3. Le lien vers le dossier BMAD/Cursor du client est affiche (construit depuis `clients.bmad_project_path` si disponible, sinon message informatif)
4. Une notification est envoyee au client : "Votre demande '{titre}' est prise en charge par MiKL"
**And** un toast confirme "Demande prise en charge — bon dev !"

**Given** MiKL selectionne "Reporter" (option D)
**When** il confirme l'action avec une raison optionnelle et une date de rappel optionnelle
**Then** :
1. La demande reste en statut 'pending' mais le `reviewer_comment` est mis a jour avec "Reporte : {raison}"
2. Si une date de rappel est fournie : un rappel est cree dans le systeme de notifications (notification future avec `created_at` = date de rappel, type='system', titre="Rappel : demande '{titre}' de {client} a traiter")
3. Aucune notification n'est envoyee au client (le report est interne)
**And** un toast confirme "Demande reportee"
**And** la demande reste visible dans la file avec une indication visuelle "Reportee"

**Given** MiKL selectionne une action de traitement
**When** l'action est executee
**Then** le cache TanStack Query est invalide pour toutes les queries impactees
**And** l'historique de la demande est mis a jour avec l'action choisie
**And** MiKL est redirige vers la file d'attente

---

## Story 7.6 : Temps reel, compteur de demandes & abonnement Realtime

As a **MiKL (operateur)**,
I want **voir les nouvelles demandes apparaitre en temps reel et avoir un compteur visible dans la navigation**,
So that **je ne rate aucune demande urgente et je sais toujours combien de soumissions m'attendent**.

**Acceptance Criteria :**

**Given** le module Validation Hub est charge dans le Hub
**When** MiKL est connecte
**Then** un abonnement Supabase Realtime est cree sur la table `validation_requests` :
- Canal : `validation-requests-operator-{operatorId}`
- Filtre : `operator_id=eq.{operatorId}`
- Evenements ecoutes : INSERT, UPDATE
**And** l'abonnement est gere dans le hook `use-validation-queue.ts` (ou un hook dedie `use-validation-realtime.ts`)
**And** l'abonnement est nettoye proprement au demontage du composant (cleanup)

**Given** un nouveau brief Lab ou evolution One est soumis par un client
**When** l'evenement INSERT arrive via Realtime
**Then** :
- Le cache TanStack Query est invalide automatiquement (invalidateQueries(['validation-requests']))
- La liste se met a jour sans rechargement de page
- Une notification toast apparait : "Nouvelle demande de {client} — {titre}"
**And** la notification apparait en moins de 2 secondes (NFR-P5)

**Given** le statut d'une demande change (par un autre onglet, un trigger, ou une re-soumission client)
**When** l'evenement UPDATE arrive via Realtime
**Then** le cache TanStack Query est invalide et la liste se met a jour
**And** si le changement est une re-soumission client (status passe de 'needs_clarification' a 'pending') : un toast specifique "Le client {nom} a repondu a votre question"

**Given** la sidebar du Hub affiche le module Validation Hub
**When** des demandes sont en statut 'pending'
**Then** un badge numerique s'affiche a cote de l'icone "Validation Hub" dans la navigation :
- Couleur rouge si >= 1 demande en attente
- Nombre affiche (ex: "3")
- Le badge se met a jour en temps reel grace a l'abonnement Realtime
**And** le compteur est calcule via le `pendingCount` du hook (ou un hook leger dedie pour la sidebar)
**And** le badge disparait quand toutes les demandes sont traitees

**Given** la vue matinale de MiKL (workflow quotidien)
**When** MiKL arrive sur le dashboard Hub (accueil)
**Then** un widget "Validations en attente" est affiche dans la section "Actions prioritaires" :
- Nombre de demandes en attente
- Derniere demande recue (titre + client + date)
- Lien "Voir toutes les demandes" vers le Validation Hub
**And** ce widget utilise le meme hook `use-validation-queue` avec le filtre status='pending'

---

## Resume Epic 7 — Couverture FRs

| Story | Titre | FRs couvertes |
|-------|-------|---------------|
| 7.1 | Module Validation Hub — structure, types & file d'attente | FR8 |
| 7.2 | Vue detaillee d'une demande avec contexte complet | FR9 |
| 7.3 | Validation & refus de demande avec commentaire | FR10, FR11, FR14 (partiel) |
| 7.4 | Demande de precisions sur une soumission | FR12, FR14 (partiel) |
| 7.5 | Actions de traitement — workflows post-decision | FR13 |
| 7.6 | Temps reel, compteur de demandes & abonnement Realtime | FR14 (completion) |

**Toutes les 7 FRs de l'Epic 7 sont couvertes.**

---
