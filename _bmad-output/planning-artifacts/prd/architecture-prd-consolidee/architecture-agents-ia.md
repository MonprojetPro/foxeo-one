# Architecture Agents IA

## Vue d'Ensemble

```
┌─────────────────────────────────────────────────────────────────┐
│  🦉 ORPHEUS — CERVEAU FOXEO (Cursor/BMAD)                       │
├─────────────────────────────────────────────────────────────────┤
│  • Travaille avec MiKL dans Cursor                              │
│  • Connaissance complète entreprise MonprojetPro                       │
│  • GÉNÈRE des documents sources pour les Élio                   │
│  • NE S'ADRESSE PAS aux clients directement                     │
│  • Claude (abonnement Max) — Coût: 0€                           │
└─────────────────────────────────────────────────────────────────┘
                              │
                    génère documents
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        FOXEO HUB (MiKL)                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  🦊 ÉLIO HUB                                                    │
│  ─────────────────                                              │
│  • Assistant quotidien MiKL                                     │
│  • Récupère docs Orpheus (estimations, specs...)                │
│  • Gère agenda, visios, devis, facturation                      │
│  • Correction rédaction + adaptation profil                     │
│  • DeepSeek V3.2 — Coût: ~1€/mois                               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ Validation Hub / Docs clients
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                       CÔTÉ CLIENTS                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  🦊 ÉLIO LAB (MonprojetPro Lab)              🦊 ÉLIO ONE (MonprojetPro One)  │
│  ─────────────────────────            ─────────────────────     │
│  • Accompagne parcours création       • One: FAQ + guide        │
│  • Génère docs brainstorming          • One+: Actions auto      │
│  • Docs envoyés à Orpheus             • Reçoit docs tech        │
│  • Reçoit livrables retravaillés        d'Orpheus               │
│  • DeepSeek V3.2                      • DeepSeek V3.2           │
│  • Coût: ~0.40€/parcours              • Coût: 0.15-0.50€/mois   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Orpheus — Cerveau MonprojetPro (BMAD/Cursor)

**Plateforme :** Cursor/BMAD (utilise l'abonnement Claude Max)
**Coût :** 0€ (abonnement existant)
**Important :** Orpheus NE fait PAS partie de l'interface MonprojetPro. Il travaille avec MiKL dans Cursor.

**Missions :**
- Connaissance complète de l'entreprise MonprojetPro
- Génère des documents sources pour alimenter les Élio
- Analyse des transcriptions de visio client
- Évalue les prix des projets → Élio Hub fait les devis
- Génère docs techniques → Élio One accompagne les clients
- Retravaille les docs brainstorming Lab → livrables clients

**Flux Documentaires Orpheus → Élio :**

| Document généré par Orpheus | Utilisé par | Pour |
|-----------------------------|-------------|------|
| Estimation prix projet | Élio Hub | Créer devis client |
| Doc technique module | Élio One | Accompagner le client |
| Livrable retravaillé | Élio Lab | Rendu au client |
| Config client (yaml) | Tous Élio | Personnaliser l'agent |

**Apprentissage Métier MonprojetPro :**

Orpheus apprend au fil du temps et devient expert de l'activité MonprojetPro :

| Donnée captée | Apprentissage | Utilisation |
|---------------|---------------|-------------|
| Devis établis | Grille tarifaire réelle | "Pour ce type de client, tu factures généralement X€" |
| Négociations | Patterns de pricing | "Les assos négocient souvent -15%, anticipe" |
| Parcours clients | Durées moyennes | "Un parcours complet prend en moyenne 6 semaines" |
| Feedbacks clients | Points de friction | "Les clients bloquent souvent sur l'étape Identité" |
| Décisions MiKL | Préférences | "Tu refuses généralement les projets < 2K€" |

**Mémoire Orpheus :** Stockée dans `_bmad/monprojetpro-knowledge/orpheus-memory.yaml`

## Élio Hub — Assistant Opérationnel MiKL

**Plateforme :** Hub MonprojetPro (interface web)
**Modèle :** DeepSeek V3.2
**Coût :** ~1€/mois

**Fonctionnalités :**

| Catégorie | Fonctionnalité |
|-----------|----------------|
| **Navigation** | Aide sur les fonctionnalités du Hub |
| **Actions** | Recherche clients, rappels, stats |
| **Rédaction** | Correction auto + Adaptation profil client |
| **Génération** | Brouillons emails, réponses Validation Hub |
| **Rappels** | Tâches en attente, relances à faire |

**Correction & Adaptation Rédaction :**

Élio Hub corrige automatiquement les messages de MiKL et les adapte au profil du client :

```
Tu tapes (avec fautes)     →    Élio Hub corrige + adapte    →    Message envoyé
──────────────────────          ────────────────────────          ─────────────────
"salu thomas, je tenvoi        "Salut Thomas ! Je t'envoie       Ton adapté au
le devis cmme convenu"          le devis comme convenu."          profil client
```

| Fonction | Description |
|----------|-------------|
| Correction orthographe | Fautes, accents, typos |
| Correction syntaxe | Grammaire, ponctuation, accords |
| Adaptation ton | Formel ↔ Décontracté selon le client |
| Tutoiement/Vouvoiement | Basé sur le profil client |
| Longueur | Résume ou développe selon préférence client |

## Élio Lab — Assistant Parcours Création

**Plateforme :** MonprojetPro Lab (interface web client)
**Modèle :** DeepSeek V3.2
**Coût :** ~0.40€/parcours complet

**Missions :**
- Accompagner le client dans son parcours de création
- Poser les questions guidées pour chaque étape
- Générer les briefs (Vision, Positionnement, Offre, Identité)
- Soumettre les livrables au Validation Hub pour validation MiKL
- S'adapter au profil de communication du client

## Élio One — Assistant Client Établi

**Plateforme :** MonprojetPro One (interface web client)
**Modèle :** DeepSeek V3.2

### Élio One (Inclus dans l'abonnement Essentiel)

**Coût :** ~0.15€/mois/client

| Fonctionnalité | Description |
|----------------|-------------|
| Explication fonctionnalités | "Comment je crée un événement ?" |
| Guide utilisateur | "Explique-moi le module formations" |
| Demande d'évolution | Collecte le besoin, soumet au Validation Hub |
| FAQ intelligente | Répond aux questions courantes |
| Recherche simple | "Combien d'adhérents actifs ?" (lecture seule) |

**Ce qu'il ne fait PAS :** Actions (envoi emails, génération docs, modifications)

### Élio One+ (Inclus dans l'abonnement Agentique)

**Coût :** ~0.50€/mois/client

Fonctionnalités One + :

| Fonctionnalité | Description |
|----------------|-------------|
| Actions réelles | "Envoie un rappel aux impayés" (avec validation) |
| Génération documents | Attestations, factures, exports |
| Alertes proactives | "3 émargements manquent pour hier" |
| Automatisations | Emails confirmation, rappels J-7/J-1 |
| Requêtes complexes | Croisements de données, analyses |

## Interconnexion des Agents — Format Partagé

### client_config.yaml

```yaml
# Généré par Orpheus, lu par Élio

client:
  id: "client_xxx"
  nom: "Prénom Nom"
  entreprise: "Nom Entreprise"
  secteur: "Secteur"

brief_initial:
  source: "visio_date"
  profil: "Description du client"
  contexte: "Situation actuelle"
  besoin_exprime: "Ce que le client a demandé"
  besoin_analyse: "Ce qu'Orpheus a détecté comme vrai besoin"
  opportunites: []

parcours:
  type: "complet | partiel | ponctuel | direct_one"
  etapes_actives:
    - id: "etape_id"
      nom: "Nom de l'étape"
      livrable: "fichier_livrable.md"
      questions_cles: []

profil_communication:
  niveau_technique: "debutant | intermediaire | avance"
  style_echange: "direct | conversationnel | formel"
  ton_adapte: "formel | pro_decontracte | chaleureux | coach"
  sensibilites_detectees: []
  recommandations_elio:
    longueur_messages: "court | moyen | detaille"
    tutoiement: true | false
    exemples_concrets: true | false
    eviter: []
    privilegier: []

consignes_elio:
  focus: "Ce sur quoi Élio doit se concentrer"
  limites: []
  a_challenger: []
  escalade_mikl: []

decisions_mikl: []
```

## Détection Profil Communication par Orpheus

Orpheus analyse la transcription de la visio et détecte automatiquement :

| Signal | Ce que ça révèle |
|--------|------------------|
| Vocabulaire | Niveau technique (jargon vs vulgarisé) |
| Longueur des phrases | Style de communication (concis vs développé) |
| Ton émotionnel | État d'esprit (stressé, enthousiaste, sceptique) |
| Questions posées | Préoccupations (technique, budget, délai) |
| Hésitations | Zones d'incertitude à rassurer |

**Profil généré :**

```yaml
profil_communication:
  niveau_technique: "debutant"
  style_echange: "direct"
  ton_adapte: "pro_decontracte"

  apprentissages:
    - "Préfère les listes à puces aux paragraphes"
    - "Répond mieux le matin"
    - "S'énerve si on répète une question déjà répondue"

  recommandations_elio:
    longueur_messages: "court"
    tutoiement: true
    exemples_concrets: true
    eviter:
      - "Jargon technique"
      - "Questions ouvertes trop larges"
    privilegier:
      - "Questions fermées avec options"
      - "Réponses en bullet points"
```

---
