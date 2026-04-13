# Functional Requirements — MonprojetPro Plateforme

**Total : 174 FRs** couvrant l'ensemble de l'écosystème MonprojetPro (Hub, Lab, One).
> Mis à jour le 08/02/2026 : ajout FR153-168 (propriété client, instance dédiée, documentation livrable, surveillance usage).
> Mis à jour le 08/02/2026 : ajout FR169-170 (facturation forfait Lab 199€, déduction setup One).
> Mis à jour le 13/04/2026 (Révision 2) : refonte FR153, FR166, FR167, FR173 + ajout FR171-174. Décision finale : **déploiement multi-tenant unique `app.monprojet-pro.com`** pour tous les clients (Lab et One) pendant l'abonnement, isolation par RLS sur `client_id`. La graduation est une simple bascule de flag, sans provisioning ni migration. Le build standalone et l'infra dédiée n'existent QUE via le « kit de sortie » (Story 13.1, Epic 13 à créer) déclenché à la résiliation. Voir [ADR-01 Révision 2](../architecture/adr-01-lab-one-coexistence-same-instance.md) et [ADR-02](../architecture/adr-02-agents-feature-flags-tree-shaking.md).

## Hub — Gestion Clients

| ID | Functional Requirement |
|----|------------------------|
| FR1 | MiKL peut créer une fiche client (nom, entreprise, contact, secteur) |
| FR2 | MiKL peut définir le type de client (Complet, Direct One, Ponctuel) |
| FR3 | MiKL peut voir la liste de tous ses clients avec leur statut (Lab actif, One actif, Ponctuel) |
| FR4 | MiKL peut consulter la fiche complète d'un client (infos, historique, documents, échanges) |
| FR5 | MiKL peut assigner un parcours Lab à un client (type + étapes actives) |
| FR6 | MiKL peut activer/désactiver l'accès Lab ou One d'un client |
| FR7 | MiKL peut ouvrir le dossier BMAD d'un client dans Cursor |

## Hub — Validation Hub

| ID | Functional Requirement |
|----|------------------------|
| FR8 | MiKL peut voir les demandes en attente de validation (briefs Lab, évolutions One) |
| FR9 | MiKL peut consulter le contexte complet d'une demande (besoin, historique client, priorité) |
| FR10 | MiKL peut valider une demande (brief, livrable) |
| FR11 | MiKL peut refuser une demande avec commentaire |
| FR12 | MiKL peut demander des précisions sur une demande |
| FR13 | MiKL peut choisir une action de traitement (Réactiver Lab, Programmer Visio, Dev direct, Reporter) |
| FR14 | Le client est notifié automatiquement du traitement de sa demande |

## Orpheus — Cerveau MonprojetPro (Cursor/BMAD)

> **Note** : Orpheus n'est PAS dans MonprojetPro. Il travaille avec MiKL dans Cursor et génère des documents sources pour alimenter les Élio.

| ID | Functional Requirement |
|----|------------------------|
| FR15 | Orpheus (dans Cursor) peut analyser une transcription de visio client |
| FR16 | Orpheus peut générer un Brief Initial structuré à partir d'une transcription |
| FR17 | Orpheus peut détecter le profil de communication d'un client |
| FR18 | Orpheus peut recommander un type de parcours Lab |
| FR19 | Orpheus peut générer une config Élio (client_config.yaml) |
| FR20 | Orpheus accumule les apprentissages métier MonprojetPro (pricing, patterns, durées) |
| FR20b | Orpheus peut générer des estimations prix → Élio Hub fait les devis |
| FR20c | Orpheus peut générer des docs techniques → Élio One accompagne les clients |
| FR20d | Orpheus peut retravailler docs brainstorming Lab → livrables clients |

## Hub — Élio Hub (Assistant MiKL)

| ID | Functional Requirement |
|----|------------------------|
| FR21 | MiKL peut interagir avec Élio Hub dans le dashboard |
| FR22 | Élio Hub peut aider MiKL sur les fonctionnalités du Hub |
| FR23 | Élio Hub peut rechercher des informations clients |
| FR24 | Élio Hub peut corriger et adapter la rédaction de MiKL au profil client |
| FR25 | Élio Hub peut générer des brouillons de réponses (emails, messages Validation Hub) |

## Lab — Parcours Création

| ID | Functional Requirement |
|----|------------------------|
| FR26 | Le client Lab peut voir son parcours assigné (étapes actives) |
| FR27 | Le client Lab peut voir sa progression dans le parcours |
| FR28 | Le client Lab peut consulter les briefs produits à chaque étape |
| FR29 | Le client Lab peut soumettre un brief pour validation MiKL |
| FR30 | Le client Lab est notifié quand un brief est validé/refusé |
| FR31 | Le client Lab peut voir un teasing de MonprojetPro One (motivation graduation) |

## Lab — Élio Lab (Agent Accompagnement)

| ID | Functional Requirement |
|----|------------------------|
| FR32 | Le client Lab peut converser avec Élio Lab |
| FR33 | Élio Lab pose les questions guidées selon l'étape active |
| FR34 | Élio Lab génère les briefs à partir des réponses client |
| FR35 | Élio Lab adapte son ton selon le profil de communication du client |
| FR36 | Élio Lab soumet automatiquement les briefs au Validation Hub |
| FR37 | Élio Lab reçoit et applique la config générée par Orpheus |

## One — Structure Dashboard

| ID | Functional Requirement |
|----|------------------------|
| FR38 | Le client One peut accéder à son dashboard personnalisé |
| FR39 | Le client One peut voir les modules activés pour lui |
| FR40 | Le client One peut consulter ses documents (briefs hérités du Lab, livrables) |
| FR41 | Le client One peut voir un teasing du Lab (si nouveau projet) |
| FR42 | MiKL peut configurer les modules actifs pour chaque client One |
| FR43 | MiKL peut injecter de la documentation dans Élio One après un déploiement |

## One — Élio One (Agent Client)

| ID | Functional Requirement |
|----|------------------------|
| FR44 | Le client One peut converser avec Élio One |
| FR45 | Élio One peut répondre aux questions sur les fonctionnalités |
| FR46 | Élio One peut guider le client dans son dashboard |
| FR47 | Élio One peut collecter une demande d'évolution et la soumettre |
| FR48 | Élio One+ peut exécuter des actions sur les modules actifs |
| FR49 | Élio One+ peut générer des documents |
| FR50 | Élio One+ peut alerter proactivement le client |
| FR51 | Élio One hérite du contexte Lab (profil comm, briefs, historique) |

## Commun — Authentification & Sécurité

| ID | Functional Requirement |
|----|------------------------|
| FR52 | Les clients peuvent se connecter avec email + mot de passe |
| FR53 | MiKL peut se connecter avec email + mot de passe + 2FA |
| FR54 | Le système gère les sessions (access token, refresh, inactivité) |
| FR55 | Chaque client ne peut accéder qu'à ses propres données (RLS) |
| FR56 | Les actions sensibles requièrent une confirmation |

## Commun — Communication

| ID | Functional Requirement |
|----|------------------------|
| FR57 | Le client peut échanger avec MiKL via chat asynchrone |
| FR58 | Le client peut consulter l'historique de ses visios avec MiKL |
| FR59 | Le client peut consulter les transcriptions de ses visios |
| FR60 | Le client peut demander une visio avec MiKL |
| FR61 | Le système envoie des notifications (validation, messages, alertes) |

## Commun — Documents

| ID | Functional Requirement |
|----|------------------------|
| FR62 | Le client peut consulter ses documents dans le dashboard (rendu HTML) |
| FR63 | Le client peut télécharger ses documents en PDF |
| FR64 | MiKL peut partager un document avec un client (visible/non visible) |
| FR65 | Les documents validés sont copiés dans le dossier BMAD local |

## Commun — Profil Communication

| ID | Functional Requirement |
|----|------------------------|
| FR66 | Le système stocke le profil de communication de chaque client |
| FR67 | Le profil est détecté par Orpheus et affiné par Élio Lab |
| FR68 | Le profil est transmis à Élio One lors de la graduation |
| FR69 | Les agents adaptent leur ton selon le profil (tutoiement, longueur, style) |

## Onboarding & Parcours

| ID | Functional Requirement |
|----|------------------------|
| FR70 | Le nouveau client Lab voit un écran de bienvenue à sa première connexion |
| FR71 | Le client Lab peut accéder à un tutoriel de prise en main |
| FR72 | Le client One voit un écran de graduation avec récapitulatif de son parcours Lab |
| FR73 | Le système affiche des états vides explicatifs (pas de document, pas de message) |

## Graduation Lab → One

| ID | Functional Requirement |
|----|------------------------|
| FR74 | MiKL peut déclencher la graduation d'un client Lab vers One |
| FR75 | Le système migre automatiquement le contexte Lab vers One (profil, briefs, historique) |
| FR76 | Le client reçoit une notification de graduation avec accès à son nouveau dashboard |

## Gestion MiKL Avancée

| ID | Functional Requirement |
|----|------------------------|
| FR77 | MiKL peut créer et envoyer un devis à un client |
| FR78 | MiKL peut suivre le statut d'un devis (envoyé, accepté, refusé) |
| FR79 | MiKL peut ajouter des notes privées sur un client (non visibles par le client) |
| FR80 | MiKL peut voir des statistiques globales (clients actifs, taux graduation, revenus) |
| FR81 | MiKL peut voir le temps passé estimé par client |

## Gestion des Erreurs & Edge Cases

| ID | Functional Requirement |
|----|------------------------|
| FR82 | Le système affiche un message explicite en cas d'erreur (pas d'écran blanc) |
| FR83 | Le système gère gracieusement les timeouts API Élio |
| FR84 | Le système alerte MiKL si un client Lab est inactif depuis X jours |
| FR85 | Le système archive (pas supprime) les données d'un client désactivé |

## Synchronisation & Technique

| ID | Functional Requirement |
|----|------------------------|
| FR86 | Le système synchronise les documents validés vers le dossier BMAD local |
| FR87 | Le système garde un historique des configs Élio par client |

## Parcours Alternatifs & Cycle de Vie

| ID | Functional Requirement |
|----|------------------------|
| FR88 | Le client Lab peut demander à abandonner son parcours |
| FR89 | MiKL peut suspendre ou clôturer un client (avec archivage données) |
| FR90 | MiKL peut upgrader un client ponctuel vers Lab ou One |
| FR91 | MiKL peut changer le tier d'abonnement d'un client One |
| FR92 | Le client peut demander l'export de toutes ses données (RGPD) |
| FR93 | Le système conserve les données d'un client résilié pendant une période définie avant suppression |

## Facturation & Abonnements

| ID | Functional Requirement |
|----|------------------------|
| FR94 | Le système gère les abonnements récurrents via Stripe |
| FR95 | Le système notifie MiKL et le client en cas d'échec de paiement récurrent |
| FR96 | Le client peut consulter son historique de facturation |
| FR97 | MiKL peut générer un avoir pour un client |
| FR98 | Le client peut mettre à jour ses informations de paiement |

## Notifications & Préférences

| ID | Functional Requirement |
|----|------------------------|
| FR99 | Le système envoie des notifications par email ET in-app |
| FR100 | Le client peut configurer ses préférences de notification |
| FR101 | MiKL peut configurer les notifications pour un client spécifique |

## Administration & Monitoring

| ID | Functional Requirement |
|----|------------------------|
| FR102 | MiKL peut consulter les logs d'activité par client |
| FR103 | MiKL peut activer un mode maintenance avec message aux clients |
| FR104 | MiKL peut déclencher un export complet des données d'un client |
| FR105 | Le système effectue des backups automatiques avec possibilité de restauration |

## Recherche & Navigation

| ID | Functional Requirement |
|----|------------------------|
| FR106 | MiKL peut rechercher rapidement parmi tous ses clients |
| FR107 | Le client peut rechercher dans ses documents |
| FR108 | Le système affiche un fil d'ariane indiquant la position dans l'interface |

## Support & Feedback

| ID | Functional Requirement |
|----|------------------------|
| FR109 | Le client peut signaler un problème ou bug depuis l'interface |
| FR110 | MiKL peut consulter les problèmes signalés par les clients |
| FR111 | Le client peut accéder à une aide en ligne / FAQ dans l'app |

## Multi-Device & Sessions

| ID | Functional Requirement |
|----|------------------------|
| FR112 | Le système supporte les connexions simultanées sur plusieurs appareils |
| FR113 | MiKL peut forcer la déconnexion de toutes les sessions d'un client |
| FR114 | Le client peut voir ses sessions actives et en révoquer |

## Préparation Intégrations (Structure)

| ID | Functional Requirement |
|----|------------------------|
| FR115 | Le système prévoit une structure pour webhooks sortants (P2) |
| FR116 | Le système prévoit une structure pour API client (P2) |

## Accessibilité & Responsive

| ID | Functional Requirement |
|----|------------------------|
| FR117 | Les dashboards sont utilisables sur mobile et tablette (responsive) |
| FR118 | Les dashboards respectent les standards d'accessibilité de base (contraste, navigation clavier) |
| FR119 | Le système prévoit une structure multi-langue (P3) |

## Analytics & Métriques

| ID | Functional Requirement |
|----|------------------------|
| FR120 | Le système collecte des métriques d'usage anonymisées |
| FR121 | MiKL peut consulter des statistiques d'utilisation par fonctionnalité |

## Expérience Élio Détaillée

| ID | Functional Requirement |
|----|------------------------|
| FR122 | Le système affiche un indicateur visuel quand Élio réfléchit |
| FR123 | L'historique des conversations Élio est persistant entre sessions |
| FR124 | Le client peut démarrer une nouvelle conversation Élio (sans perdre l'historique) |
| FR125 | Élio peut envoyer des documents générés directement dans le chat |
| FR126 | Le client peut donner un feedback sur une réponse Élio (utile/pas utile) |

## Temps Réel & Synchronisation

| ID | Functional Requirement |
|----|------------------------|
| FR127 | Les notifications apparaissent en temps réel (sans rechargement) |
| FR128 | Le système gère les conflits de modification concurrente |
| FR129 | Le système indique si le client/MiKL est actuellement en ligne |

## Workflow MiKL Quotidien

| ID | Functional Requirement |
|----|------------------------|
| FR130 | MiKL peut marquer un élément comme "à traiter plus tard" |
| FR131 | MiKL peut épingler des clients prioritaires |
| FR132 | MiKL peut créer des rappels personnels (tâche + date) |
| FR133 | MiKL peut voir un calendrier de ses rappels et deadlines |

## Feedback & UX

| ID | Functional Requirement |
|----|------------------------|
| FR134 | Le système affiche des messages de confirmation après chaque action |
| FR135 | Les formulaires longs sauvegardent automatiquement en brouillon |
| FR136 | Le client peut annuler certaines actions récentes (undo) |

## Templates & Personnalisation

| ID | Functional Requirement |
|----|------------------------|
| FR137 | MiKL peut créer des templates de parcours Lab réutilisables |
| FR138 | MiKL peut personnaliser les templates d'emails automatiques |
| FR139 | MiKL peut personnaliser le branding du dashboard One (logo, couleurs) |

## Légal & Consentements

| ID | Functional Requirement |
|----|------------------------|
| FR140 | Le client doit accepter les CGU lors de son inscription |
| FR141 | Le système notifie les clients des mises à jour de CGU |
| FR142 | Le système demande un consentement explicite pour le traitement IA |
| FR143 | Le système conserve une trace horodatée des consentements |

## Gestion des Fichiers

| ID | Functional Requirement |
|----|------------------------|
| FR144 | Le système limite la taille des fichiers uploadés |
| FR145 | Le système valide le type des fichiers uploadés |
| FR146 | Le client peut organiser ses documents en dossiers |

## État Système & Monitoring

| ID | Functional Requirement |
|----|------------------------|
| FR147 | MiKL peut voir un indicateur de santé du système |
| FR148 | Le système alerte MiKL en cas de dysfonctionnement |

## Import/Export Avancé

| ID | Functional Requirement |
|----|------------------------|
| FR149 | MiKL peut importer des clients en masse (CSV) |
| FR150 | Les exports sont disponibles en formats standards (CSV, JSON, PDF) |

## Robustesse Technique

| ID | Functional Requirement |
|----|------------------------|
| FR151 | Le système affiche un message explicite si le navigateur n'est pas supporté |
| FR152 | Le système gère gracieusement les connexions instables (retry, messages) |

## Propriété Client & Instance Dédiée (One)

| ID | Functional Requirement |
|----|------------------------|
| FR153 | Tous les clients (Lab phase ou One phase) sont servis par le déploiement multi-tenant unique `app.monprojet-pro.com` (un seul Vercel, une seule base Supabase). Aucun provisioning par client pendant l'abonnement. L'isolation se fait exclusivement par RLS sur `client_id` ([ADR-01 Révision 2](../architecture/adr-01-lab-one-coexistence-same-instance.md)) |
| FR154 | Le client One est propriétaire de ses données et, à la sortie, devient propriétaire du code source et de l'infrastructure générés par le kit de sortie (voir FR174) |
| FR155 | Les apps du monorepo (Hub, Lab, One) communiquent au sein du même déploiement multi-tenant ; les webhooks signés (HMAC) restent utilisés pour les intégrations externes (Cal.com, Pennylane, etc.) |
| FR156 | MiKL peut activer un nouveau client via le Hub : création de la fiche + RLS → accès immédiat au déploiement multi-tenant, sans aucun provisioning d'infra |
| FR157 | À la résiliation, le client One peut récupérer le code source, la base de données et la documentation via le kit de sortie automatisé (voir FR174) |

## Documentation comme Livrable

| ID | Functional Requirement |
|----|------------------------|
| FR158 | Chaque module développé DOIT avoir une documentation utilisateur (guide.md, faq.md, flows.md) |
| FR159 | La documentation module est accessible au client via le module documents |
| FR160 | La documentation module alimente la base de connaissances d'Élio One |
| FR161 | La documentation est incluse dans l'export si le client quitte One |

## Surveillance Usage & Upgrade

| ID | Functional Requirement |
|----|------------------------|
| FR162 | Le système surveille l'usage des ressources de chaque instance One (DB rows, storage, bandwidth) |
| FR163 | Le système alerte MiKL quand une instance atteint un seuil de capacité (60%, 80%, 95%) |
| FR164 | MiKL peut consulter un tableau de bord de santé de toutes les instances One |
| FR165 | MiKL peut initier un upgrade de tier d'instance après validation avec le client |

## Graduation Lab → One (Bascule de Flag)

| ID | Functional Requirement |
|----|------------------------|
| FR166 | La graduation Lab→One est une simple bascule du flag `dashboard_type` de `'lab'` vers `'one'` dans `client_configs`. Aucun provisioning, aucune migration de base, aucune manipulation d'infra — tout se passe dans le déploiement multi-tenant existant ([ADR-01 Révision 2](../architecture/adr-01-lab-one-coexistence-same-instance.md)) |
| FR167 | Les données Lab du client restent dans la même base multi-tenant après la graduation, accessibles en permanence via le toggle Mode Lab (aucun archivage, aucun déplacement). Élio Lab est désactivé par défaut post-graduation via le feature flag `elio_lab_enabled`, réactivable à tout moment par MiKL depuis le Hub (voir FR172) |

## Lab — Propriété MonprojetPro

| ID | Functional Requirement |
|----|------------------------|
| FR168 | Le Lab reste propriété MonprojetPro — le client récupère uniquement ses documents à la sortie |

## Lab — Facturation Forfait

| ID | Functional Requirement |
|----|------------------------|
| FR169 | Le système permet le paiement du forfait Lab (199€) et active automatiquement l'accès au dashboard Lab + Élio Lab |
| FR170 | Si le client Lab gradue vers One, les 199€ du Lab sont automatiquement déduits du devis setup One |

## Coexistence Lab/One & Feature Flags Agents

| ID | Functional Requirement |
|----|------------------------|
| FR171 | Après la graduation, un toggle persistant Lab/One est affiché dans le shell du déploiement multi-tenant et permet au client de basculer à tout moment entre le mode Lab (thème violet, vue incubation) et le mode One (thème vert/orange, outil business quotidien) — les deux modes coexistent en permanence au sein du même déploiement, via un simple switch d'UI ([ADR-01 Révision 2](../architecture/adr-01-lab-one-coexistence-same-instance.md)) |
| FR172 | Élio Lab est piloté par un feature flag `elio_lab_enabled` : désactivé par défaut après la graduation, MiKL peut le réactiver à tout moment depuis le Hub (1 clic, pas de provisioning, pas de redéploiement) pour démarrer un nouveau cycle d'amélioration. Le flag est évalué côté serveur sur le déploiement multi-tenant partagé ([ADR-02](../architecture/adr-02-agents-feature-flags-tree-shaking.md)) |
| FR173 | Le build « One standalone » tree-shaké (Lab, Élio Lab, Élio One, Claude exclus du bundle) est produit **uniquement** par le kit de sortie (FR174) au moment de la résiliation d'un client. Il n'existe **pas** en exploitation normale : pendant l'abonnement, tous les clients utilisent le build multi-tenant complet ([ADR-02](../architecture/adr-02-agents-feature-flags-tree-shaking.md)) |

## Kit de Sortie Client

| ID | Functional Requirement |
|----|------------------------|
| FR174 | Kit de sortie client — script automatisé déclenchable par MiKL depuis le Hub à la résiliation d'un abonnement. Le script provisionne un projet Vercel dédié (API), un repo GitHub privé dédié (API) et une nouvelle base Supabase dédiée, exporte les données du client (filtrées par RLS), pousse le build standalone tree-shaké (Lab + agents exclus, cf. FR173), connecte Vercel à GitHub, déclenche le premier déploiement et produit en sortie les credentials + un brouillon d'email au client. MiKL transfère ensuite la propriété Vercel et GitHub au client (1 clic chacun). Cf. Story 13.1 (Epic 13 à créer) et [ADR-01 Révision 2](../architecture/adr-01-lab-one-coexistence-same-instance.md) |

---
