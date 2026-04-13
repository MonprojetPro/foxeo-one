# ADR-02 — Module Lab tree-shakable pour export One standalone

| Champ | Valeur |
|-------|--------|
| **Date** | 2026-04-13 |
| **Statut** | Accepté (Révision 2) |
| **Auteur** | ARCH (sur demande de MiKL) |
| **Décideur** | MiKL (PDG MonprojetPro) |
| **Dépend de** | ADR-01 (coexistence Lab/One dans un déploiement multi-tenant unique) |

> **Révision 2 — 2026-04-13** : Précision MiKL — le tree-shaking est déclenché uniquement par le kit de sortie (script handoff), pas par un second build production permanent. Un seul build production tourne pour tous les clients abonnés.

---

## Contexte

MonprojetPro repose sur un engagement fondateur : **le client possède son instance One**. Pendant la vie de l'abonnement, tous les clients vivent dans un déploiement multi-tenant unique (cf. ADR-01). À la sortie — résiliation d'abonnement OU livraison one-shot d'un projet — MiKL doit pouvoir transmettre au client sortant un dashboard One autonome, qu'il héberge lui-même.

**Précision importante de la Révision 2 (2026-04-13)** : le tree-shaking décrit dans cet ADR s'applique **uniquement au kit de sortie**. En production normale, un seul build tourne sur `app.monprojet-pro.com` avec Lab + agents toujours activés. Il n'existe **pas** de second build permanent parallèle. Les flags `NEXT_PUBLIC_ENABLE_LAB_MODULE` et `NEXT_PUBLIC_ENABLE_AGENTS` ne sont consommés que par le script handoff lorsqu'il génère un bundle de sortie.

Le transfert au client sortant implique des contraintes fortes :

1. **Aucune dépendance SaaS externe** — le client ne doit pas avoir besoin d'un compte Anthropic, Hub MonprojetPro, ou Pennylane propriétaire MiKL. Le bundle doit fonctionner en autonomie avec ses propres clés.
2. **Retrait complet du Lab** — le client sortant n'a plus besoin du module Lab. Ce code ne doit pas être livré.
3. **Retrait complet des agents IA** — Élio Lab, Élio One, Élio One+ et toute intégration Claude/Anthropic SDK doivent être strippés. Le client sortant reçoit un **outil business pur**.
4. **Conformité RGPD simplifiée** — plus aucun transfert de données vers Anthropic.
5. **Bundle réduit** — moins de code, moins de surface d'attaque, déploiement plus léger.
6. **Livraison turnkey** — le client reçoit une URL fonctionnelle, pas un repo à configurer.

---

## Décision

**Le module `packages/modules/lab/*`, le module `@monprojetpro/module-elio` et toute intégration Claude/Anthropic SDK doivent être tree-shakables à la compilation via feature flags d'environnement.**

### Feature flags build-time

| Flag | Rôle | Production | Standalone |
|------|------|------------|------------|
| `NEXT_PUBLIC_ENABLE_LAB_MODULE` | Active le module Lab complet (routes, composants, actions) | `true` | `false` |
| `NEXT_PUBLIC_ENABLE_AGENTS` | Active tous les agents Élio + Claude SDK | `true` | `false` |
| `NEXT_PUBLIC_ENABLE_HUB_SYNC` | Active la communication Hub MonprojetPro (webhooks, API) | `true` | `false` |

Ces flags sont lus au build-time par `next.config.ts` et par le registry de modules.

### Un seul build production + un build à la demande pour le kit de sortie

| Build | Commande | Flags | Quand | Usage |
|-------|----------|-------|-------|-------|
| **production** | `npm run build` | tous `true` | En permanence sur Vercel `app.monprojet-pro.com` | Déploiement multi-tenant servant tous les clients abonnés |
| **standalone-export** | `npm run build:standalone` | Lab, agents, Hub sync = `false` | **Uniquement** au déclenchement du kit de sortie | Bundle poussé vers le nouveau Vercel dédié du client sortant |

Le build production tourne en continu avec Lab et agents actifs — c'est le fonctionnement normal. Le build `standalone-export` n'est invoqué qu'**une fois par sortie client**, par le script handoff décrit plus bas. Il n'y a donc **jamais deux builds qui tournent en parallèle en production**.

### Architecture du mécanisme

Deux approches combinées :

1. **Registry de modules avec import dynamique conditionnel** — le fichier `packages/modules/registry.ts` charge les modules via `import()` gardé par les flags. Si `NEXT_PUBLIC_ENABLE_LAB_MODULE !== 'true'`, l'import Lab n'est jamais référencé et disparaît du bundle grâce au tree-shaking de webpack/Turbopack.
2. **`webpack.IgnorePlugin` dans `next.config.ts`** — en filet de sécurité, un IgnorePlugin strippe les patterns `packages/modules/lab/**` et `packages/modules/elio/**` quand les flags sont désactivés. Cela garantit qu'aucun import résiduel (même transitive) ne passe dans le bundle final.

### Comportement runtime en mode standalone

- **Routes Lab** — toutes les routes sous `apps/client/app/lab/*` appellent `notFound()` si `NEXT_PUBLIC_ENABLE_LAB_MODULE !== 'true'`. En pratique, ces fichiers sont retirés du build par le registry + IgnorePlugin, donc les routes n'existent même pas.
- **Server Actions Lab** — renvoient un `ActionResponse` avec erreur `{ code: 'MODULE_DISABLED', message: 'Module Lab non disponible dans cette édition' }` si appelées (impossible en pratique car le code est absent).
- **Toggle shell** — le composant `ModeToggle` détecte l'absence du mode Lab via `NEXT_PUBLIC_ENABLE_LAB_MODULE` et se masque. Le dashboard affiche uniquement le mode One.
- **Chat Élio** — le composant `ElioChat` est conditionnellement importé. En standalone, il est remplacé par `null`, le bouton flottant n'apparaît pas.
- **Claude SDK** — le package `@anthropic-ai/sdk` est listé dans `peerDependenciesMeta.optional` et n'est installé que si `NEXT_PUBLIC_ENABLE_AGENTS === 'true'` via un script postinstall conditionnel.

### Données conservées

La base de données client exportée contient **toutes les données historiques** (Lab briefs, conversations Élio, livrables, documents). Ces données restent accessibles en lecture brute via SQL si le client sortant souhaite les consulter ultérieurement. Un outil de lecture Lab simplifié (sans agents) pourra être développé plus tard si un besoin émerge — ce n'est pas dans le périmètre de cet ADR.

---

## Kit de sortie — Workflow complet

Le kit de sortie est un **script handoff** exécuté par MiKL depuis le Hub, déclenché soit par une résiliation d'abonnement, soit par la livraison finale d'un projet one-shot. Il matérialise la promesse « le client possède son One » en produisant une instance autonome turnkey.

Le script exécute les 8 étapes suivantes dans l'ordre :

1. **Créer un nouveau projet Vercel** via l'API Vercel, sur l'équipe MiKL (ownership transférée ensuite au client).
2. **Créer un nouveau repo GitHub privé** via l'API GitHub, dans l'organisation MiKL (ownership transférée ensuite au client).
3. **Provisionner un nouveau projet Supabase dédié** au client (DB + Auth + Storage), via l'API Supabase.
4. **Exporter les données du client** depuis la base multi-tenant, filtrées par RLS sur `client_id`, et les importer dans le nouveau Supabase dédié (pg_dump ciblé ou script ETL).
5. **Pusher le codebase `apps/client` sur le nouveau repo** en mode standalone — build exécuté avec `NEXT_PUBLIC_ENABLE_LAB_MODULE=false` et `NEXT_PUBLIC_ENABLE_AGENTS=false`, déclenchant le tree-shaking via registry + IgnorePlugin.
6. **Connecter le nouveau Vercel au nouveau GitHub** et déclencher le premier déploiement automatique.
7. **Produire un rapport de synthèse** avec les credentials à transférer (accès Supabase, Vercel, GitHub) et un **draft d'email** prêt à envoyer au client.
8. **Transfert manuel d'ownership** — MiKL transfère en 1 clic par plateforme (Vercel, GitHub, Supabase) la propriété au compte du client.

À l'issue, le client reçoit une URL fonctionnelle, se connecte, et son application tourne. Il n'a rien à configurer. C'est un **export one-time**, pas un service managé continu : aucun lien opérationnel ne subsiste entre le Hub MiKL et l'instance livrée.

Ce workflow sera implémenté dans **Story 13.1 de l'Epic 13**, qui est la seule story devant mobiliser le mécanisme de tree-shaking décrit dans cet ADR.

---

## Conséquences

### Positives

- **Un seul build production** à maintenir, servant tous les clients abonnés → CI simple, déploiements rapides
- **Tree-shaking invoqué à la demande** uniquement, pas de coût CI permanent
- **Bundle de sortie réduit d'environ 40%** (Lab ~20%, agents + Claude SDK ~20%)
- **Conformité RGPD simplifiée** pour le client sorti — aucune donnée envoyée à Anthropic
- **Autonomie totale du client sortant** — aucun compte SaaS tiers requis (hors Supabase/Vercel qu'il gère)
- **Sécurité renforcée côté client** — moins de surface d'attaque, moins de clés API exposées
- **Coût d'exploitation nul pour le client sortant** — plus de coût Claude API
- **Discipline architecturale bénéfique** — séparation propre des modules, utile bien au-delà du cas standalone

### Négatives

- **Kit de sortie à développer** (Story 13.1) — dette technique à traiter avant la première résiliation/livraison réelle
- **Discipline stricte imposée à toute l'équipe** — aucun import direct cross-module toléré, sinon le build standalone du kit de sortie casserait
- **Job CI dédié `build-standalone-check`** — vérifie ponctuellement que `npm run build:standalone` compile sans Lab/agents (sans pour autant le déployer). Allonge la CI d'environ 3-5 minutes.
- **Complexité de `next.config.ts`** — conditional imports + IgnorePlugin + gestion des alias workspace
- **Risque de régression silencieuse** — un import Lab résiduel dans un fichier One commun casserait le build standalone. Mitigé par le job CI.
- **Maintenance d'une dépendance optionnelle** — `@anthropic-ai/sdk` en `peerDependenciesMeta.optional`

### Impact technique

- Création d'un fichier `packages/modules/registry.ts` centralisant les imports dynamiques
- Ajout d'un script `apps/client/scripts/build-standalone.ts` qui injecte les flags et lance le build
- Ajout d'un job CI `build-standalone-check` qui vérifie que le build standalone passe
- Documentation d'une **règle de lint custom** interdisant les imports directs entre modules (`packages/modules/X` ne peut jamais importer `packages/modules/Y`)
- Mise à jour de `CLAUDE.md` pour mentionner cette contrainte dans la section « Module System »

---

## Mécanisme technique résumé

| Couche | Technique | Outil |
|--------|-----------|-------|
| **Registry** | Import dynamique conditionnel gardé par flag | `import()` + `process.env` |
| **Bundler** | Strip des patterns de fichiers | `webpack.IgnorePlugin` dans `next.config.ts` |
| **Routes** | `notFound()` si flag off (fallback) | Next.js App Router |
| **Server Actions** | `ActionResponse` erreur `MODULE_DISABLED` (fallback) | Pattern projet existant |
| **Dépendances** | `@anthropic-ai/sdk` optionnel | `peerDependenciesMeta` |
| **CI** | Job dédié `build-standalone-check` | GitHub Actions |
| **Lint** | Règle custom cross-module | `eslint-plugin-boundaries` |

---

## Impact sur les stories existantes

| Story | Titre | Rework nécessaire |
|-------|-------|-------------------|
| **9.5a** | Export RGPD des données client | Reste un export DB + documents côté client actif, indépendant du kit de sortie |
| **9.5b** | Transfert instance One au client sortant | Réécrire autour du **kit de sortie (Story 13.1)** — appel au script handoff |
| **13.1** | **Kit de sortie — script handoff automatisé** (NEW) | Nouvelle story à créer dans Epic 13 : implémenter les 8 étapes décrites plus haut |
| **1.1** | Setup monorepo packages partagés dashboard shell | Ajouter le registry de modules + la config `next.config.ts` conditionnelle (dette à combler) |
| **Toutes stories modules** | — | Respecter strictement l'interdiction d'import cross-module (règle de lint à activer) |

Un epic dédié de mise en conformité architecture (à planifier par OTTO) devra traiter le registry, le build standalone et la règle de lint, **avant** la première résiliation client réelle.

---

## Alternatives considérées

### Option A — Pas de tree-shaking, livrer le bundle complet (rejetée)

Livrer au client sortant le bundle production tel quel, avec Lab et agents, en lui demandant simplement de ne pas utiliser le mode Lab.

**Rejet** : contredit l'exigence RGPD (transfert de données vers Anthropic même si non utilisé), expose des clés API inutilement, alourdit le bundle, ne protège pas le client sortant d'une facture Claude accidentelle.

### Option B — Fork manuel du code au moment de la résiliation (rejetée)

Au moment de la résiliation, un développeur forke manuellement le repo et retire Lab + agents à la main.

**Rejet** : non répétable, source d'erreurs, coûteux en temps humain, impossible à automatiser, non auditables.

### Option C — Monorepo séparé pour le standalone (rejetée)

Maintenir un second monorepo `monprojetpro-standalone` qui ne contient que le code One + module business, synchronisé manuellement avec le monorepo principal.

**Rejet** : double maintenance, divergence inévitable, charge de travail permanente. Le tree-shaking automatique est infiniment plus soutenable.

### Option D — Runtime flag uniquement (rejetée)

Utiliser des flags runtime (lus depuis la DB) sans tree-shaking. Le code Lab + agents reste dans le bundle mais est désactivé à l'exécution.

**Rejet** : ne résout ni le RGPD, ni la taille du bundle, ni le retrait des dépendances SaaS. Contraire à l'objectif.

---

*ADR validé par MiKL le 2026-04-13. À référencer dans les stories 9.5a, 9.5b, 1.1 et dans l'epic de mise en conformité architecture.*
