# ADR-01 — Coexistence Lab et One dans une instance unique par client

| Champ | Valeur |
|-------|--------|
| **Date** | 2026-04-13 |
| **Statut** | Accepté |
| **Auteur** | ARCH (sur demande de MiKL) |
| **Décideur** | MiKL (PDG MonprojetPro) |
| **Remplace** | Modèle initial « Lab multi-tenant + One instance-per-client » |

---

## Contexte

L'architecture initiale de MonprojetPro reposait sur une séparation physique entre Lab et One :

- **Lab** était déployé en multi-tenant sur `lab.monprojet-pro.com`, tous les clients partageant la même application avec isolation RLS. Le Lab servait de phase d'incubation (brainstorming, briefs, livrables Élio Lab).
- **One** était déployé en **instance isolée par client** sur `{slug}.monprojet-pro.com`, chaque client possédant son propre déploiement Vercel, sa propre base Supabase et son propre code. Le One était l'outil business quotidien.
- La **graduation** consistait à migrer les données du client depuis le Lab multi-tenant vers sa nouvelle instance One dédiée, puis à archiver son espace Lab (lecture seule, accès technique uniquement).

Ce modèle présentait plusieurs limitations opérationnelles identifiées au fil des epics 9 et 10 :

1. **Graduation unidirectionnelle** — une fois le client gradué, il ne pouvait plus revenir activement dans le Lab pour un nouveau cycle d'idéation (nouveau projet, pivot, évolution majeure). Il fallait reprovisionner manuellement ou créer un second parcours.
2. **Fracture UX** — le client changeait d'URL, de thème, et perdait tout son contexte Élio Lab au moment où il « graduait ». L'expérience ressemblait à un déménagement brutal plutôt qu'à une évolution naturelle.
3. **Complexité de migration** — copier les données Lab vers l'instance One (briefs, conversations Élio, profil de communication, livrables) impliquait un pipeline de migration fragile, des webhooks HMAC et une fenêtre de downtime.
4. **Réalité du workflow entrepreneur** — un entrepreneur qui utilise One au quotidien a régulièrement besoin de revenir en mode « brainstorming / projet » pour structurer une nouvelle idée. Forcer un aller-retour cross-URL casse ce flux.

MiKL a validé le 2026-04-13 un nouveau modèle unifié.

---

## Décision

**Lab et One coexistent dans la même instance client, en permanence, accessibles via un toggle persistant dans le shell du dashboard.**

### Principes

1. **Une seule instance par client** — le déploiement Vercel et la base Supabase du client hébergent simultanément le code Lab ET le code One. Il n'existe plus qu'une seule URL par client (`{slug}.monprojet-pro.com`).
2. **Toggle visible persistant** — un switch « Mode Lab / Mode One » dans le header du shell permet au client de basculer instantanément entre les deux vues. Le basculement change le thème (violet Lab ↔ vert/orange One), la navigation latérale, les modules affichés, et l'agent Élio actif.
3. **Phase pré-graduation** — avant graduation, le mode par défaut est Lab, le mode One est verrouillé (invisible ou grisé). Le client vit son incubation.
4. **Phase post-graduation** — après graduation, le mode par défaut devient One. Le mode Lab reste accessible en lecture (historique, livrables, briefs) mais l'agent **Élio Lab est désactivé par défaut** via le flag `elio_lab_enabled = false`.
5. **Réactivation Lab à la demande** — MiKL peut réactiver Élio Lab à tout moment sur un client donné via le Hub (feature flag `elio_lab_enabled = true`), sans aucun reprovisioning. Le client retrouve alors un Lab pleinement fonctionnel en parallèle de son One.
6. **Coexistence permanente** — le client peut utiliser One pour son business quotidien et brainstormer avec Élio Lab en parallèle pour un nouveau projet, sans friction ni changement de contexte.

### Modèle de données

Le schéma `clients` évolue :

| Colonne | Type | Rôle |
|---------|------|------|
| `dashboard_type` | enum | Conservé pour routing par défaut (`lab` \| `one`) |
| `lab_mode_available` | boolean | Si le mode Lab est accessible (true par défaut) |
| `elio_lab_enabled` | boolean | Si l'agent Élio Lab répond (contrôlé par MiKL) |
| `one_mode_available` | boolean | Si le mode One est débloqué (devient true à graduation) |
| `graduated_at` | timestamp | Date de graduation (nullable) |

Les tables métier Lab (`lab_briefs`, `lab_conversations`, `lab_learnings`) et les tables métier One (`one_*`) cohabitent dans la même base — aucune migration inter-instance.

### Impact technique

- **Shell partagé** — `@monprojetpro/ui/dashboard-shell` reçoit une prop `mode: 'lab' | 'one'` et un handler `onModeChange`. Le thème CSS est injecté conditionnellement (`data-theme="lab"` vs `data-theme="one"`).
- **Middleware Next.js** — redirige vers `/lab` ou `/one` selon le mode actif (stocké en cookie `mpp_mode`), en vérifiant que le mode cible est disponible (`lab_mode_available` / `one_mode_available`).
- **Feature flags runtime** — `elio_lab_enabled` est lu au chargement et conditionne l'affichage du composant chat Élio Lab. Si désactivé, le chat est remplacé par un message « Élio Lab est en pause — contactez MiKL pour le réactiver ».
- **Feature flag build-time** — `NEXT_PUBLIC_ENABLE_LAB_MODULE` permet de **stripper** entièrement Lab du bundle pour les exports standalone (voir ADR-02).

---

## Rationale

| Critère | Ancien modèle | Nouveau modèle |
|---------|---------------|----------------|
| **UX graduation** | Déménagement brutal, nouvelle URL | Switch instantané, même instance |
| **Réactivation Lab** | Reprovisioning manuel | Toggle d'un flag |
| **Migration de données** | Pipeline HMAC fragile | Aucune migration (même DB) |
| **Cycles d'évolution** | Impossibles sans friction | Natifs et permanents |
| **Complexité infra** | 2 déploiements (Lab multi-tenant + One par client) | 1 déploiement par client |
| **Alignement workflow entrepreneur** | Forcé linéaire | Oscillation business ↔ idéation |

Le gain principal est **philosophique** : un entrepreneur ne « gradue » pas une fois pour toutes — il alterne en permanence entre exécution (One) et idéation (Lab). L'architecture doit refléter cette réalité.

---

## Conséquences

### Positives

- **Toggle instantané** sans latence réseau ni authentification re-négociée
- **Lab réactivable** à volonté par MiKL sans déploiement
- **Zéro provisioning** à la graduation — simple update SQL (`one_mode_available = true`)
- **Données cohérentes** — plus de synchronisation Lab → One
- **Expérience client unifiée** — une seule URL, un seul login, un seul contexte
- **Réduction de l'infrastructure** — suppression du déploiement Lab multi-tenant central
- **Continuité d'Élio** — le profil de communication et l'historique de conversations Lab restent accessibles à Élio One

### Négatives / compromis

- **Empreinte code plus lourde par instance client** — chaque déploiement contient le code Lab + One (~30-40% de bundle supplémentaire)
- **Tree-shaking obligatoire** pour les exports standalone (voir ADR-02)
- **Discipline d'architecture renforcée** — aucun import direct cross-module, registry obligatoire
- **Multi-tenant Lab supprimé** — les clients pré-graduation vivent désormais dans leur propre instance dès le premier jour (impact coût infra par client, compensé par la suppression du déploiement multi-tenant central)
- **Middleware plus complexe** — gestion du mode actif, fallback, vérification des flags

### Impact technique détaillé

- Le module `packages/modules/lab/*` devient **optionnel au build** via `NEXT_PUBLIC_ENABLE_LAB_MODULE`
- Le shell `DashboardShell` accepte `availableModes` et `currentMode`
- Le hook `useMode()` expose `{ mode, setMode, canSwitch }`
- Les routes `/lab/*` et `/one/*` coexistent dans `apps/client/app/`
- L'agent `Élio Lab` devient conditionnel (`elio_lab_enabled`), `Élio One` toujours actif post-graduation

---

## Impact sur les stories existantes

Les stories suivantes nécessitent un **rework** pour s'aligner sur ce nouveau modèle :

| Story | Titre | Rework nécessaire |
|-------|-------|-------------------|
| **9.1** | Graduation Lab → One : déclenchement & migration | Supprimer la migration cross-instance, remplacer par un simple update SQL (`one_mode_available = true`, `graduated_at = now()`, `elio_lab_enabled = false`) |
| **9.2** | Graduation : notification client & activation accès One | Remplacer l'envoi d'URL par la notification « Mode One débloqué — utilisez le toggle » |
| **9.5b** | Transfert instance One au client sortant | S'appuyer sur le build `standalone-export` de l'ADR-02 (Lab et agents strippés) |
| **10.1** | Dashboard One accueil personnalisé | Ajouter le composant toggle dans le header shell, gérer l'état `mode` persistant |

Un epic de transition (Epic 12+ ou Epic 13) devra être planifié par OTTO pour tracker ce rework.

---

## Alternatives considérées

### Option 2 — Redirect SSO cross-URL (rejetée)

Garder deux déploiements distincts (`lab.monprojet-pro.com` et `{slug}.monprojet-pro.com`) et créer un mécanisme SSO qui redirige instantanément entre les deux URLs avec partage de session.

**Rejet** : la latence réseau (redirect + re-hydratation), la complexité CORS/cookies cross-domain et la double maintenance (deux codebases déployés) ne justifiaient pas le maintien de la séparation.

### Option 3 — Full multi-tenant unique (rejetée)

Fusionner Lab et One dans un seul déploiement multi-tenant central où tous les clients cohabitent avec isolation RLS.

**Rejet** : contradit le principe fondateur de MonprojetPro selon lequel **le client possède son instance One** (exit propre, export code + DB, autonomie). Un multi-tenant central rend l'export impossible sans pipeline de fork complexe.

### Option 4 — Statu quo avec amélioration graduation (rejetée)

Garder les deux déploiements et améliorer uniquement le pipeline de migration.

**Rejet** : ne résout pas la réactivation du Lab post-graduation ni la friction UX.

---

*ADR validé par MiKL le 2026-04-13. À référencer dans les stories 9.1, 9.2, 9.5b, 10.1 et dans l'epic de transition.*
