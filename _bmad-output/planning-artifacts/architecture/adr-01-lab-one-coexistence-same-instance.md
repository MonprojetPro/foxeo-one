# ADR-01 — Coexistence Lab et One dans un déploiement multi-tenant unique

| Champ | Valeur |
|-------|--------|
| **Date** | 2026-04-13 |
| **Statut** | Accepté (Révision 2) |
| **Auteur** | ARCH (sur demande de MiKL) |
| **Décideur** | MiKL (PDG MonprojetPro) |
| **Remplace** | Modèle initial « Lab multi-tenant + One instance-per-client » |

> **Révision 2 — 2026-04-13** : Précision apportée par MiKL — abandon du modèle « instance dédiée par client post-graduation » au profit d'un déploiement multi-tenant unique. Le provisioning par client n'existe que via le kit de sortie (cf. ADR-02).

---

## Contexte

Deux modèles ont été successivement envisagés avant d'aboutir au modèle retenu :

**Modèle initial (abandonné)** : Lab multi-tenant sur `lab.monprojet-pro.com` + One en instance isolée par client sur `{slug}.monprojet-pro.com` (Vercel + Supabase dédiés par client). Graduation = migration cross-instance.

**Révision 1 (également abandonnée)** : coexistence Lab/One dans une **instance dédiée par client** dès le premier jour, avec toggle Lab/One. Ce modèle résolvait la friction UX mais imposait un provisioning Vercel + Supabase par client dès la souscription, une dette infra lourde et un coût opérationnel croissant à chaque nouveau client.

**Révision 2 (retenue, 2026-04-13)** : MiKL a clarifié son intention réelle. Tant que le client est abonné (Lab ou One), il vit dans un **déploiement multi-tenant unique** partagé par tous les clients. Le provisioning individuel n'a lieu **qu'une seule fois**, à la sortie (résiliation ou livraison one-shot), via un « kit de sortie » automatisé qui crée un déploiement autonome que MiKL transmet au client.

Ce modèle est justifié par :

1. **Simplicité opérationnelle** — un seul Vercel, un seul Supabase, une seule CI, un seul set de migrations. Zéro provisioning à la souscription.
2. **Graduation triviale** — un simple flag `dashboard_type` passe de `lab` à `one`, en transaction SQL. Aucun pipeline, aucune migration, aucune latence.
3. **Toggle Lab/One instantané** — puisque tout vit dans la même base, le basculement est une simple mise à jour d'état UI.
4. **Coûts maîtrisés** — le coût infra ne croît pas linéairement avec le nombre de clients abonnés.
5. **Sortie propre** — le kit de sortie produit une instance autonome que le client possède réellement, respectant l'engagement fondateur « le client possède son One ».

---

## Décision

**Tous les clients abonnés (Lab comme One) vivent dans un déploiement multi-tenant unique hébergé sur `app.monprojet-pro.com`. Lab et One coexistent dans ce déploiement en permanence, l'isolation entre clients étant assurée par les politiques RLS sur la colonne `client_id`.**

### Principes

1. **Un seul déploiement pour tous les clients abonnés** — un unique projet Vercel (`app.monprojet-pro.com`), une unique base Supabase, une unique CI. Isolation par RLS `client_id`, pas par infrastructure.
2. **Graduation = flag SQL** — à la graduation, `client_configs.dashboard_type` passe de `lab` à `one` et `lab_mode_available` reste `true` (le client garde accès au Lab en lecture + réactivation possible). Aucun provisioning, aucune migration, aucun downtime.
3. **Toggle Lab/One instantané** — un switch « Mode Lab / Mode One » dans le header du shell bascule thème, navigation, modules et agent Élio actif. Le basculement est purement UI — toutes les données du client sont déjà dans la même base.
4. **Phase pré-graduation** — `dashboard_type = 'lab'`, mode One verrouillé (`one_mode_available = false`). Le client vit son incubation.
5. **Phase post-graduation** — `dashboard_type = 'one'`, `one_mode_available = true`. Le mode Lab reste accessible (historique, réactivation à la demande). L'agent Élio Lab est contrôlé par `elio_lab_enabled` (toggle MiKL dans le Hub admin).
6. **Coexistence de code permanente** — Lab et One modules cohabitent dans le déploiement multi-tenant à tout moment. **Aucun tree-shaking runtime** : le tree-shaking (cf. ADR-02) n'existe que dans le contexte du kit de sortie.
7. **Kit de sortie = unique moment de provisioning** — à la résiliation ou livraison one-shot, un script handoff crée une instance autonome (Vercel + GitHub + Supabase dédiés) depuis laquelle Lab et agents sont tree-shakés au build. Cf. ADR-02 pour le workflow détaillé.

### Modèle de données

Le schéma `client_configs` porte les flags de mode :

| Colonne | Type | Rôle |
|---------|------|------|
| `client_id` | uuid | FK vers `clients`, pivot RLS de toute la base multi-tenant |
| `dashboard_type` | enum (`lab` \| `one`) | Mode par défaut au login |
| `lab_mode_available` | boolean | Accès Lab autorisé (true par défaut) |
| `one_mode_available` | boolean | Mode One débloqué (devient true à graduation) |
| `elio_lab_enabled` | boolean | Agent Élio Lab actif (toggle MiKL depuis Hub admin) |
| `graduated_at` | timestamp | Date de graduation (nullable) |

Toutes les tables métier (Lab et One) portent `client_id` et sont isolées par RLS. Aucune migration inter-base, aucun provisioning.

### Impact technique

- **Un seul projet Vercel** (`app.monprojet-pro.com`) servant tous les clients abonnés. URLs `{slug}.monprojet-pro.com` abandonnées pendant l'abonnement.
- **Shell partagé** — `@monprojetpro/ui/dashboard-shell` reçoit une prop `mode: 'lab' | 'one'` et un handler `onModeChange`. Le thème CSS est injecté conditionnellement (`data-theme="lab"` vs `data-theme="one"`).
- **Middleware Next.js** — résout `client_id` depuis la session, lit `client_configs`, et route vers `/lab` ou `/one` selon `dashboard_type` + cookie `mpp_mode`.
- **Hub ↔ client** — le Hub opère directement sur la base multi-tenant. **Plus de webhooks HMAC Hub ↔ instance client** pendant l'abonnement (obsolètes). Ce concept ne subsiste éventuellement que pour le kit de sortie.
- **Feature flags runtime** — `elio_lab_enabled` conditionne l'affichage du chat Élio Lab (lecture `client_configs`).
- **Feature flag build-time** — `NEXT_PUBLIC_ENABLE_LAB_MODULE` et `NEXT_PUBLIC_ENABLE_AGENTS` sont utilisés **uniquement par le kit de sortie** (cf. ADR-02), jamais en production normale.

---

## Rationale

| Critère | Modèle initial (Lab multi-tenant + One par client) | Révision 1 (instance dédiée par client) | **Révision 2 retenue (multi-tenant unique)** |
|---------|-----|-----|-----|
| **Provisioning à la souscription** | 1 instance Vercel + Supabase par One | 1 instance dès le Lab | **Aucun** |
| **Graduation** | Migration cross-instance | Update flag local | **Update flag SQL** |
| **Toggle Lab/One** | Impossible (URLs distinctes) | Instantané (même instance) | **Instantané (même DB)** |
| **Coût infra par client** | Linéaire (2x) | Linéaire (1x) | **Mutualisé** |
| **Complexité CI** | 2 pipelines | 1 pipeline × N clients | **1 pipeline** |
| **Sortie client** | Export manuel depuis instance dédiée | Export depuis instance dédiée | **Kit de sortie (ADR-02)** |
| **Propriété du One** | Théorique | Théorique | **Effective via kit de sortie** |

Le gain principal : **simplicité opérationnelle maximale pendant l'abonnement**, combinée à la promesse « le client possède son One » tenue via un kit de sortie automatisé au moment opportun. Un entrepreneur ne « gradue » pas une fois pour toutes — il alterne entre exécution (One) et idéation (Lab) dans la même base, sans friction ni provisioning.

---

## Conséquences

### Positives

- **Zéro provisioning** pendant toute la vie de l'abonnement — ni à l'inscription, ni à la graduation
- **Graduation triviale** — simple UPDATE SQL, transaction instantanée, aucun downtime
- **Toggle Lab/One instantané** — tout est dans la même base, le basculement est purement UI
- **Coût infra mutualisé** — un seul Vercel, un seul Supabase, une seule CI pour tous les clients abonnés
- **Données cohérentes par construction** — RLS `client_id` isole sans migration
- **Lab réactivable** à volonté par MiKL via le flag `elio_lab_enabled` dans le Hub
- **Continuité Élio totale** — profil de communication et historique Lab/One dans la même base
- **Sortie propre garantie** — le kit de sortie (ADR-02) produit une vraie instance autonome

### Négatives / compromis

- **Isolation RLS critique** — toute faille RLS exposerait les données de tous les clients. Les tests RLS (lab et one) deviennent le garde-fou n°1 en CI.
- **Mutualisation des performances** — un client gros consommateur peut impacter les autres. À monitorer via métriques Supabase.
- **Code Lab + One toujours présent** dans le bundle production — accepté, seul le kit de sortie fait du tree-shaking
- **Middleware plus complexe** — résolution `client_id` + lecture `client_configs` à chaque requête
- **Kit de sortie à développer** — dette technique à combler dans Epic 13 avant première résiliation réelle

### Impact technique détaillé

- Un **unique projet Vercel** `app.monprojet-pro.com` + **unique base Supabase** pour tous les clients abonnés
- Les URLs `{slug}.monprojet-pro.com` sont **abandonnées** pendant l'abonnement (éventuellement réutilisées par le kit de sortie ou domaine custom du client post-livraison)
- Le shell `DashboardShell` accepte `availableModes` et `currentMode` (lus depuis `client_configs`)
- Le hook `useMode()` expose `{ mode, setMode, canSwitch }`
- Les routes `/lab/*` et `/one/*` coexistent dans `apps/client/app/` en permanence
- L'agent `Élio Lab` est conditionnel runtime (`elio_lab_enabled`)
- Les flags build-time `NEXT_PUBLIC_ENABLE_LAB_MODULE` et `NEXT_PUBLIC_ENABLE_AGENTS` ne sont consommés que par le build `standalone-export` du kit de sortie

---

## Impact sur les stories existantes

Les stories suivantes nécessitent un **rework** pour s'aligner sur ce nouveau modèle :

| Story | Titre | Rework nécessaire |
|-------|-------|-------------------|
| **9.1** | Graduation Lab → One : déclenchement & migration | Supprimer toute migration. Un simple UPDATE (`dashboard_type='one'`, `one_mode_available=true`, `graduated_at=now()`) suffit. Aucun provisioning. |
| **9.2** | Graduation : notification client & activation accès One | Notification in-app + email « Mode One débloqué », aucun changement d'URL |
| **9.5b** | Transfert instance One au client sortant | Réécrire autour du **kit de sortie** (ADR-02) : script handoff qui crée Vercel + GitHub + Supabase dédiés et exporte les données RLS-filtrées |
| **10.1** | Dashboard One accueil personnalisé | Ajouter le composant toggle dans le header shell, gérer l'état `mode` persistant (cookie `mpp_mode`) |

Un epic de transition (Epic 12+ ou Epic 13) devra être planifié par OTTO pour tracker ce rework.

---

## Alternatives considérées

### Option 2 — Redirect SSO cross-URL (rejetée)

Garder deux déploiements distincts (`lab.monprojet-pro.com` et `{slug}.monprojet-pro.com`) et créer un mécanisme SSO qui redirige instantanément entre les deux URLs avec partage de session.

**Rejet** : la latence réseau (redirect + re-hydratation), la complexité CORS/cookies cross-domain et la double maintenance (deux codebases déployés) ne justifiaient pas le maintien de la séparation.

### Option 3 — Instance dédiée par client dès le Lab (Révision 1, rejetée)

Provisionner un Vercel + Supabase par client dès l'inscription Lab, avec Lab/One coexistant dans cette instance.

**Rejet** : coût infra et complexité opérationnelle (N déploiements à maintenir, N CI, N sets de migrations) disproportionnés vs. le bénéfice. Le kit de sortie (ADR-02) permet de tenir la promesse « client possède son One » sans payer ce coût pendant l'abonnement.

### Option 4 — Statu quo avec amélioration graduation (rejetée)

Garder les deux déploiements et améliorer uniquement le pipeline de migration.

**Rejet** : ne résout pas la réactivation du Lab post-graduation ni la friction UX.

---

*ADR validé par MiKL le 2026-04-13. À référencer dans les stories 9.1, 9.2, 9.5b, 10.1 et dans l'epic de transition.*
