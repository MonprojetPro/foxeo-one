# Continuité Élio Lab → Élio One

> **Mise à jour 13/04/2026 (Révision 2)** — Depuis [ADR-01 Révision 2](../architecture/adr-01-lab-one-coexistence-same-instance.md), TOUS les clients MonprojetPro (phase Lab comme phase One) sont servis par **un seul et unique déploiement multi-tenant** `app.monprojet-pro.com` : **un seul Vercel, une seule base Supabase partagée**, isolation par RLS sur `client_id`. Il n'existe **pas** de base par client, **pas** d'instance dédiée pendant l'abonnement, **pas** de migration cross-database à la graduation. La graduation Lab→One est une simple bascule du flag `dashboard_type` (`lab` → `one`) dans `client_configs` — aucune donnée ne bouge, aucune infra ne bouge. Les données Lab ne sont **jamais archivées** : elles restent dans la même base partagée, accessibles en permanence via le toggle Mode Lab/Mode One du shell. Élio Lab devient un **feature flag** `elio_lab_enabled` (off par défaut post-graduation) que MiKL peut réactiver à tout moment depuis le Hub sans aucun provisioning, voir [ADR-02](../architecture/adr-02-agents-feature-flags-tree-shaking.md). La continuité Élio Lab → Élio One décrite ci-dessous (transmission du profil de communication et des apprentissages) se fait donc **in-place**, dans la même base partagée, par simple lecture : aucun transfert, aucune copie, aucune migration. Le cas « infrastructure dédiée au client » n'existe qu'au moment de la résiliation, via le **kit de sortie** (Story 13.1, Epic 13 à créer).

## Mémoire Persistante

Lors de la graduation, Élio One hérite de TOUT ce qu'Élio Lab a collecté, **in-place**, par simple lecture dans la base multi-tenant partagée (aucune migration, aucun transfert, aucune copie — les données n'ont jamais bougé) :

| Donnée | Source | Utilisé par One |
|--------|--------|-----------------|
| Profil communication | Orpheus + Lab | Ton adapté conservé |
| Historique échanges | Lab | Contexte complet |
| Préférences révélées | Lab | Ce qu'il aime/n'aime pas |
| Décisions MiKL | Lab | Ne contredit jamais |
| Briefs produits | Lab | Peut s'y référer |

## Format : client_profile.yaml (évolutif)

```yaml
client_id: "client_xxx"

communication:
  initial:
    date: "date"
    source: "visio_onboarding"
    ton: "pro_decontracte"

  affine:
    date_derniere_maj: "date"
    apprentissages:
      - "Préfère les listes à puces"
      - "Répond mieux le matin"
      - "Aime les analogies sport"

preferences:
  horaires_actifs: ["8h-10h", "14h-16h"]
  canal_prefere: "chat"
  aime: []
  n_aime_pas: []

business:
  secteur: "..."
  outils_actuels: []
  objectifs_exprimes: []
  contraintes: []

historique_lab:
  parcours_type: "..."
  date_graduation: "..."
  etapes_completees: []
  decisions_mikl: []
  echanges_marquants: []

config_elio_one:
  ton: "pro_decontracte"
  contexte_herite: []
  opportunites_identifiees: []
```

---
