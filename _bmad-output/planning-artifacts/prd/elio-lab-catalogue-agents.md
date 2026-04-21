# Élio Lab — Catalogue d'Agents & Parcours Client Personnalisé

> **Ajout PRD — Avril 2026** — Révision de l'architecture Élio Lab suite aux clarifications produit de MiKL. Remplace le concept `elio_step_configs` (config par étape liée à un step_id fixe) par un catalogue d'agents global + assemblage du parcours par client.

---

## Vision

Élio Lab n'est pas un agent unique générique. C'est un **catalogue d'agents spécialisés** — chacun expert dans un domaine spécifique du parcours entrepreneurial (branding, business plan, pricing, identité visuelle, etc.). MiKL compose le parcours de chaque client en piochant dans ce catalogue, dans l'ordre qui correspond au besoin du client.

---

## 1. Catalogue d'Agents Élio Lab

### Concept

Un catalogue global (non lié à un client) d'agents Élio Lab. Chaque agent est :
- Un **fichier Markdown** stocké dans `packages/modules/elio/agents/lab/`
- Créé via le **skill-creator officiel Anthropic** dans Claude Code/Cursor
- Affiché sous forme de **carte stylée** dans l'onglet Élio Lab du Hub

### Format du fichier agent

```
packages/modules/elio/agents/
├── lab/
│   ├── elio-branding.md
│   ├── elio-business-plan.md
│   ├── elio-pricing.md
│   └── ...
├── one/
└── hub/
```

Chaque fichier `.md` respecte le format SKILL.md (Anthropic) enrichi :

```markdown
---
name: Élio Branding
description: Expert en identité visuelle de marque et positionnement
model: claude-sonnet-4-6
temperature: 1.2
image: elio-branding.png
---

Tu es Élio, expert en identité visuelle...
[instructions complètes générées par skill-creator]
```

**Champs frontmatter :**
| Champ | Obligatoire | Description |
|-------|-------------|-------------|
| `name` | ✅ | Nom affiché de l'agent |
| `description` | ✅ | Spécialité résumée (1 phrase) |
| `model` | ✅ | `claude-haiku-4-5-20251001` / `claude-sonnet-4-6` / `claude-opus-4-6` |
| `temperature` | ✅ | 0.0 – 2.0 (défaut : 1.0) |
| `image` | ✅ | Nom du fichier image (renard personnalisé par agent) |

**Note max_tokens :** Non exposé dans la config agent. Valeur par défaut du modèle utilisée (suffisante pour tous les cas d'usage). Ajustable manuellement dans le fichier si besoin exceptionnel.

### Création d'un agent

Les agents sont créés via le **skill-creator officiel Anthropic** dans Claude Code/Cursor. Ce skill guide MiKL à travers un processus itératif : draft → test → évaluation → affinement → validation. Le fichier `.md` résultant est committé dans le repo.

**Pas de formulaire dans le Hub pour la création.** Le Hub est uniquement un catalogue de consultation et d'assignation.

### Synchronisation Hub

Un bouton **"Synchroniser les agents"** dans l'onglet Élio Lab lit les fichiers du dossier `packages/modules/elio/agents/lab/` et fait un UPSERT dans la table `elio_lab_agents`. Les agents apparaissent immédiatement dans le catalogue.

### Visuel des agents

Chaque agent a une image dédiée (fox personnalisé, créé par MiKL) :
- Stockée dans `packages/ui/public/elio/agents/`
- Affichée sur la **carte Hub** (catalogue) ET côté **client Lab** (header du chat Élio de l'étape)
- Le client voit le nom et l'avatar de son Élio d'étape

---

## 2. Onglet "Élio" dans la Sidebar Hub

### Structure

Nouvel onglet **"Élio"** dans la sidebar Hub, avec 3 sous-sections :

| Sous-section | Contenu |
|---|---|
| **Élio Lab** | Catalogue d'agents Lab + bouton sync + dashboard tokens |
| **Élio One** | Configuration de l'agent Élio One (à définir) |
| **Élio Hub** | Configuration de l'agent Élio Hub (assistant MiKL) |

### Élio Lab — Vue Catalogue

Grille de **cartes stylées** (dark mode, accent cyan/violet) :
- Image de l'agent (fox personnalisé)
- Nom de l'agent
- Description courte
- Modèle + température
- Badge "Actif" / "Archivé"
- Actions : archiver, dupliquer

---

## 3. Parcours Client Personnalisé

### Concept

Le parcours Lab d'un client n'est **pas fixe**. Quand MiKL lance le Lab pour un client, il **assemble son parcours** en choisissant les agents du catalogue et leur ordre.

### Flux de lancement (fiche client → onglet Lab)

1. MiKL clique "Lancer le Lab"
2. Modal d'assemblage : liste des agents disponibles dans le catalogue
3. MiKL sélectionne les agents et définit l'ordre (drag & drop)
4. Il peut nommer chaque étape librement (ex : "Étape 1 — Identité")
5. Le parcours est sauvegardé → le client voit ses étapes dans son Lab

### Ajout en cours de route

À tout moment depuis la fiche client, MiKL peut **ajouter une étape** au parcours en cours (ex : le client a besoin d'un focus pricing non prévu initialement). L'étape s'ajoute à la suite des étapes existantes.

### Modèle de données

```
elio_lab_agents          ← catalogue global (1 ligne par agent)
  id, name, description, model, temperature, image, file_path, archived, ...

client_parcours_agents   ← assemblage par client (N lignes par client)
  id, client_id, elio_lab_agent_id, step_order, step_label, status, created_at
  status: pending | active | completed | skipped
```

---

## 4. Nourrir l'Élio d'une Étape (Contexte Client)

### Concept

Pour chaque étape du parcours d'un client, MiKL peut injecter du **contexte spécifique à ce client** dans l'Élio de l'étape. Ce contexte vient enrichir la conversation de l'agent sans modifier sa configuration globale.

### Depuis la fiche client (Hub)

Deux types d'injection :

| Type | Description | Exemple |
|------|-------------|---------|
| **Prompt texte** | Instructions ou questions supplémentaires | "Demande-lui aussi de préciser sa cible B2B vs B2C" |
| **Fichier** | Document retravaillé par MiKL à réinjecter | Brief corrigé, document annoté, word du client |

### Transparence côté client

Quand MiKL injecte du contexte, **Élio l'annonce explicitement** au client :

> *"MiKL a consulté le document que tu lui as soumis. Il te demande des précisions sur les points suivants : [...]. Il y a aussi ces questions qui restent floues : [...]"*

Le client sait que c'est MiKL qui est intervenu. Élio est le messager, pas l'auteur.

### Modèle de données

```
client_step_contexts     ← contexte injecté par MiKL (N entrées par étape/client)
  id, client_parcours_agent_id, content_type (text|file), content_text,
  file_path, file_name, injected_by_operator_id, created_at, consumed_at
```

---

## 5. Chat Élio Lab Câblé

### Résolution de la config au runtime

Quand un client ouvre le chat Élio sur une étape, le système résout :

```
1. Récupère l'agent assigné à cette étape (client_parcours_agents → elio_lab_agents)
2. Lit le fichier .md de l'agent (system prompt + paramètres)
3. Récupère les contextes client non encore consommés (client_step_contexts)
4. Compose le prompt final : [system prompt agent] + [contexte client injecté]
5. Lance la conversation avec ces paramètres
```

### Affichage côté client

- **Header du chat** : image de l'agent fox + nom de l'agent (ex : "Élio Branding")
- L'identité visuelle change selon l'étape — le client perçoit un expert dédié

---

## 6. Dashboard Tokens & Coûts

### Emplacement

Section **"Monitoring"** dans l'onglet **Élio Hub** de la sidebar.

### Contenu — Cartes stylées

| Carte | Données |
|-------|---------|
| **Tokens ce mois** | Total tokens consommés / période |
| **Coût estimé** | Équivalent euros (tarifs API Anthropic) |
| **Par agent** | Répartition tokens par agent Lab |
| **Par client** | Top clients consommateurs |
| **Tendance** | Graphique simple semaine/mois |

### Alertes

MiKL peut définir un seuil mensuel (ex : 50€). Une notification Hub s'affiche si le seuil est dépassé à 80% puis à 100%.

---

## Stories Epic 14 — Plan d'Implémentation

| Story | Titre | Priorité |
|-------|-------|----------|
| **14.1** | Onglet "Élio" sidebar Hub (Lab / One / Hub) | P1 |
| **14.2** | Dossier agents + table DB + sync + catalogue cartes Hub | P1 |
| **14.3** | Assemblage parcours client depuis le catalogue | P1 |
| **14.4** | Nourrir l'Élio d'une étape (prompt + fichier, message MiKL transparent) | P1 |
| **14.5** | Chat Élio Lab câblé sur l'agent assigné + contexte client | P1 |
| **14.6** | Dashboard tokens + coût en euros (onglet Élio Hub) | P2 |

---

## Ce qui change vs l'implémentation Story 14.1 précédente

| Avant (14.1 original) | Après (PRD révisé) |
|---|---|
| Config per `step_id` (lié à une étape fixe) | Catalogue d'agents global, assignation libre |
| UI dans la fiche client | UI dans l'onglet Élio Lab (sidebar Hub) |
| Un seul config par étape | Agents réutilisables sur N clients |
| Pas d'images d'agents | Chaque agent a son fox personnalisé |
| Pas de notion de parcours assemblé | MiKL compose le parcours à la carte |
| Pas de contexte client injecté | Injection texte + fichier par étape |

**Migration :** La table `elio_step_configs` (migration 00096) sera remplacée par `elio_lab_agents` + `client_parcours_agents` + `client_step_contexts`. Une migration de suppression sera créée avant l'implémentation des nouvelles stories.
