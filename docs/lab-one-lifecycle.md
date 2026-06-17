# Cycle de vie client Lab → One — Spécification de référence

> **Source de vérité** du parcours Lab↔One et de son pilotage depuis le Hub.
> Validé par MiKL le 2026-06-17. Complète l'ADR-01 (coexistence multi-tenant, même base).
> En cas de doute « qui voit quoi / qui pilote quoi / dans quel ordre » → **c'est ce fichier**.
> Toute logique qui décide d'un accès ou d'un mode doit s'y conformer.

---

## 0. Principes directeurs (non négociables)

1. **Même logique partout** — Hub, Lab et One racontent exactement la même histoire.
2. **Un rail par défaut clair et automatique** (le parcours nominal ci-dessous).
3. **MiKL peut TOUJOURS court-circuiter** n'importe quelle étape, **dans tous les sens, sans blocage**, dès lors qu'il le décide depuis le Hub.
4. **Tout se pilote depuis le Hub.**
5. **Tout est réversible** — « on ne sait jamais sur quoi on tombe ».

---

## 0bis. Élio Lab (assistant) ≠ Agents du parcours (NE PAS CONFONDRE)

| | **Élio Lab — l'assistant** | **Les agents du parcours** |
|---|---|---|
| Rôle | Assistant du dashboard Lab : répond aux **questions produit**, oriente le client, connaît le produit par cœur. | Les **étapes d'incubation** (Élio Go-to-Market, Cible, Business, Legit, Recap…). |
| Surface | Chat libre `/modules/elio` | Chat **par étape** du parcours |
| Coupé par « Agents du parcours » (OFF) ? | **Non — reste TOUJOURS dispo** (sauf consentement IA). | **Oui — mis en pause.** |
| Flag | (consentement IA seulement) | `elio_lab_enabled` (le levier B ci-dessous) |

Techniquement : le garde `elio_lab_enabled` dans `send-to-elio` ne s'applique qu'aux appels **avec `systemPromptOverride`** (= agent de parcours) ; le chat libre de l'assistant n'en passe pas → jamais bloqué.

## 1. Les 3 leviers de pilotage (à NE PLUS confondre)

Le bug historique venait de 2 flags fourre-tout. Le modèle correct = **3 leviers indépendants** :

| Levier | Sens | Permanence | État cible |
|---|---|---|---|
| **A — Le client a un Lab** | A-t-il (eu) un espace Lab ? | **Permanent une fois accordé.** L'espace + l'historique restent accessibles **à vie**. | `has_lab` (devient `true` définitivement) |
| **B — Agents Lab** | Les agents Élio répondent-ils ? **Par agent** (+ vue globale dérivée) | Réversible à volonté | `is_active` **par agent** (actif / désactivé-grisé) |
| **C — Accès One** | Le One est-il ouvert ? | Réversible | `one_open` |

**Conséquences clés :**
- « Couper le Lab » au sens « tout cacher » **n'existe pas** pour un client qui a eu un Lab. On ne retire jamais l'espace/historique — on **coupe les agents** (levier B).
- Un client qui **n'a jamais eu de Lab** n'y a pas accès — **sauf** si MiKL lui **ouvre un parcours Lab** (alors `has_lab` devient true, définitivement).
- `dashboard_type` reste seulement le **mode présenté par défaut** au login.

---

## 2. Le rail nominal (parcours Lab → One)

| # | Étape | Déclencheur automatique (le rail) | Court-circuit Hub (toujours possible) |
|---|---|---|---|
| 1 | **Vente Lab** | Devis → paiement → facture (Pennylane) | Ouvrir le Lab à la main, sans vente |
| 2 | **Définition des agents** | MiKL compose le parcours : quels agents Élio, dans quel ordre | — |
| 3 | **Validation → email d'espace** | MiKL **valide la compo** → l'email « crée ton mot de passe / ton espace » part **automatiquement** (⚠️ doit partir APRÈS la validation — cf. §8) | Renvoyer / déclencher l'email à la main |
| 4 | **Le client fait son Lab** | Il valide chaque étape, agent par agent | **Désactiver un agent précis** (grisé) pour qu'il continue ; le réactiver |
| 5 | **Élio Recap** | Finalise le parcours → MiKL reçoit une **soumission** (comme les autres agents) | — |
| 6 | **Ouverture du One** | MiKL décide d'ouvrir le One (pour développer l'outil du client) | **Ouvrir le One même si le Lab n'est pas terminé** |
| 7 | **One « en construction »** | Le client voit : modules de base (échange avec MiKL) + **onglet suivi de l'outil** (screenshots + messages du Hub) | *(périmètre différé — cf. §6)* |
| 8 | **One « livré »** | Quand l'outil est prêt → modules métier réels | *(non figé — étape ultérieure)* |

---

## 3. Règles d'accès (permanence + réversibilité)

### Lab
- **A eu un Lab → y a accès à vie** (au minimum l'historique). Jamais retiré.
- **Jamais eu de Lab → inaccessible** (verrouillé, comme le One non ouvert), sauf si MiKL ouvre un parcours Lab.

### Agents Lab
- Chaque agent du parcours est **actif** ou **désactivé (grisé)**. Un agent désactivé reste **visible grisé** (« on se souvient qu'il était prévu, mais finalement il ne sert pas »).
- Réversible **à tout moment**, **même après qu'une soumission a été validée** : MiKL peut **rouvrir** un agent pour que le client continue à cheminer, ou **rouvrir un ancien agent** pour compléter un document resté incomplet.
- Après ouverture du One : par défaut **tous les agents passent en historique (désactivés)** — le client lit tout mais ne communique plus. MiKL rouvre ceux qu'il veut.

### One
- **Fermé par défaut** tant que MiKL ne l'ouvre pas → verrouillé + **message teasing** côté client.
- **Ouvrable manuellement** même si le Lab n'est pas terminé.
- **Réversible** (refermable).

---

## 4. Matrice d'états client (vue client)

| Profil | Mode Lab | Mode One | Toggle visible ? |
|---|---|---|---|
| **Lab en cours** (pas de One) | ✅ complet (agents selon compo) | 🔒 message teasing | Oui |
| **Lab terminé, One pas encore ouvert** | ✅ consultation (agents off, réouvrables) | 🔒 message teasing | Oui |
| **One ouvert** (rail ou forcé) | ✅ consultation ; agents off par défaut, réouvrables par agent | ✅ ouvert (défaut au login) | Oui |
| **Direct One** (jamais de Lab) | 🚫 inaccessible (sauf si MiKL ouvre un Lab) | ✅ ouvert | Non (pas de Lab) |

Règle du toggle : **visible dès que le client a un Lab** (`has_lab`). Clic sur un mode non ouvert → **message**, pas d'entrée.

---

## 5. Court-circuits que MiKL doit pouvoir faire (depuis le Hub, sans blocage)

- Ouvrir le Lab sans passer par la vente ; ouvrir un Lab à un client Direct One (nouveau projet).
- Renvoyer / déclencher l'email de création d'espace.
- Activer / **désactiver un agent précis** (grisé), **même après validation** d'une soumission.
- **Ouvrir le One sans Lab terminé** ; refermer le One.
- Réactiver un ancien agent pour compléter un document.
- Bref : **toutes les transitions, dans tous les sens**, pilotées depuis le Hub.

---

## 6. Le One — périmètre

- **Maintenant (prioritaire)** : le **switch Lab/One opérationnel** + les **modules de base One** (déjà définis) opérationnels. Objectif : Hub + Lab solides d'abord.
- **Différé (gros chantier ultérieur)** :
  - Phases du One : **« en construction »** (modules de base + **onglet suivi de l'outil**) → **« livré »** (outil + modules métier). La bascule et les modules livrés ne sont **pas encore figés**.
  - **Module « Suivi de l'outil »** (idée validée) : depuis le Hub, MiKL poste **screenshots + messages** ; le client **suit la progression de son projet en cours de dev** et est rassuré.

---

## 7. Interface Hub — onglet « Pilote / Cockpit » (demande MiKL)

- Ajouter, dans la **ligne d'onglets de chaque fiche client (Hub)**, un onglet **cockpit** d'où MiKL voit **tout l'état** du client (Lab / agents / One / facturation / étape en cours) **en un coup d'œil**, avec des **raccourcis** vers les vues détaillées (parcours, agents, One, facturation…).
- C'est **côté Hub uniquement** (pas l'interface client pour l'instant).
- Le « comment » (maquette, structure) = **plan d'attaque**.

---

## 8. Dette ouverte / à câbler

1. **Séquencement email (#7 du parcours)** — l'email « crée ton espace » doit partir **APRÈS** la définition + validation des agents (sinon le client arrive sur un espace au parcours non défini). À vérifier dans `pennylane-paid-handlers.ts` / `launch-client-parcours.ts`.
2. **Réconciliation avec le build du 2026-06-16** — « désactiver le Lab → `lab_mode_available=false` (cache tout le Lab) » est **à revoir** : pour un client qui a eu un Lab, on ne cache **jamais** l'espace. Introduire le levier de **permanence** (`has_lab`) et déplacer la coupure sur les **agents**.
3. **Granularité agents** — passer du global `elio_lab_enabled` à un **état par agent** (actif/désactivé-grisé), réversible même post-validation. `client_parcours_agents.status` existe déjà comme base.

---

## 9. Mapping flags actuels → cible (note d'implémentation)

| Cible | Aujourd'hui | Évolution |
|---|---|---|
| `has_lab` (permanent) | `lab_mode_available` (utilisé comme « toggle visible ») | Devient permanent une fois `true` ; ne repasse jamais à `false` pour un client qui a eu un Lab |
| Agents par agent | `elio_lab_enabled` (global) + `client_parcours_agents.status` | Ajouter `is_active` par agent (actif/grisé) ; global = maître/dérivé |
| `one_open` | `one_mode_available` (créé le 2026-06-16) | Ouvrable/refermable manuellement ; clic verrouillé = message (déjà fait) |
| Résolution de mode | `resolveClientMode()` (`packages/utils`) | Source unique — à étendre pour `has_lab` |

> Réfs : ADR-01 (`_bmad-output/planning-artifacts/architecture/adr-01-lab-one-coexistence-same-instance.md`), matrice teasing (`_bmad-output/planning-artifacts/prd/saas-b2b-specific-requirements.md`), leçon DRY-001 (`docs/08-lessons-learned.md`).
