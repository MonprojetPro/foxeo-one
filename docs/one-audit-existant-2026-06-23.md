# Audit de l'existant — Dashboard One (2026-06-23)

> Base factuelle pour la refonte de la vision du One. Produit par 5 agents d'audit
> (modules client, shell/mode, vue Hub, données, doc/PRD). Étape 1 du chantier
> « réflexion orientation réelle du One ». Étape 2 = atelier vision sur cette base.

---

## 🔑 LE constat central

**Le One est massivement construit côté code (Epics 9, 10, 8 « done »), mais il n'a JAMAIS
tourné avec un vrai client.** En base : 0 graduation réelle (`graduated_at = null` partout),
aucun client en `dashboard_type = 'one'` actif, tous les tiers à `'base'` (essentiel/agentique
jamais activés). Le One est une machine montée et testée à blanc, jamais mise en route.

Et surtout : **la définition de fond n'est pas figée** — les phases « en construction → livré »,
la vraie posture d'Élio One, ce que justifie l'abonnement. C'est exactement le sujet du chantier.

---

## 1. Modules — ce qui est RÉELLEMENT branché côté client

| Module | Réservé One ? | État | Note |
|--------|---------------|------|------|
| core-dashboard (accueil) | non (commun) | ⚠️ partiel | « Activité récente » = liens statiques, pas un vrai flux |
| chat | non | ✅ réel | Realtime + présence |
| documents | non | ✅ réel | upload/dossiers/partage/export |
| visio | non | ✅ réel | Cal.com + Google Meet |
| support | non | ✅ réel | tickets + Realtime |
| elio | One (page) | ✅ réel | 60+ Server Actions, widget sidebar OneElioBox |
| notifications | non | ✅ réel | cloche header (pas de page liste) |
| **facturation** | **One only** | ⚠️ conditionnel | dépend de `billing_sync` (25 rows en base → OK) |
| **suivi-outil** | **One only** | ✅ réel | fil Hub→client, images, commentaires |

**Modules « commerciaux » prévus mais NON branchés (intégrations API = P2)** : Signature (Yousign),
Calendrier, Branding, Site web, SEO, Réseaux sociaux, Maintenance. Structure d'activation + UI shell
faites, vraies intégrations jamais codées.

## 2. Shell / mode One

- `resolveClientMode` (`packages/utils/src/client-mode.ts`) = résolveur unique, propre, testé.
- Toggle Lab/One via cookie `mpp_active_view` + full reload. OK.
- Sidebar One : Dashboard · Chat · Documents · Visio · **Comptabilité** · **Suivi de l'outil** · Support · Élio.
- ⚠️ **Incohérence thème** : `one.css` est en réalité **orange/ambre**, pas vert. Le vert `#16a34a`
  vient d'un `--brand-accent` injecté en inline style. Le thème CSS et la promesse « vert » divergent.
- ⚠️ **Élio One vs One+** : la distinction existe en base (`elio_tier`) mais **aucune différence UI visible**.

## 3. Rôle du Hub vis-à-vis d'un client One

**Ce qui existe** : suivi-outil (updates dev), validation `evolution_one` (demandes d'évolution),
support tickets, chat, gestion abonnement/tier, toggles d'accès, impersonation.

**Coquilles vides** : `/elio/one` (« À venir »), `/elio/hub` (« À venir »), admin Backups/Webhooks/API.

**Ce qui manque** : pas de vue dédiée « clients One actifs », pas de métriques d'usage réel des modules One,
pas d'alertes d'inactivité spécifiques One. → Une fois le client en One, le Hub a un rôle réel mais **limité**.

## 4. Données (vraie base prod `mpgpwcpeqfwknohhqdmd`)

- **0 client réellement en mode One.** Seul « Dev Test SARL » a `one_mode_available = true` (et reste en lab).
- Actif côté One : `billing_sync` (25), `quote_metadata` (11), `tool_posts` (2), `tool_post_comments` (7), Élio (144 messages).
- Jamais déclenché : kit de sortie (`client_instances`, `instance_transfers`, `client_handoffs` = 0 rows).
- Tous les clients en tier `base` → les features Élio One/One+ payantes ne sont pas exercées.

## 5. Vision selon la doc — et ses 5 zones de flou

**Mission claire et cohérente** : *outil métier quotidien personnalisé post-graduation, « remplace 10 outils »,
Élio One = assistant configuré 24/7, demandes d'évolution → devis, propriété du code à la sortie.*

**Mais 5 flous à trancher :**
1. **Phases « en construction » → « livré » PAS figées** (différé explicitement — c'est LE gros chantier).
2. **`epic-list.md` contredit l'ADR-01** : parle encore d'« instances dédiées » alors que tout est multi-tenant.
3. **Offre « ponctuel / One limité »** jamais définie (quels modules, quel Élio, quelle durée ?).
4. **Élio One : « collecteur de demandes » OU « assistant du quotidien » ?** Posture ambiguë selon les docs.
5. **« Votre outil vous appartient »** (commercial) vs réalité multi-tenant (propriété réelle = à la sortie seulement).

---

## ➡️ Questions de fond pour l'atelier vision (étape 2)

1. **C'est quoi le One, en une phrase honnête ?** Outil de gestion ? Espace de relation continue avec MiKL ?
   Les deux ? Pour qui en priorité (gradué Lab vs Direct One) ?
2. **Le cycle « en construction → livré »** : que voit le client pendant qu'on lui développe son outil,
   et à quoi ressemble le « livré » ?
3. **Élio One** : simple collecteur de demandes, ou vrai copilote métier quotidien ?
4. **Ce que justifie l'abonnement** : présence d'Élio ? maintenance ? évolutions ? les 3 ?
5. **Modules** : on garde le catalogue large (7 modules commerciaux) ou on resserre sur un noyau qui marche vraiment ?
