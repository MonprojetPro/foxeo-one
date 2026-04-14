# Story 13.4: Relances impayées intelligentes — Élio génère, MiKL valide, multicanal

Status: ready-for-dev

## Story

As a **MiKL (opérateur)**,
I want **qu'Élio détecte automatiquement les factures impayées, génère un brouillon de relance adapté au profil du client, et me permette de valider et envoyer en 1 clic**,
so that **je n'oublie jamais une relance, je garde le contrôle du ton, et le client reçoit un message adapté à sa sensibilité via le canal le plus approprié**.

## Acceptance Criteria

**Given** une facture reste impayée J+7, J+14, ou J+30 après émission
**When** la cron Edge Function `detect-overdue-invoices` s'exécute (1× par jour à 8h00)
**Then** :
- Pour chaque facture impayée au bon niveau (J+7 → niveau 1, J+14 → niveau 2, J+30 → niveau 3)
- Si pas déjà de relance `pending` ou `sent` à ce niveau pour cette facture → insert dans `collection_reminders` (status='pending')
- Appel Edge Function `elio-chat` avec contexte : numéro facture, montant, date, profil communication client (depuis `elio_configs.communication_profile`)
- Brouillon généré stocké dans `collection_reminders.generated_body`

**Given** une ou plusieurs relances sont en attente
**When** MiKL accède à l'onglet "Comptabilité" Hub
**Then** :
- Badge numérique rouge sur l'entrée nav "Comptabilité" (count des relances `status='pending'`)
- Section "Relances en attente" en haut de la page avec liste des relances

**Given** MiKL clique sur une relance en attente
**When** le modal s'ouvre (UI comme la maquette)
**Then** le modal affiche :
- **Destinataire** : email du client
- **Objet** : "Facture {numéro} — Rappel" (pré-rempli)
- **Corps** : brouillon généré par Élio (modifiable via `<textarea>`)
- **Badge** "Adapté au ton du client" (si `communication_profile` disponible)
- **Sélecteur canal** : Email / Chat MonprojetPro / Les deux
- **Boutons** : "Modifier" (focus textarea) / "Envoyer" / "Annuler"

**Given** MiKL clique "Envoyer" avec canal "Email"
**When** la Server Action s'exécute
**Then** :
- Email envoyé via Resend (template MonprojetPro, pas de template Pennylane)
- `collection_reminders.status` → 'sent', `sent_at` → now(), `channel` → 'email'
- Toast "Relance envoyée à {prénom client} ✓"
- Relance disparaît de la liste "En attente"

**Given** MiKL clique "Envoyer" avec canal "Chat MonprojetPro"
**When** la Server Action s'exécute
**Then** :
- Notification créée dans `notifications` pour le client One concerné (type 'message', body = brouillon)
- Élio One relaie le message au client dans son chat
- `collection_reminders.status` → 'sent', `channel` → 'chat'

**Given** MiKL clique "Envoyer" avec canal "Les deux"
**When** la Server Action s'exécute
**Then** : Email + notification chat envoyés, `channel` → 'both'

**Given** MiKL clique "Annuler" sur une relance
**When** confirmation
**Then** : `collection_reminders.status` → 'cancelled' — la relance disparaît de la liste

**Given** le journal des relances
**When** MiKL consulte la section "Historique des relances" (en bas de page)
**Then** : liste de toutes les relances envoyées/annulées (client, facture, niveau, canal, date)

## Tasks / Subtasks

- [ ] Créer la migration `00070_create_collection_reminders.sql`
  - [ ] Table `collection_reminders` :
    ```sql
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES clients(id),
    invoice_id TEXT NOT NULL,              -- ID Pennylane de la facture
    invoice_number TEXT NOT NULL,
    invoice_amount NUMERIC NOT NULL,
    invoice_date DATE NOT NULL,
    reminder_level INTEGER NOT NULL CHECK (reminder_level IN (1, 2, 3)),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'cancelled')),
    generated_body TEXT,                   -- brouillon Élio
    sent_at TIMESTAMPTZ,
    channel TEXT CHECK (channel IN ('email', 'chat', 'both')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
    ```
  - [ ] RLS : SELECT/INSERT/UPDATE `is_operator()`
  - [ ] Index sur `(status, created_at DESC)`
  - [ ] Trigger `updated_at` (`trg_collection_reminders_updated_at`)

- [ ] Créer l'Edge Function `detect-overdue-invoices`
  - [ ] `supabase/functions/detect-overdue-invoices/index.ts`
  - [ ] Schedule : cron `0 8 * * *` (8h00 UTC)
  - [ ] Logique :
    - Fetch `billing_sync WHERE entity_type='invoice' AND status='unpaid'`
    - Calculer jours écoulés depuis `billing_sync.data.invoice_date`
    - Pour J+7 → niveau 1, J+14 → niveau 2, J+30 → niveau 3 (fenêtres : J+7±2, J+14±2, J+30±2)
    - Vérifier pas de doublon dans `collection_reminders` à ce niveau pour cette facture
    - Fetch `elio_configs WHERE client_id = X` → extraire `communication_profile`
    - Appel Edge Function `elio-chat` pour générer le brouillon
    - Insert dans `collection_reminders`
  - [ ] `supabase/functions/detect-overdue-invoices/overdue-logic.ts` — logique extraite et testable

- [ ] Créer la Server Action `sendReminder`
  - [ ] `packages/modules/facturation/actions/send-reminder.ts`
  - [ ] Auth check : `is_operator()`
  - [ ] Validation : `reminderId` (UUID), `channel` ('email'|'chat'|'both'), `body` (string, modifié ou original)
  - [ ] Si `channel === 'email' || 'both'` → Resend (`sendReminderEmail()`)
  - [ ] Si `channel === 'chat' || 'both'` → insert dans `notifications` (type='message', recipient = client)
  - [ ] Update `collection_reminders` : status='sent', sent_at, channel, body (si modifié)
  - [ ] Retourner `{ data, error }` standard

- [ ] Créer la Server Action `cancelReminder`
  - [ ] `packages/modules/facturation/actions/cancel-reminder.ts`
  - [ ] Auth check : `is_operator()`
  - [ ] Update `collection_reminders.status` → 'cancelled'

- [ ] Créer le composant modal de relance
  - [ ] `packages/modules/facturation/components/reminder-modal.tsx`
  - [ ] Props : `reminder: CollectionReminder`, `clientEmail: string`, `onSend`, `onCancel`
  - [ ] Textarea modifiable pour le corps
  - [ ] Sélecteur canal (Radio buttons / Toggle)
  - [ ] Badge "Adapté au ton du client" (conditionnel sur `communication_profile`)
  - [ ] Boutons : Modifier / Envoyer / Annuler

- [ ] Créer le composant liste relances en attente
  - [ ] `packages/modules/facturation/components/pending-reminders.tsx`
  - [ ] Liste des `collection_reminders WHERE status='pending'` avec TanStack Query
  - [ ] Pour chaque item : client, facture, montant, niveau (J+7/J+14/J+30), bouton "Voir & Envoyer"
  - [ ] État vide : "Aucune relance en attente ✓"

- [ ] Créer le composant badge navigation
  - [ ] `packages/modules/facturation/hooks/use-pending-reminders-count.ts`
  - [ ] Hook TanStack Query : COUNT `collection_reminders WHERE status='pending'`
  - [ ] Utiliser dans le nav item "Comptabilité" → badge rouge

- [ ] Créer les tests
  - [ ] Test `overdue-logic.ts` : calcul niveaux J+7/J+14/J+30, fenêtres ±2j, pas de doublon (8 tests)
  - [ ] Test `send-reminder.ts` : auth, validation canal, envoi email, envoi chat, update DB (8 tests)
  - [ ] Test `reminder-modal.tsx` : rendu, modification corps, sélection canal, envoi (6 tests)
  - [ ] Test `pending-reminders.tsx` : état vide, liste, click (4 tests)

## Dev Notes

### Architecture Patterns

- **Génération Élio** : appel Edge Function `elio-chat` depuis `detect-overdue-invoices` avec prompt system spécifique relance. Stocker le brouillon dans `collection_reminders.generated_body` — pas de re-génération à l'ouverture du modal (coût token)
- **Profil communication** : disponible dans `elio_configs.communication_profile` (JSONB) — Epic 8.4. Si absent → Élio génère un brouillon neutre standard
- **Email de relance** : template Resend MonprojetPro (déjà configuré Story 11.4 pour les alertes paiement). Créer un nouveau template `reminder_email` avec header MonprojetPro, corps dynamique
- **Chat notification** : insert dans `notifications` table (type='message') → Élio One du client affiche le message dans le chat (pipeline déjà établi Epic 8.7/8.8)
- **Cron scheduling** : via `supabase/config.toml` cron section ou Supabase Dashboard → cron jobs

### Prompt Élio pour génération relance

```
Tu es l'assistant de MiKL (consultant MonprojetPro).
Génère un email de relance pour une facture impayée.

Contexte client :
- Prénom : {firstName}
- Profil communication : {communicationProfile}
- Niveau relance : {level} ({daysOverdue} jours de retard)

Facture :
- Numéro : {invoiceNumber}
- Montant : {amount}€
- Date émission : {invoiceDate}

Contraintes :
- Ton adapté au profil de communication du client
- Niveau 1 (J+7) : rappel doux, bienveillant
- Niveau 2 (J+14) : plus direct, professionnel
- Niveau 3 (J+30) : ferme mais respectueux
- Signé "MiKL"
- Maximum 5 phrases
- Pas de formule juridique
```

### Source Tree

```
supabase/
├── migrations/00070_create_collection_reminders.sql   # CRÉER
└── functions/detect-overdue-invoices/
    ├── index.ts                                        # CRÉER
    └── overdue-logic.ts                                # CRÉER (testable)

packages/modules/facturation/
├── actions/
│   ├── send-reminder.ts                               # CRÉER
│   ├── send-reminder.test.ts                          # CRÉER
│   ├── cancel-reminder.ts                             # CRÉER
│   └── cancel-reminder.test.ts                        # CRÉER
├── components/
│   ├── reminder-modal.tsx                             # CRÉER
│   ├── reminder-modal.test.tsx                        # CRÉER
│   ├── pending-reminders.tsx                          # CRÉER
│   └── pending-reminders.test.tsx                     # CRÉER
└── hooks/
    └── use-pending-reminders-count.ts                 # CRÉER

apps/hub/app/(dashboard)/modules/facturation/
└── page.tsx                                           # MODIFIER: ajouter PendingReminders + badge hook
```

### Existing Code Findings

- Edge Function `billing-sync` (Story 11.2) : pattern d'accès à `billing_sync` en Deno — réutiliser
- Edge Function `elio-chat` (Story 8.1) : `verify_jwt = false` dans config.toml — même config pour `detect-overdue-invoices`
- `elio_configs` table : contient `communication_profile` (JSONB) — query par `client_id`
- `notifications` table : schema confirmé (recipient_type, recipient_id, body) — Story 11.4
- Pattern `overdue-logic.ts` : déjà utilisé Story 11.4 — même architecture

### Leçons à appliquer (depuis lessons-learned)

- `notifications` schema : `recipient_type`/`recipient_id`/`body` (PAS `user_id`/`content`)
- Edge Function Deno : ne pas importer les modules workspace → logique self-contained
- Extraire la logique métier dans `*-logic.ts` côté Node/Vitest pour les tests
- `verify_jwt = false` pour les Edge Functions appelées sans JWT user (cron)

## Dev Agent Record

### Agent Model Used

_à remplir_

### Completion Notes List

_à remplir_

### File List

_à remplir_
