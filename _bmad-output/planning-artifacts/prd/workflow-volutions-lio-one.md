# Workflow Évolutions Élio One

## Principe

Élio One = **collecteur intelligent**, pas décideur. Il qualifie la demande et la soumet à MiKL.

## Flow

```
CLIENT demande une évolution
            │
            ▼
ÉLIO ONE collecte (3-5 questions MAX)
• Qualifie le besoin rapidement
• Ne s'engage sur rien
            │
            ▼
VALIDATION HUB → Mini-brief à MiKL
• Demande structurée
• Contexte client (hérité)
            │
            ▼
MIKL DÉCIDE parmi 4 options :

[A] Réactiver Élio Lab
    → Besoin complexe, parcours à faire
    → MiKL bascule le feature flag `elio_lab_enabled` depuis le Hub
      (1 clic, pas de provisioning, pas de redéploiement, pas de migration)
    → Le client n'est jamais déplacé d'une instance à une autre :
      tout se passe dans le déploiement multi-tenant `app.monprojet-pro.com`,
      le flag change l'expérience sans toucher à l'infra
    → Le client accède immédiatement à Élio Lab en mode Lab
      (le toggle Lab/One est déjà visible dans le shell depuis la graduation)
    → Le client continue d'utiliser One en parallèle pour son quotidien business
      (les deux modes coexistent dans le même déploiement multi-tenant,
       la même base Supabase partagée, isolation par RLS)
    → Quand l'amélioration est cadrée et que MiKL démarre le développement,
      Élio Lab est désactivé à nouveau (flag off)
    → Tout le contenu Lab créé durant le cycle s'ajoute à l'historique Lab existant
    → Voir ADR-01 Révision 2 et ADR-02 (../architecture/)

[B] Programmer visio
    → Besoin de clarifier en live
    → MiKL envoie lien calendrier

[C] Développer direct
    → C'est clair, MiKL code
    → Puis met à jour doc Élio One

[D] Refuser / Reporter
    → Pas maintenant, noté pour plus tard
            │
            ▼
POST-DÉPLOIEMENT (si option C)
• Module déployé sur le déploiement multi-tenant `app.monprojet-pro.com`
  et activé pour le client concerné (feature flag / config client)
• Documentation injectée dans Élio One
• Élio One peut assister sur le nouvel outil
```

## Mise à jour Doc Élio One

Après chaque déploiement, MiKL alimente Élio One :

```yaml
modules_actifs:
  - module_existant
  - nouveau_module  # AJOUTÉ

documentation_elio:
  nouveau_module:
    description: "Ce que fait le module"
    parametres: {}
    questions_client_possibles:
      - question: "Comment je fais X ?"
        reponse: "Tu vas dans..."
    problemes_courants:
      - probleme: "Ça ne marche pas"
        diagnostic: "Vérifier 1) ... 2) ..."
        escalade_si: "Contacter MiKL si..."
```

---
