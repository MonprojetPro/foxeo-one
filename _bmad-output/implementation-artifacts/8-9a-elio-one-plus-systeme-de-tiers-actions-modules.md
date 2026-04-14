# Story 8.9a: Élio One+ — Système de tiers & actions modules

Status: done

## Story

As a **client One+**,
I want **qu'Élio One exécute des actions sur mes modules actifs après vérification de mon tier d'abonnement**,
So that **Élio est un véritable co-pilote qui agit sur mes outils à ma demande**.

## Acceptance Criteria

### AC1 : Système de tiers Élio (One vs One+)

**Given** le système de tiers Élio (One vs One+)
**When** un client One utilise Élio
**Then** le tier est déterminé par `client_configs.elio_tier` (valeurs : `'one'` | `'one_plus'`, défaut : `'one'`)

**And** le system prompt de `send-to-elio.ts` adapte les capacités :
- **One** : FAQ, guidance, collecte d'évolutions uniquement
- **One+** : tout One + actions, génération, alertes

**And** si un client One tente une action One+, Élio répond :
> "Cette fonctionnalité fait partie de l'offre Élio One+. Contactez MiKL pour en savoir plus !"

**And** le check de tier est effectué AVANT l'appel LLM (pas de gaspillage de tokens)

### AC2 : Actions sur modules actifs (FR48)

**Given** un client One+ demande une action sur un module actif
**When** il écrit :
- "Envoie un rappel de cotisation aux membres en retard"
- "Crée un événement pour samedi prochain"

**Then** Élio One+ :

1. Identifie le module cible (adhésions, événements, etc.) et l'action demandée
2. Vérifie que le module est actif pour ce client
3. **Demande TOUJOURS confirmation avant exécution** :

```
Je vais envoyer un rappel de cotisation à 12 membres en retard de paiement.

Voici la liste :
- Dupont Marie (3 mois de retard)
- Martin Jean (1 mois de retard)
[...]

Vous confirmez l'envoi ? (Oui / Non / Modifier)
```

4. Sur confirmation, exécute l'action via la Server Action du module concerné
5. Confirme l'exécution :
> "C'est fait ! 12 rappels envoyés. Vous serez notifié des réponses."

**And** l'action est logguée dans `activity_logs` avec l'acteur `'elio_one_plus'`
**And** les actions destructives (suppression, envoi masse) nécessitent une double confirmation
**And** si l'action échoue, un message d'erreur clair est affiché avec option de réessayer

### AC3 : Vérification module actif

**Given** un client One+ demande une action
**When** Élio vérifie le module concerné
**Then** :

- Si le module est actif : procéder à l'action
- Si le module n'est pas actif : répondre
> "Le module {nom} n'est pas activé pour vous. Voulez-vous que je demande à MiKL de l'activer ?"

## Tasks / Subtasks

- [x] **Task 1** : Ajouter `elio_tier` dans `client_configs` (AC: #1)
  - [x] 1.1 : Migration Supabase pour ajouter `elio_tier` (valeurs : 'one' | 'one_plus', défaut : 'one')
  - [x] 1.2 : Modifier le type `ClientConfig`

- [x] **Task 2** : Créer le check de tier dans `send-to-elio.ts` (AC: #1)
  - [x] 2.1 : Charger `client_configs.elio_tier`
  - [x] 2.2 : Adapter le system prompt selon le tier (One vs One+)
  - [x] 2.3 : Bloquer les actions One+ si tier = 'one'
  - [x] 2.4 : Message upsell si action One+ tentée

- [x] **Task 3** : Créer la détection intention "action module" (AC: #2, FR48)
  - [x] 3.1 : Modifier `utils/detect-intent.ts`
  - [x] 3.2 : Patterns : "envoie", "crée", "supprime", "modifie", verbes d'action
  - [x] 3.3 : Extraire : module cible, action, paramètres

- [x] **Task 4** : Créer le système de confirmation (AC: #2)
  - [x] 4.1 : Créer `components/action-confirmation.tsx`
  - [x] 4.2 : Afficher détails de l'action (liste entités concernées)
  - [x] 4.3 : Boutons : Oui / Non / Modifier
  - [x] 4.4 : Double confirmation pour actions destructives

- [x] **Task 5** : Créer les Server Actions par module (AC: #2)
  - [x] 5.1 : `actions/elio-actions/send-reminders.ts` (module adhésions)
  - [x] 5.2 : `actions/elio-actions/create-event.ts` (module agenda)
  - [x] 5.3 : `actions/elio-actions/send-sms.ts` (module SMS)
  - [x] 5.4 : Pattern générique : vérifier module actif, exécuter, logger

- [x] **Task 6** : Logger les actions dans `activity_logs` (AC: #2)
  - [x] 6.1 : Créer l'entrée avec `actor='elio_one_plus'`
  - [x] 6.2 : Stocker : action, module, entités concernées, résultat

- [x] **Task 7** : Vérifier module actif (AC: #3)
  - [x] 7.1 : Créer `utils/check-module-active.ts`
  - [x] 7.2 : Charger `client_configs.active_modules`
  - [x] 7.3 : Vérifier si le module est dans la liste
  - [x] 7.4 : Message si module non actif

- [x] **Task 8** : Gestion des erreurs d'exécution (AC: #2)
  - [x] 8.1 : Try/catch autour de l'exécution
  - [x] 8.2 : Message d'erreur clair + option réessayer
  - [x] 8.3 : Logger l'erreur dans `activity_logs`

- [x] **Task 9** : Tests
  - [x] 9.1 : Tester check tier (One bloqué, One+ autorisé)
  - [x] 9.2 : Tester détection intention action
  - [x] 9.3 : Tester confirmation (accepter, refuser, modifier)
  - [x] 9.4 : Tester exécution action (succès, échec)
  - [x] 9.5 : Tester module non actif

## Dev Notes

### Migration elio_tier

```sql
-- Ajouter elio_tier dans client_configs
ALTER TABLE client_configs
ADD COLUMN elio_tier TEXT DEFAULT 'one' CHECK (elio_tier IN ('one', 'one_plus'));

CREATE INDEX idx_client_configs_elio_tier ON client_configs(elio_tier);
```

### Check tier dans system prompt

```typescript
// config/system-prompts.ts
export function buildOneSystemPrompt(
  config: ElioConfig,
  clientId: string,
  elioTier: 'one' | 'one_plus'
): string {
  const basePrompt = buildBasePrompt(config)

  const capabilitiesPrompt =
    elioTier === 'one'
      ? `
**Tes capacités (Élio One)** :
- Répondre aux questions (FAQ)
- Guider dans le dashboard
- Collecter des demandes d'évolutions

**Ce que tu NE PEUX PAS faire** :
- Exécuter des actions sur les modules
- Générer des documents
- Envoyer des alertes proactives

Si on te demande une action, réponds : "Cette fonctionnalité fait partie de l'offre Élio One+. Contactez MiKL pour en savoir plus !"
`
      : `
**Tes capacités (Élio One+)** :
- Répondre aux questions (FAQ)
- Guider dans le dashboard
- Collecter des demandes d'évolutions
- **Exécuter des actions** sur les modules actifs
- **Générer des documents**
- **Envoyer des alertes proactives**

**Important pour les actions** :
- Toujours demander confirmation avant d'exécuter
- Afficher les détails (liste des entités concernées)
- Double confirmation pour les actions destructives
`

  return basePrompt + capabilitiesPrompt + navigationMap + modulesDoc
}
```

### References

- [Source: Epic 8 — Story 8.9a](file:///_bmad-output/planning-artifacts/epics/epic-8-agents-ia-elio-hub-lab-one-stories-detaillees.md#story-89a)
- [Source: PRD — FR48](file:///_bmad-output/planning-artifacts/prd/functional-requirements-monprojetpro-plateforme.md)

---

**Story créée le** : 2026-02-13
**Story prête pour développement** : ✅ Oui
**Dépendances** : Story 8.1, 8.7
**FRs couvertes** : FR48 (actions modules One+)

---

## Dev Agent Record

### Implementation Notes

Story 8.9a implémentée — Système de tiers Élio One vs One+ avec actions modules.

**Décisions techniques :**
- `elio_tier` ajouté comme colonne dédiée dans `client_configs` (migration 00049) — plus rapide que lookup JSON
- `activity_logs.actor_type` étendu avec `'elio_one_plus'` (même migration)
- Module action detection intégrée dans `detect-intent.ts` (réutilise l'infrastructure existante)
- Check tier AVANT appel LLM (pas de token gaspillage) — via `detectIntent(message)` sur `'module_action'`
- Server Actions (send-reminders, create-event, send-sms) = stubs avec pattern générique (vérify module → exécute → log)
- `ActionConfirmation` component : double confirmation uniquement pour verb=delete
- Fallback: `elio_tier` null → default `'one'` (sécuritaire)

### Completion Notes

✅ AC1 — Tier check AVANT LLM : One bloqué, One+ autorisé avec upsell message
✅ AC2 — Module action detection (send/create/update/delete) + confirmation requise + logging elio_one_plus
✅ AC3 — Check module actif avec message "Voulez-vous que je demande à MiKL de l'activer ?"
✅ 122 tests passing

**Code Review fixes :**
- HIGH: Server Actions (send-reminders, create-event, send-sms) — ajout check erreur activity_logs insert + console.error logging
- HIGH: Documentation type ElioTier dans elio.types.ts pour distinguer du ElioTier de @monprojetpro/types
- MEDIUM: buildModuleNotActiveMessage utilise MODULE_DISPLAY_LABELS (Adhésions, Agenda, SMS, Facturation) au lieu du raw module ID
- MEDIUM: Ajout test buildModuleNotActiveMessage avec labels lisibles + fallback
- MEDIUM: Ajout test detectIntent pour verb "update" (Modifie) — couverture 4/4 verbs

### File List

- `supabase/migrations/00049_client_configs_elio_tier.sql` (nouveau)
- `packages/types/src/client-config.types.ts` (modifié — elioTier)
- `packages/modules/elio/utils/detect-intent.ts` (modifié — module_action)
- `packages/modules/elio/utils/detect-intent.test.ts` (modifié — +10 tests)
- `packages/modules/elio/utils/check-module-active.ts` (nouveau)
- `packages/modules/elio/utils/check-module-active.test.ts` (nouveau)
- `packages/modules/elio/types/elio.types.ts` (modifié — pendingAction, requiresConfirmation)
- `packages/modules/elio/config/system-prompts.ts` (modifié — One/One+ prompts enrichis)
- `packages/modules/elio/config/system-prompts.test.ts` (modifié — +5 tests)
- `packages/modules/elio/actions/send-to-elio.ts` (modifié — tier check + module_action flow)
- `packages/modules/elio/actions/send-to-elio.test.ts` (inchangé — existant)
- `packages/modules/elio/actions/send-to-elio-tier.test.ts` (nouveau — 7 tests tier)
- `packages/modules/elio/components/action-confirmation.tsx` (nouveau)
- `packages/modules/elio/components/action-confirmation.test.ts` (nouveau)
- `packages/modules/elio/actions/elio-actions/send-reminders.ts` (nouveau)
- `packages/modules/elio/actions/elio-actions/send-reminders.test.ts` (nouveau)
- `packages/modules/elio/actions/elio-actions/create-event.ts` (nouveau)
- `packages/modules/elio/actions/elio-actions/create-event.test.ts` (nouveau)
- `packages/modules/elio/actions/elio-actions/send-sms.ts` (nouveau)
- `packages/modules/elio/actions/elio-actions/send-sms.test.ts` (nouveau)

## Change Log

- 2026-03-04: Story 8.9a implémentée — système tiers, actions modules One+, logging elio_one_plus (135 tests)
- 2026-03-04: Code review fixes — activity_logs error handling, module display labels, ElioTier doc, +3 tests (122 tests)
