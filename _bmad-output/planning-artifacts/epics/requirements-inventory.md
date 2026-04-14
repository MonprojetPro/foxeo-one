# Requirements Inventory

## Functional Requirements

**Total : 170 FRs** couvrant l'ensemble de l'ecosysteme MonprojetPro (Hub, Lab, One).
> Mis a jour 08/02/2026 : FR153-168 (propriete client, instance dediee, documentation livrable, surveillance usage).
> Mis a jour 08/02/2026 : FR169-170 (facturation forfait Lab 199€, deduction setup One).

### Hub — Gestion Clients
| ID | Functional Requirement |
|----|------------------------|
| FR1 | MiKL peut creer une fiche client (nom, entreprise, contact, secteur) |
| FR2 | MiKL peut definir le type de client (Complet, Direct One, Ponctuel) |
| FR3 | MiKL peut voir la liste de tous ses clients avec leur statut (Lab actif, One actif, Ponctuel) |
| FR4 | MiKL peut consulter la fiche complete d'un client (infos, historique, documents, echanges) |
| FR5 | MiKL peut assigner un parcours Lab a un client (type + etapes actives) |
| FR6 | MiKL peut activer/desactiver l'acces Lab ou One d'un client |
| FR7 | MiKL peut ouvrir le dossier BMAD d'un client dans Cursor |

### Hub — Validation Hub
| ID | Functional Requirement |
|----|------------------------|
| FR8 | MiKL peut voir les demandes en attente de validation (briefs Lab, evolutions One) |
| FR9 | MiKL peut consulter le contexte complet d'une demande (besoin, historique client, priorite) |
| FR10 | MiKL peut valider une demande (brief, livrable) |
| FR11 | MiKL peut refuser une demande avec commentaire |
| FR12 | MiKL peut demander des precisions sur une demande |
| FR13 | MiKL peut choisir une action de traitement (Reactiver Lab, Programmer Visio, Dev direct, Reporter) |
| FR14 | Le client est notifie automatiquement du traitement de sa demande |

### Orpheus — Cerveau MonprojetPro (Cursor/BMAD) — HORS PERIMETRE APPLICATIF
| ID | Functional Requirement |
|----|------------------------|
| FR15 | Orpheus (dans Cursor) peut analyser une transcription de visio client |
| FR16 | Orpheus peut generer un Brief Initial structure a partir d'une transcription |
| FR17 | Orpheus peut detecter le profil de communication d'un client |
| FR18 | Orpheus peut recommander un type de parcours Lab |
| FR19 | Orpheus peut generer une config Elio (client_config.yaml) |
| FR20 | Orpheus accumule les apprentissages metier MonprojetPro (pricing, patterns, durees) |
| FR20b | Orpheus peut generer des estimations prix |
| FR20c | Orpheus peut generer des docs techniques |
| FR20d | Orpheus peut retravailler docs brainstorming Lab |

### Hub — Elio Hub (Assistant MiKL)
| ID | Functional Requirement |
|----|------------------------|
| FR21 | MiKL peut interagir avec Elio Hub dans le dashboard |
| FR22 | Elio Hub peut aider MiKL sur les fonctionnalites du Hub |
| FR23 | Elio Hub peut rechercher des informations clients |
| FR24 | Elio Hub peut corriger et adapter la redaction de MiKL au profil client |
| FR25 | Elio Hub peut generer des brouillons de reponses (emails, messages Validation Hub) |

### Lab — Parcours Creation
| ID | Functional Requirement |
|----|------------------------|
| FR26 | Le client Lab peut voir son parcours assigne (etapes actives) |
| FR27 | Le client Lab peut voir sa progression dans le parcours |
| FR28 | Le client Lab peut consulter les briefs produits a chaque etape |
| FR29 | Le client Lab peut soumettre un brief pour validation MiKL |
| FR30 | Le client Lab est notifie quand un brief est valide/refuse |
| FR31 | Le client Lab peut voir un teasing de MonprojetPro One (motivation graduation) |

### Lab — Elio Lab (Agent Accompagnement)
| ID | Functional Requirement |
|----|------------------------|
| FR32 | Le client Lab peut converser avec Elio Lab |
| FR33 | Elio Lab pose les questions guidees selon l'etape active |
| FR34 | Elio Lab genere les briefs a partir des reponses client |
| FR35 | Elio Lab adapte son ton selon le profil de communication du client |
| FR36 | Elio Lab soumet automatiquement les briefs au Validation Hub |
| FR37 | Elio Lab recoit et applique la config generee par Orpheus |

### One — Structure Dashboard
| ID | Functional Requirement |
|----|------------------------|
| FR38 | Le client One peut acceder a son dashboard personnalise |
| FR39 | Le client One peut voir les modules actives pour lui |
| FR40 | Le client One peut consulter ses documents (briefs herites du Lab, livrables) |
| FR41 | Le client One peut voir un teasing du Lab (si nouveau projet) |
| FR42 | MiKL peut configurer les modules actifs pour chaque client One |
| FR43 | MiKL peut injecter de la documentation dans Elio One apres un deploiement |

### One — Elio One (Agent Client)
| ID | Functional Requirement |
|----|------------------------|
| FR44 | Le client One peut converser avec Elio One |
| FR45 | Elio One peut repondre aux questions sur les fonctionnalites |
| FR46 | Elio One peut guider le client dans son dashboard |
| FR47 | Elio One peut collecter une demande d'evolution et la soumettre |
| FR48 | Elio One+ peut executer des actions sur les modules actifs |
| FR49 | Elio One+ peut generer des documents |
| FR50 | Elio One+ peut alerter proactivement le client |
| FR51 | Elio One herite du contexte Lab (profil comm, briefs, historique) |

### Commun — Authentification & Securite
| ID | Functional Requirement |
|----|------------------------|
| FR52 | Les clients peuvent se connecter avec email + mot de passe |
| FR53 | MiKL peut se connecter avec email + mot de passe + 2FA |
| FR54 | Le systeme gere les sessions (access token, refresh, inactivite) |
| FR55 | Chaque client ne peut acceder qu'a ses propres donnees (RLS) |
| FR56 | Les actions sensibles requierent une confirmation |

### Commun — Communication
| ID | Functional Requirement |
|----|------------------------|
| FR57 | Le client peut echanger avec MiKL via chat asynchrone |
| FR58 | Le client peut consulter l'historique de ses visios avec MiKL |
| FR59 | Le client peut consulter les transcriptions de ses visios |
| FR60 | Le client peut demander une visio avec MiKL |
| FR61 | Le systeme envoie des notifications (validation, messages, alertes) |

### Commun — Documents
| ID | Functional Requirement |
|----|------------------------|
| FR62 | Le client peut consulter ses documents dans le dashboard (rendu HTML) |
| FR63 | Le client peut telecharger ses documents en PDF |
| FR64 | MiKL peut partager un document avec un client (visible/non visible) |
| FR65 | Les documents valides sont copies dans le dossier BMAD local |

### Commun — Profil Communication
| ID | Functional Requirement |
|----|------------------------|
| FR66 | Le systeme stocke le profil de communication de chaque client |
| FR67 | Le profil est detecte par Orpheus et affine par Elio Lab |
| FR68 | Le profil est transmis a Elio One lors de la graduation |
| FR69 | Les agents adaptent leur ton selon le profil (tutoiement, longueur, style) |

### Onboarding & Parcours
| ID | Functional Requirement |
|----|------------------------|
| FR70 | Le nouveau client Lab voit un ecran de bienvenue a sa premiere connexion |
| FR71 | Le client Lab peut acceder a un tutoriel de prise en main |
| FR72 | Le client One voit un ecran de graduation avec recapitulatif de son parcours Lab |
| FR73 | Le systeme affiche des etats vides explicatifs (pas de document, pas de message) |

### Graduation Lab → One
| ID | Functional Requirement |
|----|------------------------|
| FR74 | MiKL peut declencher la graduation d'un client Lab vers One |
| FR75 | Le systeme migre automatiquement le contexte Lab vers One (profil, briefs, historique) |
| FR76 | Le client recoit une notification de graduation avec acces a son nouveau dashboard |

### Gestion MiKL Avancee
| ID | Functional Requirement |
|----|------------------------|
| FR77 | MiKL peut creer et envoyer un devis a un client |
| FR78 | MiKL peut suivre le statut d'un devis (envoye, accepte, refuse) |
| FR79 | MiKL peut ajouter des notes privees sur un client (non visibles par le client) |
| FR80 | MiKL peut voir des statistiques globales (clients actifs, taux graduation, revenus) |
| FR81 | MiKL peut voir le temps passe estime par client |

### Gestion des Erreurs & Edge Cases
| ID | Functional Requirement |
|----|------------------------|
| FR82 | Le systeme affiche un message explicite en cas d'erreur (pas d'ecran blanc) |
| FR83 | Le systeme gere gracieusement les timeouts API Elio |
| FR84 | Le systeme alerte MiKL si un client Lab est inactif depuis X jours |
| FR85 | Le systeme archive (pas supprime) les donnees d'un client desactive |

### Synchronisation & Technique
| ID | Functional Requirement |
|----|------------------------|
| FR86 | Le systeme synchronise les documents valides vers le dossier BMAD local |
| FR87 | Le systeme garde un historique des configs Elio par client |

### Parcours Alternatifs & Cycle de Vie
| ID | Functional Requirement |
|----|------------------------|
| FR88 | Le client Lab peut demander a abandonner son parcours |
| FR89 | MiKL peut suspendre ou cloturer un client (avec archivage donnees) |
| FR90 | MiKL peut upgrader un client ponctuel vers Lab ou One |
| FR91 | MiKL peut changer le tier d'abonnement d'un client One |
| FR92 | Le client peut demander l'export de toutes ses donnees (RGPD) |
| FR93 | Le systeme conserve les donnees d'un client resilie pendant une periode definie avant suppression |

### Facturation & Abonnements
| ID | Functional Requirement |
|----|------------------------|
| FR94 | Le systeme gere les abonnements recurrents via Stripe |
| FR95 | Le systeme notifie MiKL et le client en cas d'echec de paiement recurrent |
| FR96 | Le client peut consulter son historique de facturation |
| FR97 | MiKL peut generer un avoir pour un client |
| FR98 | Le client peut mettre a jour ses informations de paiement |

### Notifications & Preferences
| ID | Functional Requirement |
|----|------------------------|
| FR99 | Le systeme envoie des notifications par email ET in-app |
| FR100 | Le client peut configurer ses preferences de notification |
| FR101 | MiKL peut configurer les notifications pour un client specifique |

### Administration & Monitoring
| ID | Functional Requirement |
|----|------------------------|
| FR102 | MiKL peut consulter les logs d'activite par client |
| FR103 | MiKL peut activer un mode maintenance avec message aux clients |
| FR104 | MiKL peut declencher un export complet des donnees d'un client |
| FR105 | Le systeme effectue des backups automatiques avec possibilite de restauration |

### Recherche & Navigation
| ID | Functional Requirement |
|----|------------------------|
| FR106 | MiKL peut rechercher rapidement parmi tous ses clients |
| FR107 | Le client peut rechercher dans ses documents |
| FR108 | Le systeme affiche un fil d'ariane indiquant la position dans l'interface |

### Support & Feedback
| ID | Functional Requirement |
|----|------------------------|
| FR109 | Le client peut signaler un probleme ou bug depuis l'interface |
| FR110 | MiKL peut consulter les problemes signales par les clients |
| FR111 | Le client peut acceder a une aide en ligne / FAQ dans l'app |

### Multi-Device & Sessions
| ID | Functional Requirement |
|----|------------------------|
| FR112 | Le systeme supporte les connexions simultanees sur plusieurs appareils |
| FR113 | MiKL peut forcer la deconnexion de toutes les sessions d'un client |
| FR114 | Le client peut voir ses sessions actives et en revoquer |

### Preparation Integrations (Structure P2)
| ID | Functional Requirement |
|----|------------------------|
| FR115 | Le systeme prevoit une structure pour webhooks sortants (P2) |
| FR116 | Le systeme prevoit une structure pour API client (P2) |

### Accessibilite & Responsive
| ID | Functional Requirement |
|----|------------------------|
| FR117 | Les dashboards sont utilisables sur mobile et tablette (responsive) |
| FR118 | Les dashboards respectent les standards d'accessibilite de base (contraste, navigation clavier) |
| FR119 | Le systeme prevoit une structure multi-langue (P3) |

### Analytics & Metriques
| ID | Functional Requirement |
|----|------------------------|
| FR120 | Le systeme collecte des metriques d'usage anonymisees |
| FR121 | MiKL peut consulter des statistiques d'utilisation par fonctionnalite |

### Experience Elio Detaillee
| ID | Functional Requirement |
|----|------------------------|
| FR122 | Le systeme affiche un indicateur visuel quand Elio reflechit |
| FR123 | L'historique des conversations Elio est persistant entre sessions |
| FR124 | Le client peut demarrer une nouvelle conversation Elio (sans perdre l'historique) |
| FR125 | Elio peut envoyer des documents generes directement dans le chat |
| FR126 | Le client peut donner un feedback sur une reponse Elio (utile/pas utile) |

### Temps Reel & Synchronisation
| ID | Functional Requirement |
|----|------------------------|
| FR127 | Les notifications apparaissent en temps reel (sans rechargement) |
| FR128 | Le systeme gere les conflits de modification concurrente |
| FR129 | Le systeme indique si le client/MiKL est actuellement en ligne |

### Workflow MiKL Quotidien
| ID | Functional Requirement |
|----|------------------------|
| FR130 | MiKL peut marquer un element comme "a traiter plus tard" |
| FR131 | MiKL peut epingler des clients prioritaires |
| FR132 | MiKL peut creer des rappels personnels (tache + date) |
| FR133 | MiKL peut voir un calendrier de ses rappels et deadlines |

### Feedback & UX
| ID | Functional Requirement |
|----|------------------------|
| FR134 | Le systeme affiche des messages de confirmation apres chaque action |
| FR135 | Les formulaires longs sauvegardent automatiquement en brouillon |
| FR136 | Le client peut annuler certaines actions recentes (undo) |

### Templates & Personnalisation
| ID | Functional Requirement |
|----|------------------------|
| FR137 | MiKL peut creer des templates de parcours Lab reutilisables |
| FR138 | MiKL peut personnaliser les templates d'emails automatiques |
| FR139 | MiKL peut personnaliser le branding du dashboard One (logo, couleurs) |

### Legal & Consentements
| ID | Functional Requirement |
|----|------------------------|
| FR140 | Le client doit accepter les CGU lors de son inscription |
| FR141 | Le systeme notifie les clients des mises a jour de CGU |
| FR142 | Le systeme demande un consentement explicite pour le traitement IA |
| FR143 | Le systeme conserve une trace horodatee des consentements |

### Gestion des Fichiers
| ID | Functional Requirement |
|----|------------------------|
| FR144 | Le systeme limite la taille des fichiers uploades |
| FR145 | Le systeme valide le type des fichiers uploades |
| FR146 | Le client peut organiser ses documents en dossiers |

### Etat Systeme & Monitoring
| ID | Functional Requirement |
|----|------------------------|
| FR147 | MiKL peut voir un indicateur de sante du systeme |
| FR148 | Le systeme alerte MiKL en cas de dysfonctionnement |

### Import/Export Avance
| ID | Functional Requirement |
|----|------------------------|
| FR149 | MiKL peut importer des clients en masse (CSV) |
| FR150 | Les exports sont disponibles en formats standards (CSV, JSON, PDF) |

### Robustesse Technique
| ID | Functional Requirement |
|----|------------------------|
| FR151 | Le systeme affiche un message explicite si le navigateur n'est pas supporte |
| FR152 | Le systeme gere gracieusement les connexions instables (retry, messages) |

## NonFunctional Requirements

**Total : 39 NFRs** definissant les criteres de qualite du systeme.

### Performance
| ID | NFR |
|----|-----|
| NFR-P1 | Les pages du dashboard se chargent en moins de 2 secondes (First Contentful Paint) |
| NFR-P2 | Les actions utilisateur (clic, soumission) repondent en moins de 500ms |
| NFR-P3 | Elio repond (premier token) en moins de 3 secondes |
| NFR-P4 | La recherche retourne des resultats en moins de 1 seconde |
| NFR-P5 | Les notifications temps reel apparaissent en moins de 2 secondes apres l'evenement |
| NFR-P6 | L'export PDF d'un document se genere en moins de 5 secondes |

### Securite
| ID | NFR |
|----|-----|
| NFR-S1 | Toutes les communications utilisent HTTPS/TLS 1.3 |
| NFR-S2 | Les donnees sensibles sont chiffrees au repos (AES-256) |
| NFR-S3 | Les mots de passe sont haches avec Argon2 |
| NFR-S4 | Les sessions expirent apres 8h d'inactivite |
| NFR-S5 | Le systeme bloque apres 5 tentatives de login echouees (5 min) |
| NFR-S6 | Les tokens API ne sont affiches qu'une seule fois a la creation |
| NFR-S7 | Les donnees d'un client sont isolees des autres (RLS Supabase) |
| NFR-S8 | Les cles API LLM ne transitent jamais cote client |
| NFR-S9 | Le systeme est conforme RGPD (export, suppression, consentement) |

### Scalabilite
| ID | NFR |
|----|-----|
| NFR-SC1 | Le systeme supporte 50 clients simultanes sans degradation |
| NFR-SC2 | Le systeme supporte 100 requetes Elio/heure par client |
| NFR-SC3 | Le stockage supporte 1 Go/client minimum |
| NFR-SC4 | L'architecture permet une migration vers VPS dedie sans refonte |

### Accessibilite
| ID | NFR |
|----|-----|
| NFR-A1 | Les dashboards sont utilisables sur ecrans >=320px (mobile) |
| NFR-A2 | Le contraste texte/fond respecte WCAG AA (ratio 4.5:1) |
| NFR-A3 | La navigation au clavier est fonctionnelle sur toutes les pages |
| NFR-A4 | Les elements interactifs ont des labels accessibles |

### Integrations
| ID | NFR |
|----|-----|
| NFR-I1 | Les appels Stripe timeout apres 30 secondes avec retry |
| NFR-I2 | Les appels DeepSeek timeout apres 60 secondes avec message gracieux |
| NFR-I3 | Les webhooks Stripe sont traites en moins de 5 secondes |
| NFR-I4 | Les emails transactionnels sont envoyes en moins de 10 secondes |
| NFR-I5 | Le systeme gere les indisponibilites des services tiers avec messages explicites |

### Fiabilite & Disponibilite
| ID | NFR |
|----|-----|
| NFR-R1 | Le systeme vise une disponibilite de 99.5% (hors maintenance planifiee) |
| NFR-R2 | Les backups sont effectues quotidiennement avec retention 30 jours |
| NFR-R3 | Le RPO (perte de donnees max) est de 24h |
| NFR-R4 | Le RTO (temps de restauration) est de 4h |
| NFR-R5 | Les erreurs sont loguees avec contexte pour diagnostic |
| NFR-R6 | Le systeme reste fonctionnel si un service externe est down (mode degrade) |

### Maintenabilite & Qualite Code
| ID | NFR |
|----|-----|
| NFR-M1 | Chaque FR est couverte par des tests unitaires (couverture >80%) |
| NFR-M2 | Le code passe un linting sans erreur avant commit |
| NFR-M3 | Chaque deploiement inclut une phase de nettoyage/refactoring |
| NFR-M4 | Les dependances sont mises a jour mensuellement (securite) |
| NFR-M5 | Le code suit les conventions du projet (documentees) |

## Additional Requirements

### Architecture — Fondation existante et decisions structurantes

- **Starter Template** : Monorepo Turborepo existant avec Next.js 16.1, React 19, Tailwind CSS 4, TypeScript, Vitest. Packages existants : @monprojetpro/ui, @monprojetpro/utils, @monprojetpro/tsconfig. A ajouter : @supabase/supabase-js ^2.95.x, @supabase/ssr, @tanstack/react-query ^5.90.x, zustand ^5.0.x, react-hook-form ^7.71.x
- **2 applications Next.js** : apps/hub/ (MonprojetPro-Hub, operateur MiKL) + apps/client/ (dashboard unifie Lab+One). Deploiement independant : hub.monprojet-pro.com / app.monprojet-pro.com
- **15 modules plug & play** avec contrat ModuleManifest strict (id, name, version, navigation, routes, apiRoutes, requiredTables, targets, dependencies). Modules : core-dashboard, chat, elio, documents, visio, crm, notifications, facturation, parcours-lab, validation-hub, agenda, analytics, admin, historique-lab, templates
- **Multi-tenancy natif** : table operators (MiKL = operator_id: 1), RLS par operator_id + client_id, prepare pour commercialisation du Hub
- **Configuration-driven** via table client_config (active_modules, dashboard_type, theme_variant, custom_branding, elio_config, parcours_config)
- **Auth triple couche** : RLS (donnees Supabase) + Middleware Next.js (routes) + UI (composants). Middleware hub verifie admin+2FA, middleware client verifie client_id+config
- **3 patterns data fetching stricts** : Server Components RSC (lecture), Server Actions (mutation), API Routes (webhooks externes uniquement). Aucun cas gris autorise
- **Pattern reponse unique** : { data, error } partout (style Supabase), jamais de throw dans Server Actions
- **TanStack Query** = source de verite donnees serveur. Zustand = etat UI uniquement. Realtime invalide le cache TanStack Query
- **Deploiement** : Vercel auto-deploy (frontend) + VPS Docker Compose (OpenVidu, Cal.com) + Pennylane API v2 (SaaS facturation/compta). 3 environnements : dev local, preview Vercel, production
- **15 migrations Supabase** planifiees : operators, clients, client_configs, module_manifests, messages, documents, notifications, meetings, parcours, validation_requests, elio_conversations, activity_logs, consents, rls_policies, rls_functions
- **5 quality gates CI** bloquants : tests RLS isolation, contract tests modules, lint + TypeScript strict, tests unitaires >80%, build successful
- **Tests co-localises** : *.test.ts a cote du fichier source, pas de dossier __tests__ separe
- **Skeleton loaders obligatoires** par module (loading.tsx), jamais de spinners
- **Conventions nommage** : DB=snake_case, API/JSON=camelCase, fichiers=kebab-case, composants=PascalCase
- **Transformation snake_case<->camelCase** a la frontiere DB/API via helper @monprojetpro/utils
- **Services des le MVP** : OpenVidu self-hosted (visio+enregistrement+transcription), Cal.com self-hosted (prise de RDV), Pennylane SaaS (facturation, devis, abonnements, compta, conformite facturation electronique sept. 2026)
- **Monitoring** : Vercel Analytics + Supabase Dashboard + Sentry
- **Premiere priorite implementation** : 1) Setup monorepo (packages/supabase, packages/types, turbo tasks) 2) Migrations Supabase 3) Module core-dashboard + shell 4) Auth flow 5) Premier module metier

### UX Design — Specifications visuelles et interaction

- **Style "Minimal Futuriste"** : Dark mode pour les 3 dashboards, fond noir profond (#020402)
- **3 palettes couleurs distinctes** : Hub (Cyan/Turquoise), Lab (Violet/Purple), One (Orange vif + Bleu-gris) sur base noir profond commune
- **Desktop first + Responsive** des V1, app native mobile V2/V3
- **Composants** : shadcn/ui + Radix UI + Tremor (300+ blocks dashboard)
- **Typographie** : Poppins (titres/UI) + Inter (corps)
- **Format couleurs** : OKLCH (Tailwind CSS v4 ready)
- **Densite adaptee** : Hub=compact (data-dense), Lab=spacious (emotionnel), One=comfortable (operationnel)
- **2 chats distincts** : Chat Elio (IA, prive client, MiKL n'y a PAS acces) + Chat MiKL (direct humain, MiKL y a acces complet)
- **Systeme d'escalade** : Elio propose l'escalade vers MiKL quand il ne sait pas repondre
- **Flux onboarding prospect** : Points d'entree (QR, LinkedIn, Site, Mobile) -> Cal.com -> Salle d'attente (formulaire + API INSEE SIRET) -> OpenVidu (enregistre) -> Hub MiKL (choix statut Chaud/Tiede/Froid/Non)
- **Statuts post-visio** avec comportements differencies : email adapte, relance auto ou non, statut CRM
- **Graduation Lab -> One** : animation de passage, message d'accueil, pas de changement de couleur brutal
- **Zero friction actions recurrentes** : Valider, repondre, avancer = 1-2 clics max
- **Progression visible partout** : barres de progression, celebrations
- **Elio omnipresent mais discret** : disponible sans etre intrusif
- **Etats vides explicatifs** : messages engageants quand pas de contenu

### Modules Commerciaux — Options et tarification

- **7 modules commerciaux** disponibles pour clients One : Signature electronique (Yousign API), Calendrier synchronise (Google/Microsoft/Apple APIs), Branding (interne), Site Web (interne), SEO (Google Search Console + option SEMrush/Ahrefs), Reseaux Sociaux (APIs natives Meta/LinkedIn), Maintenance (interne)
- **Activation automatique** des modules selon prestation commandee (branding -> module Branding, site -> module Site Web, etc.)
- **Grille tarifaire ONE** : abonnement de base (dashboard, chat Elio, suivi projet, documents, 5 signatures/mois, sync calendrier) + options additionnelles (signatures illimitees +15EUR/mois, SEO avance +25EUR/mois, reseaux sociaux autonome +20EUR/mois, support prioritaire +30EUR/mois)
- **Interface ClientModules** TypeScript definissant la configuration par module (enabled, plan, usage, connectedCalendars, etc.)

## FR Coverage Map

| FR | Epic | Description |
|----|------|-------------|
| FR1 | Epic 2 | Creer fiche client |
| FR2 | Epic 2 | Definir type client |
| FR3 | Epic 2 | Liste clients avec statut |
| FR4 | Epic 2 | Fiche complete client |
| FR5 | Epic 2 | Assigner parcours Lab |
| FR6 | Epic 2 | Activer/desactiver acces |
| FR7 | Epic 2 | Ouvrir dossier BMAD Cursor |
| FR8 | Epic 7 | Voir demandes en attente |
| FR9 | Epic 7 | Contexte complet demande |
| FR10 | Epic 7 | Valider demande |
| FR11 | Epic 7 | Refuser avec commentaire |
| FR12 | Epic 7 | Demander precisions |
| FR13 | Epic 7 | Choisir action traitement |
| FR14 | Epic 7 | Notification auto client |
| FR15 | HP | Orpheus - analyser transcription (hors perimetre) |
| FR16 | HP | Orpheus - generer brief (hors perimetre) |
| FR17 | HP | Orpheus - detecter profil comm (hors perimetre) |
| FR18 | HP | Orpheus - recommander parcours (hors perimetre) |
| FR19 | HP | Orpheus - generer config Elio (hors perimetre) |
| FR20 | HP | Orpheus - apprentissages metier (hors perimetre) |
| FR20b | HP | Orpheus - estimations prix (hors perimetre) |
| FR20c | HP | Orpheus - docs techniques (hors perimetre) |
| FR20d | HP | Orpheus - retravailler docs (hors perimetre) |
| FR21 | Epic 8 | Interagir avec Elio Hub |
| FR22 | Epic 8 | Elio Hub aide fonctionnalites |
| FR23 | Epic 8 | Elio Hub recherche clients |
| FR24 | Epic 8 | Elio Hub adapter redaction |
| FR25 | Epic 8 | Elio Hub brouillons reponses |
| FR26 | Epic 6 | Client Lab voir parcours |
| FR27 | Epic 6 | Client Lab progression |
| FR28 | Epic 6 | Client Lab consulter briefs |
| FR29 | Epic 6 | Client Lab soumettre brief |
| FR30 | Epic 6 | Client Lab notifie validation |
| FR31 | Epic 6 | Client Lab teasing One |
| FR32 | Epic 6 | Converser Elio Lab |
| FR33 | Epic 6 | Elio Lab questions guidees |
| FR34 | Epic 6 | Elio Lab generer briefs |
| FR35 | Epic 6 | Elio Lab adapter ton |
| FR36 | Epic 6 | Elio Lab soumettre auto |
| FR37 | Epic 6 | Elio Lab appliquer config |
| FR38 | Epic 10 | Client One dashboard personnalise |
| FR39 | Epic 10 | Client One modules actives |
| FR40 | Epic 10 | Client One documents herites |
| FR41 | Epic 10 | Client One teasing Lab |
| FR42 | Epic 10 | MiKL configurer modules |
| FR43 | Epic 10 | MiKL injecter doc Elio |
| FR44 | Epic 8 | Client One converser Elio |
| FR45 | Epic 8 | Elio One FAQ |
| FR46 | Epic 8 | Elio One guidance |
| FR47 | Epic 8 | Elio One demande evolution |
| FR48 | Epic 8 | Elio One+ actions |
| FR49 | Epic 8 | Elio One+ documents |
| FR50 | Epic 8 | Elio One+ alertes |
| FR51 | Epic 8 | Elio One heritage contexte Lab |
| FR52 | Epic 1 | Login client email+mdp |
| FR53 | Epic 1 | Login MiKL email+mdp+2FA |
| FR54 | Epic 1 | Gestion sessions |
| FR55 | Epic 1 | Isolation donnees RLS |
| FR56 | Epic 1 | Confirmation actions sensibles |
| FR57 | Epic 3 | Chat asynchrone MiKL-client |
| FR58 | Epic 5 | Historique visios |
| FR59 | Epic 5 | Transcriptions visios |
| FR60 | Epic 5 | Demander visio |
| FR61 | Epic 3 | Notifications systeme |
| FR62 | Epic 4 | Consulter documents HTML |
| FR63 | Epic 4 | Telecharger PDF |
| FR64 | Epic 4 | Partager document |
| FR65 | Epic 4 | Copie dossier BMAD |
| FR66 | Epic 8 | Stocker profil communication |
| FR67 | Epic 8 | Profil detecte par Orpheus affine par Elio |
| FR68 | Epic 8 | Profil transmis a Elio One |
| FR69 | Epic 8 | Agents adaptent ton selon profil |
| FR70 | Epic 5 | Ecran bienvenue premiere connexion |
| FR71 | Epic 5 | Tutoriel prise en main |
| FR72 | Epic 5 | Ecran graduation recapitulatif |
| FR73 | Epic 1 | Etats vides explicatifs |
| FR74 | Epic 9 | Declencher graduation |
| FR75 | Epic 9 | Migration auto contexte Lab-One |
| FR76 | Epic 9 | Notification graduation |
| FR77 | Epic 11 | Creer et envoyer devis |
| FR78 | Epic 11 | Suivre statut devis |
| FR79 | Epic 2 | Notes privees client |
| FR80 | Epic 2 | Statistiques globales |
| FR81 | Epic 2 | Temps passe par client |
| FR82 | Epic 1 | Messages erreur explicites |
| FR83 | Epic 8 | Gestion timeouts API Elio |
| FR84 | Epic 2 | Alerte client Lab inactif |
| FR85 | Epic 2 | Archivage donnees client desactive |
| FR86 | Epic 4 | Sync documents vers BMAD local |
| FR87 | Epic 8 | Historique configs Elio |
| FR88 | Epic 9 | Client Lab abandon parcours |
| FR89 | Epic 2 | Suspendre/cloturer client |
| FR90 | Epic 2 | Upgrader client ponctuel |
| FR91 | Epic 9 | Changer tier abonnement |
| FR92 | Epic 9 | Export donnees RGPD |
| FR93 | Epic 9 | Retention donnees resiliation |
| FR94 | Epic 11 | Abonnements recurrents Stripe |
| FR95 | Epic 11 | Notification echec paiement |
| FR96 | Epic 11 | Historique facturation |
| FR97 | Epic 11 | Generer avoir |
| FR98 | Epic 11 | MAJ informations paiement |
| FR99 | Epic 3 | Notifications email + in-app |
| FR100 | Epic 3 | Preferences notification client |
| FR101 | Epic 3 | Config notifications par client |
| FR102 | Epic 12 | Logs activite par client |
| FR103 | Epic 12 | Mode maintenance |
| FR104 | Epic 12 | Export complet donnees client |
| FR105 | Epic 12 | Backups automatiques |
| FR106 | Epic 2 | Recherche rapide clients |
| FR107 | Epic 4 | Recherche dans documents |
| FR108 | Epic 1 | Fil d'ariane |
| FR109 | Epic 3 | Signaler probleme/bug |
| FR110 | Epic 3 | Consulter problemes signales |
| FR111 | Epic 3 | Aide en ligne / FAQ |
| FR112 | Epic 1 | Connexions simultanees multi-device |
| FR113 | Epic 1 | Forcer deconnexion sessions |
| FR114 | Epic 1 | Voir/revoquer sessions actives |
| FR115 | Epic 12 | Structure webhooks sortants P2 |
| FR116 | Epic 12 | Structure API client P2 |
| FR117 | Epic 1 | Responsive mobile/tablette |
| FR118 | Epic 1 | Accessibilite WCAG AA |
| FR119 | Epic 1 | Structure multi-langue P3 |
| FR120 | Epic 12 | Metriques usage anonymisees |
| FR121 | Epic 12 | Stats utilisation par fonctionnalite |
| FR122 | Epic 8 | Indicateur Elio reflechit |
| FR123 | Epic 8 | Historique conversations persistant |
| FR124 | Epic 8 | Nouvelle conversation sans perte |
| FR125 | Epic 8 | Documents dans chat Elio |
| FR126 | Epic 8 | Feedback reponse Elio |
| FR127 | Epic 3 | Notifications temps reel |
| FR128 | Epic 3 | Conflits modification concurrente |
| FR129 | Epic 3 | Indicateur en ligne |
| FR130 | Epic 2 | Marquer a traiter plus tard |
| FR131 | Epic 2 | Epingler clients prioritaires |
| FR132 | Epic 2 | Creer rappels personnels |
| FR133 | Epic 2 | Calendrier rappels/deadlines |
| FR134 | Epic 1 | Messages confirmation actions |
| FR135 | Epic 4 | Autosave brouillons formulaires |
| FR136 | Epic 4 | Undo actions recentes |
| FR137 | Epic 12 | Templates parcours Lab |
| FR138 | Epic 12 | Templates emails automatiques |
| FR139 | Epic 10 | Personnaliser branding dashboard One |
| FR140 | Epic 1 | Accepter CGU inscription |
| FR141 | Epic 1 | Notification MAJ CGU |
| FR142 | Epic 1 | Consentement traitement IA |
| FR143 | Epic 1 | Trace horodatee consentements |
| FR144 | Epic 4 | Limite taille fichiers |
| FR145 | Epic 4 | Validation type fichiers |
| FR146 | Epic 4 | Organiser documents en dossiers |
| FR147 | Epic 12 | Indicateur sante systeme |
| FR148 | Epic 12 | Alerte dysfonctionnement |
| FR149 | Epic 2 | Import clients CSV |
| FR150 | Epic 4 | Export formats standards |
| FR151 | Epic 1 | Message navigateur non supporte |
| FR152 | Epic 1 | Gestion connexions instables |
| FR153 | Epic 12 (Story 12.6) | Instance deployee dediee par client One |
| FR154 | Epic 10 | Client One proprietaire code + donnees |
| FR155 | Epic 1 | Communication Hub↔One via API REST + HMAC |
| FR156 | Epic 12 (Story 12.6) | Provisioning instance One via Hub |
| FR157 | Epic 9 (Story 9.5) | Client quitte One = export code + DB + docs |
| FR158 | Epic 12 (Story 12.8) | Documentation obligatoire par module |
| FR159 | Epic 12 (Story 12.8) | Documentation accessible via module documents |
| FR160 | Epic 12 (Story 12.8) | Documentation alimente Elio One |
| FR161 | Epic 9 + 12 (Stories 9.5, 12.8) | Documentation incluse dans export client |
| FR162 | Epic 12 (Story 12.7) | Surveillance usage ressources par instance |
| FR163 | Epic 12 (Story 12.7) | Alertes seuils capacite (60/80/95%) |
| FR164 | Epic 12 (Story 12.7) | Tableau de bord sante instances |
| FR165 | Epic 12 (Story 12.7) | Initier upgrade tier instance |
| FR166 | Epic 9 (Story 9.1) | Graduation provisionne instance dediee |
| FR167 | Epic 9 (Story 9.1) | Graduation migre donnees Lab vers instance One |
| FR168 | Epic 9 (Story 9.5) | Lab = propriete MonprojetPro, client recupere documents |
| FR169 | Epic 11 (Story 11.5) | Paiement forfait Lab 199€ + activation dashboard Lab |
| FR170 | Epic 11 (Story 11.5) | Deduction Lab 199€ du setup One si graduation |
