# ADR-02 — Module Lab tree-shakable pour export One standalone

| Champ | Valeur |
|-------|--------|
| **Date** | 2026-04-13 |
| **Statut** | Accepté |
| **Auteur** | ARCH (sur demande de MiKL) |
| **Décideur** | MiKL (PDG MonprojetPro) |
| **Dépend de** | ADR-01 (coexistence Lab/One dans une instance unique) |

---

## Contexte

MonprojetPro repose sur un engagement fondateur : **le client possède son instance One**. Lors d'une résiliation (arrêt de l'abonnement mensuel, changement de stratégie, fin de la relation), MiKL doit pouvoir transmettre au client sortant son dashboard One tel quel, afin qu'il puisse l'héberger lui-même sur son propre Vercel / VPS / infrastructure.

Ce transfert implique des contraintes fortes :

1. **Aucune dépendance SaaS externe** — le client ne doit pas avoir besoin d'un compte Anthropic, Supabase Hub MonprojetPro, ou Pennylane propriétaire MiKL. Le bundle doit fonctionner en autonomie avec ses propres clés.
2. **Retrait complet du Lab** — le client sortant n'a plus besoin du module Lab (incubation, briefs, livrables Élio Lab). Ce code ne doit pas être livré.
3. **Retrait complet des agents IA** — Élio Lab, Élio One, Élio One+ et toute intégration Claude/Anthropic SDK doivent être strippés. Le client sortant reçoit un **outil business pur**, sans IA intégrée.
4. **Conformité RGPD simplifiée** — en retirant les agents, on supprime tout transfert de données vers Anthropic, ce qui simplifie le registre des traitements pour le client sortant.
5. **Bundle réduit** — moins de code = moins de surface d'attaque, moins de maintenance, déploiement plus léger.

Avec l'ADR-01, Lab et One cohabitent dans la même instance client. Sans mécanisme de tree-shaking, un export livrerait **tout** le code Lab + agents au client sortant, ce qui contredit les exigences ci-dessus.

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

### Deux builds Vercel distincts

| Build | Commande | Flags | Usage |
|-------|----------|-------|-------|
| **production** | `npm run build` | tous `true` | Instances clients actives, hébergées par MiKL |
| **standalone-export** | `npm run build:standalone` | Lab, agents, Hub sync = `false` | Bundle livré au client sortant |

Le script `build:standalone` est défini dans `apps/client/package.json` et injecte les variables d'environnement correspondantes avant d'appeler `next build`.

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

## Conséquences

### Positives

- **Bundle réduit d'environ 40%** pour le standalone (retrait de Lab ~20%, agents + Claude SDK ~20%)
- **Conformité RGPD simplifiée** — aucune donnée envoyée à Anthropic dans le standalone
- **Autonomie totale du client sortant** — aucun compte SaaS tiers requis (hors Supabase et Vercel qu'il gère lui-même)
- **Sécurité renforcée** — moins de surface d'attaque, moins de clés API exposées
- **Coût d'exploitation nul pour le client sortant** — plus de coût Claude API, plus d'abonnement Hub
- **Discipline architecturale bénéfique** — force une séparation propre des modules dès maintenant, utile bien au-delà du cas standalone

### Négatives

- **Discipline stricte imposée à toute l'équipe** — aucun import direct cross-module toléré. Tout passe par le registry ou par des contrats d'interface explicites.
- **Tests CI doublés** — la pipeline doit builder **les deux versions** (production + standalone) pour vérifier que le standalone compile sans Lab/agents. Cela allonge la CI d'environ 3-5 minutes.
- **Complexité de `next.config.ts`** — conditional imports + IgnorePlugin + gestion des alias workspace nécessitent une configuration soignée.
- **Risque de régression silencieuse** — un développeur qui ajoute un import Lab dans un fichier One commun casserait le build standalone. Mitigé par le test CI dédié.
- **Maintenance de deux profils de dépendances** — `@anthropic-ai/sdk` optionnel demande une gestion fine de `package.json`.

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
| **9.5a** | Export RGPD des données client | Conserver l'export DB + documents, mais ajouter la génération du bundle standalone (code source + configuration Vercel) |
| **9.5b** | Transfert instance One au client sortant | Réécrire : utiliser `npm run build:standalone` pour produire le bundle, package le dépôt Git épuré (sans Lab/agents), fournir une documentation de self-hosting |
| **1.1** | Setup monorepo packages partagés dashboard shell | Ajouter le registry de modules + la config `next.config.ts` conditionnelle (en dette technique à combler) |
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
