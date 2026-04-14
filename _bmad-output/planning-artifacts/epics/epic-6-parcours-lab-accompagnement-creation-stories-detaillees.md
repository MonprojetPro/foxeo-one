# Epic 6 : Parcours Lab — Accompagnement Creation — Stories detaillees

**Objectif :** Les clients en creation suivent un parcours structure guide par Elio Lab, qui pose les questions, genere et soumet les briefs automatiquement au Validation Hub.

**FRs couverts:** FR26, FR27, FR28, FR29, FR30, FR31, FR32, FR33, FR34, FR35, FR36, FR37

**NFRs pertinentes:** NFR-P1, NFR-P3, NFR-I2, NFR-S7, NFR-A1 a NFR-A4, NFR-M1 a NFR-M5

**Note architecturale :** Cet epic cree le module parcours-lab (parcours, progression, briefs) ET le comportement specifique d'Elio Lab (conversation guidee, generation de briefs, soumission auto). L'infrastructure Elio partagee (historique persistant, indicateur de reflexion, feedback) sera consolidee dans l'Epic 8. L'interface de chat Elio Lab creee ici sera enrichie en Epic 8.

---

## Story 6.1 : Module Parcours Lab — Migration, structure, vue parcours & progression

As a **client Lab**,
I want **voir mon parcours assigne avec les etapes actives et ma progression**,
So that **je sais exactement ou j'en suis et ce qu'il me reste a accomplir**.

**Acceptance Criteria :**

**Given** les besoins en donnees de cette story
**When** la migration 00009_parcours.sql est executee
**Then** la table `parcours_templates` est creee avec : id (UUID PK), operator_id (FK operators NOT NULL), name (TEXT NOT NULL), description (TEXT), steps (JSONB NOT NULL — tableau d'objets {id, title, description, order, default_active}), created_at (TIMESTAMP DEFAULT NOW()), updated_at (TIMESTAMP DEFAULT NOW())
**And** la table `parcours` est creee avec : id (UUID PK), client_id (FK clients NOT NULL UNIQUE), operator_id (FK operators NOT NULL), template_id (FK parcours_templates NOT NULL), active_steps (JSONB NOT NULL — tableau d'objets {step_id, status: 'pending'|'in_progress'|'completed'|'skipped', started_at, completed_at}), current_step_id (TEXT nullable), status (TEXT CHECK IN ('not_started', 'in_progress', 'completed', 'suspended', 'abandoned') DEFAULT 'not_started'), started_at (TIMESTAMP nullable), completed_at (TIMESTAMP nullable), created_at (TIMESTAMP DEFAULT NOW()), updated_at (TIMESTAMP DEFAULT NOW())
**And** les policies RLS :
- `parcours_select_owner` : un client ne voit que son propre parcours
- `parcours_select_operator` : un operateur voit les parcours de ses clients
- `parcours_templates_select_operator` : un operateur voit ses templates

**Given** le module Parcours Lab n'existe pas encore
**When** la story est completee
**Then** le module `packages/modules/parcours-lab/` est structure :
- `manifest.ts` avec id: `parcours-lab`, targets: `['client-lab']`, requiredTables: `['parcours', 'parcours_templates']`
- `components/` : parcours-progress.tsx, etape-detail.tsx
- `hooks/` : use-parcours.ts
- `actions/` : (vide pour l'instant, les actions viennent dans les stories suivantes)
- `types/` : parcours.types.ts
- `index.ts` barrel export

**Given** un client Lab authentifie accede a son dashboard
**When** il accede au module Parcours Lab (`/modules/parcours-lab`)
**Then** la page affiche son parcours assigne avec (FR26) :
- Titre du parcours (issu du template)
- Liste des etapes actives avec leur statut (a faire, en cours, terminee)
- L'etape courante est mise en evidence visuellement
**And** les donnees sont fetches via TanStack Query avec queryKey `['parcours', clientId]`
**And** un skeleton loader s'affiche pendant le chargement
**And** la densite est `spacious` (palette Lab Violet/Purple sur fond #020402)

**Given** le parcours du client est charge
**When** la progression est calculee (FR27)
**Then** une barre de progression globale s'affiche en haut : "Etape X sur Y — Z% complete"
**And** chaque etape affiche un indicateur individuel (icone check, en cours, a faire)
**And** la progression est calculee : (etapes completees / etapes actives totales) * 100
**And** quand une etape est completee, une micro-celebration s'affiche (animation subtile, message encourageant)

---

## Story 6.2 : Consultation des briefs par etape & teasing MonprojetPro One

As a **client Lab**,
I want **consulter les briefs produits a chaque etape et voir un apercu motivant de MonprojetPro One**,
So that **je retrouve facilement mes livrables et je suis motive pour avancer vers la graduation**.

**Acceptance Criteria :**

**Given** un client Lab consulte son parcours
**When** il clique sur une etape completee ou en cours (FR28)
**Then** le detail de l'etape s'affiche (etape-detail.tsx) avec :
- Titre et description de l'etape
- Statut actuel (en cours, terminee)
- Brief(s) produit(s) a cette etape (lien vers les documents du module Documents)
- Date de debut et de completion (si terminee)
**And** les briefs sont recuperes depuis la table `documents` filtres par client_id et tag d'etape
**And** un clic sur un brief ouvre le viewer HTML (Story 4.2)

**Given** un client Lab n'a pas encore produit de brief pour une etape
**When** il consulte le detail de l'etape
**Then** un etat vide s'affiche avec le message "Discutez avec Elio pour commencer cette etape" et un CTA vers le chat Elio Lab

**Given** un client Lab navigue dans son espace
**When** il consulte la section "Teasing MonprojetPro One" (FR31)
**Then** un encart ou une section dediee presente MonprojetPro One de maniere attractive :
- Titre "Votre futur espace professionnel"
- 3-4 fonctionnalites cles de One (modules, outils metier, autonomie)
- Visuels teasing (screenshots ou illustrations style One)
- Message motivant lie a la progression ("Plus que X etapes avant votre graduation !")
**And** le composant one-teasing.tsx est utilise
**And** le teasing est affiche en bas de la page parcours ou dans un onglet dedie
**And** le contenu est statique (composant React, pas de donnees dynamiques)

---

## Story 6.3 : Soumission de brief pour validation & notifications

As a **client Lab**,
I want **soumettre un brief a MiKL pour validation et etre notifie du resultat**,
So that **je sais quand mon travail est valide et que je peux passer a l'etape suivante**.

**Acceptance Criteria :**

**Given** les besoins en donnees de cette story
**When** la migration 00010_validation_requests.sql est executee
**Then** la table `validation_requests` est creee avec : id (UUID PK), client_id (FK clients NOT NULL), operator_id (FK operators NOT NULL), parcours_id (FK parcours nullable), step_id (TEXT nullable), type (TEXT CHECK IN ('brief_lab', 'evolution_one') NOT NULL), title (TEXT NOT NULL), content (TEXT NOT NULL), document_ids (UUID[] DEFAULT ARRAY[]::UUID[]), status (TEXT CHECK IN ('pending', 'approved', 'rejected', 'needs_clarification') DEFAULT 'pending'), reviewer_comment (TEXT nullable), submitted_at (TIMESTAMP DEFAULT NOW()), reviewed_at (TIMESTAMP nullable), created_at (TIMESTAMP DEFAULT NOW()), updated_at (TIMESTAMP DEFAULT NOW())
**And** les policies RLS :
- `validation_requests_select_owner` : un client ne voit que ses propres soumissions
- `validation_requests_select_operator` : un operateur voit les soumissions de ses clients
- `validation_requests_insert_authenticated` : un client peut soumettre

**Given** un client Lab a travaille sur un brief (via Elio ou manuellement)
**When** il clique sur "Soumettre a MiKL" depuis le detail de l'etape (brief-submit.tsx) (FR29)
**Then** un formulaire de soumission s'affiche avec :
- Titre du brief (pre-rempli avec le nom de l'etape)
- Contenu/resume (pre-rempli si genere par Elio, editable)
- Documents joints (selection parmi les documents de l'etape)
- Bouton "Soumettre pour validation"
**And** le formulaire utilise react-hook-form avec validation Zod

**Given** le client soumet le brief
**When** la Server Action `submitBrief()` s'execute
**Then** un enregistrement est cree dans `validation_requests` avec type='brief_lab', parcours_id et step_id
**And** le statut de l'etape dans `parcours.active_steps` passe a 'in_progress' (si pas deja)
**And** une notification est envoyee a MiKL (type: 'validation', titre: "Nouveau brief a valider de {client}")
**And** un toast confirme "Brief soumis pour validation"
**And** le cache TanStack Query est invalide

**Given** MiKL valide ou refuse le brief (via Validation Hub — Epic 7)
**When** le statut de la validation_request change
**Then** une notification est envoyee au client (FR30) :
- Si approuve : "Votre brief '{titre}' a ete valide par MiKL !" avec lien vers l'etape
- Si refuse : "MiKL a demande des modifications sur '{titre}'" avec le commentaire de MiKL
- Si demande de precisions : "MiKL a une question sur '{titre}'" avec le commentaire
**And** la notification apparait en temps reel (Supabase Realtime)

**Given** un brief est valide (status='approved')
**When** le statut est mis a jour
**Then** l'etape correspondante dans `parcours.active_steps` passe a 'completed'
**And** le `current_step_id` avance a l'etape suivante (si elle existe)
**And** la barre de progression se met a jour
**And** une micro-celebration s'affiche au client lors de sa prochaine visite

**Given** toutes les etapes du parcours sont completees
**When** la derniere etape est validee
**Then** le statut du parcours passe a 'completed'
**And** une notification speciale est envoyee au client ("Felicitations ! Votre parcours est termine !")
**And** MiKL est notifie ("Le client {nom} a termine son parcours Lab — pret pour la graduation")

---

> **Prerequis :** Story 8.1 (architecture Elio unifiee) doit etre implementee avant les Stories 6.4-6.6. Les stories ci-dessous construisent les fonctionnalites Lab-specifiques sur le module unifie `modules/elio/` cree en Story 8.1.

## Story 6.4 : Elio Lab — Conversation guidee & adaptation au profil communication

As a **client Lab**,
I want **converser avec Elio Lab qui me pose les bonnes questions selon mon etape active et adapte son ton a mon profil**,
So that **je suis guide naturellement dans mon parcours sans me sentir perdu**.

**Acceptance Criteria :**

**Given** les besoins en donnees de cette story
**When** la migration 00011_elio_conversations.sql est executee
**Then** la table `elio_conversations` est creee avec : id (UUID PK), client_id (FK clients NOT NULL), operator_id (FK operators NOT NULL), dashboard_type (TEXT CHECK IN ('lab', 'one', 'hub') NOT NULL), title (TEXT DEFAULT 'Nouvelle conversation'), created_at (TIMESTAMP DEFAULT NOW()), updated_at (TIMESTAMP DEFAULT NOW())
**And** la table `elio_messages` est creee avec : id (UUID PK), conversation_id (FK elio_conversations NOT NULL), role (TEXT CHECK IN ('user', 'assistant', 'system') NOT NULL), content (TEXT NOT NULL), metadata (JSONB nullable — pour les briefs generes, actions, etc.), created_at (TIMESTAMP DEFAULT NOW())
**And** les policies RLS :
- `elio_conversations_select_owner` : un client ne voit que ses propres conversations
- `elio_messages_select_owner` : un client ne voit que les messages de ses conversations
- MiKL n'a PAS acces aux conversations Elio (conformement a la spec UX)

**Given** un client Lab accede au chat Elio
**When** la conversation se charge (FR32)
**Then** l'interface de chat Elio s'affiche avec :
- Historique de la conversation en cours
- Champ de saisie pour ecrire
- Avatar Elio distinctif (different du Chat MiKL)
- Indicateur que c'est un chat IA ("Elio — Votre assistant IA")
**And** la conversation est liee a l'etape active du parcours
**And** les donnees sont fetches via TanStack Query avec queryKey `['elio-conversation', clientId, conversationId]`
**And** la palette Lab (Violet/Purple) est utilisee pour l'interface du chat

**Given** le client demarre une nouvelle conversation ou reprend la conversation active
**When** Elio Lab repond (FR33)
**Then** Elio pose des questions guidees en fonction de l'etape active du parcours :
- Les questions sont definies dans la configuration du parcours template (champ `steps[].elio_prompts` dans parcours_templates)
- Elio suit une sequence de decouverte : contexte → besoin → contraintes → solution
- Elio ne pose qu'une question a la fois et attend la reponse
**And** le premier token de reponse d'Elio apparait en moins de 3 secondes (NFR-P3)
**And** un indicateur "Elio reflechit..." s'affiche pendant la generation

**Given** le profil de communication du client est defini (FR35)
**When** Elio Lab genere ses reponses
**Then** Elio adapte son ton selon le profil stocke dans `client_configs.elio_config.communication_profile` :
- Tutoiement ou vouvoiement selon la preference
- Longueur des reponses (concis vs detaille)
- Style (professionnel, decontracte, pedagogique)
**And** si le profil n'est pas encore defini, Elio utilise un ton neutre et professionnel par defaut

**Given** Elio Lab ne sait pas repondre a une question du client
**When** la confiance de la reponse est basse
**Then** Elio propose l'escalade vers MiKL : "Je ne suis pas sur de pouvoir t'aider la-dessus. Tu veux que je contacte MiKL ?"
**And** si le client accepte, une notification est envoyee a MiKL avec le contexte de la conversation (question + historique recent)
**And** MiKL repond via le Chat direct (module Chat — Epic 3)

**Given** l'integration LLM pour Elio Lab
**When** un message est envoye
**Then** la Server Action `sendToElio()` appelle le LLM (DeepSeek ou equivalent) via Supabase Edge Function
**And** le system prompt inclut : role Elio Lab, etape active, profil communication client, contexte du parcours
**And** le timeout est de 60 secondes (NFR-I2)
**And** en cas d'echec, un message explicite s'affiche ("Elio est temporairement indisponible, reessayez dans quelques instants")

---

## Story 6.5 : Elio Lab — Generation de briefs & soumission automatique au Validation Hub

As a **client Lab**,
I want **qu'Elio Lab genere automatiquement les briefs a partir de mes reponses et les soumette au Validation Hub**,
So that **je n'ai pas a rediger moi-meme et mes idees sont structurees professionnellement**.

**Acceptance Criteria :**

**Given** le client a repondu aux questions guidees d'Elio Lab pour une etape
**When** Elio Lab determine que suffisamment d'informations ont ete collectees (FR34)
**Then** Elio Lab genere un brief structure a partir des reponses du client :
- Le brief suit un format defini par etape dans le template de parcours
- Le brief est genere via appel LLM avec un prompt specifique de structuration
- Le brief est sauvegarde comme document dans la table `documents` (type: 'brief', tag: etape_id)
**And** Elio Lab presente le brief au client dans le chat : "Voici le brief que j'ai prepare pour toi. Tu veux le revoir avant de l'envoyer a MiKL ?"
**And** le brief genere est affiche dans le chat avec un rendu Markdown propre
**And** le client peut demander des modifications ("Change la partie sur...", "Ajoute...")

**Given** le client approuve le brief genere
**When** il confirme l'envoi ("Oui, envoie-le a MiKL" ou clic sur bouton "Soumettre")
**Then** Elio Lab soumet automatiquement le brief au Validation Hub (FR36) :
- Un enregistrement `validation_requests` est cree avec type='brief_lab', contenu du brief, document_ids lies
- Le statut de l'etape dans le parcours passe a 'in_progress'
- Une notification est envoyee a MiKL
**And** Elio Lab confirme dans le chat : "Brief envoye a MiKL ! Tu seras notifie quand il aura valide."
**And** un toast confirme "Brief soumis pour validation"

**Given** le client n'approuve pas le brief
**When** il demande des modifications
**Then** Elio Lab edite le brief en fonction des retours du client
**And** le processus de validation par le client reprend (boucle edition → approbation)
**And** le document brief en base est mis a jour (pas de duplication)

**Given** le client veut soumettre un brief manuellement (sans Elio)
**When** il utilise le composant brief-submit.tsx (Story 6.3)
**Then** la soumission manuelle fonctionne independamment d'Elio
**And** Elio Lab est informe de la soumission manuelle et adapte sa conversation en consequence

---

## Story 6.6 : Elio Lab — Configuration Orpheus & personnalisation agent

As a **MiKL (operateur)**,
I want **qu'Elio Lab recoive et applique la configuration generee par Orpheus pour chaque client**,
So that **chaque client a un Elio Lab personnalise en fonction de son profil et de son projet**.

**Acceptance Criteria :**

**Given** Orpheus (dans Cursor) a genere une configuration Elio pour un client (FR37)
**When** MiKL injecte la config dans la plateforme
**Then** la configuration est stockee dans `client_configs.elio_config` avec la structure suivante :
```json
{
  "communication_profile": {
    "tone": "decontracte",
    "formality": "tu",
    "response_length": "concis",
    "style_notes": "Utiliser des metaphores sportives"
  },
  "parcours_context": {
    "business_type": "coach sportif",
    "key_challenges": ["acquisition clients", "differenciation"],
    "recommended_approach": "focus personal branding"
  },
  "custom_prompts": {
    "greeting": "Salut {prenom} ! Pret a bosser sur ton projet aujourd'hui ?",
    "step_overrides": {}
  }
}
```
**And** la config est validee avec un schema Zod avant sauvegarde

**Given** MiKL veut injecter ou modifier la config Elio d'un client
**When** il accede a la fiche client dans le Hub (section "Configuration Elio")
**Then** un formulaire permet de :
- Coller un JSON de configuration (genere par Orpheus)
- Editer les champs individuellement via un formulaire structure
- Voir un apercu de la personnalisation (message d'accueil, ton)
**And** la validation du schema s'execute avant sauvegarde
**And** un toast confirme "Configuration Elio mise a jour"

**Given** la config Elio est mise a jour pour un client
**When** le client ouvre son chat Elio Lab
**Then** Elio Lab utilise immediatement la nouvelle configuration :
- Le ton et le style sont adaptes selon `communication_profile`
- Le contexte metier est integre dans les questions guidees via `parcours_context`
- Les prompts custom sont appliques si definis dans `custom_prompts`
**And** le changement est transparent pour le client (pas de notification, pas de coupure)

**Given** aucune config Elio n'existe pour un client
**When** le client utilise Elio Lab
**Then** une configuration par defaut est utilisee :
- Ton professionnel, vouvoiement
- Reponses de longueur moyenne
- Questions guidees standard du template de parcours
**And** la config par defaut est definie dans le code (constante DEFAULT_ELIO_CONFIG dans @monprojetpro/utils)

**Given** l'historique des configs Elio est necessaire
**When** MiKL modifie une config
**Then** l'ancienne version est archivee (insert dans une table `elio_config_history` ou via le trigger updated_at + versionning JSON)
**And** MiKL peut consulter l'historique des modifications de config

---

## Resume Epic 6 — Couverture FRs

| Story | Titre | FRs couvertes |
|-------|-------|---------------|
| 6.1 | Module Parcours Lab — migration, vue parcours & progression | FR26, FR27 |
| 6.2 | Consultation des briefs par etape & teasing One | FR28, FR31 |
| 6.3 | Soumission de brief pour validation & notifications | FR29, FR30 |
| 6.4 | Elio Lab — conversation guidee & adaptation profil | FR32, FR33, FR35 |
| 6.5 | Elio Lab — generation de briefs & soumission auto | FR34, FR36 |
| 6.6 | Elio Lab — configuration Orpheus & personnalisation | FR37 |

**Toutes les 12 FRs de l'Epic 6 sont couvertes.**

---
