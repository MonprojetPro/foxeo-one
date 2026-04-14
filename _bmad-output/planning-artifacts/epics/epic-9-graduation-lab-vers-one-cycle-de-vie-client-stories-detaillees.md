# Epic 9 : Graduation Lab vers One & Cycle de Vie Client — Stories detaillees

**Objectif :** Les clients transitent de Lab vers One avec **provisioning d'une instance dediee** (Supabase + Vercel) et migration complete du contexte. MiKL gere le cycle de vie complet (abandon parcours, changement tier abonnement, export RGPD, transfert instance, retention donnees).

**FRs couverts:** FR74, FR75, FR76, FR88, FR91, FR92, FR93, **FR157, FR161, FR166, FR167, FR168**

**NFRs pertinentes:** NFR-S7, NFR-S9, NFR-R2, NFR-R3, NFR-P2, NFR-A1 a NFR-A4, NFR-M1 a NFR-M5

**Note architecturale :** L'ecran de graduation (animation, recapitulatif) a ete cree dans Story 5.6 (FR72, module core-dashboard). La transmission du profil de communication est geree par Story 8.4 (FR68). Cet epic construit le processus backend de graduation (declenchement, migration donnees, acces), le cycle de vie client (abandon, tier, RGPD) et les policies de retention. Les donnees ne sont JAMAIS supprimees — toujours archivees (FR85, NFR-S9).

---

## Story 9.1 : Graduation Lab vers One — Declenchement & migration automatique du contexte

As a **MiKL (operateur)**,
I want **declencher la graduation d'un client Lab vers One avec migration automatique de tout le contexte (profil, briefs, historique)**,
So that **le client transite en douceur vers son espace professionnel sans perte d'information**.

**Acceptance Criteria :**

**Given** MiKL consulte la fiche d'un client Lab dont le parcours est termine (FR74)
**When** il accede a la section "Parcours Lab" de la fiche client
**Then** un bouton "Graduer vers MonprojetPro One" est visible si les conditions suivantes sont remplies :
- Le parcours Lab est en statut 'completed' (toutes les etapes validees)
- Le client n'a aucune `validation_request` en statut 'pending'
- Le client n'est pas deja en statut 'one'
**And** si les conditions ne sont pas remplies, le bouton est desactive avec un tooltip explicatif :
- "Parcours non termine — {X} etapes restantes"
- "Demandes de validation en attente — traitez-les d'abord"

**Given** MiKL clique sur "Graduer vers MonprojetPro One" (FR74)
**When** la modale de confirmation s'affiche
**Then** elle contient :
- Nom et entreprise du client
- Recapitulatif du parcours Lab (duree, etapes completees, briefs valides)
- Choix du tier One initial : "Ponctuel" / "Essentiel (49€/mois — Elio One)" / "Agentique (99€/mois — Elio One+)"
- Choix des modules a activer pour le client (checkboxes depuis la liste des modules disponibles)
- Champ notes de graduation (optionnel, pour MiKL)
- Boutons "Confirmer la graduation" / "Annuler"
**And** le tier "Essentiel" est pre-selectionne par defaut

**Given** MiKL confirme la graduation
**When** la Server Action `graduateClient(clientId, tier, activeModules, notes)` s'execute
**Then** les operations suivantes sont effectuees (FR75, FR166, FR167) :

**Phase A — Provisioning instance dediee (FR153, FR166) :**
Le provisioning complet (creation Supabase, migrations DB, deploiement Vercel, health check) est execute via `provisionOneInstance()` — voir **Story 12.6** pour le processus detaille en 6 etapes. Dans le contexte de graduation, les parametres sont derives de la modale de graduation :
- `slug` → derive du nom d'entreprise du client (kebab-case)
- `modules` → modules choisis par MiKL dans la modale
- `tier` → tier selectionne (Essentiel / Agentique)

**Phase B — Migration des donnees Lab vers l'instance One (FR167) :**
5. Les donnees Lab pertinentes sont migrees vers le Supabase dedie du client :
   - Le `communication_profile` est copie dans la DB One
   - Les `elio_conversations` avec `dashboard_type='lab'` sont copiees (consultables dans "Historique Lab")
   - Les `documents` du Lab sont copies dans le Storage One
   - Le `parcours` complete est copie (lecture seule)
   - Les observations Elio Lab sont compilees dans `communication_profile.lab_learnings`
6. Les donnees Lab ORIGINALES restent dans la DB Lab partagee (archivage, propriete MonprojetPro — FR168)

**Phase C — Mise a jour du client dans le Hub :**
7. `clients.client_type` → 'one' (etait 'lab')
8. `clients.graduated_at` → NOW()
9. `clients.graduation_notes` → notes de MiKL
10. `client_configs.elio_tier` → tier choisi
11. `client_configs.active_modules` → modules actives
12. `client_configs.graduation_source` → 'lab'

**Phase D — Preparation de l'accueil One :**
13. Un flag `show_graduation_screen` → true est positionne dans la DB One du client
14. L'instance One est prete a recevoir le client

**And** le provisioning est declenche de maniere asynchrone — l'action retourne immediatement le statut 'provisioning' et la progression est suivie via Realtime (channel: `provisioning:{clientId}`)
**And** un toast confirme "Graduation lancee — provisioning en cours pour {nom}"
**And** le cache TanStack Query est invalide pour ['clients', clientId], ['parcours', clientId]
**And** un evenement de graduation est logge dans `activity_logs`

**Given** une erreur survient pendant la graduation
**When** la transaction echoue
**Then** un rollback complet est effectue — aucune donnee n'est modifiee
**And** un message d'erreur explicite s'affiche : "Erreur lors de la graduation — aucune modification effectuee. Reessayez."
**And** l'erreur est logguee avec contexte pour diagnostic (NFR-R5)

---

## Story 9.2 : Graduation Lab vers One — Notification client & activation acces One

As a **client Lab gradue**,
I want **recevoir une notification de graduation et acceder immediatement a mon nouveau dashboard One**,
So that **je sais que mon parcours est termine et je peux commencer a utiliser mes outils professionnels**.

**Acceptance Criteria :**

**Given** la graduation a ete executee avec succes (Story 9.1) (FR76)
**When** la Server Action termine la transaction
**Then** une notification est envoyee au client :
- Type : 'graduation'
- Titre : "Felicitations ! Votre espace professionnel MonprojetPro One est pret !"
- Body : "Votre parcours Lab est termine. Vous avez maintenant acces a votre dashboard personnalise avec {X} modules actives."
- Link : "/" (redirige vers l'accueil du dashboard One)
**And** la notification est envoyee en temps reel via Supabase Realtime (NFR-P5, < 2 secondes)
**And** un email de graduation est egalement envoye (template specifique) :
- Objet : "Bienvenue dans MonprojetPro One — Votre espace professionnel est pret"
- Contenu : recapitulatif du parcours Lab, lien de connexion, apercu des modules actives
**And** MiKL est egalement notifie (type : 'system') : "Graduation effectuee — {nom} est maintenant client One"

**Given** le client se connecte apres la graduation
**When** le middleware d'authentification verifie son profil
**Then** :
1. Le client est redirige vers son instance dediee `{slug}.monprojet-pro.com` (au lieu de `lab.monprojet-pro.com`)
   - Le Hub fournit l'URL de l'instance One via `client_instances.instance_url`
   - Le middleware Auth de l'instance Lab detecte le client gradue et redirige
2. Le flag `show_graduation_screen` est detecte
3. L'ecran de graduation (Story 5.6) s'affiche avec l'animation et le recapitulatif
4. Apres fermeture, le flag est mis a false (affichage unique)
**And** si le client etait deja connecte (session active), la redirection se fait au prochain chargement de page

**Given** le client est sur le dashboard One apres la graduation
**When** il ouvre Elio One pour la premiere fois
**Then** Elio One l'accueille avec un message contextualise (Story 8.7) :
- "Felicitations pour la fin de votre parcours Lab ! Je suis Elio One, votre nouvel assistant. Je connais deja votre projet grace a votre parcours — n'hesitez pas a me poser des questions sur vos outils."
- Le ton est adapte au profil de communication herite du Lab (FR68, Story 8.4)
**And** le message d'accueil est un `elio_messages` avec `dashboard_type='one'` dans une nouvelle `elio_conversations`

**Given** le client veut consulter ses donnees Lab apres la graduation
**When** il cherche ses anciens briefs ou conversations
**Then** :
- Les documents Lab sont visibles dans le module documents (meme table, meme client_id)
- Les conversations Lab sont consultables dans le panneau de conversations Elio (section "Historique Lab", filtrees par `dashboard_type='lab'`, lecture seule)
- Le parcours Lab termine est visible dans un onglet "Mon parcours" (lecture seule, module historique-lab, Epic 10)
**And** le client ne peut plus modifier ou soumettre de briefs Lab (acces lecture seule)

---

## Story 9.3 : Demande d'abandon de parcours Lab par le client

As a **client Lab**,
I want **pouvoir demander a abandonner mon parcours si je ne souhaite plus continuer**,
So that **je peux sortir du parcours proprement sans que mes donnees soient perdues**.

**Acceptance Criteria :**

**Given** un client Lab est en cours de parcours (FR88)
**When** il souhaite abandonner
**Then** un bouton "Quitter le parcours" est accessible depuis :
- La page "Mon Parcours" (parcours-progress) — en bas de page, discret
- Les parametres du compte — section "Mon parcours Lab"
**And** le bouton n'est visible que si le parcours est en statut 'in_progress' ou 'not_started'

**Given** le client clique sur "Quitter le parcours"
**When** la modale de confirmation s'affiche
**Then** elle contient :
- Message d'avertissement : "Etes-vous sur de vouloir quitter votre parcours Lab ?"
- Recapitulatif de la progression actuelle : "{X}/{Y} etapes completees"
- Champ raison d'abandon (optionnel, textarea) avec des suggestions :
  - "Je n'ai plus le temps en ce moment"
  - "Le parcours ne correspond pas a mes attentes"
  - "J'ai trouve une autre solution"
  - "Autre raison..."
- Mention rassurante : "Vos donnees et documents seront conserves. MiKL vous contactera pour en discuter."
- Boutons "Confirmer l'abandon" (rouge) / "Continuer mon parcours" (vert, mis en avant)

**Given** le client confirme l'abandon
**When** la Server Action `requestParcourAbandonment(clientId, reason)` s'execute
**Then** les operations suivantes sont effectuees :
1. `parcours.status` → 'abandoned'
2. `parcours.completed_at` → NOW() (date de fin)
3. `activity_logs` → evenement 'parcours_abandoned' avec la raison
4. Une notification est envoyee a MiKL (type : 'alert', priorite haute) :
   - Titre : "Le client {nom} souhaite abandonner son parcours Lab"
   - Body : "Raison : {raison}. Progression : {X}/{Y} etapes. Contactez-le pour en discuter."
   - Link : "/clients/{clientId}"
5. Les donnees du client sont PRESERVEES integralement (pas d'archivage ni suppression)
**And** un toast confirme au client : "Votre demande a ete envoyee a MiKL. Il vous contactera prochainement."
**And** le cache TanStack Query est invalide

**Given** le parcours est abandonne
**When** le client se reconnecte
**Then** :
- La page parcours affiche : "Votre parcours est en pause. MiKL va vous contacter pour en discuter."
- Elio Lab est desactive (le chat affiche : "Votre parcours est en pause. Contactez MiKL si vous souhaitez reprendre.")
- Les documents et briefs restent accessibles en lecture
- Le chat avec MiKL reste actif

**Given** MiKL veut reactiver un parcours abandonne
**When** il accede a la fiche client et clique "Reactiver le parcours"
**Then** `parcours.status` → 'in_progress', `parcours.completed_at` → null
**And** Elio Lab est reactive
**And** le client est notifie : "Bonne nouvelle ! Votre parcours Lab a ete reactive par MiKL."

---

## Story 9.4 : Changement de tier abonnement client One

As a **MiKL (operateur)**,
I want **changer le tier d'abonnement d'un client One (Base, Essentiel, Agentique) avec effet immediat sur les capacites Elio**,
So that **je peux adapter l'offre a l'evolution des besoins du client**.

**Acceptance Criteria :**

**Given** MiKL consulte la fiche d'un client One (FR91)
**When** il accede a la section "Abonnement" de la fiche client
**Then** il voit :
- Le tier actuel du client (Base / Essentiel / Agentique) avec un badge colore
- La date de debut du tier actuel
- Le cout mensuel associe
- Un bouton "Modifier le tier"

**Given** MiKL clique sur "Modifier le tier"
**When** la modale de changement s'affiche
**Then** elle contient :
- Les 3 options de tier avec detail :
  | Tier | Prix | Elio | Description |
  |------|------|------|-------------|
  | Base | Ponctuel | Aucun | Maintenance 1 mois + docs techniques |
  | Essentiel | 49€/mois | One | Maintenance continue, mises a jour, Elio One assistant |
  | Agentique | 99€/mois | One+ | Maintenance continue, mises a jour, Elio One+ agentif |
- Le tier actuel est surligne et indique "(actuel)"
- Un avertissement si downgrade : "Attention : le passage de Agentique a Essentiel desactivera les fonctionnalites Elio One+ (actions, generation de documents, alertes proactives)."
- Boutons "Confirmer le changement" / "Annuler"

**Given** MiKL confirme le changement de tier
**When** la Server Action `changeClientTier(clientId, newTier)` s'execute
**Then** les operations suivantes sont effectuees :
1. `client_configs.elio_tier` → nouveau tier ('one' | 'one_plus' | null pour Base)
2. `client_configs.subscription_tier` → nouveau tier ('base' | 'essentiel' | 'agentique')
3. `client_configs.tier_changed_at` → NOW()
4. `activity_logs` → evenement 'tier_changed' avec ancien et nouveau tier
5. Si upgrade vers One+ : les alertes proactives sont activees (config par defaut)
6. Si downgrade depuis One+ : les alertes proactives sont desactivees, les actions en cours sont preservees
**And** l'effet est immediat : Elio adapte ses capacites des la prochaine interaction
**And** un toast confirme "Tier modifie — {nom} est maintenant en {tier}"
**And** le cache TanStack Query est invalide

**Given** le tier change impacte la facturation (integration future Epic 11)
**When** la Server Action s'execute
**Then** un champ `client_configs.pending_billing_update` → true est positionne pour signaler a l'Epic 11 (Facturation & Abonnements) qu'une mise a jour Stripe est necessaire
**And** pour le MVP, la facturation est geree manuellement par MiKL (pas de Stripe auto dans cet epic)

**Given** le client utilise Elio One apres un changement de tier
**When** il tente une action One+ alors qu'il est en tier One
**Then** Elio One repond : "Cette fonctionnalite fait partie de l'offre Elio One+. Contactez MiKL pour en savoir plus !"
**And** le check de tier est effectue avant l'appel LLM (pas de tokens gaspilles)

---

## Story 9.5a : Export RGPD des donnees client

As a **client MonprojetPro ou MiKL (operateur)**,
I want **exporter l'ensemble des donnees personnelles d'un client (droit d'acces RGPD)**,
So that **le client peut exercer son droit a la portabilite des donnees**.

**Acceptance Criteria :**

**Given** un client souhaite exporter ses donnees (FR92)
**When** il accede a ses parametres de compte (section "Mes donnees")
**Then** il voit :
- Un bouton "Exporter toutes mes donnees" avec l'explication : "Conformement au RGPD, vous pouvez telecharger l'ensemble de vos donnees personnelles."
- Une estimation du temps de generation ("L'export prend generalement 1 a 5 minutes")

**Given** le client (ou MiKL via la fiche client) declenche l'export
**When** la Server Action `exportClientData(clientId)` s'execute
**Then** un export complet est genere incluant :
1. **Informations personnelles** : nom, email, entreprise, date d'inscription, type de client
2. **Documents** : tous les documents associes (briefs, livrables) — fichiers + metadata
3. **Communications** : historique des messages chat avec MiKL (table `messages`)
4. **Conversations Elio** : historique complet des conversations avec Elio (tables `elio_conversations` + `elio_messages`)
5. **Parcours Lab** : etapes, progression, briefs soumis (si applicable)
6. **Demandes de validation** : historique des `validation_requests`
7. **Notifications** : historique des notifications recues
8. **Consentements** : consentements donnes (CGU, IA, etc.)
9. **Sessions** : historique des connexions
10. **Facturation** : factures et devis (si applicable)
**And** l'export est genere dans 2 formats :
- **JSON structure** : un fichier JSON complet avec toutes les donnees brutes
- **PDF lisible** : un document PDF formate avec les donnees organisees par categorie
**And** les fichiers sont compresses en ZIP
**And** l'export est stocke temporairement dans Supabase Storage (dossier prive, expire apres 7 jours)
**And** un lien de telechargement est envoye par notification in-app ET email

**Given** MiKL peut aussi declencher un export pour un client (FR104 — lien avec Epic 12)
**When** il accede a la fiche client (section "Administration")
**Then** un bouton "Exporter les donnees client" est disponible
**And** le meme processus s'execute
**And** l'export est accessible a MiKL (pas au client) si MiKL l'a declenche pour ses propres besoins

---

## Story 9.5b : Transfert instance One au client sortant

As a **MiKL (operateur)**,
I want **transferer l'instance One dediee a un client qui quitte MonprojetPro, avec code source, DB et documentation**,
So that **le client est autonome et proprietaire de son outil conformement aux engagements MonprojetPro (FR154)**.

**Acceptance Criteria :**

**Given** un client One quitte MonprojetPro et recupere son outil (FR154, FR157)
**When** MiKL declenche la procedure de sortie depuis la fiche client (bouton "Transferer l'instance au client")
**Then** la procedure suivante est executee :
1. Le code source du monorepo client est exporte dans un repo Git dedie
2. La documentation complete de chaque module actif est incluse (guide.md, faq.md, flows.md)
3. Les credentials Supabase sont transferes au client (ou un dump DB est fourni)
4. Les modules service MonprojetPro sont retires (chat MiKL, visio, Elio) — sauf si inclus dans le perimetre projet
5. Un document "Guide d'autonomie" est genere avec :
   - Architecture technique de l'instance
   - Variables d'environnement documentees
   - Procedure de deploiement sans MonprojetPro
   - Contacts support technique (optionnel, payant)
6. `client_instances.status` → 'transferred'
7. Le client recoit par email : repo Git + dump DB + documentation + Guide d'autonomie
**And** le dossier BMAD (briefs internes, analyses Orpheus) reste propriete MonprojetPro — le client recoit les documents strategiques (brief final, PRD, architecture client)
**And** un evenement 'client_instance_transferred' est logge dans `activity_logs`

---

## Story 9.5c : Anonymisation & retention des donnees apres resiliation

As a **MiKL (operateur)**,
I want **archiver, puis anonymiser les donnees des clients resilies apres la periode de retention**,
So that **la plateforme est conforme RGPD et les obligations comptables sont respectees**.

**Acceptance Criteria :**

**Given** un client est resilie (FR93)
**When** son compte est desactive par MiKL
**Then** les donnees sont ARCHIVEES (jamais supprimees immediatement) :
1. `clients.status` → 'archived'
2. `clients.archived_at` → NOW()
3. Le client perd l'acces au dashboard (middleware bloque la connexion)
4. Les donnees restent en base (RLS empeche l'acces mais ne supprime pas)
5. Un champ `clients.retention_until` → NOW() + {periode_retention} est positionne
**And** la periode de retention par defaut est de **90 jours** (configurable)
**And** les obligations comptables sont respectees : les factures sont conservees **10 ans** independamment de la retention client (conformite fiscale francaise)
**And** un evenement 'client_archived' est logge dans `activity_logs`

**Given** la periode de retention est ecoulee
**When** un processus de nettoyage s'execute (Supabase Edge Function, cron hebdomadaire)
**Then** les donnees du client sont anonymisees :
1. `clients.name` → 'Client supprime #{id_court}'
2. `clients.email` → 'deleted_{uuid}@anonymized.monprojet-pro.com'
3. `clients.company` → null
4. Les `elio_conversations` et `elio_messages` sont supprimees
5. Les `messages` (chat MiKL) sont anonymises (contenu → 'Message supprime')
6. Les `documents` sont supprimes du Storage (fichiers physiques)
7. Les `notifications` sont supprimees
8. Le `client_configs` est supprime (sauf `subscription_tier` pour historique facturation)
9. Les `validation_requests` sont conservees (anonymisees) pour les stats
10. Les donnees de facturation sont PRESERVEES (obligation legale 10 ans)
**And** `clients.status` → 'deleted'
**And** un evenement 'client_data_purged' est logge dans `activity_logs`
**And** l'anonymisation est irreversible

**Given** MiKL veut consulter les clients archives
**When** il accede a la liste clients avec le filtre "Archives"
**Then** les clients archives sont visibles avec :
- Mention "Archive" + date d'archivage
- Date de suppression prevue (`retention_until`)
- Bouton "Reactiver" (si dans la periode de retention)
- Les donnees sont encore consultables tant que la retention n'est pas ecoulee
**And** apres la suppression/anonymisation, seul le nom anonymise et les donnees comptables restent

**Given** MiKL veut reactiver un client archive (dans la periode de retention)
**When** il clique sur "Reactiver"
**Then** `clients.status` → le statut precedent ('lab' ou 'one')
**And** `clients.archived_at` → null, `clients.retention_until` → null
**And** le client retrouve l'acces a son dashboard avec toutes ses donnees intactes
**And** une notification est envoyee au client : "Votre compte MonprojetPro a ete reactive"

---

## Resume Epic 9 — Couverture FRs

| Story | Titre | FRs couvertes |
|-------|-------|---------------|
| 9.1 | Graduation Lab vers One — provisioning instance & migration contexte | FR74, FR75, FR166, FR167 |
| 9.2 | Graduation Lab vers One — notification & activation acces | FR76 |
| 9.3 | Demande d'abandon parcours Lab par le client | FR88 |
| 9.4 | Changement de tier abonnement client One | FR91 |
| 9.5a | Export RGPD des donnees client | FR92 |
| 9.5b | Transfert instance One au client sortant | FR154, FR157, FR161 |
| 9.5c | Anonymisation & retention des donnees apres resiliation | FR93, FR168 |

**Toutes les 12 FRs de l'Epic 9 sont couvertes.**

---
