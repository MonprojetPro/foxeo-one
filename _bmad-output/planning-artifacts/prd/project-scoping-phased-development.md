# Project Scoping & Phased Development

## MVP Strategy & Philosophy

**MVP Approach:** MVP Complet Portfolio
- Pas de version allégée — chaque module est développé complètement
- Co-construction progressive avec la cliente référence (pas d'urgence)
- Chaque développement devient un actif réutilisable (catalogue MonprojetPro)

**Resource Requirements:**
- Développeur principal : MiKL (via Cursor/BMAD)
- Stack : Next.js + Supabase + Stripe
- Agents IA : Claude (Orpheus) + DeepSeek V3.2 (Élio)

## MVP Feature Set (Phase 1) — Cas Client Référence

**Core User Journeys Supported:**
- Journey Sandrine (assistante association) : complet
- Journey MiKL (Validation Hub) : complet
- Journey Edge Case (paiement échoué) : complet

**Must-Have Capabilities:**

| Module | Priorité | Réutilisabilité |
|--------|----------|-----------------|
| Site Public (vitrine + espace adhérent) | P1 | Template association/TPE |
| CRM Adhérents | P1 | Module CRM générique |
| Formations + Qualiopi | P1 | Module formations (niche OF) |
| Événements | P1 | Module événementiel |
| Adhésions | P1 (Octobre) | Module abonnements |
| Élio One+ | P1 | Agent configurable |
| Dashboard | P1 | Vue globale standard |
| Stripe Integration | P1 | Paiements standard |

**Séquence de Déploiement (indicative, à affiner en Lab) :**
1. Site public + Espace adhérent
2. CRM centralisé
3. Module Formations
4. Module Événements
5. Module Adhésions
6. Élio One

## Post-MVP Features

**Phase 2 (Growth) :**
- Analytics avancés (tableaux de bord enrichis)
- PWA (application mobile)
- Notifications push
- Automatisations avancées (N8N)
- 2FA clients (optionnel)

**Phase 3 (Vision) :**
- Multi-utilisateurs par client
- API publique
- Marketplace de modules
- Multi-langue

## Contraintes de Développement (Obligatoires)

**Ces règles s'appliquent à CHAQUE Functional Requirement développé :**

| Contrainte | Description |
|------------|-------------|
| **Tests Unitaires Poussés** | Chaque FR doit être couverte par des tests unitaires exhaustifs couvrant tous les cas de figure (happy path, edge cases, erreurs) |
| **Nettoyage du Code** | Chaque développement inclut une phase de refactoring/nettoyage pour garantir un code optimal, lisible et performant |
| **Revue Qualité** | Aucune FR n'est considérée "terminée" sans tests + nettoyage validés |

**Objectif :** Code de qualité production dès le premier développement, pas de dette technique accumulée.

---

## Risk Mitigation Strategy

**Scope Creep :** Cadré via Validation Hub — chaque demande hors scope initial = devis séparé

**Complexité Qualiopi :** Module isolé, documentation exhaustive des règles métier

**Dépendance cliente unique :** Architecture modulaire dès le départ, tout est réutilisable

**Ressources/Délais :** Pas de deadline externe — itération progressive, qualité > vitesse

---
