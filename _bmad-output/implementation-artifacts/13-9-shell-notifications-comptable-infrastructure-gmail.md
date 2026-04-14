# Story 13.5: Shell notifications comptable — infrastructure prête, parsing Gmail à configurer

Status: ready-for-dev

## Story

As a **MiKL (opérateur)**,
I want **voir dans l'onglet Comptabilité une section "Notifications comptable" prête à recevoir les demandes de mon comptable Pennylane**,
so that **quand je reçois un email de mon comptable signalant des justificatifs manquants, ces alertes apparaissent directement dans le Hub sans que j'aie à chercher dans ma boîte mail**.

## Acceptance Criteria

**Given** MiKL accède à l'onglet "Comptabilité" Hub
**When** aucune notification comptable n'a encore été configurée
**Then** la section "Notifications comptable" affiche :
- État vide illustré : "Aucune demande en attente de votre comptable ✓"
- Bouton "Configurer" → ouvre le panel de configuration

**Given** MiKL clique "Configurer"
**When** le panel s'ouvre
**Then** il voit :
- Champ "Email de votre comptable Pennylane" (ex: comptable@cabinet.fr)
- Toggle "Activer la synchronisation Gmail" (désactivé par défaut — `accountant_email_sync_enabled = false`)
- Message informatif : "Dès que vous recevez un email de votre comptable, nous pourrons l'afficher ici. Activez la synchro quand vous êtes prêt."
- Bouton "Sauvegarder"

**Given** MiKL a renseigné l'email comptable et activé la synchro
**When** une notification est insérée en base (via parsing Gmail ou manuellement)
**Then** :
- Badge numérique dans la section "Notifications comptable" (count unread)
- Liste des notifications : type (justificatif manquant / demande d'info), titre, date, statut (Non lu / Lu / Résolu)
- Click sur une notification → détail + bouton "Marquer comme résolu"

**Given** la section est activée
**When** la synchro Gmail est active et un email correspondant arrive
**Then** :
- L'email est parsé → une notification est créée dans `accountant_notifications`
- (Note : le parsing Gmail sera configuré avec MiKL après réception du premier vrai email)

**Given** MiKL clique "Marquer comme résolu"
**When** la Server Action s'exécute
**Then** : `accountant_notifications.status` → 'resolved', notification disparaît de la liste active

## Tasks / Subtasks

- [ ] Créer la migration `00071_create_accountant_notifications.sql`
  - [ ] Table `accountant_notifications` :
    ```sql
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT NOT NULL CHECK (type IN ('missing_receipt', 'info_request', 'other')),
    title TEXT NOT NULL,
    body TEXT,
    source_email TEXT,              -- email expéditeur (comptable)
    raw_email_id TEXT,              -- ID Gmail du message source
    status TEXT NOT NULL DEFAULT 'unread' CHECK (status IN ('unread', 'read', 'resolved')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
    ```
  - [ ] RLS : SELECT/INSERT/UPDATE `is_operator()`
  - [ ] Index sur `(status, created_at DESC)`
  - [ ] Trigger `updated_at` (`trg_accountant_notifications_updated_at`)
  - [ ] Insert dans `system_config` : `accountant_email` (TEXT, vide), `accountant_email_sync_enabled` (BOOLEAN, false)

- [ ] Créer la Server Action `updateAccountantConfig`
  - [ ] `packages/modules/facturation/actions/update-accountant-config.ts`
  - [ ] Auth check : `is_operator()`
  - [ ] Upsert `system_config` : `accountant_email`, `accountant_email_sync_enabled`
  - [ ] Retourner `{ data, error }`

- [ ] Créer la Server Action `resolveAccountantNotification`
  - [ ] `packages/modules/facturation/actions/resolve-accountant-notification.ts`
  - [ ] Auth check : `is_operator()`
  - [ ] Update `accountant_notifications.status` → 'resolved'

- [ ] Créer l'infrastructure Gmail parsing (INACTIVE par défaut)
  - [ ] `supabase/functions/sync-accountant-emails/index.ts`
  - [ ] Vérifier en entrée : `system_config.accountant_email_sync_enabled === true`, sinon exit early
  - [ ] Si activée : lire `system_config.accountant_email` (adresse comptable)
  - [ ] Appel Gmail API `GET /gmail/v1/users/me/messages?q=from:{accountant_email}+is:unread`
  - [ ] Pour chaque email : `parseAccountantEmail(emailBody)` → extraire type + titre
  - [ ] Insert dans `accountant_notifications` si pas déjà traité (`raw_email_id` non dupliqué)
  - [ ] Marquer email comme lu via Gmail API
  - [ ] **DÉSACTIVÉ** : pas de cron configuré — sera activé quand MiKL fournit un vrai email de référence

- [ ] Créer la fonction `parseAccountantEmail` (stub)
  - [ ] `supabase/functions/sync-accountant-emails/email-parser.ts`
  - [ ] Stub actuel : retourne `{ type: 'other', title: subject, body: snippet }`
  - [ ] Commentaire : "À configurer avec patterns réels après réception du premier email Pennylane comptable"

- [ ] Créer les composants Hub
  - [ ] `packages/modules/facturation/components/accountant-notifications.tsx`
    - Liste des notifications non résolues (TanStack Query)
    - État vide "Aucune demande en attente ✓"
    - Badge count non lus
  - [ ] `packages/modules/facturation/components/accountant-config-panel.tsx`
    - Champ email comptable
    - Toggle synchro Gmail
    - Message informatif
    - Bouton Sauvegarder

- [ ] Créer les tests
  - [ ] Test `update-accountant-config.ts` : auth, upsert system_config (4 tests)
  - [ ] Test `resolve-accountant-notification.ts` : auth, update status (3 tests)
  - [ ] Test `accountant-notifications.tsx` : état vide, liste, badge count (5 tests)
  - [ ] Test `email-parser.ts` : stub retourne structure attendue (2 tests)

## Dev Notes

### Architecture Patterns

- **Infrastructure first** : toute la structure est créée et testée, mais la synchro Gmail est **désactivée** (`accountant_email_sync_enabled = false`). MiKL active manuellement depuis le Hub quand il est prêt
- **Gmail API** : utiliser les mêmes credentials OAuth Google que Story 13.3 (Google Workspace). Scope additionnel requis : `https://www.googleapis.com/auth/gmail.readonly` + `gmail.modify` (pour marquer lu)
- **`raw_email_id` dédoublonnage** : clé Gmail de l'email → garantit qu'on n'insère jamais le même email deux fois
- **Parsing progressif** : le stub `parseAccountantEmail` sera enrichi avec les vrais patterns regex quand MiKL partage un exemple d'email Pennylane comptable (sujet, corps, structure)

### Extension future (après activation)

Quand MiKL fournit un exemple d'email comptable Pennylane, enrichir `email-parser.ts` avec :
```typescript
// Patterns probables à identifier (à confirmer)
const MISSING_RECEIPT_PATTERNS = [
  /justificatif manquant/i,
  /pièce justificative/i,
  /document absent/i,
]
// → type: 'missing_receipt', extraire montant + date depuis le corps
```

### Cron (à activer manuellement plus tard)

```toml
# supabase/config.toml — à décommenter quand prêt
# [functions.sync-accountant-emails]
# cron = "0 9 * * *"   # 9h00 UTC chaque jour
```

### Source Tree

```
supabase/
├── migrations/00071_create_accountant_notifications.sql   # CRÉER
└── functions/sync-accountant-emails/
    ├── index.ts                                            # CRÉER (désactivé)
    └── email-parser.ts                                     # CRÉER (stub)

packages/modules/facturation/
├── actions/
│   ├── update-accountant-config.ts                        # CRÉER
│   ├── update-accountant-config.test.ts                   # CRÉER
│   ├── resolve-accountant-notification.ts                 # CRÉER
│   └── resolve-accountant-notification.test.ts            # CRÉER
└── components/
    ├── accountant-notifications.tsx                        # CRÉER
    ├── accountant-notifications.test.tsx                   # CRÉER
    ├── accountant-config-panel.tsx                         # CRÉER
    └── accountant-config-panel.test.tsx                    # CRÉER

apps/hub/app/(dashboard)/modules/facturation/
└── page.tsx                                                # MODIFIER: ajouter AccountantNotifications
```

### Existing Code Findings

- `system_config` : upsert pattern établi (Stories 12.1, 13.3)
- Gmail API credentials : réutiliser ceux de Story 13.3 (Google Workspace, même OAuth app)
- `notifications` table schema : référence pour structure (ne pas confondre avec `accountant_notifications` — deux tables distinctes)

## Dev Agent Record

### Agent Model Used

_à remplir_

### Completion Notes List

_à remplir_

### File List

_à remplir_
