# Story 9.4: Changement de tier abonnement client One

> ## ⚠️ REWORK REQUIRED — Décision architecturale 2026-04-13
>
> Cette story a été implémentée sous l'ancienne architecture (Lab et One déployés séparément). Le modèle a changé : Lab et One cohabitent désormais dans la même instance client avec un toggle persistant.
>
> **Référence** : [ADR-01](../../planning-artifacts/architecture/adr-01-lab-one-coexistence-same-instance.md) — Coexistence Lab+One dans une instance unique.
>
> **Impact sur cette story** : Clarifier dans le code que le tier s'applique à Élio One uniquement — pas au déploiement (il n'y a plus de provisioning différencié).
>
> **À reworker** : Une story de refonte sera créée dans l'Epic 13 — Refonte coexistence Lab/One.

Status: done

## Story

As a **MiKL (opérateur)**,
I want **changer le tier d'abonnement d'un client One (Base, Essentiel, Agentique) avec effet immédiat sur les capacités Elio**,
so that **je peux adapter l'offre à l'évolution des besoins du client**.

## Acceptance Criteria

**Given** MiKL consulte la fiche d'un client One (FR91)
**When** il accède à la section "Abonnement" de la fiche client
**Then** il voit :
- Le tier actuel du client (Base / Essentiel / Agentique) avec un badge coloré
- La date de début du tier actuel
- Le coût mensuel associé
- Un bouton "Modifier le tier"

**Given** MiKL clique sur "Modifier le tier"
**When** la modale de changement s'affiche
**Then** elle contient :
- Les 3 options de tier avec détail :
  | Tier | Prix | Elio | Description |
  |------|------|------|-------------|
  | Base | Ponctuel | Aucun | Maintenance 1 mois + docs techniques |
  | Essentiel | 49€/mois | One | Maintenance continue, mises à jour, Elio One assistant |
  | Agentique | 99€/mois | One+ | Maintenance continue, mises à jour, Elio One+ agentif |
- Le tier actuel est surligné et indiqué "(actuel)"
- Un avertissement si downgrade : "Attention : le passage de Agentique à Essentiel désactivera les fonctionnalités Elio One+ (actions, génération de documents, alertes proactives)."
- Boutons "Confirmer le changement" / "Annuler"

**Given** MiKL confirme le changement de tier
**When** la Server Action `changeClientTier(clientId, newTier)` s'exécute
**Then** les opérations suivantes sont effectuées :
1. `client_configs.elio_tier` → nouveau tier ('one' | 'one_plus' | null pour Base)
2. `client_configs.subscription_tier` → nouveau tier ('base' | 'essentiel' | 'agentique')
3. `client_configs.tier_changed_at` → NOW()
4. `activity_logs` → événement 'tier_changed' avec ancien et nouveau tier
5. Si upgrade vers One+ : les alertes proactives sont activées (config par défaut)
6. Si downgrade depuis One+ : les alertes proactives sont désactivées, les actions en cours sont préservées
**And** l'effet est immédiat : Elio adapte ses capacités dès la prochaine interaction
**And** un toast confirme "Tier modifié — {nom} est maintenant en {tier}"
**And** le cache TanStack Query est invalidé

**Given** le tier change impacte la facturation (intégration future Epic 11)
**When** la Server Action s'exécute
**Then** un champ `client_configs.pending_billing_update` → true est positionné pour signaler à l'Epic 11 (Facturation & Abonnements) qu'une mise à jour Stripe est nécessaire
**And** pour le MVP, la facturation est gérée manuellement par MiKL (pas de Stripe auto dans cet epic)

**Given** le client utilise Elio One après un changement de tier
**When** il tente une action One+ alors qu'il est en tier One
**Then** Elio One répond : "Cette fonctionnalité fait partie de l'offre Elio One+. Contactez MiKL pour en savoir plus !"
**And** le check de tier est effectué avant l'appel LLM (pas de tokens gaspillés)

## Tasks / Subtasks

- [x] Créer section "Abonnement" dans fiche client (AC: #1)
  - [x] Modifier `packages/modules/crm/components/client-info-tab.tsx`
  - [x] Ajouter section "Abonnement" (visible uniquement si `client_type = 'one'`)
  - [x] Afficher tier actuel avec badge coloré :
    - Base : badge gris (neutral)
    - Essentiel : badge vert (success)
    - Agentique : badge violet (premium)
  - [x] Afficher date début tier : `client_configs.tier_changed_at` ou `clients.graduated_at`
  - [x] Afficher coût mensuel : lookup table (Base: Ponctuel, Essentiel: 49€/mois, Agentique: 99€/mois)
  - [x] Bouton "Modifier le tier"

- [x] Créer modale de changement de tier (AC: #2)
  - [x] Créer `packages/modules/crm/components/change-tier-dialog.tsx`
  - [x] Utiliser Dialog component de @monprojetpro/ui (Radix UI)
  - [x] RadioGroup avec 3 options : Base, Essentiel, Agentique (toggle buttons custom)
  - [x] Chaque option affiche : nom tier, prix, capacité Elio, description
  - [x] Tier actuel surligné + badge "(actuel)"
  - [x] Si downgrade One+ → Essentiel ou Base : afficher Alert warning
  - [x] Alert : "Attention : le passage de Agentique à {newTier} désactivera les fonctionnalités Elio One+ (actions, génération de documents, alertes proactives)."
  - [x] Boutons "Confirmer le changement" (primary) / "Annuler"

- [x] Créer Server Action `changeClientTier` (AC: #3, #4)
  - [x] Créer `packages/modules/crm/actions/change-tier.ts`
  - [x] Signature: `changeClientTier(clientId: string, newTier: SubscriptionTier): Promise<ActionResponse<void>>`
  - [x] Validation Zod : clientId UUID, newTier enum ('base' | 'essentiel' | 'agentique')
  - [x] Fetch client actuel avec `client_configs`
  - [x] Si même tier : retourner error 'TIER_UNCHANGED'
  - [x] Déterminer ancien tier pour logging
  - [x] UPDATE `client_configs` :
    - `subscription_tier = {newTier}`
    - `elio_tier = {mapTierToElio(newTier)}` (Base→null, Essentiel→'one', Agentique→'one_plus')
    - `tier_changed_at = NOW()`
    - `pending_billing_update = true` (pour Epic 11)
  - [x] Si upgrade vers One+ : activer alertes proactives par défaut
  - [x] Si downgrade depuis One+ : désactiver alertes proactives, préserver actions
  - [x] INSERT `activity_logs` : type 'tier_changed', metadata { oldTier, newTier, changedBy: operatorId }
  - [x] Retourner format `{ data: null, error }` standard

- [x] Créer helper `mapTierToElio` (AC: #3)
  - [x] Créer `packages/modules/crm/utils/tier-helpers.ts`
  - [x] `mapTierToElio(tier: SubscriptionTier): ElioTier | null`
  - [x] Mapping : 'base' → null, 'essentiel' → 'one', 'agentique' → 'one_plus'

- [x] Implémenter gestion alertes proactives (AC: #3)
  - [x] Si upgrade vers One+ : `client_configs.elio_proactive_alerts = true`
  - [x] Si downgrade depuis One+ : `client_configs.elio_proactive_alerts = false`
  - [x] Actions Elio One+ en cours préservées (pas de suppression)

- [x] Implémenter invalidation cache et notifications (AC: #3)
  - [x] Invalider TanStack Query : `queryClient.invalidateQueries(['client', clientId])`
  - [x] Invalider TanStack Query : `queryClient.invalidateQueries(['client-config', clientId])`
  - [x] Toast success : "Tier modifié — {nom} est maintenant en {tier}"
  - [x] Notification client optionnelle : non implémentée (MVP — facturation manuelle)

- [x] Implémenter check tier dans Elio One+ (AC: #5)
  - [x] Créer `packages/modules/elio/actions/execute-action.ts` (helper `checkElioTierAccess`)
  - [x] Avant exécution action One+ : vérifier `client_configs.elio_tier`
  - [x] Si `elio_tier != 'one_plus'` : retourner error message (TIER_INSUFFICIENT)
  - [x] Message : "Cette fonctionnalité fait partie de l'offre Élio One+. Contactez MiKL pour en savoir plus !"
  - [x] Ne pas consommer tokens LLM si check échoue (déjà implémenté dans send-to-elio.ts)

- [x] Créer types TypeScript (AC: all)
  - [x] Créer `packages/modules/crm/types/subscription.types.ts`
  - [x] Type `SubscriptionTier = 'base' | 'essentiel' | 'agentique'`
  - [x] Type `ElioTierForSubscription = 'one' | 'one_plus' | null`
  - [x] Type `TierInfo = { name: string; price: string; elio: string; description: string }`
  - [x] Const `TIER_INFO: Record<SubscriptionTier, TierInfo>`

- [x] Créer tests unitaires (TDD)
  - [x] Test `changeClientTier`: tier modifié + elio_tier mis à jour
  - [x] Test `changeClientTier`: upgrade vers One+ → alertes activées
  - [x] Test `changeClientTier`: downgrade depuis One+ → alertes désactivées
  - [x] Test `changeClientTier`: même tier → error 'TIER_UNCHANGED'
  - [x] Test `changeClientTier`: activity_log créé avec ancien et nouveau tier
  - [x] Test `mapTierToElio`: mapping correct pour chaque tier
  - [x] Test check Elio One+ : elio_tier != 'one_plus' → error message (execute-action.test.ts)

- [x] Créer test RLS
  - [x] Test : opérateur A ne peut pas changer tier de client de opérateur B
  - [x] Test : client ne peut pas changer son propre tier (fonction Hub only)

## Dev Notes

### Architecture Patterns
- **Pattern data fetching**: Server Action pour mutation (`changeClientTier`)
- **Pattern state**: TanStack Query pour cache client + config
- **Pattern validation**: Zod schema pour validation inputs
- **Pattern tier gating**: Check tier avant actions Elio One+ (pas de tokens gaspillés)
- **Pattern facturation**: Flag `pending_billing_update` pour Epic 11 (Stripe/Pennylane)

### Source Tree Components
```
packages/modules/crm/
├── components/
│   ├── client-info-tab.tsx           # MODIFIER: ajouter section "Abonnement"
│   ├── change-tier-dialog.tsx        # CRÉER: modale changement tier
│   └── change-tier-dialog.test.tsx
├── actions/
│   ├── change-tier.ts                # CRÉER: Server Action changement tier
│   └── change-tier.test.ts
├── utils/
│   ├── tier-helpers.ts               # CRÉER: mapTierToElio() + TIER_INFO const
│   └── tier-helpers.test.ts
└── types/
    └── subscription.types.ts         # CRÉER: types SubscriptionTier, ElioTier, TierInfo

packages/modules/elio/
└── actions/
    └── execute-action.ts             # MODIFIER: ajouter check tier One+ avant exécution
```

### Testing Standards
- **Unitaires**: Vitest, co-localisés (*.test.ts)
- **Coverage**: >80% pour Server Actions critiques
- **RLS**: Test isolation opérateur (ne peut pas modifier tier d'un autre opérateur)
- **Tier gating**: Test Elio One+ refuse action si tier != 'one_plus'

### Project Structure Notes
- Alignement avec fiche client CRM (Story 2.3)
- Intégration Elio One+ (Story 8.9a — actions tiers)
- Préparation Epic 11 (facturation Stripe/Pennylane) via flag `pending_billing_update`
- Alertes proactives Elio One+ (Story 8.9c)

### Key Technical Decisions

**1. Tiers et capacités Elio**
- **Base (Ponctuel)** : Pas d'abonnement, maintenance 1 mois, pas d'Elio
- **Essentiel (49€/mois)** : Elio One (assistant FAQ, guidance dashboard)
- **Agentique (99€/mois)** : Elio One+ (actions, génération documents, alertes proactives)
- Mapping tier → elio_tier dans `client_configs` pour check rapide

**2. Effet immédiat**
- Changement tier commit immédiatement en DB
- Elio adapte capacités dès prochaine interaction (check `elio_tier` dans action)
- Pas de période de transition (changement instantané)
- Cache TanStack Query invalidé pour refresh UI

**3. Downgrade One+ → gestion features**
- Alertes proactives désactivées (`elio_proactive_alerts = false`)
- Actions Elio One+ en cours PRÉSERVÉES (pas de suppression)
- Client peut consulter historique actions mais ne peut plus en créer
- Message explicite si tentative action One+ avec tier One ou Base

**4. Facturation manuelle MVP**
- Flag `pending_billing_update = true` positionné lors du changement
- Epic 11 (Facturation & Abonnements) consommera ce flag pour sync Stripe/Pennylane
- Pour MVP : MiKL gère facturation manuellement (devis, factures Pennylane)
- Pas de webhook Stripe dans cette story

**5. Tier gating Elio**
- Check tier AVANT appel LLM (économie tokens)
- Message refus friendly : "Cette fonctionnalité fait partie de l'offre Elio One+. Contactez MiKL..."
- Pas d'erreur technique, juste information upsell
- Client peut continuer à utiliser Elio One (FAQ, guidance) en tier Essentiel

### Database Schema Changes

```sql
-- Migration: add subscription_tier and tier_changed_at to client_configs
ALTER TABLE client_configs
  ADD COLUMN subscription_tier TEXT CHECK (subscription_tier IN ('base', 'essentiel', 'agentique')) DEFAULT 'base',
  ADD COLUMN tier_changed_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN pending_billing_update BOOLEAN DEFAULT false,
  ADD COLUMN elio_proactive_alerts BOOLEAN DEFAULT false;

-- Migration: add index on subscription_tier for analytics
CREATE INDEX idx_client_configs_subscription_tier ON client_configs(subscription_tier);

-- NOTE: elio_tier column already exists from Story 8.1 (Elio infrastructure)
-- Values: null (Base), 'one' (Essentiel), 'one_plus' (Agentique)
```

### UI/UX Considerations

**Badge colors par tier**
- Base : neutral (gris) — minimal
- Essentiel : success (vert) — standard
- Agentique : premium (violet/indigo) — advanced

**Modale changement tier**
- RadioGroup vertical pour meilleure lisibilité (3 options)
- Chaque option : Card avec hover effect
- Tier actuel : border accent + badge "(actuel)"
- Prix mis en avant (h2) + description en subtitle
- Downgrade warning : Alert component (destructive variant)

**Toast notifications**
- Success : "Tier modifié — {nom} est maintenant en {tier}"
- Error : "Erreur lors du changement de tier — {errorMessage}"

**Message refus Elio One+**
- Ton friendly, pas d'erreur technique
- CTA : "Contactez MiKL pour en savoir plus !"
- Link optionnel vers chat MiKL
- Affichage dans UI Elio (pas de toast error)

### Tier Information Constants

```typescript
// packages/modules/crm/utils/tier-helpers.ts
export const TIER_INFO: Record<SubscriptionTier, TierInfo> = {
  base: {
    name: 'Base',
    price: 'Ponctuel',
    elio: 'Aucun',
    description: 'Maintenance 1 mois + documentation technique',
  },
  essentiel: {
    name: 'Essentiel',
    price: '49€/mois',
    elio: 'Elio One',
    description: 'Maintenance continue, mises à jour, Elio One assistant',
  },
  agentique: {
    name: 'Agentique',
    price: '99€/mois',
    elio: 'Elio One+',
    description: 'Maintenance continue, mises à jour, Elio One+ agentif',
  },
}
```

### References
- [Source: CLAUDE.md — Architecture Rules]
- [Source: docs/project-context.md — Stack & Versions]
- [Source: _bmad-output/planning-artifacts/architecture/04-implementation-patterns.md — API Response Format]
- [Source: _bmad-output/planning-artifacts/epics/epic-9-graduation-lab-vers-one-cycle-de-vie-client-stories-detaillees.md — Story 9.4 Requirements]
- [Source: Story 2.3 — Fiche client CRM]
- [Source: Story 8.9a — Elio One+ actions (tier gating)]
- [Source: Story 8.9c — Elio One+ alertes proactives]
- [Source: Epic 11 — Facturation & Abonnements (pending_billing_update)]

### Dependencies
- **Bloquée par**: Story 2.3 (fiche client CRM), Story 8.1 (infrastructure Elio), Story 8.9a (Elio One+ actions)
- **Bloque**: Aucune
- **Référence**: Epic 11 (facturation Stripe/Pennylane — consommation flag pending_billing_update)

## Dev Agent Record

### Agent Model Used
claude-sonnet-4-6

### Debug Log References
- Tests `change-tier.test.ts` : clientId 'client-1' rejetté par Zod UUID → fix UUIDs réels dans les tests
- Tests `change-tier.test.ts` : `revalidatePath` lance exception en env test → mock `next/cache` ajouté
- `elio_tier` CHECK constraint PostgreSQL : NULL est valide même avec CHECK (NULL IN (...) = NULL, pas FALSE)
- `execute-action.ts` : fichier créé (non existant avant) — le tier check existe déjà dans `send-to-elio.ts` mais `execute-action.ts` expose `checkElioTierAccess` comme helper réutilisable et testable

### Completion Notes List
- Migration 00054 : ajout `subscription_tier`, `tier_changed_at`, `pending_billing_update`, `elio_proactive_alerts` à `client_configs`
- Types `subscription.types.ts` : `SubscriptionTier`, `ElioTierForSubscription`, `TierInfo`, `ChangeTierInput`
- `tier-helpers.ts` : `mapTierToElio()`, `isDowngradeFromOnePlus()`, `isUpgradeToOnePlus()`, `TIER_INFO` constant
- `change-tier.ts` : Server Action complète avec Zod validation, auth, operator check, client check, UPDATE client_configs, activity_log, revalidatePath
- `change-tier-dialog.tsx` : Dialog avec toggle buttons pour les 3 tiers, badge "(actuel)", warning downgrade, confirmations
- `client-info-tab.tsx` : section Abonnement conditionnelle (isOneClient), badges colorés par tier, date tier_changed_at, bouton "Modifier le tier"
- `execute-action.ts` : helper `checkElioTierAccess(clientId)` — vérifie elio_tier AVANT tout appel LLM
- `get-client.ts` : ajout fetch `subscription_tier` + `tier_changed_at` depuis client_configs
- `crm.types.ts` : ajout `subscriptionTier` + `tierChangedAt` dans `ClientConfig`
- Tests : 40 tests passing — 20 tier-helpers, 7 change-tier, 6 execute-action, 7 change-tier-dialog
- RLS test : `tests/rls/tier-rls.test.ts` (skipIf Supabase unavailable — nécessite instance locale)
- CR Fixes : (1) suppression type dead code `ChangeTierInput`, (2) extraction `TIER_BADGE_CLASSES` dans tier-helpers (DRY), (3) suppression `as any` + eslint-disable dans execute-action.ts, (4) reset selectedTier via useEffect au reopen dialog

### File List
- `supabase/migrations/00054_subscription_tier.sql` (créé)
- `packages/modules/crm/types/subscription.types.ts` (créé)
- `packages/modules/crm/utils/tier-helpers.ts` (créé)
- `packages/modules/crm/utils/tier-helpers.test.ts` (créé)
- `packages/modules/crm/actions/change-tier.ts` (créé)
- `packages/modules/crm/actions/change-tier.test.ts` (créé)
- `packages/modules/crm/components/change-tier-dialog.tsx` (créé)
- `packages/modules/crm/components/change-tier-dialog.test.tsx` (créé)
- `packages/modules/elio/actions/execute-action.ts` (créé)
- `packages/modules/elio/actions/execute-action.test.ts` (créé)
- `packages/modules/crm/components/client-info-tab.tsx` (modifié)
- `packages/modules/crm/actions/get-client.ts` (modifié)
- `packages/modules/crm/types/crm.types.ts` (modifié)
- `tests/rls/tier-rls.test.ts` (créé)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (modifié)
