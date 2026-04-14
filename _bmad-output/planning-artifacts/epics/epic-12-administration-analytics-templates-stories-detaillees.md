# Epic 12 : Administration, Analytics & Templates — Stories detaillees

**Objectif :** MiKL pilote la plateforme avec des outils d'administration (logs, maintenance, backups), du monitoring (sante systeme, alertes, **monitoring instances One** — usage, seuils, upgrade), des analytics (metriques d'usage), des templates personnalisables (parcours Lab, emails), **provisioning** de nouvelles instances One, **verification documentation obligatoire par module** et la preparation des integrations futures (webhooks, API).

**FRs couverts:** FR102, FR103, FR104, FR105, FR115, FR116, FR120, FR121, FR137, FR138, FR147, FR148, **FR153, FR155, FR156, FR158, FR159, FR160, FR162, FR163, FR164, FR165**

**NFRs pertinentes:** NFR-R1 a NFR-R6, NFR-M1 a NFR-M5, NFR-S9, NFR-I5, NFR-P1

**Note architecturale :** Cet epic est le dernier — il construit les outils de pilotage de la plateforme. Le module `admin/` (targets: ['hub']) centralise les fonctionnalites d'administration. Le module `analytics/` gere les metriques. Le module `templates/` gere les templates reutilisables. Les logs d'activite utilisent la table `activity_logs` (creee en Story 1.2, Epic 1). Les integrations P2 (webhooks sortants, API client) sont preparees en structure uniquement — pas d'implementation fonctionnelle.

---

## Story 12.1 : Module Admin — Logs d'activite par client & mode maintenance

As a **MiKL (operateur)**,
I want **consulter les logs d'activite par client et activer un mode maintenance avec message personnalise**,
So that **je peux suivre ce qui se passe sur la plateforme et informer mes clients lors des maintenances**.

**Acceptance Criteria :**

**Given** le module Admin n'existe pas encore
**When** le module est cree
**Then** la structure suivante est en place :
```
modules/admin/
  index.ts
  manifest.ts                    # { id: 'admin', targets: ['hub'], dependencies: [] }
  components/
    activity-logs.tsx            # Vue logs d'activite
    maintenance-mode.tsx         # Controle mode maintenance
  hooks/
    use-activity-logs.ts
    use-maintenance.ts
  actions/
    toggle-maintenance.ts
  types/
    admin.types.ts
```

**Given** les besoins en donnees de cette story
**When** le module Admin est initialise
**Then** la table `activity_logs` (creee en Story 1.2, migration de base) est deja disponible avec : id (UUID PK), actor_type, actor_id, action, entity_type, entity_id, metadata (JSONB), created_at
**And** les index et policies RLS sont deja en place (Story 1.2)

**Given** MiKL accede aux logs d'activite (FR102)
**When** il consulte la page "Logs" du module Admin
**Then** il voit une liste chronologique des evenements avec :
- Date/heure
- Acteur (MiKL, Client {nom}, Systeme, Elio)
- Action (creation client, graduation, validation, paiement, connexion, etc.)
- Entite concernee (avec lien cliquable)
- Details supplementaires (metadata)
**And** les filtres disponibles : par client, par type d'action, par periode, par acteur
**And** la recherche textuelle fonctionne sur les champs action et metadata
**And** la pagination est en place (50 logs par page)
**And** les logs sont fetches via TanStack Query avec queryKey `['activity-logs', filters]`

**Given** MiKL veut activer le mode maintenance (FR103)
**When** il accede a la page "Maintenance" du module Admin
**Then** il voit :
- Toggle "Mode maintenance" (actif/inactif)
- Champ "Message aux clients" (textarea, pre-rempli : "La plateforme est en maintenance. Nous serons de retour tres bientot !")
- Champ "Duree estimee" (optionnel, ex: "30 minutes")
- Apercu du message tel qu'il apparaitra aux clients
- Bouton "Activer la maintenance"

**Given** MiKL active la maintenance
**When** la Server Action `toggleMaintenanceMode(enabled, message, estimatedDuration)` s'execute
**Then** :
1. Un flag `system_config.maintenance_mode` est positionne a `true` dans une table `system_config` (ou dans Supabase Vault)
2. Le message est stocke dans `system_config.maintenance_message`
3. Les middlewares des apps client (hub et client-one/lab) detectent le flag et affichent une page de maintenance au lieu du dashboard :
   - Page epuree avec le logo MonprojetPro
   - Message personnalise de MiKL
   - Duree estimee (si fournie)
   - "Revenez dans quelques instants"
4. MiKL reste connecte normalement (le Hub n'est PAS affecte par la maintenance)
**And** un toast confirme "Mode maintenance active"
**And** l'evenement est logge dans `activity_logs`

**Given** MiKL desactive la maintenance
**When** il remet le toggle a "inactif"
**Then** `system_config.maintenance_mode` → false
**And** les clients retrouvent immediatement l'acces
**And** un toast confirme "Mode maintenance desactive — clients reconnectes"

---

## Story 12.2 : Export complet donnees client & backups automatiques

As a **MiKL (operateur)**,
I want **exporter l'ensemble des donnees d'un client et avoir la garantie de backups automatiques avec restauration possible**,
So that **je peux fournir les donnees sur demande et je sais que rien n'est perdu**.

**Acceptance Criteria :**

**Given** MiKL veut exporter les donnees completes d'un client (FR104)
**When** il accede a la fiche client, section "Administration" et clique "Exporter toutes les donnees"
**Then** la Server Action `exportClientData(clientId)` s'execute (meme action que Story 9.5 pour le RGPD mais accessible aussi a MiKL) :
- L'export genere un ZIP contenant toutes les donnees du client (cf. Story 9.5 pour le detail)
- Un lien de telechargement est genere (expire apres 7 jours)
- MiKL est notifie quand l'export est pret (notification in-app)
**And** l'export est stocke dans Supabase Storage (dossier `/exports/{clientId}/`)
**And** un toast confirme "Export en cours de generation — vous serez notifie quand il sera pret"
**And** l'evenement est logge dans `activity_logs`

**Given** le systeme doit effectuer des backups automatiques (FR105)
**When** le systeme est operationnel
**Then** les backups sont configures selon la politique suivante :
- **Backup quotidien (Supabase natif)** : sauvegarde automatique de la base de donnees avec retention 30 jours (NFR-R2)
- **Backup hebdomadaire (cold backup)** : export complet vers un stockage externe (Supabase Storage bucket dedie ou S3) avec retention 1 an
- **RPO** : 24 heures maximum de perte de donnees (NFR-R3)
- **RTO** : 4 heures maximum de temps de restauration (NFR-R4)
**And** la configuration est documentee dans un fichier `docs/backup-policy.md` (non cree dans cette story, mais la strategy est implementee)

**Given** MiKL veut verifier l'etat des backups
**When** il accede a la page "Backups" du module Admin
**Then** il voit :
- Date et statut du dernier backup quotidien (Supabase)
- Date et statut du dernier backup hebdomadaire (cold)
- Historique des 30 derniers backups
- Bouton "Declencher un backup manuel" (cold backup)
- Bouton "Restaurer un backup" (avec selection de date et confirmation)
**And** la restauration d'un backup necessite une double confirmation ("Attention : cette action ecrasera les donnees actuelles. Etes-vous sur ?")
**And** les informations de backup sont recuperees via l'API Supabase Management et/ou les metadonnees stockees dans `system_config`

---

## Story 12.3 : Templates reutilisables — Parcours Lab & emails automatiques

As a **MiKL (operateur)**,
I want **creer des templates de parcours Lab reutilisables et personnaliser les emails automatiques de la plateforme**,
So that **je peux onboarder chaque nouveau client avec un parcours pre-configure et garder une communication email coherente**.

**Acceptance Criteria :**

**Given** MiKL veut gerer les templates de parcours Lab (FR137)
**When** il accede au module Templates, section "Parcours Lab"
**Then** il voit la liste des templates existants avec :
- Nom du template (ex: "Parcours Branding Complet", "Parcours Site Web Express")
- Nombre d'etapes
- Nombre de clients qui l'utilisent
- Date de creation / derniere modification
- Actions : "Modifier", "Dupliquer", "Archiver"
- Bouton "Nouveau template"

**Given** MiKL cree ou modifie un template de parcours
**When** il ouvre l'editeur de template
**Then** il peut :
- Definir le nom et la description du template
- Ajouter/supprimer/reordonner des etapes (drag & drop)
- Pour chaque etape :
  - Titre et description
  - Ordre (position dans le parcours)
  - Actif par defaut (toggle)
  - Prompts Elio Lab (les questions guidees pour cette etape)
- Sauvegarder le template
**And** le template est stocke dans `parcours_templates` (table creee en Story 6.1)
**And** la validation Zod verifie que le template a au moins 2 etapes
**And** un template modifie n'impacte PAS les parcours deja en cours (les parcours actifs gardent une copie de la config au moment de l'assignation)

**Given** MiKL veut personnaliser les emails automatiques (FR138)
**When** il accede au module Templates, section "Emails"
**Then** il voit la liste des templates d'emails avec :
| Template | Declencheur | Variables disponibles |
|----------|-------------|----------------------|
| Bienvenue Lab | Premiere connexion client Lab | {prenom}, {entreprise}, {parcours_nom} |
| Brief valide | MiKL valide un brief | {prenom}, {titre_brief}, {commentaire} |
| Brief refuse | MiKL refuse un brief | {prenom}, {titre_brief}, {commentaire} |
| Graduation | Client gradue vers One | {prenom}, {duree_lab}, {modules_actives} |
| Facture envoyee | Facture envoyee | {prenom}, {montant}, {numero_facture} |
| Echec paiement | Paiement echoue | {prenom}, {montant}, {raison} |
| Rappel parcours | Client Lab inactif | {prenom}, {jours_inactif}, {etape_en_cours} |

**Given** MiKL modifie un template d'email
**When** il ouvre l'editeur
**Then** il peut :
- Modifier le sujet de l'email
- Modifier le contenu (editeur texte riche simplifie, pas de HTML brut)
- Inserer des variables via des boutons ({prenom}, {entreprise}, etc.)
- Voir un apercu du rendu
- Bouton "Sauvegarder" / "Reinitialiser au defaut"
**And** les templates sont stockes dans une table `email_templates` (id, template_key, subject, body, variables, updated_at)
**And** les templates par defaut sont pre-inseres en migration

---

## Story 12.4 : Analytics & metriques d'usage

As a **MiKL (operateur)**,
I want **consulter des statistiques d'utilisation de la plateforme par fonctionnalite et des metriques d'usage anonymisees**,
So that **je peux comprendre comment mes clients utilisent la plateforme et optimiser mon offre**.

**Acceptance Criteria :**

**Given** le systeme collecte des metriques d'usage anonymisees (FR120)
**When** les clients et MiKL utilisent la plateforme
**Then** les evenements suivants sont traces (dans `activity_logs` avec `actor_type='system'`) :
- Connexions (par jour, par client)
- Pages visitees (par module)
- Messages envoyes (chat MiKL, Elio)
- Documents consultes/telecharges
- Briefs soumis / valides / refuses
- Temps passe par session (approximation)
**And** les metriques sont anonymisees pour les agregations globales (pas de donnees personnelles dans les stats)
**And** la collecte respecte les consentements RGPD (opt-in lors de l'inscription, Story 1.9)

**Given** MiKL accede au module Analytics (FR121)
**When** la page se charge
**Then** un dashboard analytique affiche :
- **Vue d'ensemble** :
  - Nombre de clients actifs (Lab / One / Total)
  - Taux de graduation Lab → One (pourcentage)
  - Revenus mensuels recurrents (MRR) — si facturation active
  - Nombre de demandes traitees ce mois (Validation Hub)
- **Utilisation par module** :
  - Classement des modules les plus utilises (nombre d'acces)
  - Modules les moins utilises (opportunites de desactivation)
- **Activite Elio** :
  - Nombre de conversations par jour/semaine
  - Ratio feedback positif/negatif
  - Questions les plus frequentes (top 10)
- **Engagement clients** :
  - Clients les plus actifs (top 5)
  - Clients inactifs depuis > 7 jours (alerte)
  - Duree moyenne des parcours Lab
**And** les donnees sont visualisees avec des sparklines, barres et compteurs (style "Minimal Futuriste")
**And** un filtre par periode est disponible (7 jours, 30 jours, 90 jours, 1 an)
**And** les donnees sont fetches via TanStack Query et calculees par des requetes Supabase aggregees (COUNT, AVG, GROUP BY)

---

## Story 12.5a : Monitoring sante systeme & alertes dysfonctionnement

As a **MiKL (operateur)**,
I want **voir un indicateur de sante du systeme et recevoir des alertes en cas de dysfonctionnement**,
So that **je sais que tout fonctionne et je suis informe immediatement en cas de probleme**.

**Acceptance Criteria :**

**Given** MiKL veut voir la sante du systeme (FR147)
**When** il accede a la page "Monitoring" du module Admin
**Then** un dashboard de sante affiche :
- **Statut global** : indicateur vert (tout OK) / orange (degradé) / rouge (problème)
- **Services internes** :
  | Service | Verification | Seuil |
  |---------|-------------|-------|
  | Supabase DB | Requete `SELECT 1` | < 500ms |
  | Supabase Auth | Check session | Fonctionnel |
  | Supabase Realtime | Check connexion | Connecte |
  | Supabase Storage | Check upload/download | Fonctionnel |
- **Services externes** :
  | Service | Verification | Seuil |
  |---------|-------------|-------|
  | Pennylane API v2 | `GET /api/external/v2/customers?page_size=1` | < 2s |
  | DeepSeek (LLM) | `GET /health` ou test prompt | < 5s |
  | Cal.com | API check | < 2s |
  | OpenVidu | API check | < 2s |
- **Metriques systeme** :
  - Temps de reponse moyen des pages (derniere heure)
  - Nombre d'erreurs (derniere heure)
  - Taille de la base de donnees
**And** les checks sont effectues a la demande (bouton "Rafraichir") et/ou periodiquement (toutes les 5 minutes via un cron leger)
**And** les resultats sont stockes dans `system_config.health_checks` (JSONB)

**Given** un dysfonctionnement est detecte (FR148)
**When** un service ne repond pas ou depasse le seuil
**Then** :
1. Le statut global passe a orange (degrade) ou rouge (critique)
2. Une notification prioritaire est envoyee a MiKL : "Alerte systeme — {service} ne repond pas ({details})"
3. L'evenement est logge dans `activity_logs` (type 'system_alert')
4. Si le service est un service externe (Pennylane, Cal.com, etc.) : le systeme reste fonctionnel en mode degrade (NFR-R6, NFR-I5) avec message explicite aux utilisateurs
**And** une alerte n'est envoyee qu'une fois par incident (pas de spam, debounce 15 minutes)

---

## Story 12.5b : Preparation integrations P2 — Webhooks & API

As a **MiKL (operateur)**,
I want **avoir la structure de donnees prete pour les integrations futures (webhooks sortants et API client)**,
So that **la plateforme est prete a evoluer vers les integrations en Phase 2 sans migration lourde**.

**Acceptance Criteria :**

**Given** la preparation des integrations futures (FR115, FR116)
**When** la structure est mise en place
**Then** :

**Webhooks sortants (FR115) — Structure P2 :**
- Une page "Webhooks" dans le module Admin affiche : "Fonctionnalite disponible en Phase 2"
- La table `outgoing_webhooks` est creee (en migration) avec : id, url, events (TEXT[]), secret, active, created_at
- Aucune logique d'envoi n'est implementee (P2)
- La UI affiche un placeholder avec description : "Configurez des webhooks sortants pour integrer MonprojetPro avec vos outils externes"

**API Client (FR116) — Structure P2 :**
- Une page "API" dans le module Admin affiche : "Fonctionnalite disponible en Phase 2"
- La table `api_keys` est creee (en migration) avec : id, client_id, key_hash, name, permissions (TEXT[]), last_used_at, created_at, revoked_at
- Aucune logique d'authentification API n'est implementee (P2)
- La UI affiche un placeholder avec description : "Generez des cles API pour permettre a vos clients d'integrer MonprojetPro dans leurs systemes"
**And** les tables sont creees pour eviter une migration future, mais restent vides
**And** la mention "Phase 2" est clairement visible sur ces fonctionnalites

---

## Story 12.6 : Provisioning instance One depuis le Hub

As a **MiKL (operateur)**,
I want **provisionner une nouvelle instance MonprojetPro One dediee (Vercel + Supabase) directement depuis le Hub**,
So that **chaque client One recoit son propre environnement isole avec ses donnees et son code**.

**Acceptance Criteria:**

**Given** MiKL cree un nouveau client Direct One (pas de parcours Lab) (FR156)
**When** il accede a la fiche client et clique "Provisionner instance One"
**Then** une modale de provisioning s'affiche avec :
- Slug de l'instance : champ texte pre-rempli avec le nom de l'entreprise en kebab-case (ex: "association-sport-plus")
- URL resultante : `https://{slug}.monprojet-pro.com`
- Modules a activer (checkboxes)
- Tier Elio initial (Essentiel / Agentique)
- Estimation du cout mensuel infrastructure (~5-7€ sur tiers gratuits)
- Bouton "Lancer le provisioning"

**Given** MiKL lance le provisioning
**When** la Server Action `provisionOneInstance(clientId, slug, modules, tier)` s'execute
**Then** le processus suivant est declenche :

1. **Validation pre-provisioning :**
   - Verification que le slug est unique (pas de collision avec une instance existante)
   - Verification que le client n'a pas deja une instance One active
   - Validation du format du slug (kebab-case, 3-50 caracteres, pas de mots reserves)

2. **Creation projet Supabase (via Supabase Management API) :**
   - Nom du projet : `monprojetpro-one-{slug}`
   - Region : eu-west-1 (Paris)
   - Plan : Free (upgrade ulterieur si necessaire)
   - Recuperation des credentials (URL, anon key, service role key)

3. **Execution des migrations DB :**
   - Toutes les migrations du template client sont executees sur le nouveau Supabase
   - Tables creees : `client_config`, `elio_conversations`, `elio_messages`, `documents`, `messages`, `notifications`, `activity_logs`
   - Seed data : configuration initiale du client (modules, tier, branding par defaut)

4. **Deploiement Vercel :**
   - Clone du template `apps/client/` en nouveau projet Vercel
   - Configuration des env variables :
     | Variable | Valeur |
     |----------|--------|
     | `NEXT_PUBLIC_SUPABASE_URL` | URL du projet Supabase cree |
     | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Cle publique Supabase |
     | `SUPABASE_SERVICE_ROLE_KEY` | Cle service (server-side uniquement) |
     | `INSTANCE_SECRET` | Secret HMAC genere (UUID v4) |
     | `HUB_API_URL` | `https://hub.monprojet-pro.com/api` |
     | `ACTIVE_MODULES` | Liste JSON des modules actives |
     | `ELIO_TIER` | 'one' ou 'one_plus' |
     | `CLIENT_SLUG` | Slug du client |
   - Configuration du domaine : `{slug}.monprojet-pro.com`
   - Declenchement du premier deploiement

5. **Enregistrement dans le Hub :**
   - Insert dans `client_instances` avec status 'provisioning'
   - `instance_url`, `supabase_url`, `vercel_project_id`, `instance_secret`

6. **Health check :**
   - Le Hub ping `GET https://{slug}.monprojet-pro.com/api/hub/health` toutes les 10 secondes (max 5 minutes)
   - Quand l'instance repond `{ status: 'ok' }` :
     - `client_instances.status` → 'active'
     - Notification a MiKL : "Instance {slug}.monprojet-pro.com prete !"
   - Si timeout (5 min) : `status` → 'failed', alerte MiKL avec log d'erreur

**And** l'ensemble du provisioning prend moins de 5 minutes
**And** un indicateur de progression est affiche a MiKL pendant le provisioning :
  - "Creation du projet Supabase..." → "Execution des migrations..." → "Deploiement Vercel..." → "Verification de sante..." → "Instance prete !"
**And** l'evenement 'instance_provisioned' est logge dans `activity_logs`

**Given** le provisioning echoue a une etape
**When** une erreur survient
**Then** :
1. Les etapes deja completees sont nettoyees (rollback) :
   - Suppression du projet Supabase si cree
   - Suppression du projet Vercel si cree
2. `client_instances.status` → 'failed'
3. Le message d'erreur est affiche a MiKL avec le detail de l'etape en echec
4. Un bouton "Reessayer" est disponible
**And** l'erreur est logguee dans `activity_logs` avec le stacktrace

**Given** MiKL veut voir l'etat des instances provisionnees
**When** il accede a la section "Instances" du module Admin (ou page dediee)
**Then** il voit un tableau listant toutes les instances :
| Colonne | Description |
|---------|-------------|
| Client | Nom + entreprise |
| Slug | `{slug}.monprojet-pro.com` (lien cliquable) |
| Statut | Provisioning / Active / Suspended / Archived / Failed |
| Tier | Essentiel / Agentique |
| Modules | Liste des modules actives |
| Cree le | Date de provisioning |
| Derniere sante | Date + statut du dernier health check |
**And** des actions sont disponibles par instance : "Voir les metriques", "Suspendre", "Archiver"

---

## Story 12.7 : Monitoring instances One — usage, seuils & alertes

As a **MiKL (operateur)**,
I want **surveiller l'usage des ressources de chaque instance One et recevoir des alertes quand les seuils sont atteints**,
So that **je peux anticiper les depassements de capacite et proposer un upgrade au client avant qu'il ne soit impacte**.

**Acceptance Criteria:**

**Given** le systeme doit surveiller l'usage de chaque instance One (FR162)
**When** un cron quotidien s'execute (Edge Function Supabase, 6h00)
**Then** pour chaque instance One avec `status='active'` :
1. Le Hub appelle `GET https://{slug}.monprojet-pro.com/api/hub/health` qui retourne :
```typescript
type UsageMetrics = {
  dbRows: number          // Nombre total de lignes en DB
  storageUsedMb: number   // Espace Storage utilise (MB)
  bandwidthUsedGb: number // Bande passante mensuelle (GB)
  edgeFunctionCalls: number // Invocations Edge Functions ce mois
}
```
2. Les metriques sont stockees dans `client_instances.usage_metrics` (JSONB)
3. `client_instances.last_health_check` → NOW()

**Given** les metriques sont collectees
**When** un seuil est atteint (FR163)
**Then** le systeme evalue les seuils suivants :
| Metrique | Seuil gratuit | 60% (info) | 80% (warning) | 95% (critical) |
|----------|---------------|------------|----------------|-----------------|
| DB rows | 500K | 300K | 400K | 475K |
| Storage | 1 GB | 600 MB | 800 MB | 950 MB |
| Bandwidth | 2 GB/mois | 1.2 GB | 1.6 GB | 1.9 GB |
| Edge Functions | 500K/mois | 300K | 400K | 475K |
**And** `client_instances.alert_level` est mis a jour :
- 'none' si aucun seuil atteint
- 'info' si un seuil 60% est atteint
- 'warning' si un seuil 80% est atteint
- 'critical' si un seuil 95% est atteint (le niveau le plus eleve gagne)
**And** une notification est envoyee a MiKL selon le niveau :
- **info** : notification in-app uniquement : "Instance {slug} : usage DB a 60%"
- **warning** : notification in-app + email : "Instance {slug} : usage Storage a 80% — envisager un upgrade"
- **critical** : notification in-app + email + badge rouge dans la liste des instances : "URGENT : Instance {slug} proche de la limite ({metrique} a 95%)"
**And** la notification n'est envoyee qu'une fois par palier franchi (pas de spam si le seuil reste stable)
**And** l'evenement est logge dans `activity_logs`

**Given** MiKL veut consulter la sante de toutes les instances One (FR164)
**When** il accede au "Tableau de bord Instances" dans le module Admin
**Then** il voit :
- **Vue d'ensemble** :
  - Nombre total d'instances actives
  - Nombre d'alertes en cours (par niveau)
  - Cout mensuel estime total des instances
- **Liste des instances** avec indicateurs visuels :
  - Badge vert (none), bleu (info), orange (warning), rouge (critical)
  - Barres de progression pour chaque metrique (DB rows, Storage, Bandwidth)
  - Derniere date de health check
- **Detail par instance** (clic sur une instance) :
  - Historique des metriques sur 30 jours (graphique)
  - Historique des alertes
  - Modules actives
  - Configuration Elio (tier, docs injectees)
  - Bouton "Initier un upgrade"
**And** les donnees sont fetches via TanStack Query avec queryKey `['instances', 'monitoring']`
**And** un filtre par statut d'alerte est disponible

**Given** MiKL veut initier un upgrade de tier infrastructure (FR165)
**When** il clique "Initier un upgrade" depuis le detail d'une instance
**Then** une modale s'affiche avec :
- Metriques actuelles et seuils depassees
- Options d'upgrade :
  | Upgrade | Action | Cout estime |
  |---------|--------|-------------|
  | Supabase Pro | Migrer vers plan Pro ($25/mois) | +25$/mois |
  | Vercel Pro | Migrer vers plan Pro ($20/mois) | +20$/mois |
  | Les deux | Migration combinee | +45$/mois |
- Recommandation automatique basee sur les metriques depassees
- Note : "Le client sera informe du changement et du nouveau cout"
- Boutons "Confirmer l'upgrade" / "Contacter le client d'abord"
**And** "Contacter le client d'abord" ouvre le chat MiKL pre-rempli avec un message type :
  "Bonjour {prenom}, votre espace MonprojetPro One grandit ! Nous approchons des limites de votre formule actuelle. Je vous propose un upgrade pour assurer la continuite du service. Voulez-vous qu'on en discute ?"
**And** pour le MVP, l'upgrade reel des tiers Supabase/Vercel est effectue manuellement par MiKL (via les dashboards Supabase/Vercel). Le Hub enregistre l'intention et le statut.

---

## Story 12.8 : Documentation obligatoire par module & verification

As a **MiKL (operateur) et client One**,
I want **que chaque module deploye ait une documentation utilisateur obligatoire (guide, FAQ, flows) verifiable et accessible**,
So that **les clients peuvent utiliser leurs outils en autonomie et Elio One dispose d'une base de connaissances precise**.

**Acceptance Criteria:**

**Given** chaque module developpe doit avoir une documentation obligatoire (FR158)
**When** un module est cree dans `packages/modules/[nom]/`
**Then** la structure suivante est requise :
```
packages/modules/[nom]/
  docs/
    guide.md      # Guide utilisateur pas-a-pas
    faq.md        # Questions frequentes
    flows.md      # Diagrammes de flux / parcours utilisateur
```
**And** le contrat ModuleManifest est etendu avec :
```typescript
export interface ModuleManifest {
  // ... champs existants ...
  documentation: {
    hasGuide: boolean     // docs/guide.md existe et n'est pas vide
    hasFaq: boolean       // docs/faq.md existe et n'est pas vide
    hasFlows: boolean     // docs/flows.md existe et n'est pas vide
  }
}
```
**And** un script de validation `scripts/check-module-docs.ts` verifie que tous les modules actifs ont les 3 fichiers de documentation
**And** ce script est execute en CI (pre-deploy) — un module sans documentation ne peut PAS etre deploye

**Given** la documentation module est accessible au client (FR159)
**When** un client One consulte le module Documents
**Then** une section "Documentation" affiche les guides de chaque module actif :
- Organisee par module (un onglet ou accordeon par module)
- Le guide.md est rendu en HTML (Markdown → HTML)
- La FAQ est affichee en format accordeon (question cliquable → reponse)
- Les flows sont affiches comme images/diagrammes
**And** la documentation est chargee depuis les fichiers `docs/` du module (servis par l'API de l'instance)
**And** un champ de recherche textuelle permet de chercher dans toute la documentation

**Given** la documentation alimente Elio One (FR160)
**When** Elio One recoit une question d'un client
**Then** le system prompt de Elio One inclut la documentation de tous les modules actifs :
- Le contenu de `guide.md`, `faq.md` et `flows.md` est injecte dans le contexte
- Si le client pose une question sur un module specifique, Elio repond en s'appuyant sur la documentation
- Si la documentation ne couvre pas la question, Elio repond :
  "Je n'ai pas cette information dans ma documentation. Voulez-vous que je transmette votre question a MiKL ?"
**And** la documentation est cachee en memoire (refreshed au deploy) pour eviter de la relire a chaque conversation
**And** pour les modules avec beaucoup de documentation, seuls les fichiers du module concerne sont injectes (pas toute la doc de tous les modules a chaque conversation)

**Given** la documentation est incluse dans l'export client (FR161)
**When** un client One quitte MonprojetPro (Story 9.5 — procedure de sortie)
**Then** l'export inclut :
- Un dossier `documentation/` avec un sous-dossier par module actif
- Chaque sous-dossier contient : guide.md, faq.md, flows.md
- Un fichier `documentation/README.md` listant tous les modules documentes
**And** la documentation fait partie du "Guide d'autonomie" fourni au client

---

## Resume Epic 12 — Couverture FRs

| Story | Titre | FRs couvertes |
|-------|-------|---------------|
| 12.1 | Module Admin — logs d'activite & mode maintenance | FR102, FR103 |
| 12.2 | Export complet donnees client & backups automatiques | FR104, FR105 |
| 12.3 | Templates reutilisables — parcours Lab & emails | FR137, FR138 |
| 12.4 | Analytics & metriques d'usage | FR120, FR121 |
| 12.5a | Monitoring sante systeme & alertes dysfonctionnement | FR147, FR148 |
| 12.5b | Preparation integrations P2 — Webhooks & API | FR115, FR116 |
| 12.6 | Provisioning instance One depuis le Hub | FR153, FR155, FR156 |
| 12.7 | Monitoring instances One — usage, seuils & alertes | FR162, FR163, FR164, FR165 |
| 12.8 | Documentation obligatoire par module & verification | FR158, FR159, FR160, FR161 |

**Toutes les 20 FRs de l'Epic 12 sont couvertes.**
