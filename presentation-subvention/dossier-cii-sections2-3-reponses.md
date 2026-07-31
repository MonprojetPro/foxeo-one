# Dossier d'agrément CII — Réponses (Sections 2 et 3)

> Suite de `dossier-cii-section1-reponses.md`.
> Projet d'innovation présenté : **la plateforme MonProjetPro (Hub + Lab + One)**.
> Statut du projet au sens du formulaire : **réalisé en majeure partie dans les 12 derniers mois
> et toujours en développement actif** — cas le plus favorable (option 1 + option 2 combinées).
> Rédigé le 30 juillet 2026.
>
> **Arbitrages appliqués** (cf. section 1, points ouverts) :
> - Prix officiels : **One 49 €/mois, One+ 99 €/mois** — **décision commerciale de MiKL du 31/07/2026**
>   (retour à 49 €, aligné sur le site public). ⚠️ Le code en production affiche encore **39 €/mois**
>   (`apps/client/components/one-activity-cockpit.tsx`) : **à mettre à jour** pour que le produit et
>   le dossier concordent.
> - **Le « kit de sortie » est exclu** du dossier — brique abandonnée, non implémentée.
>   La démonstration repose sur les **7 verrous techniques construits**.

---

## ⚠️ Trois points à trancher avant envoi au cabinet

1. **Antériorité des travaux vs immatriculation.** L'historique de versionnement démarre le
   **8 février 2026**, alors que la SASU est immatriculée le **30 mars 2026** et que son activité
   débute le **1er avril 2026**. Sur les **95 jours de développement effectifs constatés**,
   **27 sont antérieurs au 1er avril** et **68 postérieurs**. Ces 27 jours correspondent à une
   **phase de conception et de prototypage menée par le fondateur préalablement à la constitution
   de la société**, poursuivie et industrialisée par MONPROJETPRO à compter du 1er avril.
   👉 **Le cabinet doit valider la formulation retenue** (§3.D) : elle est exacte, mais l'instructeur
   la lira. La présenter spontanément vaut mieux qu'elle soit découverte.

2. **Coût / TJM à déclarer en 3.D** — placeholder `[TJM À VALIDER]` dans le tableau.
   Aucun chiffrage n'a été inventé.

3. **Matériel de développement en 3.C** — placeholder `[MATÉRIEL À PRÉCISER]` (marque, modèle,
   processeur, RAM).

---

# 2. Projet d'innovation

## 2.A — Présentation du projet ✅

Le projet **« MonProjetPro »** est une solution SaaS B2B innovante conçue pour **rendre accessible
aux TPE/PME, entrepreneurs, associations et porteurs de projets un accompagnement stratégique
augmenté par l'intelligence artificielle et un outil métier sur mesure, réunis dans une seule et
même plateforme** — là où le marché impose aujourd'hui de recourir successivement à un cabinet de
conseil, puis à une agence de développement, puis à un éditeur de logiciel, sans continuité entre
les trois.

La plateforme repose sur le **modèle « Centaure » (IA + Humain)** : un agent d'intelligence
artificielle propriétaire, **Élio**, en posture de coach et de force de proposition, opère sous
supervision humaine à des points de contrôle explicites (validation des productions, injection de
contexte par l'opérateur, escalade automatique vers l'humain).

Elle s'articule en **trois environnements applicatifs** partageant un socle technique unique :

| Environnement | Utilisateur | Rôle |
|---|---|---|
| **Hub** | Opérateur MonProjetPro | Cockpit de pilotage de l'ensemble de l'activité |
| **Lab** | Client en phase d'accompagnement | Parcours entrepreneurial guidé par l'IA multi-agents |
| **One** | Client « gradué » | Console de pilotage de ses livrables et canal de relation continue |

### Fonctionnalités clés

**① Parcours entrepreneurial piloté par une IA experte multi-agents (Lab)**
Timeline verticale à progression conditionnelle : chaque étape ne se débloque qu'après validation
humaine de la précédente. Chaque étape est servie par un **agent IA expert spécialisé** — 11 agents
distincts (Vision, Marché, Cible, Offre, Identité, Positionnement, Feuille de route, Légitimité,
Business, Acquisition, Récapitulatif), chacun disposant de son propre prompt système, de son modèle
et de sa température. Point d'ingénierie déterminant : **ces agents sont définis en base de données
et non codés en dur**, ce qui permet de faire évoluer l'expertise délivrée sans redéploiement
applicatif. Le client soumet sa production, l'opérateur approuve, commente ou demande une révision ;
l'IA annonce explicitement au client les consignes reçues de l'opérateur (principe de transparence).

**① bis — Création d'agents experts sur mesure en quelques minutes, sans développement**
Corollaire direct du choix de définir les agents en base : **l'opérateur peut créer un agent expert
entièrement nouveau, calibré sur un besoin identifié chez un client, en quelques minutes et sans
aucune intervention de développement**. Il ajoute une étape au parcours, rédige la mission de
l'agent, choisit son modèle et sa température, l'active — le client y a accès immédiatement. Chaque
parcours client dispose ainsi de sa propre composition d'agents, activables, désactivables,
réordonnables et réouvrables individuellement. **C'est la différence entre un produit à catalogue
figé d'assistants et un atelier d'expertise configurable** : là où l'état de l'art impose un cycle
de spécification, développement, test et redéploiement pour ajouter une compétence à un assistant,
la plateforme le fait par configuration, à chaud, pour un client précis.

**① ter — Chaque agent produit un livrable documentaire calibré, propriété du client**
Un agent Élio ne se contente pas de converser : **il produit un document structuré, calibré pour
remplir une fonction précise** (note de vision, analyse de marché, définition de cible, offre,
positionnement, feuille de route…). Ce document est généré à l'issue de l'échange, soumis
automatiquement au circuit de validation de l'opérateur, puis versé au dossier du client.
**Ces livrables appartiennent au client** : ils sont consultables, téléchargeables et
**exportables en intégralité** à tout moment. Le parcours ne produit donc pas une conversation,
mais un **corpus documentaire structuré et transférable** — l'actif que le porteur de projet
conserve, y compris s'il quitte la plateforme.

**① quater — Élio « Concierge », assistance permanente du client accompagné**
Indépendamment des agents d'étape, un agent transverse — **le Concierge** — assiste le client en
permanence pendant tout son parcours. Il connaît le fonctionnement de la plateforme, l'état réel
d'avancement du client, ses étapes validées et en attente, et **prend la parole de façon proactive**
sur les événements qui le concernent (production validée, retour de l'opérateur, nouvelle étape
débloquée, module activé). Le client n'est jamais seul devant son parcours, et n'a jamais à chercher
où il en est. Un équivalent existe côté outil livré (Concierge One).

**② Continuité de contexte de l'IA entre les phases (Lab → One)**
Les acquis de la phase d'accompagnement — briefs validés, décisions de l'opérateur, état du parcours —
sont **hérités par l'IA de la phase outil métier sans aucune migration de données**, par lecture de la
même base multi-tenant. Un **profil de communication** propre à chaque client (niveau technique, style,
ton, longueur de réponse, exemples à privilégier ou à éviter) est enrichi par observation implicite
pendant l'accompagnement, compilé au moment de la graduation, puis injecté dans l'ensemble des prompts.

**③ Cycle de vie client unifié sans provisioning d'infrastructure**
Accompagnement (Lab) et outil livré (One) ne sont pas deux produits ni deux déploiements, mais
**deux modes d'une même application multi-tenant**. La « graduation » d'un client est un simple
changement d'état en base — sans interruption de service, sans migration, sans instance dédiée.

**④ Architecture modulaire « plug & play » à découverte automatique**
Chaque brique fonctionnelle est un module autodéclaré par manifeste, découvert automatiquement par
un registre et chargé dynamiquement. **Aucune liste codée en dur, aucun import entre modules** : la
communication inter-modules transite exclusivement par la base de données ou le canal temps réel.
**17 modules** sont aujourd'hui construits (CRM, validation, parcours, documents, visioconférence,
facturation, chat, notifications, support, analytique, administration, Élio, etc.).

**⑤ Cockpit opérateur 360° (Hub)**
CRM complet à fiches modulaires et cycle de vie client, **file d'attente unifiée de validation**
regroupant toutes les productions à valider, **agenda agrégeant cinq sources hétérogènes**
(événements internes, événements personnels, Google Calendar en OAuth2 multi-comptes, Cal.com par
webhook, flux iCal publics), messagerie temps réel, visioconférence avec récupération automatique
des enregistrements et transcriptions, gestion documentaire, facturation synchronisée
bidirectionnellement avec l'outil comptable, analytique calculée depuis un journal d'activité en
append-only.

**⑥ Ancrage anti-hallucination et escalade vers l'humain**
L'état réel du système (modules actifs, statut de livraison, derniers échanges, tickets ouverts) est
**injecté systématiquement dans le prompt** de l'IA, qui ne peut donc pas affirmer un fait contredit
par la base. Sur détection de patterns de faible confiance, l'IA **escalade automatiquement vers
l'opérateur humain**, en lui transmettant l'historique de la conversation.

**⑦ Automatisation complète de l'activation client**
Paiement → vérification de signature HMAC → rapprochement du devis → activation du compte → courriel
de bienvenue : chaîne entièrement autonome, sans intervention de l'opérateur.

**⑧ Lien opérateur ↔ client permanent, et réactivité de l'accompagnement**
La qualité perçue d'un accompagnement tient autant au délai de réponse qu'au contenu de la réponse.
La plateforme réunit donc **tous les canaux de la relation dans un point unique** : messagerie
instantanée temps réel entre l'opérateur et chaque client (avec indicateur de frappe, accusé de
lecture et compteur de messages non lus propagé en temps réel), **correspondance électronique
rapatriée directement dans la fiche client** (les fils de discussion Gmail sont lus, affichés et
répondus depuis le Hub, sans quitter l'outil, avec assistance de l'IA à la reformulation avant
envoi), tickets de support, demandes de rendez-vous et file de validation. Un **système de
notifications temps réel** (cloche, badges de barre latérale, notifications par courriel
paramétrables par catégorie) alerte l'opérateur dès qu'une action l'attend. Résultat visé :
**aucune sollicitation client ne dort dans une boîte de réception séparée**, et l'opérateur pilote
l'intégralité de sa relation client depuis un écran unique.

**⑨ Le Hub comme plateforme centralisée de pilotage de tous les produits de l'éditeur**
Le Hub n'administre pas seulement les clients de la plateforme : il constitue le **poste de pilotage
unique de l'ensemble des produits numériques développés et exploités par MonProjetPro**. Chaque
produit y dispose de son cockpit dédié — indicateurs d'usage, courbes d'évolution, modération,
messagerie de support avec ses utilisateurs finaux. Le premier produit ainsi intégré, **MenuFacile,
est opérationnel** ; les produits suivants s'y brancheront au fur et à mesure de leur mise en
production. L'enjeu technique est traité au point ⑩.

**⑩ Pilotage de produits tiers par guichet isolé**
Ce pilotage centralisé pose une difficulté : administrer un produit externe supposerait normalement
d'accéder à sa base de données, donc de coupler les deux systèmes et de créer une voie de
compromission entre eux. La plateforme pilote l'application externe **sans jamais accéder à sa base
de données** : tout transite par un guichet HTTP d'administration authentifié par jeton serveur,
qui expose des opérations métier explicitement autorisées et rien d'autre. **L'étanchéité totale des
deux systèmes est préservée**, et le patron est reproductible pour chaque nouveau produit intégré.

**⑪ Une chaîne de production organisée autour d'un agent IA et d'une bibliothèque de modules
capitalisée**
L'innovation ne porte pas seulement sur le produit livré, mais sur **la façon dont il est produit**.
Le développement des outils clients est organisé autour d'un **agent d'IA gardien de la
bibliothèque de modules** : tout outil commandé par un client n'est pas développé comme un
projet jetable, mais **découpé en modules génériques et configurables qui viennent enrichir une
bibliothèque réutilisable**. L'agent applique une **doctrine formalisée** dont la règle absolue est
qu'**un module ne connaît jamais un client en particulier** — toute spécificité (adresse, couleurs,
logo, contenus, clés d'accès, source de données) vit en base de données ou en configuration, jamais
dans le code. Il tient le catalogue des briques existantes et audite chaque nouveau module avant son
entrée en bibliothèque.

Les modules sont classés en deux familles : les modules **« Relation »**, socle universel du lien
entre le client et l'opérateur, identique pour tous ; et les modules **« Cockpit »**, briques sur
mesure pilotant les livrables propres à chaque client.

La conséquence économique est directe : **le sur-mesure se déplace de la fabrication vers
l'assemblage**. Une commande client similaire ne se recode pas, elle se recompose à partir de
briques éprouvées, ce qui fait décroître le coût marginal de chaque nouvel outil livré à mesure que
la bibliothèque s'enrichit. **17 modules sont aujourd'hui construits, recensés et classés** ; le
processus formel de labellisation par l'agent gardien est en cours de déploiement sur l'ensemble
du parc.

### Technologies utilisées et raison des choix

| Technologie | Raison du choix |
|---|---|
| **Next.js 16 (App Router) / React 19** | Rendu serveur natif : les données sensibles sont lues côté serveur et ne transitent jamais inutilement vers le navigateur. Les *Server Actions* permettent d'écrire les mutations sans exposer d'API publique, réduisant d'autant la surface d'attaque. |
| **TypeScript strict** | Typage de bout en bout depuis le schéma de base jusqu'à l'interface. Indispensable sur une architecture modulaire où un contrat rompu doit échouer à la compilation et non en production. |
| **PostgreSQL / Supabase** | Le *Row Level Security* natif de PostgreSQL permet de porter l'isolation inter-clients **au niveau de la base elle-même** plutôt que dans le code applicatif — condition nécessaire d'un multi-tenant sûr sans infrastructure dédiée par client. Fournit également l'authentification, le stockage, le temps réel et les fonctions serverless dans un socle cohérent. |
| **Supabase Realtime** | Propagation instantanée des changements d'état vers tous les écrans concernés, sans interrogation périodique du serveur. |
| **TanStack Query v5** | Source unique de vérité des données serveur côté client. Le temps réel invalide le cache ; aucune synchronisation manuelle n'est écrite, ce qui élimine par construction une classe entière de bugs de désynchronisation. |
| **Anthropic Claude (SDK officiel)** | Moteur des agents Élio. Appels **exclusivement côté serveur** : la clé d'API n'est jamais exposée au navigateur. Choisi pour sa qualité de suivi d'instructions longues, déterminante pour des agents à prompts systèmes experts. |
| **Turborepo (monorepo)** | Permet à trois applications et dix-sept modules de partager un socle unique (interface, accès base, types, utilitaires) sans duplication, avec invalidation de cache de build par dépendance. |
| **Tailwind CSS 4 / Radix UI** | Système de design par jetons, autorisant un thème calculé dynamiquement par client avec **contraste WCAG AA garanti par calcul** et non par validation manuelle. |
| **Edge Functions serverless** | Traitements asynchrones et périodiques (synchronisation comptable, contrôles de santé, alertes d'inactivité, courriels) exécutés hors du cycle de requête utilisateur. |
| **Vercel** | Déploiement continu, prévisualisation par branche, exécution en périphérie de réseau. |
| **Vitest / Playwright** | Tests unitaires co-localisés, tests d'isolation RLS et tests de contrat de module, **bloquants en intégration continue**. |
| **Intégrations tierces** | Google Calendar, Google Meet API v2, Gmail OAuth, Google Drive (agenda, visio, courriels, archivage) · Cal.com (prise de rendez-vous) · Pennylane (comptabilité) · Resend (courriels transactionnels). |

### Modèle économique

Modèle **B2B mixte, sans version gratuite**, reposant sur une **distinction structurante entre le
développement des solutions et leur exploitation** :

> ⚠️ **Point à ne jamais laisser ambigu dans le dossier.** Les abonnements One et One+ **ne financent
> pas le développement**. Ils couvrent exclusivement le **fonctionnement et le suivi** de ce qui a
> été livré : hébergement, maintenance, supervision, mises à jour de sécurité, assistant IA dédié,
> relation continue avec l'opérateur. **Le développement des solutions numériques nécessaires à
> l'activité du client est facturé séparément, au devis**, en fonction du besoin réel.

| Offre | Tarif | Nature | Contenu |
|---|---|---|---|
| **Lab** | **199 €** forfaitaires | Accompagnement | Parcours entrepreneurial complet guidé par l'IA multi-agents, sous supervision humaine. **Intégralement déduits** de tout développement sur mesure ultérieur — le ticket d'entrée ne pénalise jamais le client qui va plus loin. |
| **Développement sur mesure** | **Au devis** | Production | Conception et développement des solutions numériques nécessaires à l'activité du client : outils métier, automatisations, intégrations. Facturé au projet, selon le besoin réel. Deux modalités de livraison : intégré au dashboard One du client, ou livré en propre et déployé de façon autonome (offre **Ponctuel**). |
| **One** | **49 €/mois** | Exploitation | **Fonctionnement et suivi uniquement** : hébergement, maintenance, supervision, mises à jour, assistant IA dédié (Élio One), console de pilotage des livrables, canal de relation continue avec l'opérateur. |
| **One+** | **99 €/mois** | Exploitation + humain | L'offre One augmentée de séances de **coaching humain** destinées à soutenir le porteur de projet dans la concrétisation de son ambition. |

**Architecture économique.** Le modèle combine des **revenus de projet** (développement au devis, qui
constitue la part principale de la valeur facturée) et des **revenus récurrents** (abonnements
d'exploitation), le forfait Lab jouant le rôle d'entrée de parcours qualifiante. L'abonnement
mensuel n'est donc pas un tarif de logiciel en libre-service : c'est le **coût de possession** d'un
outil sur mesure déjà payé, maintenu en condition opérationnelle et accompagné dans la durée.

---

## 2.B — Contexte de marché et besoins adressés ✅

**Le constat de départ.** Un porteur de projet, une TPE ou une association qui veut se doter d'un
outil numérique se heurte aujourd'hui à une chaîne fragmentée et coûteuse : un cabinet de conseil
pour clarifier le projet, une agence de développement pour le construire, un éditeur de logiciel
pour l'exploiter — trois prestataires, trois contrats, trois vocabulaires, et **aucune continuité
d'information entre eux**. Le travail de cadrage produit par le premier est perdu au moment où le
deuxième commence ; l'outil livré par le deuxième est ensuite maintenu sans mémoire du pourquoi.
Pour une structure de moins de dix personnes, ce parcours est hors de portée financière, et c'est
la raison pour laquelle il ne se produit pas : la petite structure renonce, ou se rabat sur un outil
générique qu'elle n'utilisera qu'à 20 %.

**Ce que les solutions existantes ne résolvent pas.**

- **Les plateformes d'incubation et de suivi de startups** (outils de portefeuille, CRM
  d'accompagnement) organisent le suivi administratif du parcours mais **ne produisent aucune
  expertise** : elles enregistrent l'avancement, elles ne conseillent pas. L'accompagnement reste
  intégralement porté par un humain, donc facturé au temps passé, donc réservé aux structures qui
  peuvent le payer.
- **Les assistants conversationnels génériques** délivrent une réponse plausible mais **ignorent
  totalement l'état réel du projet** du client : ils n'ont accès ni à ses livrables, ni à ses
  décisions passées, ni à son avancement. Ils produisent du conseil générique, non situé — et
  hallucinent d'autant plus volontiers qu'ils n'ont aucun ancrage factuel.
- **Les outils no-code** permettent de construire un outil, mais laissent entièrement à la charge du
  client la question la plus difficile : **savoir quoi construire**. Ils supposent un cahier des
  charges que, précisément, la petite structure n'a pas les moyens de produire.
- **Les SaaS métier verticaux** imposent leur modèle de données et leur ergonomie ; l'adaptation au
  métier réel du client se paie en contournements.
- **Les assistants IA embarqués dans les produits du marché reposent sur un catalogue figé de
  compétences.** Ajouter une expertise à l'assistant suppose un cycle complet de spécification, de
  développement, de test et de redéploiement — délai de plusieurs semaines et coût fixe. Il est donc
  économiquement impossible de calibrer une expertise **pour un seul client**, alors que c'est
  précisément ce dont un accompagnement individualisé a besoin.
- **Les prestations de développement sur mesure sont produites en jetable.** L'agence livre un
  projet, encaisse, et recommence de zéro au client suivant : rien n'est capitalisé, le coût
  marginal du énième outil livré reste égal au premier. C'est la raison de fond pour laquelle le
  développement sur mesure demeure inaccessible aux petites structures.
- **Les canaux de la relation client sont éclatés** : le courriel dans une messagerie, les échanges
  dans un outil de discussion, les documents dans un espace de stockage, les rendez-vous dans un
  agenda, les demandes dans un formulaire. Pour un opérateur seul, cette dispersion est le premier
  facteur de délai de réponse — et le délai de réponse est ce que le client accompagné perçoit en
  premier.
- **Sur le plan technique**, les plateformes d'accompagnement qui livrent ensuite un outil au client
  procèdent classiquement par **provisioning d'une instance dédiée par client** — infrastructure
  séparée, base séparée, déploiement séparé. Ce modèle a un coût unitaire d'exploitation et un coût
  de maintenance qui **interdisent structurellement de servir un client à 49 € par mois**.

**Les besoins que le projet cherche à résoudre.**

1. **Supprimer la rupture entre la phase de réflexion et la phase d'outillage.** Ce qui a été compris
   du projet pendant l'accompagnement doit rester disponible et exploitable dans l'outil livré,
   sans ressaisie ni transfert — y compris par l'IA elle-même.
2. **Rendre un conseil expert économiquement accessible à une structure de moins de dix personnes**,
   en industrialisant la part reproductible de l'accompagnement (méthode, cadres d'analyse,
   questionnement structuré) tout en maintenant l'humain aux points de décision.
3. **Produire un conseil situé et non générique** : une IA qui connaît l'état réel du projet du
   client et ne peut pas affirmer un fait contredit par les données.
4. **Maintenir un coût d'exploitation par client compatible avec un abonnement à 49 €/mois**, ce qui
   impose une architecture mutualisée à isolation garantie plutôt qu'une infrastructure par client.
5. **Garantir la confiance** : isolation stricte des données entre clients, supervision humaine des
   productions de l'IA, consentement explicite et révocable à l'usage de l'IA, conformité RGPD.
6. **Permettre de calibrer une expertise pour un client unique, en quelques minutes**, sans cycle de
   développement — condition sans laquelle un accompagnement réellement individualisé reste un
   discours commercial.
7. **Faire décroître le coût du sur-mesure au fil des livraisons**, en capitalisant chaque outil
   développé sous forme de briques génériques réutilisables plutôt qu'en produisant du jetable.
8. **Restituer au client la propriété de ce qui est produit pour lui** : les livrables du parcours
   sont des documents structurés, exportables, qu'il conserve — et non des échanges captifs d'une
   plateforme.
9. **Concentrer la relation client en un point unique** pour supprimer le délai de réponse induit
   par la dispersion des canaux.

**Le contournement de la contrainte structurante.** Le verrou central du projet est là : servir un
accompagnement personnalisé et un outil métier sur mesure à un tarif de masse suppose de mutualiser
l'infrastructure ; mutualiser l'infrastructure suppose de garantir l'étanchéité des données au seul
niveau logiciel. C'est ce compromis — habituellement tranché en faveur de l'instance dédiée, plus
simple mais plus chère — que le projet résout par une isolation portée au niveau de la base de
données et **vérifiée par des tests d'isolation bloquants en intégration continue**.

---

## 2.C — Documents renforçant l'aspect innovant ✅

MONPROJETPRO **n'a pas commandité d'étude de marché auprès d'un cabinet externe** : jeune entreprise
autofinancée, elle a construit son analyse concurrentielle en interne, à partir de l'observation
directe des solutions du marché et des besoins exprimés par ses prospects et clients.

En revanche, l'entreprise dispose d'un **corpus documentaire technique et fonctionnel substantiel,
produit tout au long de la conception**, intégralement communicable :

| Document | Nature | Ce qu'il démontre |
|---|---|---|
| **Dossier de présentation de la plateforme** | Synthèse fonctionnelle et technique **illustrée de captures d'écran de l'application en production** | La réalité et le niveau de finition du produit |
| **Cahier des exigences fonctionnelles (PRD)** | Spécification détaillée, découpée par domaine | La démarche de conception structurée, antérieure au développement |
| **Dossier d'architecture technique** | 7 sections : socle, données, modules, patrons d'implémentation, structure, sécurité, déploiement | La caractérisation des verrous techniques et les choix d'ingénierie retenus |
| **Décisions d'architecture documentées (ADR)** | Notamment ADR-01 (coexistence Lab/One dans une instance unique) | La **démarche d'innovation elle-même** : options envisagées, contraintes, arbitrage motivé |
| **Spécification de conception UX** | Système de design, parcours utilisateurs, patrons d'interface | La dimension ergonomique de l'innovation |
| **Documentation obligatoire par module** | Guide, FAQ et diagrammes de flux pour chacun des 17 modules — **présence vérifiée automatiquement en intégration continue** | L'industrialisation de la qualité |
| **Doctrine de la bibliothèque de modules** | Règles formalisées d'admission d'un module dans la bibliothèque réutilisable : règle d'or de généricité, checklist d'audit, critères de rejet | La **méthode de production capitalisante**, formalisée et opposable — et non une intention |
| **Catalogue de la bibliothèque de modules** | Recensement des 17 modules construits, classés par famille (Relation / Cockpit), avec statut d'audit et configuration requise | La réalité de la capitalisation et l'état d'avancement du processus de labellisation |
| **Référentiel de vélocité de développement** | Relevé horodaté de 90 récits utilisateurs livrés, avec volumétrie de code et de tests | La traçabilité fine et vérifiable de l'effort de développement |
| **Historique de versionnement Git complet** | 694 révisions sur 95 journées de développement effectives | La **preuve objective et infalsifiable** de la réalité, de la chronologie et de l'ampleur des travaux |
| **Journal des correctifs et registre des enseignements** | Suivi continu des problèmes rencontrés et des solutions retenues | La démarche itérative de résolution des difficultés techniques |
| **Sites publics** | monprojet-pro.com et monprojet-qvct.fr | Le positionnement commercial effectif |

**Le code source de la plateforme et son historique de versionnement complet peuvent être mis à la
disposition de l'administration** — l'ensemble des affirmations techniques du présent dossier y est
directement vérifiable.

Une **installation pilote en conditions réelles d'exploitation** (dispositif MonProjet-QVCT, déployé
auprès du bailleur social Habitat 77 depuis mai 2026) complète ce corpus par un retour d'usage terrain.

---

## 2.D — Objectifs de performance et avancées techniques visées ✅

> Le tableau distingue systématiquement ce qui est **déjà atteint et mesurable** de ce qui constitue
> un **objectif visé** — cette distinction est volontaire et engage l'entreprise.

### État actuel — volumétrie objectivement constatée

| Indicateur | Valeur constatée au 27/07/2026 |
|---|---|
| Code applicatif TypeScript / React | **~216 700 lignes** versionnées, dont **~86 200 lignes de tests** |
| Fichiers de tests automatisés | **654** |
| Schéma de base de données | **186 migrations SQL** versionnées (~10 200 lignes) |
| Modules fonctionnels construits | **17** |
| Fonctions serverless en production | **19** |
| Agents IA experts définis en base | **11** |
| Révisions versionnées | **694**, sur **95 journées de développement effectives** |
| Couverture de tests exigée en intégration continue | **> 80 %**, bloquante |

### Objectifs de performance visés

**① Isolation et sécurité — objectif : zéro fuite inter-clients, garantie par construction**
Aucune donnée d'un client ne doit pouvoir être atteinte par un autre, **quelle que soit l'erreur
applicative**. L'objectif est que l'isolation ne dépende jamais du code applicatif : elle est portée
par les politiques de sécurité au niveau des lignes de la base et **vérifiée par des tests
d'isolation bloquants** exécutés à chaque intégration. Cible : **100 % des tables portant des données
client couvertes par une politique d'isolation testée**. S'y ajoutent une authentification à double
facteur TOTP de niveau AAL2 et une limitation des tentatives de connexion implémentée en base.

**② Coût d'exploitation par client — objectif : maintenir un outil sur mesure en condition
opérationnelle pour 49 €/mois**
L'abonnement ne finance **que le fonctionnement et le suivi** de la solution — le développement
étant facturé séparément au devis. L'objectif est donc que le **coût récurrent d'exploitation d'un
client** (infrastructure, supervision, maintenance, inférence IA) reste très inférieur à ce montant,
ce qui commande l'ensemble des choix d'architecture : il impose un coût d'infrastructure marginal
par client quasi nul, donc l'absence de toute instance dédiée. Cible : **servir l'intégralité du parc
client depuis un déploiement unique**, l'ajout d'un client n'entraînant **aucune opération
d'infrastructure ni aucun coût fixe supplémentaire** — objectif atteint dans l'architecture actuelle,
à éprouver à l'échelle.

**③ Maîtrise du coût d'inférence de l'IA — objectif : coût unitaire connu et plafonné**
Un service conversationnel à forfait mensuel est exposé au risque d'un coût d'inférence non maîtrisé.
Le projet vise une **instrumentation fine de la consommation de jetons par agent et par client**, des
**alertes de budget configurables** et un **routage du modèle selon la complexité de la demande**
(modèle économique pour les tâches simples, modèle avancé pour le raisonnement). Cible :
**coût d'IA par client et par mois maintenu à moins de 5 % du prix de l'abonnement**.

**④ Fiabilité factuelle de l'IA — objectif : aucune affirmation contredite par l'état du système**
L'IA ne doit jamais énoncer sur le projet du client un fait que la base contredit. Le dispositif
combine l'injection systématique de l'état réel du dashboard dans le prompt, une posture codifiée
interdisant l'invention factuelle, et une **escalade automatique vers l'opérateur humain sur
détection de faible confiance**. Cible : **100 % des affirmations d'état vérifiables adossées à une
donnée injectée**, et non produites par le modèle.

**⑤ Latence et fluidité perçue — objectif : temps réel généralisé**
Toute action de l'un doit être visible chez l'autre sans rechargement. Cibles : **propagation d'un
changement d'état à l'ensemble des écrans concernés en moins d'une seconde** ; **recherche client
instantanée sans requête supplémentaire en base** (filtrage sur cache, anti-rebond 300 ms) ;
**regroupement des rafraîchissements en cascade par anti-rebond** pour éviter les tempêtes de
requêtes ; **délai maximal de réponse de l'IA borné à 60 secondes** avec dégradation gracieuse.

**⑥ Scalabilité — objectif de montée en charge**
Cible de dimensionnement : **plusieurs centaines de clients actifs servis simultanément depuis le
déploiement unique**, avec **plusieurs milliers de connexions temps réel concurrentes**, sans
modification d'architecture ni ajout d'instance. Le socle serverless et la mutualisation sont
dimensionnés pour cela ; **la validation à cette échelle reste à conduire** — c'est un des axes de
travail des douze prochains mois.

**⑦ Extensibilité — objectif : ajouter une capacité sans toucher à l'existant**
Cible : **un nouveau module intégrable sans modifier une seule ligne des modules existants ni du
noyau**, par simple ajout d'un manifeste découvert automatiquement. Corollaire imposé et vérifié :
**interdiction stricte de tout import direct entre modules**, la communication passant exclusivement
par la base ou le canal temps réel.

**⑧ Gain d'efficacité pour le client — objectif métier**
Réduction visée du délai entre l'idée initiale et un projet structuré prêt à être construit : **de
plusieurs mois d'allers-retours avec des prestataires successifs à quelques semaines de parcours
guidé**. Côté opérateur, la file d'attente unifiée de validation et l'automatisation de l'activation
client visent à **supprimer intégralement les gestes administratifs répétitifs** du cycle
paiement → activation → accueil.

**⑨ Délai de mise à disposition d'une expertise nouvelle — objectif : de plusieurs semaines à
quelques minutes**
Cible : **créer, calibrer et mettre à disposition d'un client un agent expert entièrement nouveau en
moins de 15 minutes, sans écrire une ligne de code ni redéployer l'application**. L'état de l'art
impose pour cela un cycle de spécification, développement, test et déploiement de plusieurs
semaines. C'est ce facteur d'écart qui rend économiquement possible une expertise calibrée pour un
client unique.

**⑩ Capitalisation de la production — objectif : coût marginal décroissant du sur-mesure**
Cible : **faire décroître la charge de développement de chaque nouvel outil client à mesure que la
bibliothèque de modules s'enrichit**, en visant qu'une part majoritaire de chaque nouvelle commande
soit couverte par recomposition de briques existantes plutôt que par développement neuf. Indicateurs
suivis : nombre de modules labellisés en bibliothèque, part des modules réutilisés sans modification
de code (configuration seule), et charge moyenne par outil livré. Le processus formel de
labellisation est en cours de déploiement sur les 17 modules construits.

**⑪ Accessibilité — objectif : conformité garantie par calcul**
Le branding de chaque client étant personnalisable, le contraste ne peut pas être validé
manuellement à l'avance. Le projet vise un **contraste WCAG AA garanti par calcul automatique** des
variables de thème, quelle que soit la couleur choisie par le client.

### Avancées techniques recherchées

Au-delà des indicateurs, la démarche vise **sept verrous techniques**, tous aujourd'hui levés dans le
code et détaillés en §3.A :

1. Multi-tenancy à isolation stricte par *Row Level Security*, **sans instance dédiée**.
2. Coexistence de deux expériences produit (accompagnement / outil livré) dans une application unique,
   la bascule étant un simple changement d'état — **sans provisioning ni interruption**.
3. Modularité à découverte automatique par manifestes, **sans couplage inter-modules**.
4. **Continuité de contexte de l'IA entre phases, sans migration de données.**
5. Orchestration temps réel de consommateurs hétérogènes par un **coordinateur unique à anti-rebond**.
6. Chaîne d'activation client **entièrement autonome** depuis le paiement.
7. Pilotage d'un produit tiers **par guichet isolé**, sans couplage de bases de données.

S'y ajoutent deux avancées portant non sur le produit livré mais sur **la manière de le produire** :

- **Expertise IA définie en données et non en code** : la compétence délivrée par la plateforme
  devient un paramètre d'exploitation modifiable à chaud, et non un livrable de développement.
- **Chaîne de production capitalisante** : chaque outil client développé enrichit une bibliothèque
  de modules génériques, sous le contrôle d'un agent gardien appliquant une doctrine formalisée —
  déplaçant le sur-mesure de la fabrication vers l'assemblage.

---

## 2.E — Illustrations et schémas ✅

Oui. Sont disponibles et communicables :

- **Captures d'écran de l'application en production** — jeu complet couvrant les trois environnements
  (Hub, Lab, One), déjà intégré au dossier de présentation de la plateforme.
- **Dossier de présentation illustré** de la plateforme (document de synthèse fonctionnelle et
  technique).
- **Schémas d'architecture** : structure du monorepo, modèle de données, flux d'authentification et
  d'isolation, chaîne d'activation client par webhook, architecture du noyau IA.
- **Diagrammes de flux par module** — chacun des 17 modules embarque un document `flows.md`
  obligatoire, **dont la présence est vérifiée automatiquement en intégration continue**.
- **Spécification de conception UX** : système de design, thèmes des trois environnements, parcours
  utilisateurs.
- **Sites publics en ligne** : monprojet-pro.com et monprojet-qvct.fr.

Des captures complémentaires, schémas d'architecture additionnels ou rapports techniques peuvent
être produits à la demande de l'administration.

---

# 3. Rôle et travaux de l'entreprise dans le projet

> **Précision liminaire indispensable.** MONPROJETPRO **est le porteur principal** du projet
> d'innovation présenté : la plateforme MonProjetPro est son produit propre, conçu, développé et
> exploité par elle. Les travaux décrits ci-dessous n'ont donc **pas été sous-traités à l'entreprise
> par un donneur d'ordre tiers** : ils ont été **réalisés à 100 % en interne**, sans aucune
> sous-traitance sortante ni prestation externe de conception ou de développement.
> La présente demande d'agrément vise à permettre à ses **futurs clients** d'intégrer les
> prestations d'innovation que l'entreprise réalisera pour leur compte dans leur crédit d'impôt
> innovation — la plateforme MonProjetPro constituant la **démonstration de sa capacité à conduire
> des opérations d'innovation**.

## 3.A — Travaux réalisés par l'entreprise ✅

**Part de l'entreprise dans le projet : 100 %.** Conception, architecture, développement, tests,
sécurité, déploiement et exploitation ont été intégralement réalisés en interne par le président,
seule personne affectée au projet.

### Détail des activités

**① Cadrage produit et conception fonctionnelle**
Analyse du besoin des trois populations d'utilisateurs (opérateur, client accompagné, client gradué),
rédaction du cahier des exigences fonctionnelles, découpage en 12 domaines fonctionnels et en récits
utilisateurs, définition des critères d'acceptation.

**② Architecture technique et décisions structurantes**
Choix du modèle de déploiement multi-tenant, conception du modèle de données et de la stratégie
d'isolation, définition des patrons d'implémentation imposés (trois modes d'accès aux données
strictement délimités, séparation stricte entre état serveur et état d'interface), conception du
système modulaire à découverte automatique, rédaction des décisions d'architecture documentées.
**C'est ici que se situe l'essentiel de la démarche d'innovation** : les options ont été instruites,
les contraintes caractérisées, les arbitrages motivés et tracés.

**③ Développement de la base de données et de la sécurité**
186 migrations SQL, politiques d'isolation par ligne sur l'ensemble des tables portant des données
client, fonctions de sécurité en base, authentification à double facteur TOTP avec codes de
récupération, limitation des tentatives de connexion, gestion de session serveur.

**④ Développement applicatif des trois environnements**
Hub (cockpit opérateur), Lab (parcours d'accompagnement), One (console de pilotage des livrables) :
~216 700 lignes de code TypeScript / React, réparties en 17 modules fonctionnels autonomes, sur un
socle partagé (interface, accès base, types, utilitaires).

**⑤ Conception et mise en œuvre du noyau d'intelligence artificielle**
Architecture d'orchestration multi-agents, conception et rédaction des prompts systèmes des 11 agents
experts, mécanisme d'ancrage anti-hallucination par injection de l'état réel, profil de communication
par client, continuité de contexte entre phases, escalade vers l'humain, instrumentation de la
consommation de jetons et du coût par client.

**⑥ Intégrations tierces**
Google Calendar (OAuth2 multi-comptes avec rafraîchissement automatique de jeton), Google Meet API v2
(compte de service et délégation de domaine), Gmail OAuth, Google Drive, Cal.com (webhooks),
Pennylane (synchronisation bidirectionnelle), Resend (courriels transactionnels) — ainsi que le
guichet HTTP d'administration isolé pilotant le produit tiers MenuFacile.

**⑦ Développement des traitements serverless**
19 fonctions : synchronisation comptable périodique, contrôles de santé du système, alertes
d'inactivité, envoi de courriels, facturation mensuelle récurrente, activation client par webhook,
appels au moteur d'IA, compilation des acquis d'accompagnement.

**⑧ Tests et qualité**
654 fichiers de tests (~86 200 lignes), tests d'isolation inter-clients, tests de contrat par module,
vérification automatique de la présence de la documentation de chaque module, typage strict,
couverture supérieure à 80 % — l'ensemble étant **bloquant en intégration continue**.

**⑨ Déploiement, exploitation et supervision**
Chaîne d'intégration et de déploiement continus, environnements de prévisualisation par branche,
supervision de la santé du système, journalisation d'audit, mode maintenance.

### Caractère essentiel de cette contribution

La contribution de l'entreprise **est le projet** : sans elle, il n'existe pas. Elle porte en
particulier les décisions dont dépend la viabilité économique du produit — c'est le choix du
multi-tenant à isolation stricte, contre le réflexe d'une instance par client, qui rend possible un
abonnement à 49 €/mois ; et c'est la continuité de contexte de l'IA entre les phases qui donne au
produit sa différence par rapport à une simple juxtaposition d'un outil de suivi et d'un agent
conversationnel.

### Volume et part du projet

| | Valeur |
|---|---|
| **Journées de développement effectives constatées** | **95** (relevé sur l'historique de versionnement, du 08/02/2026 au 27/07/2026) |
| dont antérieures au démarrage d'activité (avant le 01/04/2026) | 27 — phase de conception et de prototypage préalable à la constitution de la société |
| dont réalisées par MONPROJETPRO (depuis le 01/04/2026) | **68** |
| **Part de l'entreprise dans le projet** | **100 %** — aucune sous-traitance sortante, aucun cofinancement, aucune contribution externe |

> ℹ️ Les 95 journées correspondent aux **journées calendaires distinctes comportant au moins une
> révision versionnée** : c'est une donnée objective, extraite de l'historique Git et vérifiable.
> La charge en jours-hommes déclarée en 3.D en découle directement (cf. §3.D).

---

## 3.B — Lieu de réalisation des travaux ✅

Les travaux sont réalisés **intégralement en distanciel**, depuis le poste de travail du président,
sans site de production physique. L'entreprise est domiciliée 33 rue de la Bienfaisance, 75008 Paris
(domiciliation TERRA SERVICES SAS) et intervient **100 % à distance, sur toute la France**.

**Outils collaboratifs et de production utilisés :**

| Usage | Outils |
|---|---|
| Gestion de versions et suivi des travaux | Git / GitHub (dépôts privés) |
| Environnement de développement | Visual Studio Code, Cursor, Claude Code |
| Base de données, authentification, stockage, temps réel | Supabase (console et interface en ligne de commande) |
| Hébergement, déploiement continu, prévisualisation | Vercel |
| Visioconférence client | Google Meet, plateforme de visioconférence intégrée à la plateforme |
| Prise de rendez-vous | Cal.com |
| Messagerie et courriels | Gmail (OAuth), Resend pour le transactionnel |
| Agenda et documents partagés | Google Calendar, Google Drive, Google Docs |
| Comptabilité et facturation | Pennylane |
| Documentation projet | Documentation versionnée dans le dépôt (Markdown) |
| Relation client et suivi | La plateforme MonProjetPro elle-même (chat, documents, validation, support) |

> À noter : **l'entreprise exploite sa propre plateforme pour conduire sa relation client** — le Hub
> est son outil de travail quotidien, ce qui en fait également son premier terrain d'éprouvage.

---

## 3.C — Matériels et moyens particuliers ✅

### Technologies et logiciels

| Moyen | Rôle dans le projet |
|---|---|
| **Next.js 16 (App Router) / React 19** | Socle applicatif des trois environnements ; rendu serveur pour la performance et la protection des données sensibles. |
| **TypeScript (mode strict)** | Typage de bout en bout du schéma de base jusqu'à l'interface ; garantit l'intégrité des contrats entre les 17 modules. |
| **PostgreSQL / Supabase** | Base de données, authentification, stockage de fichiers, temps réel et fonctions serverless. Le *Row Level Security* natif porte l'isolation inter-clients au niveau de la base. |
| **Supabase Realtime** | Propagation instantanée des changements d'état vers tous les écrans concernés. |
| **TanStack Query v5** | Source unique de vérité des données serveur côté client ; invalidation de cache pilotée par le temps réel. |
| **Anthropic Claude (SDK officiel)** | Moteur d'inférence des agents Élio ; appels serveur uniquement, clé jamais exposée. |
| **Turborepo** | Gestion du monorepo : 3 applications et 17 modules sur un socle partagé, avec cache de build par dépendance. |
| **Tailwind CSS 4 / Radix UI / shadcn/ui** | Système de design par jetons ; thème calculé par client à contraste WCAG AA garanti. |
| **Zod / React Hook Form** | Validation des données partagée entre client et serveur. |
| **Vitest / Playwright** | Tests unitaires, tests d'isolation RLS, tests de contrat, tests de bout en bout. |
| **Vercel** | Hébergement, intégration et déploiement continus, environnements de prévisualisation par branche. |
| **GitHub Actions** | Chaîne de qualité bloquante : lint, typage, tests, isolation, présence de la documentation, build. |
| **Google Workspace APIs** | Calendar (OAuth2 multi-comptes), Meet API v2 (compte de service + délégation de domaine), Gmail, Drive, Docs. |
| **Cal.com / Pennylane / Resend** | Prise de rendez-vous, comptabilité synchronisée, courriels transactionnels. |
| **Claude Code / Cursor** | Assistance au développement par agents d'IA — l'entreprise applique à sa propre production la démarche d'ingénierie assistée par IA qu'elle met en œuvre dans ses prestations. |
| **Flutter / Dart** | Employé sur le produit connexe MenuFacile, piloté depuis le Hub. |

### Matériel

**Poste de développement principal — ordinateur portable HP Victus Gaming 15-fa1xxx :**

| Caractéristique | Valeur |
|---|---|
| Processeur | Intel Core i5-12500H (12ᵉ génération), 2,50 GHz — 12 cœurs |
| Mémoire vive | 16 Go |
| Carte graphique | NVIDIA GeForce RTX 4050 Laptop GPU (6 Go) + Intel Iris Xe Graphics |
| Stockage | SSD 477 Go |
| Système d'exploitation | Windows 11, 64 bits (architecture x64) |

Cette configuration est dimensionnée pour l'exécution simultanée d'un monorepo de 3 applications et
17 modules en mode développement, d'une base de données locale, de la suite de tests automatisés
(654 fichiers de tests) et des agents d'assistance au développement par IA.

**Terminaux de test** : navigateurs de bureau et terminaux mobiles, pour la vérification du
comportement adaptatif des interfaces et des applications web installables.

### Moyens humains

**Une personne** : Mickaël CULUS, président — architecte, développeur et opérateur du produit.
Aucune autre ressource humaine n'est affectée au projet.

---

## 3.D — Estimation en jours-hommes et coût ⏸️ *(chiffrage à valider)*

### Méthode d'estimation retenue

L'estimation ne repose **pas sur une projection déclarative** mais sur le **relevé objectif de
l'historique de versionnement** du projet : chaque journée comportant au moins une révision
versionnée est comptée comme une journée de développement effective. Le décompte est **vérifiable
par l'administration** sur simple communication du dépôt.

**Période couverte** : du 8 février 2026 au 27 juillet 2026.
**Journées de développement effectives constatées** : **95**, dont **68 depuis le démarrage
d'activité de la société** (1er avril 2026) et **27 antérieures**, correspondant à la phase de
conception et de prototypage menée avant la constitution de la SASU.
**Révisions versionnées** : 694. **Récits utilisateurs livrés et horodatés** : 90.

### Décomposition par jalon technique

| Jalon technique | Durée estimée | Détail des travaux |
|---|---|---|
| **1. Cadrage produit & architecture logicielle** | **8 – 10 j** | Analyse du besoin des trois populations d'utilisateurs, rédaction du cahier des exigences fonctionnelles, conception du modèle de données, choix du modèle de déploiement multi-tenant, définition des patrons d'implémentation imposés, décisions d'architecture documentées, conception UX et système de design. |
| **2. Socle technique & fondations de sécurité** | **10 – 12 j** | Monorepo et socle partagé (interface, accès base, types, utilitaires), migrations fondatrices, politiques d'isolation par ligne sur l'ensemble des tables client, authentification client et opérateur, double facteur TOTP avec codes de récupération, limitation des tentatives de connexion, gestion de session multi-appareils, tests d'isolation bloquants. |
| **3. Architecture modulaire à découverte automatique** | **5 – 7 j** | Format de manifeste, registre auto-découvrant, chargement dynamique, interdiction d'import inter-modules, tests de contrat par module, documentation obligatoire vérifiée en intégration continue. |
| **4. Cockpit opérateur — CRM & cycle de vie client** | **12 – 14 j** | Base clients, fiches à onglets modulaires, cycle de vie complet (suspension, clôture à double validation, réactivation, montée d'offre), import en masse, statistiques, prise de contrôle de session pour le support, export RGPD, alertes d'inactivité. |
| **5. Communication temps réel & notifications** | **8 – 10 j** | Messagerie temps réel, notifications applicatives et par courriel, préférences par catégorie, présence en ligne, gestion des modifications concurrentes, **orchestrateur unique de rafraîchissement à anti-rebond résolvant les désynchronisations entre lecteurs hétérogènes**. |
| **6. Gestion documentaire & visioconférence** | **8 – 10 j** | Dépôt de fichiers à validation en triple couche, visualisation intégrée, génération de documents PDF brandés, dossiers, partage, liens signés à durée limitée ; visioconférence, récupération automatique des enregistrements et des transcriptions. |
| **7. Agenda multi-sources & intégrations tierces** | **8 – 10 j** | Agrégation de cinq sources hétérogènes en un calendrier unique (interne, personnel, Google Calendar en OAuth2 multi-comptes avec rafraîchissement de jeton, Cal.com par webhook, flux iCal publics), vues jour/semaine/mois. |
| **8. Facturation & chaîne d'activation automatisée** | **7 – 9 j** | Devis, factures, abonnements récurrents, indicateurs de revenu récurrent, **synchronisation bidirectionnelle avec l'outil comptable**, et **chaîne autonome paiement → vérification de signature HMAC → rapprochement de devis → activation du compte → courriel de bienvenue**. |
| **9. Parcours d'accompagnement guidé (Lab)** | **10 – 12 j** | Timeline à progression conditionnelle, briefs enrichis à galerie d'assets, workflow de soumission et de validation, injections de contexte de l'opérateur, modification du parcours en cours de route, modèles de parcours réutilisables par instantané. |
| **10. Noyau d'intelligence artificielle « Centaure »** | **14 – 16 j** | Architecture d'orchestration multi-agents, conception et rédaction des prompts systèmes des 11 agents experts, définition des agents en base plutôt qu'en dur, ancrage anti-hallucination par injection de l'état réel, profil de communication par client, **continuité de contexte entre phases sans migration**, escalade vers l'humain, liens profonds, instrumentation des jetons et du coût par client. |
| **11. Console de pilotage des livrables (One) & graduation** | **8 – 10 j** | Coque personnalisée par client à contraste garanti par calcul, console d'activité entièrement branchée sur des sources réelles, **graduation sans provisioning**, compilation des acquis d'accompagnement, fil de suivi de l'outil, bascule entre les deux modes. |
| **12. Administration système, supervision & analytique** | **6 – 8 j** | Catalogue de modules et activation par client, supervision de la santé du système, journalisation d'audit, mode maintenance, analytique calculée depuis un journal d'activité en append-only. |
| **13. Pilotage de produit tiers par guichet isolé** | **4 – 5 j** | Guichet HTTP d'administration authentifié par jeton serveur, garantissant l'étanchéité totale des deux bases ; cockpit de pilotage du produit tiers. |
| **14. Recette, correctifs, durcissement & mise en production** | **10 – 12 j** | Revues de code adversariales systématiques, correctifs, audits de sécurité, résolution des désynchronisations, montée de version des dépendances, mises en production successives. |
| **Total estimé** | **~118 – 145 j-h** | dont **95 journées de développement effectives objectivement constatées** dans l'historique de versionnement |

> **Lecture de l'écart.** Le total par jalons (118–145 j-h) est **supérieur** aux 95 journées
> constatées dans l'historique : c'est attendu, les 95 journées ne comptant que les journées ayant
> produit une révision versionnée, à l'exclusion du temps de conception, d'analyse, de rédaction
> documentaire, de veille technique et de recette n'ayant pas donné lieu à commit le jour même.
> **La fourchette basse (118 j-h) est la valeur à retenir si le cabinet préfère la position la plus
> défendable** : elle reste adossée à une preuve matérielle vérifiable.

### Coût

**Taux journalier moyen retenu : 550 € HT**, en cohérence avec les devis émis par l'entreprise et
avec les pratiques du marché pour un développeur full-stack senior indépendant sur cette pile
technologique.

| Hypothèse | Charge | Calcul | Coût du projet |
|---|---|---|---|
| **Retenue — fourchette basse** | **118 j-h** | 118 × 550 € | **64 900 € HT** |
| Fourchette haute | 145 j-h | 145 × 550 € | 79 750 € HT |

**Coût total estimé du projet : 64 900 € HT** (118 jours-hommes à 550 € HT/jour).

> La fourchette basse est retenue délibérément : elle reste intégralement adossée à l'historique de
> versionnement, donc vérifiable par l'administration. Le projet est **autofinancé sur fonds propres**,
> sans subvention, avance remboursable ni financement externe.

### Coût par jalon technique

| Jalon | Charge retenue | Coût (550 €/j) |
|---|---|---|
| 1. Cadrage produit & architecture logicielle | 8 j | 4 400 € |
| 2. Socle technique & fondations de sécurité | 10 j | 5 500 € |
| 3. Architecture modulaire à découverte automatique | 5 j | 2 750 € |
| 4. Cockpit opérateur — CRM & cycle de vie client | 12 j | 6 600 € |
| 5. Communication temps réel & notifications | 8 j | 4 400 € |
| 6. Gestion documentaire & visioconférence | 8 j | 4 400 € |
| 7. Agenda multi-sources & intégrations tierces | 8 j | 4 400 € |
| 8. Facturation & chaîne d'activation automatisée | 7 j | 3 850 € |
| 9. Parcours d'accompagnement guidé (Lab) | 10 j | 5 500 € |
| 10. Noyau d'intelligence artificielle « Centaure » | 14 j | 7 700 € |
| 11. Console de pilotage des livrables (One) & graduation | 8 j | 4 400 € |
| 12. Administration système, supervision & analytique | 6 j | 3 300 € |
| 13. Pilotage de produit tiers par guichet isolé | 4 j | 2 200 € |
| 14. Recette, correctifs, durcissement & mise en production | 10 j | 5 500 € |
| **Total** | **118 j-h** | **64 900 € HT** |

### Devis détaillé

Un **devis détaillé jalon par jalon**, reprenant le tableau ci-dessus valorisé au taux journalier
retenu, peut être produit et joint au dossier sur demande du cabinet ou de l'administration.

---

## Points restant à compléter

| # | Point | Section | Qui tranche | Statut |
|---|---|---|---|---|
| 1 | TJM et coût total du projet | 3.D | MiKL | ✅ **Tranché le 30/07 : 550 €/j → 64 900 € HT** |
| 2 | Matériel de développement | 3.C | MiKL | ✅ **Renseigné le 30/07 : HP Victus 15-fa1xxx, i5-12500H, 16 Go** |
| 3 | **Formulation de l'antériorité des travaux** vs immatriculation (27 j avant le 01/04/2026) | 3.A / 3.D | MiKL + cabinet | ⏸️ **Ouvert** |
| 4 | Formation BMAD | 1.C | MiKL | ✅ **Clos le 30/07 : il n'y en a jamais eu — mention retirée définitivement du dossier** |
| 5 | Section 4 — sans objet : première demande, pas de renouvellement | 4 | — | ✅ Clos |

---

## Sources faisant autorité

- `presentation-subvention/dossier-cii-section1-reponses.md` — section 1 validée, arbitrages actés.
- `presentation-subvention/synthese-fonctionnalites-cii.md` (02/07/2026) — inventaire technique.
- **Historique Git du dépôt** (08/02/2026 → 27/07/2026) — source des volumétries et des 95 journées
  effectives ; toutes les données chiffrées de ce document en sont extraites et sont reproductibles.
- `_orpheus/velocity-reference.md` — relevé horodaté des 90 récits utilisateurs livrés.
- `_bmad-output/planning-artifacts/` — PRD, architecture, ADR, spécification UX.
- ⚠️ **Sources périmées à ne pas utiliser** : la **nomenclature** « Essentiel / Agentique » des
  artefacts PRD (les offres s'appellent **One** et **One+**) ; les mentions de **39 €/mois** encore
  présentes dans le code produit (prix officiels retenus : **One 49 € / One+ 99 €**, décision du
  31/07/2026) ; le verrou n°8 « kit de sortie » de `synthese-fonctionnalites-cii.md` (brique
  abandonnée).
