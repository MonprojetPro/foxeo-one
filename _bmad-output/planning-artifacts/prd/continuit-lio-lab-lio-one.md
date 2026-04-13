# Continuité Élio Lab → Élio One

> **Mise à jour 13/04/2026** — Depuis la décision [ADR-01](../architecture/adr-01-lab-one-coexistence-same-instance.md), Lab et One coexistent dans la **même instance client**. Les données Lab ne sont **jamais archivées** après la graduation : elles restent pleinement accessibles dans la base du client. Un toggle Lab/One persistant dans le shell permet au client de basculer entre les deux modes en permanence. Élio Lab devient un **feature flag** (off par défaut post-graduation) que MiKL peut réactiver à tout moment depuis le Hub pour ouvrir un nouveau cycle d'amélioration, sans re-provisioning — voir [ADR-02](../architecture/adr-02-agents-feature-flags-tree-shaking.md). La continuité décrite ci-dessous (transmission du profil de communication et des apprentissages Lab vers Élio One au moment de la graduation) reste inchangée : elle s'appuie désormais sur une base de connaissances partagée au sein de la même instance.

## Mémoire Persistante

Lors de la graduation, Élio One hérite de TOUT ce qu'Élio Lab a collecté (sans migration cross-database — tout vit dans la même instance) :

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
