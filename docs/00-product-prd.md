# PRD — MonprojetPro (Hub · Lab · One)

> **Document de présentation produit.** Celui-ci se lit en français courant, sans jargon technique :
> c'est le document à montrer à un client ou à parcourir toi-même. La preuve technique détaillée
> (fichiers, lignes de code, requêtes) vit à part dans `docs/00-product-board.md`, qui reste mon
> carnet de travail — tu n'as plus besoin de l'ouvrir.
>
> **Mis à jour automatiquement à chaque fois que le board technique bouge** (même rythme, même
> fiabilité — rien à demander).
>
> Chaque Epic regroupe les User Stories qui le composent. Une Story = une phrase "qui, quoi,
> pourquoi" + son statut. Le code entre crochets à la fin d'une ligne (ex. `[T-062]`) est une
> référence vers la preuve technique, pour moi uniquement — tu peux l'ignorer.

**Statuts utilisés :** 🟢 Livré · 🟡 En cours · ⚪ À faire · 🔵 À qualifier (l'idée existe, le périmètre reste à définir avec toi)

**Dernière mise à jour :** 2026-10-28

---

## Sommaire des Epics

| # | Epic | Statut global |
|---|---|---|
| A | Socle technique & Authentification | 🟢 Livré |
| B | Gestion de la Relation Client (CRM) | 🟢 Livré, évolutions continues |
| C | Communication & Notifications | 🟢 Livré, évolutions continues |
| D | Gestion Documentaire & Dossier Projet | 🟢 Livré, évolutions continues |
| E | Visioconférence, Transcription & Facturation associée | 🟡 En cours |
| F | Parcours Lab — Accompagnement à la création | 🟢 Livré |
| G | Validation Hub | 🟢 Livré |
| H | Élio — Assistant IA (Hub, Lab, One/One+) | 🟢 Livré, évolutions continues |
| I | Graduation Lab → One & Cycle de vie client | 🟢 Livré, évolutions continues |
| J | Dashboard One & Bibliothèque de modules (Cockpits) | 🟢 Livré, évolutions continues |
| K | Facturation, Devis & Pennylane | 🟡 En cours |
| L | Crédit d'Impôt Innovation (CII) | 🟡 En cours |
| M | Administration, Analytics & Pilotage | 🟢 Livré, évolutions continues |
| N | Sécurité & Fiabilité technique | 🟡 En cours |

---

## Epic A — Socle technique & Authentification

Le Hub (toi) et l'espace client (Lab/One) sont accessibles de façon sécurisée, avec les données de
chaque client totalement cloisonnées des autres.

| Story | Statut | Date |
|---|---|---|
| Mise en place du monorepo et des briques partagées entre les deux applications | 🟢 Livré | 2026-02 |
| Connexion client (inscription, mot de passe, session) | 🟢 Livré | 2026-02 |
| Ta connexion opérateur avec double authentification (2FA) | 🟢 Livré | 2026-02 |
| Cloisonnement total des données entre clients (personne ne voit les données d'un autre) | 🟢 Livré | 2026-02 |
| Gestion avancée des sessions (voir, révoquer, forcer une déconnexion) | 🟢 Livré | 2026-02 |
| Thème visuel sombre/clair, responsive, accessible | 🟢 Livré | 2026-02 |
| Fil d'Ariane, messages de confirmation, écrans vides explicites | 🟢 Livré | 2026-02 |
| Consentements légaux (CGU, traitement par IA) | 🟢 Livré | 2026-02 |
| Une seule porte d'entrée pour se connecter (Hub, Lab et One) | 🟢 Livré | 2026-08-04 |
| Page de connexion et vérification 2FA harmonisées visuellement | 🟢 Livré | 2026-10-20 `[T-060]` |

---

## Epic B — Gestion de la Relation Client (CRM)

Tu gères l'ensemble de ton portefeuille clients depuis le Hub : fiches, recherche, contacts,
cycle de vie.

| Story | Statut | Date |
|---|---|---|
| Liste des clients avec filtres et recherche rapide | 🟢 Livré | 2026-02 |
| Création et modification d'une fiche client | 🟢 Livré | 2026-02 |
| Fiche client complète multi-onglets | 🟢 Livré | 2026-02 |
| Distinction Particulier / Entité sur la fiche, avec rapprochement automatique via le SIRET | 🟢 Livré | 2026-10-05 `[T-035]` |
| Mention du SIRET sur les documents envoyés par Pennylane | ⚪ À faire | — `[T-035a]` |
| Carnet de contacts par client (plusieurs personnes, qui reçoit la facture, qui y figure) | 🟢 Livré | 2026-10-08 `[T-039]` |
| Nettoyage des 3 comptes de démonstration, avec sauvegarde restaurable | 🟢 Livré | 2026-09-28 `[T-034]` |
| Rattraper deux champs internes qui pointaient encore vers un compte de démonstration | ⚪ À faire | — `[T-034a]` |
| Accès dégradé automatique pour un client qui a résilié (espace figé, support toujours actif) | 🟢 Livré | 2026-10 |

---

## Epic C — Communication & Notifications

Toi et tes clients échangez en temps réel (chat, pièces jointes, notifications email + dans
l'app).

| Story | Statut | Date |
|---|---|---|
| Chat asynchrone avec notifications email et dans l'app | 🟢 Livré | 2026-02 |
| Indicateur de présence et FAQ/support | 🟢 Livré | 2026-02 |
| Fil de discussion enrichi (pièces jointes, correction orthographe par IA) | 🟢 Livré | 2026-09-08 `[F-013]` |
| Le chat ne reste plus bloqué en silence si la connexion temps réel décroche | 🟢 Livré | 2026-09-08 `[T-021]` |
| Zone de saisie des réponses qui ne déborde plus de la pop-up | 🟢 Livré | 2026-09-08 `[T-019]` |
| Messages du guichet MenuFacile visibles partout où ils doivent l'être (badge sidebar + accueil) | 🟢 Livré | 2026-09-09/11 `[T-022]` |
| Pièces jointes MenuFacile visibles côté Hub (photos envoyées par un client) | 🟢 Livré | 2026-09-15 `[T-023]` |
| Répondre avec une pièce jointe depuis le Hub vers MenuFacile | 🟢 Livré | 2026-09-16 `[T-023a]` |
| Envoi d'un message à tous les utilisateurs MenuFacile depuis le Hub | 🟢 Livré | 2026-10-18 `[T-033]` |

---

## Epic D — Gestion Documentaire & Dossier Projet

Documents générés par le Hub (devis, factures, dossiers CII, comptes-rendus...), rangés et
accessibles, y compris sur le disque de ton ordinateur.

| Story | Statut | Date |
|---|---|---|
| Gestion de documents avec visionneuse HTML/PDF, recherche, dossiers | 🟢 Livré | 2026-02 |
| Création d'un dossier local (Bureau, puis disque dur externe) lié à un client, avec plusieurs projets possibles par client | 🟢 Livré | 2026-10-21 `[T-063]` |
| Copie automatique et manuelle des documents générés dans le bon sous-dossier | 🟢 Livré | 2026-10-21 `[T-063]` |
| Lecture du contenu réel du dossier lié, navigation dossier par dossier | 🟢 Livré | 2026-10-21 `[T-063]` |
| Rattachement de chaque document à son projet (fini la liste en vrac) | 🟢 Livré | 2026-10-21 `[T-063]` |
| Lier le devis/facture et le générateur CII au dossier projet | ⚪ À faire | — (retiré du périmètre T-062a, à qualifier si voulu) |
| Limite de taille explicite à l'import d'un document (évite un échec silencieux) | ⚪ À faire | — `[T-030a]` |

---

## Epic E — Visioconférence, Transcription & Facturation associée

Tu organises des visios (Google Meet via Cal.com), elles sont transcrites et archivées, et la
facturation d'une séance (gratuite ou payante) est pilotée depuis le Hub.

| Story | Statut | Date |
|---|---|---|
| Prise de RDV avec prospect (Cal.com), salle d'attente, suivi post-visio | 🟢 Livré | 2026-02 |
| Création réelle d'une salle Google Meet au moment du RDV | 🟢 Livré | 2026-10-18 `[T-049]` |
| Le client peut enfin voir les créneaux disponibles de son opérateur (bug RLS) | 🟢 Livré | 2026-10-18 `[T-047]` |
| Lien de prise de RDV à jour et modifiable sans déconnexion | 🟢 Livré | 2026-10-18 `[T-048]` |
| Distinguer un 1er rendez-vous offert d'une vraie consultation facturée | ⚪ À faire | — (risque jugé dormant, sans urgence) `[T-048a]` |
| Onglet Visio sur la fiche client : envoyer un lien Meet par email, même sans espace client | 🟢 Livré | 2026-10-13 `[T-051]` |
| Récupération et archivage automatique de la transcription dans le dossier client | 🟢 Livré | 2026-10-16 `[T-050]` |
| Premier lien Google Meet réellement généré en conditions réelles | 🟢 Livré | 2026-10-15 `[T-053]` |
| Badge de connexion Gmail fiable (reflète l'état réel, pas juste "connecté" en dur) | 🟢 Livré | 2026-10-15 `[T-054, T-055]` |
| Actions sur une visio existante : renvoyer, annuler, déplacer, copier le lien | 🟢 Livré | 2026-10-15 `[T-056]` |
| Emails Gmail propres (objet lisible, mise en forme, logo à jour) | 🟢 Livré | 2026-10-15 `[T-057]` |
| Facturation d'une séance visio (gratuite/payante, dette, génération de facture) pilotée depuis le Hub | 🟢 Livré | 2026-10-20 `[T-059]` |
| Page "Visio" du menu général alignée avec l'onglet du dossier client | 🟢 Livré | 2026-10-20 `[T-061]` |

---

## Epic F — Parcours Lab — Accompagnement à la création

Un client en création d'activité suit un parcours structuré, guidé par Élio Lab, avec soumission
automatique des étapes au Validation Hub.

| Story | Statut | Date |
|---|---|---|
| Parcours structuré avec questions, génération et soumission automatique des briefs | 🟢 Livré | 2026-02 |

---

## Epic G — Validation Hub

Tu examines, valides ou refuses les soumissions de tes clients, avec tout le contexte nécessaire.

| Story | Statut | Date |
|---|---|---|
| File de demandes, décisions, actions de traitement | 🟢 Livré | 2026-02 |

---

## Epic H — Élio — Assistant IA (Hub, Lab, One/One+)

Toi et tes clients bénéficiez d'un assistant IA contextuel, avec une posture adaptée à chaque
espace.

| Story | Statut | Date |
|---|---|---|
| Assistance IA contextuelle par rôle, historique, profil de communication personnalisé | 🟢 Livré | 2026-02 → 2026-08 |
| Élio Hub devient un agent outillé (13 outils), avec garde-fou débrayable | 🟢 Livré | 2026 |
| Élio One devient le relais vers toi — avec l'accord du client uniquement | 🟢 Livré | 2026-08-19 |
| Crédits de coaching One+ : cumulables, facturables hors forfait | 🟢 Livré | 2026 |
| Chat Élio One éphémère (aucun historique conservé côté Hub) | 🟢 Livré | 2026 |

---

## Epic I — Graduation Lab → One & Cycle de vie client

Un client passe de Lab à One par un simple changement de statut (pas de nouvelle installation),
et tu gères tout son cycle de vie (abandon, changement d'offre, export de ses données, clôture).

| Story | Statut | Date |
|---|---|---|
| Bascule Lab → One par changement de statut, même espace, même session | 🟢 Livré | 2026-03 |
| Gestion du cycle de vie complet (abandon, changement d'offre, export RGPD) | 🟢 Livré | 2026-03 |
| Accès permanent au Lab même après résiliation (sauf désactivation explicite des agents) | 🟢 Livré | 2026 |

---

## Epic J — Dashboard One & Bibliothèque de modules (Cockpits)

Les clients établis pilotent leurs livrables depuis leur One, avec un socle commun (Relation) et
des briques sur-mesure (Cockpits) réutilisables d'un projet à l'autre.

| Story | Statut | Date |
|---|---|---|
| Dashboard One — console de pilotage des livrables + lien avec toi | 🟢 Livré | 2026-02 → 2026-06 |
| Coin "Mes projets" sur l'accueil Hub avec tuiles configurables (ex. MenuFacile) | 🟢 Livré | 2026-09-08 `[F-012]` |
| Bibliothèque de modules réutilisables entre projets (doctrine FORGE), gate de validation | ⚪ À faire | — `[F-001]` |
| Premier Cockpit produit réel (site/appli) | 🔵 À qualifier | — `[F-002]` |

---

## Epic K — Facturation, Devis & Pennylane

Tu génères devis, factures et abonnements via Pennylane, avec gestes commerciaux, avoirs et
synchronisation automatique.

| Story | Statut | Date |
|---|---|---|
| Devis, factures, abonnements via Pennylane, synchronisation automatique | 🟢 Livré | 2026-03 → 2026-04 |
| Facture directe pour une prestation déjà effectuée (sans passer par un devis) | 🟢 Livré | 2026-10-06 `[T-036]` |
| Gestes commerciaux (prestation offerte, remise) sur devis et factures | 🟢 Livré | 2026-10-06 `[T-037]` |
| Montants de la remise affichés au format français sur le document | 🔵 À qualifier | — `[T-037a]` |
| Avoir — annuler une facture déjà émise, enfin accessible depuis le Hub | 🟢 Livré | 2026-10-06 `[T-041]` |
| L'avoir s'affiche désormais correctement dans le Hub | 🟢 Livré | 2026-10-07 `[T-041c]` |
| Alerte avant d'émettre une ligne à 0,00 € (facture et devis) | 🟢 Livré | 2026-10-08 `[T-043]` |
| Renvoyer une facture ou un avoir déjà émis depuis le Hub | 🟢 Livré | 2026-10-08 `[T-044]` |
| Compteur "En attente" corrigé (comptait mal les factures émises non réglées) | 🟢 Livré | 2026-10-08 `[T-042]` |
| Le premier avoir réel échoue chez Pennylane (erreur 400) | ⚪ À faire | — sonde avant correctif `[T-041a]` |
| L'avoir existe chez Pennylane mais n'est pas enregistré côté Hub (garde anti-doublon inopérante) | ⚪ À faire | — `[T-041b]` |
| La facture et son avoir ne se compensent pas dans les totaux du Hub (écart de TVA) | ⚪ À faire | — `[T-041d]` |
| Espaces en trop au début/fin des libellés envoyés à Pennylane | 🔵 À qualifier | — `[T-038]` |
| Mention du SIRET sur les documents Pennylane | ⚪ À faire | — `[T-035a]` |

---

## Epic L — Crédit d'Impôt Innovation (CII)

Depuis l'obtention de l'agrément CII (20-10-2026), le Hub t'aide à transformer une prestation en
ligne de facturation conforme, et à poser les bonnes mentions légales.

| Story | Statut | Date |
|---|---|---|
| Assistant de reformulation : un fichier de fonctions développées devient un devis/une facture au format officiel CII | 🟢 Livré | 2026-10-23 `[T-062]` |
| Case d'éligibilité PME sur la fiche client, et case d'éligibilité projet sur devis/facture | 🟢 Livré | 2026-10-24 `[T-062a]` |
| Mentions légales CII ajoutées sur devis/facture (sans effacer le texte existant) | 🟢 Livré | 2026-10-24 `[T-062a]` |
| Repère visuel du seuil de pertinence (25 000 €) | 🟢 Livré | 2026-10-24 `[T-062a]` |
| Dossier justificatif CII (pièces, checklist, temps passé) | ⚪ À faire | — hors périmètre actuel |

---

## Epic M — Administration, Analytics & Pilotage

Tu pilotes la plateforme : monitoring, analytics, templates, bascule chantier→livré pour tes
clients One.

| Story | Statut | Date |
|---|---|---|
| Outils d'administration, analytics, templates personnalisables | 🟢 Livré | 2026-02 |
| Monitoring santé système en direct, contrôlé toutes les 5 minutes | 🟢 Livré | 2026 |
| Bouton "Rafraîchir" du monitoring réellement fonctionnel | 🟢 Livré | 2026-09-20 `[T-028]` |
| Fausses alertes du monitoring sur Resend supprimées (seuils recalibrés) | 🟢 Livré | 2026-09-20 `[T-027]` |
| Historique des latences du monitoring (impossible aujourd'hui de voir une dégradation venir) | 🔵 À qualifier | — `[T-029]` |
| Import/compression des images de bannière MenuFacile réparé | 🟢 Livré | 2026-09-20 `[T-030, T-031, T-032]` |

---

## Epic N — Sécurité & Fiabilité technique

Travail de fond, invisible pour un client, qui protège les données et évite les pannes
silencieuses.

| Story | Statut | Date |
|---|---|---|
| Un client ne voit plus qui d'autre est en ligne parmi les clients de MiKL, et personne ne peut faire croire que MiKL est connecté | 🟡 En cours — corrigé et testé, mise en production en attente de ton accord | 2026-10-28 `[T-064]` |
| Les autres canaux temps réel passent eux aussi en accès privé, puis l'accès public est coupé | ⚪ À faire | — `[T-064a]` |
| Une base de test neuve ne démarre pas : deux numéros de mise à jour de la base sont en double | 🔵 À qualifier | — `[T-065]` |
| Les webhooks externes refusent une requête non signée au lieu de l'accepter | 🟢 Livré | 2026-09-16 `[T-024]` |
| L'assistant IA du Hub n'est plus ouvert sans authentification | ⚪ À faire | — `[T-001]` |
| Policy d'écriture des notifications trop permissive | ⚪ À faire | — `[T-002]` |
| Fonctions internes exécutables par un visiteur non connecté | ⚪ À faire | — partiellement traité `[T-004]` |
| Buckets de fichiers qui exposaient la liste de tous les fichiers (pas leur contenu) | 🟢 Livré | 2026-07-10 `[T-005]` |
| Protections de base manquantes contre certaines attaques web | ⚪ À faire | — `[T-006]` |
| Dépendances avec des failles connues à mettre à jour | ⚪ À faire | — `[T-007]` |
| Changements de base de données non traçables dans le dépôt de code | ⚪ À faire | — `[T-008]` |
| Lien de connexion Google (Gmail) non protégé contre une usurpation | ⚪ À faire | — `[T-009]` |
| Outil de diagnostic temporaire resté actif en production | 🟢 Livré | — `[T-010]` |
| Droits d'accès à vérifier après une reconstruction de base de test | 🔵 À qualifier | — `[T-015]` |
| Réglage email (SPF) chez l'hébergeur de domaine obsolète | ⚪ À faire | — chez MiKL, DNS `[T-018]` |

---

## Hors périmètre actuel — décisions prises

Ces sujets ont été proposés puis écartés, avec la raison :

| Sujet | Décision | Raison |
|---|---|---|
| Instance dédiée par client à la sortie (kit de sortie One) | Écarté | Jamais utile en pratique, le modèle multi-tenant suffit |
| Élio One+ "agentique" (génération automatique de documents) | Écarté | Contredit le positionnement One+ = coaching humain |

---

## Pour aller plus loin

- **La preuve technique détaillée** (quel fichier, quelle ligne, quel test) : `docs/00-product-board.md`
- **Les schémas visuels** (parcours utilisateur, structure de données) : à produire à la demande,
  par Epic — dis-moi lequel t'intéresse et je le génère.
- **L'historique antérieur à 2026-09** (avant la bascule vers ce format de suivi) :
  `docs/00-product-board-archive.md`, disponible sur demande si besoin de remonter plus loin.

---

*Document généré et maintenu par OTTO, à partir de `docs/00-product-board.md`. Toute idée nouvelle
entre d'abord par ce board ; ce PRD n'en est que la vue lisible.*
