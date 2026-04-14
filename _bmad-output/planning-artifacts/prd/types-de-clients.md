# Types de Clients

> **Mise à jour 2026-04-14 — Simplification** : Suite à la décision de MiKL, les 3 types de clients (`complet`, `direct_one`, `ponctuel`) deviennent des étiquettes **informationnelles historiques**. La logique technique est désormais pilotée par `client_configs` (`dashboard_type`, `active_modules`, `lab_mode_available`, `elio_lab_enabled`) et non plus par `clients.client_type`. Voir le document `../onboarding-flow-unifie.md` pour le flow complet à jour (ADR-01 Révision 2 + Stories Epic 13). Le contenu ci-dessous est conservé à titre de référence historique.

## Classification des Clients

Tous les clients ne passent pas par le parcours complet. MonprojetPro Hub gère 3 types de clients :

| Type | Parcours | Ce qu'il a | Cas d'usage |
|------|----------|------------|-------------|
| **Complet** | Hub → Lab → One | Tout l'écosystème (Élio Lab + Élio One + Dashboard personnalisé) | Création de business, accompagnement long |
| **Direct One** | Hub → One | Dashboard sans maturation Lab | Client qui sait ce qu'il veut, besoin clair |
| **Ponctuel** | Hub uniquement | Fiche client + échanges + factures | Mission ponctuelle, petit contrat |

## Client Ponctuel (CRM Only)

Le client ponctuel n'a pas d'Élio, pas de dashboard dédié. Juste :
- Fiche contact dans le Hub
- Historique des échanges
- Documents partagés
- Facturation

**Opportunité de conversion** : Un client ponctuel qui revient plusieurs fois peut "graduer" vers un abonnement One.

## Indicateurs Visuels dans le Hub

| Type | Indicateur |
|------|------------|
| Complet (Lab+One actifs) | 🟢 |
| Direct One (One actif) | 🟡 |
| Ponctuel (CRM only) | ⚪ |

## Modèle de Données Client

```yaml
client:
  id: "client_xxx"
  type: "complet" | "direct_one" | "ponctuel"
  has_lab: boolean
  has_one: boolean
  modules_actifs: []
```

---
