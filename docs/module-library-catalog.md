# Catalogue de la bibliothèque de modules — tenu par FORGE

> **Mémoire de l'atelier.** Recense les modules de `packages/modules/` pour éviter de recoder une
> brique existante. Tenu par l'agent **FORGE « le Forgeron »** — mis à jour à chaque labellisation,
> changement de famille, ou ajout de config requise.
> Doctrine appliquée : `docs/module-library-doctrine.md`.
> Recensement initial : 2026-06-24 (16 modules réellement présents dans `packages/modules/`).

## Légende

- **Famille** : 🔵 Relation (socle universel, lien client ↔ MiKL) · 🟢 Cockpit (sur-mesure, pilote les livrables) · ⚙️ Hub-only (outil opérateur, hors socle client) · 🧩 Infra (brique transverse).
- **Réutilisable tel quel ?** : ✅ oui · ⚙️ via config · ❓ à auditer par FORGE.
- **Statut** : ✅ Labellisé · ⏳ À labelliser (gate FORGE non encore passé) · ❓ À auditer.
- Les docs `guide.md` / `faq.md` / `flows.md` sont **présentes** pour les 16 modules (vérifié au recensement).

> ⚠️ **Important** : aucun module n'a encore franchi le **gate FORGE formel** (l'agent vient d'être
> créé). Tous les modules ci-dessous sont au statut **⏳ À labelliser** ou **❓ À auditer** tant que
> FORGE n'a pas passé sa checklist 7 portes (`module-library-doctrine.md` §4) sur chacun. Les familles
> sont **pré-classées** d'après l'audit existant et la vision v2 ; FORGE confirme au gate.

---

## Catalogue

| Module (`id`) | Cible(s) `targets` | Famille | Réutilisable tel quel ? | Config requise | Statut | Note |
|---|---|---|---|---|---|---|
| `core-dashboard` | hub, client-lab, client-one | 🔵 Relation | ✅ | — | ⏳ À labelliser | Accueil / vue d'ensemble. Audit : « Activité récente » = liens statiques → à rendre dynamique (flux réel) avant label. |
| `chat` | hub, client-lab, client-one | 🔵 Relation | ✅ | — | ⏳ À labelliser | Messagerie temps réel MiKL ↔ client. Realtime + présence. Brique socle du lien. |
| `documents` | hub, client-lab, client-one | 🔵 Relation | ✅ | — | ⏳ À labelliser | Upload / dossiers / partage / export. Socle. |
| `support` | client-lab, client-one | 🔵 Relation | ✅ | — | ⏳ À labelliser | Tickets + Realtime. Socle. |
| `notifications` | hub, client-lab, client-one | 🔵 Relation | ✅ | — | ⏳ À labelliser | Cloche header in-app temps réel. (Pas de page liste — à compléter selon KIT.) |
| `visio` | hub, client-lab, client-one | 🔵 Relation | ⚙️ | Google Meet / Cal.com (env OAuth). Tables : `meetings`, `meeting_recordings`. | ⏳ À labelliser | Coque générique ; identifiants OAuth via env, jamais en dur. |
| `suivi-outil` | client-one | 🔵 Relation | ✅ | — | ⏳ À labelliser | Fil « voilà où en est ton outil » (Hub → client, images, commentaires). Clé du cycle « en chantier → livré ». |
| `elio` | hub, client-one | 🔵 Relation | ⚙️ | Prompts/agents en base (`elio_lab_agents`, `client_parcours_agents`). Clé LLM via env. | ⏳ À labelliser | Assistant IA. La personnalité vient de la base, pas du code → conforme règle d'or si aucun prompt client en dur. À auditer (prompts en base). |
| `facturation` | hub, client-one | 🟢 Cockpit | ⚙️ | Pennylane (`billing_sync`). Clé API via env. | ⏳ À labelliser | ⚠️ Vision v2 : « Facturation » **sort du socle** (outil pour que le client facture SES clients = Cockpit). L'aspect « mes factures d'abonnement MPP » est rapatrié dans Paramètres → Mes factures (réutilise `billing_sync`). |
| `parcours` | client-lab | 🔵 Relation (Lab) | ✅ | — | ⏳ À labelliser | Accompagnement Lab pas à pas. Socle côté Lab. |
| `crm` | hub | ⚙️ Hub-only | n/a (opérateur) | Tables : `clients`, `client_configs`, `parcours`, `client_notes`, `reminders`, `activity_logs`, `notifications`. | ❓ À auditer | Outil MiKL, pas un module client. Hors socle/cockpit client. |
| `analytics` | hub | ⚙️ Hub-only | n/a (opérateur) | — | ❓ À auditer | Métriques plateforme pour MiKL. ⚠️ Ne pas confondre avec les **métriques cockpit** (visites du site client) qui restent à forger projet par projet. |
| `email` | hub | ⚙️ Hub-only | ⚙️ | `requiredEnv: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET`. | ❓ À auditer | Gestion emails clients avec transformation Élio. Outil opérateur. Clés via env (conforme). |
| `templates` | hub | ⚙️ Hub-only | n/a (opérateur) | — | ❓ À auditer | Templates de parcours Lab + emails auto. Outil MiKL. |
| `validation-hub` | hub | ⚙️ Hub-only | n/a (opérateur) | — | ❓ À auditer | File de validation (briefs Lab + évolutions One). Cible **hub uniquement** → ne JAMAIS l'ajouter à `ALL_CLIENT_MANIFESTS` (cf. CLAUDE.md). |
| `admin` | hub | ⚙️ Hub-only | n/a (opérateur) | — | ❓ À auditer | ⚠️ Description mentionne « provisioning instances One » = **kit de sortie One ABANDONNÉ** (vision v2 §4). À nettoyer / re-scoper. |

---

## Lecture rapide par famille

### 🔵 Relation — socle universel (One de base)
`core-dashboard` · `chat` · `documents` · `support` · `notifications` · `visio` · `suivi-outil` · `elio` · `parcours` (Lab)
→ Ces briques gèrent le **lien client ↔ MiKL**. Réutilisables tel quel (ou via config OAuth/LLM). Ce sont les fondations de tout nouveau One.

### 🟢 Cockpit — sur-mesure (pilote les livrables)
`facturation` (à re-scoper : outil de facturation du client = Cockpit)
→ **À forger selon les projets** : Cockpit Site, Cockpit App, métriques produit. Coque générique, branchement via config/base, **sources de métriques décidées projet par projet** (vision v2 §9.1).

### ⚙️ Hub-only — outils opérateur (hors socle/cockpit client)
`crm` · `analytics` · `email` · `templates` · `validation-hub` · `admin`
→ Cockpit de MiKL, pas des modules client. Ne pas brancher côté client.

---

## Points d'attention relevés au recensement (pour FORGE)

1. **`admin`** référence le **kit de sortie One** (« provisioning instances ») — **abandonné** (vision v2 §4, audit : `client_instances`/`instance_transfers`/`client_handoffs` = 0 ligne). À nettoyer avant tout label.
2. **`facturation`** : re-scoper Cockpit (facturer SES clients) vs « mes factures d'abonnement MPP » (rapatrié Paramètres). Vérifier qu'aucune logique client n'est en dur.
3. **`core-dashboard`** : « Activité récente » statique → rendre dynamique (flux réel) avant label Relation.
4. **`elio`** : prompts/agents en **base** (`elio_lab_agents`) — conforme règle d'or **si** aucun prompt client n'est hardcodé dans le code. À confirmer au gate.
5. **Aucun Cockpit « produit » réel n'existe encore** (Cockpit Site / App à forger) — c'est le premier chantier de la bibliothèque côté sur-mesure.

> Prochaine action FORGE : passer le **gate 7 portes** sur les 9 modules Relation, en commençant par les fondations du One (`chat`, `documents`, `suivi-outil`, `support`, `notifications`), pour les faire passer de ⏳ à ✅.
