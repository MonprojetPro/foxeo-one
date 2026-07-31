# Dossier d'agrément CII — Réponses validées (Section 1)

> Demande d'**agrément CII prestataire** (autorisation MESR permettant aux clients d'intégrer
> les factures MONPROJETPRO dans leur crédit d'impôt innovation).
> Exercice fiscal **2026** (1er exercice, clôture 31/12/2026).
> Produit d'innovation principal présenté : **la plateforme MonProjetPro dans son ensemble
> (Hub + Lab + One)**.
> Le dossier passe par un **cabinet prestataire** qui fait tampon avec l'administration.
> Rédigé avec MiKL les 29-30 juillet 2026. Section 1 finalisée ; sections 2 à 4 à traiter.

---

## 0. En-tête administratif (extrait Kbis du 30/03/2026)

| Champ | Valeur |
|---|---|
| Dénomination sociale | **MONPROJETPRO** |
| Forme juridique | SAS à associé unique (SASU) |
| Capital social | 6 900 € |
| RCS | **103 076 972 R.C.S. Paris** — immatriculée le 30/03/2026 |
| Siège | 33 rue de la Bienfaisance, 75008 Paris (domiciliation TERRA SERVICES SAS) |
| Début d'activité | **01/04/2026** — 1er exercice clos le 31/12/2026 |
| Président / associé unique | Mickaël Julien CULUS (né le 23/08/1986 à Créteil) |
| Effectif | 1 (le président) |

⚠️ L'objet social au Kbis est plus large que l'activité exploitée : il inclut la formation
professionnelle et les conférences — **branche commercialement abandonnée**, à ne pas
mentionner comme activité.

---

## 1.A — Présentation de l'entreprise et de son activité ✅

MONPROJETPRO (SASU, RCS Paris 103 076 972) est une jeune entreprise française créée le
30 mars 2026, dont l'activité a démarré le 1er avril 2026. Elle est spécialisée dans le
conseil en systèmes et logiciels informatiques et dans la conception de produits numériques
sur mesure intégrant l'intelligence artificielle, à destination des TPE/PME, entrepreneurs,
associations et porteurs de projets.

**Deux activités complémentaires :**

- **Coaching et accompagnement de projets** — structuration du projet du porteur : diagnostic,
  cadrage, positionnement, stratégie et feuille de route, jusqu'à un projet prêt à être construit.
- **Développement numérique sur mesure** — conception et développement full-stack d'applications
  web, de dashboards métier et de sites internet (Next.js, React, TypeScript, Supabase), avec
  intégration d'intelligence artificielle générative, d'agents conversationnels et
  d'automatisations dans les processus métier.

Ces deux activités sont opérées au travers d'une **plateforme SaaS B2B multi-tenant développée
intégralement en interne**, articulée en trois environnements complémentaires :
- le **Hub**, cockpit de pilotage de l'ensemble de l'activité (CRM, validation, facturation,
  administration système) ;
- le **Lab**, parcours d'accompagnement entrepreneurial du client, guidé par une IA experte
  multi-agents sous supervision humaine ;
- le **One**, console de pilotage des livrables du client et canal de relation continue.

**Offres commerciales :**
- **Ponctuel** — projet développé sur mesure et livré en propre au client (déploiement autonome), au devis.
- **One** — accès au dashboard One avec hébergement, maintenance, évolutions au devis et
  **assistant IA dédié (Élio)**, par abonnement mensuel.
- **One+** — l'offre One augmentée de **séances de coaching humain** destinées à soutenir le
  porteur de projet dans la concrétisation de son ambition.

**Particularité technologique — le modèle « Centaure » :** la plateforme repose sur un agent IA
propriétaire, **Élio**, en posture de coach et de force de proposition, opérant sous supervision
humaine à des points de contrôle explicites (validations, injections de contexte, escalades).
Son socle technique met en œuvre plusieurs verrous d'ingénierie : multi-tenancy à isolation
stricte par *Row Level Security* sans instance dédiée, architecture modulaire à découverte
automatique par manifestes, continuité de contexte de l'IA entre les phases Lab et One sans
migration de données, et orchestration temps réel multi-consommateurs.

**Méthode :** une démarche propriétaire en trois temps — **les 3C : Comprendre, Créer,
Concrétiser** — qui impose un diagnostic complet avant toute production technique.

**Mode d'intervention :** 100 % à distance, France entière.

**Objectif :** rendre accessible aux petites structures un niveau d'outillage numérique et
d'automatisation par l'IA jusqu'ici réservé aux entreprises disposant d'une direction des
systèmes d'information.

---

## 1.B — CV, diplôme le plus élevé, expérience en innovation ✅

**Mickaël CULUS — Président et associé unique, Coach de Projet & Développeur Produit**
*Seule personne affectée au projet d'innovation (effectif de l'entreprise : 1).*

**Diplôme le plus élevé (titre de référence pour le dossier) :**
**Product Builder** — titre professionnel enregistré au **RNCP sous le n° 39108, niveau 6
(équivalent Bac +3/4)**, délivré par l'**École Cube** (septembre – décembre 2025), premier
organisme certificateur français reconnu par l'État sur cette spécialité. Projet de
certification : conception et déploiement d'un écosystème digital complet pour une association
— site web, base de données, automatisations et application membres. *Justificatif disponible.*

**Autres formations diplômantes :**
- Étiopathie — Faculté libre d'étiopathie de Paris, cursus de 5 ans (2006 – 2011).
- Ostéopathie D.O. — Institut Franco-Britannique d'Ostéopathie (IFBO), 2011 – 2012.
- Psycho-énergétique — IFPIA Rennes, 2017 – 2019.
- Posturologie — Posturopole, depuis 2024.

**Expérience en innovation et développement technologique :**

- **Conception et développement intégral de la plateforme MonProjetPro** (2025 – 2026) : trois
  environnements applicatifs (Hub, Lab, One) en architecture SaaS multi-tenant, incluant un
  noyau d'intelligence artificielle propriétaire (Élio), une architecture modulaire à découverte
  automatique et une infrastructure temps réel. Développement full-stack de bout en bout :
  modélisation de la base de données, sécurité (isolation *Row Level Security*, double
  authentification TOTP, limitation de tentatives de connexion), intégrations tierces (Google
  Calendar, Google Meet API, Gmail OAuth, Cal.com, Pennylane, Resend, Supabase, Vercel),
  fonctions serverless, intégration et déploiement continus.

- **Conception et mise en production d'agents d'intelligence artificielle** : orchestration
  multi-agents (11 agents experts spécialisés, pilotés par base de données et non codés en dur),
  instrumentation fine de la consommation de jetons et du coût par client, mécanismes d'ancrage
  anti-hallucination par injection de l'état réel du système, escalade automatique vers l'humain
  sur détection de faible confiance, continuité de contexte entre les phases produit sans
  migration de données.

- **Conception d'un moteur d'optimisation sous contraintes** (GuardVeto, 2026) : génération
  automatique de plannings de garde pour un cabinet vétérinaire, intégrant contraintes
  individuelles, règles de sécurité métier et suivi d'équité inter-périodes, avec synchronisation
  vers les agendas mobiles via l'API Google Calendar. Projet commandé par un client ; seconde
  version en cours de finalisation.

- **Conception et déploiement d'une installation pilote en conditions réelles**
  (MonProjet-QVCT, opérationnelle depuis mai 2026 auprès du bailleur social Habitat 77) :
  dispositif instrumenté de mesure de la qualité de vie au travail — collecte structurée,
  sélection d'indicateurs, bilans de protocole et analyse agrégée des données à l'échelle
  de l'organisation.

- **Développement d'une application grand public en production** (MenuFacile, Flutter/Dart,
  PWA installable) : génération de menus hebdomadaires réconciliant les profils alimentaires de
  tous les membres d'un foyer, synchronisation temps réel entre membres, architecture conçue pour
  un déploiement en marque blanche. L'application est pilotée à distance depuis le Hub
  MonProjetPro via un **guichet HTTP sécurisé garantissant l'isolation totale des deux bases
  de données**.

- **Conception d'une architecture d'assistant vocal à mémoire longue** (Orpheus, en cours) :
  dissociation de l'interface (montre connectée Wear OS servant de télécommande vocale) et de la
  capacité cognitive (hub distant organisé en zones fonctionnelles indépendantes et extensibles
  sans modification de l'existant).

- **Création et direction d'entreprise** : fondateur et gérant d'OsteoForm (2017 – 2019),
  entreprise B2B de qualité de vie au travail et de prévention des risques — création du concept
  et de l'offre, prospection et vente auprès de DRH, comités d'entreprise et directions générales,
  déploiement multi-sites, coordination d'un réseau de praticiens. Fondateur et président de
  l'Association Alternatives (depuis 2022), réseau de professionnels de la santé et de
  l'accompagnement.

- **15 ans de pratique du diagnostic et de la pensée systémique** (ostéopathie, posturologie,
  coaching) et **9 ans de formation de professionnels** (LUXOMED, 2016 – 2025) — compétences
  directement transposées dans la méthode 3C, qui impose un diagnostic complet et documenté avant
  toute production technique.

**Précision sur la compétence en développement :** le titre Product Builder constitue le socle
certifié. La compétence en développement logiciel proprement dite a été acquise **par la pratique
et la production de code réel**, sans certification complémentaire (voir 1.C). Elle est
directement vérifiable dans les livrables : le code source et l'historique de versionnement de
la plateforme peuvent être mis à disposition.

**Compétences clés :** TypeScript, React, Next.js (App Router), PostgreSQL et Supabase
(*Row Level Security*, fonctions serverless, temps réel), TanStack Query, Tailwind CSS,
Flutter/Dart ; architecture SaaS multi-tenant et modulaire ; intégration d'API d'intelligence
artificielle générative (Anthropic Claude) et ingénierie de prompts systèmes ; conception
d'agents IA supervisés ; intégrations OAuth2 et webhooks signés ; intégration continue, tests
d'isolation et tests de contrat ; conception produit et cadrage fonctionnel.

---

## 1.C — Certifications et formations complémentaires ✅ *(finalisée le 30/07/2026)*

**Mickaël CULUS, Président — Coach de Projet & Développeur Produit**

Hors le titre RNCP mentionné en 1.B, aucune certification professionnelle ni formation dispensée
par un organisme n'a été suivie. La montée en compétence en développement logiciel s'est faite par
**auto-formation et pratique continue**, attestée par les réalisations mises en production décrites
en 1.B et 1.D, dont le code source et l'historique de versionnement peuvent être communiqués.

---

## 1.D — Portefeuille d'innovations (4 projets) ✅

### GuardVeto — Moteur de génération de plannings de garde sous contraintes
**Rôle :** Concepteur et développeur principal (projet commandé par un cabinet vétérinaire de
7 praticiens).
**Technologies :** Next.js 16 (App Router), TypeScript strict, Tailwind CSS 4, shadcn/ui,
Supabase (PostgreSQL, Auth, Row Level Security), API Google Calendar, Vercel, Playwright.
**Innovation réalisée :** Développement d'un moteur de génération automatique de plannings de
garde résolvant un problème d'optimisation sous contraintes multiples et hétérogènes :
contraintes individuelles de chaque praticien (repos, alternance de semaines, gardes d'enfants),
règles de sécurité métier (interdiction d'apparier deux praticiens juniors), congés et formations
ponctuels, et surtout **équité de répartition suivie dans le temps** (week-ends, jours fériés,
nuits) — dimension absente des outils de planning du marché, qui optimisent au mieux la période
courante sans mémoire inter-périodes. Le moteur remplace un processus manuel de plusieurs heures
mensuelles par une génération en quelques secondes, avec assistance à la gestion des échanges de
garde après publication et synchronisation automatique du résultat sur les agendas mobiles de
toute l'équipe. Une première version complète a été développée ; sa mise en production a été
volontairement suspendue au profit d'une seconde version, en cours de finalisation, que le
cabinet utilisera directement.

### MonProjet-QVCT — Plateforme de suivi et d'analyse de la qualité de vie au travail
**Rôle :** Concepteur et développeur ; opérateur du programme.
**Technologies :** Next.js, TypeScript, Supabase (PostgreSQL, Row Level Security), traitement et
visualisation de données, site public dédié (monprojet-qvct.fr).
**Innovation réalisée :** Conception d'une solution de pilotage de la qualité de vie et des
conditions de travail articulant un site public à destination des entreprises et une
**application d'administration de suivi des bénéficiaires** : questionnaires d'évaluation avant
et après protocole, sélection d'indicateurs par séance, bilans de fin de protocole, et **analyse
agrégée des données collectées** permettant à l'entreprise cliente d'objectiver l'évolution du
stress et des conditions de travail de ses collaborateurs. L'innovation tient à la transformation
d'une prestation d'accompagnement individuel — traditionnellement non mesurable — en un dispositif
**instrumenté et mesurable à l'échelle de l'organisation**, restituant des indicateurs exploitables
par la direction.
**Modalité de déploiement — installation pilote :** le système est mis à disposition **à titre
gracieux** du bailleur social **Habitat 77** depuis **mai 2026**, en contrepartie de sa coopération
à l'expérimentation. Ce déploiement constitue une **installation pilote en conditions réelles
d'exploitation**, destinée à éprouver le dispositif, mesurer sa performance et l'améliorer avant
son industrialisation et sa commercialisation auprès d'autres entreprises et partenaires.

### MenuFacile — Générateur de menus hebdomadaires multi-profils
**Rôle :** Concepteur et développeur principal.
**Technologies :** Flutter/Dart, PWA installable, Supabase (PostgreSQL, Auth, Realtime), Vercel,
guichet HTTP d'administration sécurisé par jeton serveur.
**Innovation réalisée :** Développement d'une application de génération automatique du menu
hebdomadaire d'un foyer, capable de **réconcilier en un seul plan de repas les goûts, régimes
alimentaires et contraintes de chaque membre du foyer** — là où les applications concurrentes
raisonnent sur un profil unique. L'application produit la liste de courses associée et
**synchronise l'état du foyer en temps réel entre tous ses membres**. Architecture conçue dès
l'origine pour un déploiement en marque blanche auprès de médias culinaires partenaires. Elle est
en outre **pilotée à distance depuis la plateforme MonProjetPro via un guichet HTTP sécurisé
garantissant l'isolation totale des bases de données** des deux produits — un patron
d'administration inter-produits sans couplage. Application en production.

### ORPHEUS — Assistant personnel vocal à mémoire longue, piloté depuis une montre connectée
**Rôle :** Concepteur et développeur (projet en cours).
**Technologies :** Wear OS (montre connectée), Android (relais), architecture serveur modulaire,
transcription et synthèse vocale, modèles de langage, WebSocket, chiffrement des flux.
**Innovation réalisée :** Conception d'un assistant personnel dont l'originalité architecturale
est de **dissocier totalement l'interface de la capacité cognitive** : la montre n'est qu'une
télécommande vocale, l'intelligence résidant dans un hub distant organisé en **zones
fonctionnelles indépendantes** (mémoire, compréhension, restitution, action) reliées à un tronc
commun. Cette conception permet d'ajouter une nouvelle capacité sans jamais modifier les zones
existantes — réponse directe au problème d'extensibilité des assistants vocaux monolithiques du
marché. Fonctions visées : capture d'idées à la voix, question-réponse audio, enregistrement et
synthèse de réunions avec extraction des décisions et des tâches, et mémoire relationnelle
interrogeable dans la durée.

> **ORAID (jeu web3 blockchain) a été volontairement écarté** de cette liste : MiKL y intervient
> à titre d'investisseur personnel, sur le game design, la direction produit et le marketing —
> sans contribution au développement et sans portage par la SASU. L'y faire figurer offrirait à
> l'instructeur une ligne facile à disqualifier.

---

## 1.E — Aides publiques et prix ✅

À ce jour, MONPROJETPRO n'a bénéficié d'**aucune aide publique** et n'a été lauréate d'**aucun
concours ou prix d'innovation**.

La société, immatriculée le 30 mars 2026 et dont l'activité a débuté le 1er avril 2026, clôturera
son premier exercice le 31 décembre 2026. L'ensemble des travaux de conception et de développement
réalisés depuis sa création — plateforme MonProjetPro, installation pilote MonProjet-QVCT,
prototype GuardVeto — ont été **intégralement autofinancés sur fonds propres**, sans subvention,
avance remboursable ni financement externe.

La présente demande d'agrément constitue la première démarche de l'entreprise auprès d'un
dispositif public de soutien à l'innovation.

> ⚠️ **À corriger si une candidature existe** (BPI France, prêt d'honneur Initiative France /
> Réseau Entreprendre, aide CCI, concours, incubateur) — même en cours d'instruction ou refusée.
> L'ACRE n'est pas une aide à l'innovation : ne pas la déclarer ici.

---

## 1.F — Documents de présentation ✅

Oui. L'entreprise dispose des supports suivants, communicables sur demande :

- **Site web institutionnel** — monprojet-pro.com : positionnement, méthode 3C, offres et
  modalités d'accompagnement.
- **Dossier de présentation de la plateforme MonProjetPro** — document de synthèse fonctionnelle
  et technique détaillant les trois environnements applicatifs (Hub, Lab, One), leur architecture
  et leurs fonctionnalités, **illustré de captures d'écran de l'application en production**.
- **Site dédié au programme QVCT** — monprojet-qvct.fr : présentation de l'offre à destination
  des entreprises.
- **Profil professionnel LinkedIn** du dirigeant et **carte de visite** de l'entreprise.

Des captures d'écran complémentaires, maquettes et rapports techniques peuvent être fournis pour
tout projet mentionné dans le présent dossier.

---

## Points ouverts pour la suite (sections 2 à 4)

1. ✅ **TRANCHÉ (31/07)** — **Prix officiels : One 49 €/mois, One+ 99 €/mois.** Décision commerciale
   de MiKL du 31/07/2026 : retour à 49 €, aligné sur le site public. ⚠️ Le code en production affiche
   encore **39 €/mois** (`apps/client/components/one-activity-cockpit.tsx`, hérité de
   `one-vision-v2-2026-06-24.md`) — **à mettre à jour** pour que le produit concorde avec le dossier.
   La nomenclature « Essentiel / Agentique » des artefacts PRD reste **périmée** : les offres
   s'appellent **One** et **One+**.
2. ✅ **TRANCHÉ (30/07)** — **Le « kit de sortie » est retiré du dossier.** Il n'est ni déclaré comme
   innovation acquise, ni mentionné comme perspective : la brique est abandonnée
   (`one-vision-v2-2026-06-24.md`, 24/06 — « utopie technique », tables à 0 ligne) et le script
   handoff complet n'est pas implémenté. Le verrou n°8 de `synthese-fonctionnalites-cii.md`
   est donc **caduc** — la section 2 s'appuie sur les **7 verrous techniques restants**, tous
   construits et vérifiables dans le code.
3. **Section 3 (« travaux sous-traités à l'entreprise »)** — aucune prestation d'innovation n'a
   encore été facturée à un donneur d'ordre : GuardVeto n'est pas encore facturé, MonProjet-QVCT
   est fourni à titre gracieux et Habitat 77 est facturé par le cabinet personnel de MiKL (pas par
   la SASU). L'agrément devra donc se construire sur la **capacité démontrée** plutôt que sur des
   missions passées. Le cabinet qui instruit le dossier doit en être informé.
4. ✅ **CLOS (30/07)** — **1.C finalisée** : aucune formation ni certification complémentaire.
   Toute mention d'une « formation BMAD » est définitivement retirée du dossier — il n'y en a jamais
   eu : la méthodologie a été pratiquée en autonomie, sans organisme ni attestation. Ne pas la
   réintroduire.
5. **Section 4** — sans objet : première demande, pas de renouvellement.

---

## Sources faisant autorité

- `presentation-subvention/synthese-fonctionnalites-cii.md` (02/07/2026) — inventaire technique
  des 3 dashboards, base directe des sections 2 et 3.
- `presentation-subvention/MonprojetPro-presentation.html` + `screenshots/` — pièce jointe 1.F.
- `docs/one-vision-v2-2026-06-24.md` — vision produit validée.
- `MPP-identite/doc reference MPP/2026 - Kbis MPP.pdf` — identité légale.
- ⚠️ **Source périmée à ne pas utiliser** : `MPP-identite/site/project-context.md` (mentionne
  encore la branche « Formations & Conférences », abandonnée, et un ancien packaging d'offres).
