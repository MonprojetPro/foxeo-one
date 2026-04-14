# Story 3.7: Support client — Signalement de problèmes & aide en ligne

Status: done

## Story

As a **client MonprojetPro**,
I want **signaler un problème ou bug depuis l'interface et accéder à une aide en ligne / FAQ**,
So that **je peux obtenir de l'aide rapidement sans quitter la plateforme**.

## Acceptance Criteria

1. **AC1 — Migration DB** : Table `support_tickets` créée avec : id (UUID PK), client_id (FK clients NOT NULL), operator_id (FK operators NOT NULL), type (TEXT CHECK 'bug'/'question'/'suggestion' DEFAULT 'bug'), subject (TEXT NOT NULL), description (TEXT NOT NULL), screenshot_url (TEXT nullable), status (TEXT CHECK 'open'/'in_progress'/'resolved'/'closed' DEFAULT 'open'), created_at, updated_at. RLS : `support_tickets_select_owner`, `support_tickets_select_operator`, `support_tickets_insert_authenticated`.

2. **AC2 — Signalement client** : Bouton "Signaler un problème" accessible depuis menu utilisateur ou footer (FR109). Dialog : type (Bug/Question/Suggestion), sujet (obligatoire), description (obligatoire), capture d'écran (optionnel, upload Supabase Storage). react-hook-form + Zod.

3. **AC3 — Server Action createSupportTicket()** : Crée ticket dans `support_tickets`. Notification envoyée à MiKL (type: 'alert'). Toast "Votre signalement a été envoyé". Section "Mes signalements" pour le client avec statut.

4. **AC4 — Vue Hub (MiKL)** : Liste tickets dans le CRM ou onglet dédié (FR110). Colonnes : client, type, sujet, statut, date. Triables par statut (priorité 'open') et date. MiKL peut changer statut (open → in_progress → resolved → closed). Lien rapide vers Chat client.

5. **AC5 — FAQ / Aide** : Bouton "Aide" / "FAQ" dans menu utilisateur (FR111). Page FAQ structurée par catégories : Premiers pas, Mon parcours Lab, Mon espace One, Compte & sécurité, Contact MiKL. Barre de recherche filtrante. Contenu stocké en dur (JSON/composant, pas de CMS en V1). Liens "Contacter MiKL" et "Signaler un problème" en bas.

6. **AC6 — Tests** : Tests unitaires co-localisés. Tests RLS. Coverage >80%.

## Tasks / Subtasks

- [x] Task 1 — Migration Supabase (AC: #1)
  - [x] 1.1 Créer migration `00026_create_support_tickets.sql` (00025 déjà pris)
  - [x] 1.2 Table `support_tickets`
  - [x] 1.3 Index : `idx_support_tickets_client_id`, `idx_support_tickets_operator_id_status`
  - [x] 1.4 Trigger updated_at
  - [x] 1.5 RLS policies

- [x] Task 2 — Module Support scaffold (AC: #2)
  - [x] 2.1 Créer `packages/modules/support/manifest.ts` — id: `support`, targets: `['client-lab', 'client-one']`
  - [x] 2.2 `index.ts`, `package.json`, `tsconfig.json`
  - [x] 2.3 `types/support.types.ts` : SupportTicket, CreateTicketInput, TicketType, TicketStatus
  - [x] 2.4 `docs/guide.md`, `faq.md`, `flows.md`

- [x] Task 3 — Server Actions (AC: #3, #4)
  - [x] 3.1 `actions/create-support-ticket.ts` — Créer ticket + notification MiKL
  - [x] 3.2 `actions/get-support-tickets.ts` — Récupérer tickets (client: ses tickets, MiKL: tous)
  - [x] 3.3 `actions/update-ticket-status.ts` — MiKL change le statut
  - [x] 3.4 `actions/upload-screenshot.ts` — Upload image vers Supabase Storage bucket `screenshots`

- [x] Task 4 — Hooks TanStack Query (AC: #3)
  - [x] 4.1 `hooks/use-support-tickets.ts` — queryKey `['support-tickets', clientId]`
  - [x] 4.2 Mutation création avec invalidation

- [x] Task 5 — Composants UI signalement (AC: #2, #3)
  - [x] 5.1 `components/report-issue-dialog.tsx` — Dialog signalement (react-hook-form + Zod)
  - [x] 5.2 `components/screenshot-upload.tsx` — Composant upload image avec preview
  - [x] 5.3 `components/my-tickets-list.tsx` — Liste "Mes signalements" côté client
  - [x] 5.4 `components/ticket-status-badge.tsx` — Badge statut (open/in_progress/resolved/closed)

- [x] Task 6 — Composants UI aide/FAQ (AC: #5)
  - [x] 6.1 `components/faq-page.tsx` — Page FAQ avec catégories collapsibles
  - [x] 6.2 `components/faq-search.tsx` — Barre de recherche filtrant les questions
  - [x] 6.3 `data/faq-content.ts` — Contenu FAQ en JSON (catégories + questions + réponses)

- [x] Task 7 — Routes et intégration (AC: #2, #4, #5)
  - [x] 7.1 Client : `apps/client/app/(dashboard)/support/page.tsx` — Page "Mes signalements"
  - [x] 7.2 Client : `apps/client/app/(dashboard)/help/page.tsx` — Page FAQ
  - [x] 7.3 Hub : Vue tickets dans le module CRM (onglet "Support" via extraTabs pattern)
  - [x] 7.4 Bouton "Signaler" dans le menu utilisateur client (composant header)
  - [x] 7.5 Bouton "Aide" dans le menu utilisateur client

- [x] Task 8 — Tests (AC: #6)
  - [x] 8.1 Tests Server Actions : createTicket (7), getTickets (5), updateStatus (6)
  - [x] 8.2 Tests composants : TicketStatusBadge (4)
  - [x] 8.3 Tests Zod schemas : types validation (10)
  - [x] 8.4 Tests upload : mock Supabase Storage (7)
  - [x] 8.5 Tests FAQ : content validation (6)

- [x] Task 9 — Documentation (AC: #6)
  - [x] 9.1 `docs/guide.md`, `faq.md`, `flows.md` (done in Task 2)

## Dev Notes

### Architecture — Règles critiques

- **NOUVEAU MODULE** : `packages/modules/support/` — créer `manifest.ts` en premier.
- **Targets** : Module client uniquement (`client-lab`, `client-one`). MiKL voit les tickets depuis le CRM.
- **Upload** : Supabase Storage pour les screenshots. Bucket `screenshots` à créer.
- **Response format** : `{ data, error }` — JAMAIS throw.
- **Logging** : `[SUPPORT:CREATE_TICKET]`, `[SUPPORT:UPDATE_STATUS]`

### Base de données

**Migration `00025`** :
```sql
CREATE TABLE support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  operator_id UUID NOT NULL REFERENCES operators(id),
  type TEXT NOT NULL DEFAULT 'bug' CHECK (type IN ('bug', 'question', 'suggestion')),
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  screenshot_url TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_support_tickets_client_id ON support_tickets(client_id);
CREATE INDEX idx_support_tickets_operator_id_status ON support_tickets(operator_id, status);
```

### Upload screenshot — Supabase Storage

```typescript
// actions/upload-screenshot.ts
'use server'
export async function uploadScreenshot(formData: FormData): Promise<ActionResponse<string>> {
  const file = formData.get('screenshot') as File
  if (!file) return errorResponse('Aucun fichier', 'VALIDATION_ERROR')

  const supabase = await createServerSupabaseClient()
  const filename = `${crypto.randomUUID()}.${file.name.split('.').pop()}`

  const { data, error } = await supabase.storage
    .from('screenshots')
    .upload(filename, file, { contentType: file.type })

  if (error) return errorResponse('Échec upload', 'STORAGE_ERROR', error)

  const { data: { publicUrl } } = supabase.storage
    .from('screenshots')
    .getPublicUrl(data.path)

  return successResponse(publicUrl)
}
```

### FAQ content — Structure JSON

```typescript
// data/faq-content.ts
export const FAQ_CATEGORIES = [
  {
    id: 'getting-started',
    title: 'Premiers pas',
    icon: 'rocket',
    questions: [
      {
        q: 'Comment fonctionne mon espace MonprojetPro ?',
        a: 'Votre espace MonprojetPro est votre tableau de bord personnel...',
      },
      {
        q: "Qu'est-ce qu'Élio ?",
        a: "Élio est votre assistant IA personnel qui vous accompagne...",
      },
    ],
  },
  {
    id: 'lab-journey',
    title: 'Mon parcours Lab',
    questions: [/* ... */],
  },
  // ...
]
```

### Module manifest

```typescript
export const manifest: ModuleManifest = {
  id: 'support',
  name: 'Support',
  description: 'Signalement de problèmes et aide en ligne',
  version: '1.0.0',
  targets: ['client-lab', 'client-one'],
  navigation: { label: 'Support', icon: 'help-circle', position: 90 },
  routes: [
    { path: '/support', component: 'SupportPage' },
    { path: '/help', component: 'FaqPage' },
  ],
  requiredTables: ['support_tickets'],
  dependencies: []
}
```

### Notification vers MiKL

Quand un ticket est créé, insérer directement dans la table `notifications` (pas d'import module) :
```typescript
await supabase.from('notifications').insert({
  recipient_type: 'operator',
  recipient_id: operatorId,
  type: 'alert',
  title: `Nouveau signalement de ${clientName}`,
  body: `${ticketType}: ${subject}`,
  link: `/modules/crm/clients/${clientId}?tab=support`,
})
```

### Composants shadcn/ui

- `<Dialog>` pour signalement
- `<Select>` pour type (Bug/Question/Suggestion)
- `<Input>` pour sujet
- `<Textarea>` pour description
- `<Accordion>` pour catégories FAQ
- `<Input>` pour recherche FAQ
- `<Badge>` pour statut ticket
- `<DropdownMenu>` pour actions MiKL sur ticket

### Fichiers à créer

**Module support :**
```
packages/modules/support/
├── manifest.ts, index.ts, package.json, tsconfig.json
├── docs/guide.md, faq.md, flows.md
├── types/support.types.ts
├── actions/create-support-ticket.ts, get-support-tickets.ts, update-ticket-status.ts, upload-screenshot.ts
├── hooks/use-support-tickets.ts
├── components/report-issue-dialog.tsx, screenshot-upload.tsx, my-tickets-list.tsx, ticket-status-badge.tsx
├── components/faq-page.tsx, faq-search.tsx
└── data/faq-content.ts
```

**Routes :**
- `apps/client/app/(dashboard)/support/page.tsx`
- `apps/client/app/(dashboard)/help/page.tsx`

**Migration :**
- `supabase/migrations/00025_create_support_tickets.sql`

### Fichiers à modifier

- Menu utilisateur client (ajouter liens Signaler + Aide)
- Module CRM (vue tickets MiKL, optionnel: onglet fiche client)

### Dépendances

- **Story 3.2** : Table `notifications` pour notifier MiKL
- Table `clients`, `operators`
- Supabase Storage pour screenshots

### Anti-patterns — Interdit

- NE PAS utiliser un CMS pour la FAQ en V1 (JSON en dur suffit)
- NE PAS importer le module notifications directement (insert Supabase)
- NE PAS throw dans les Server Actions
- NE PAS stocker les screenshots localement (Supabase Storage)

### References

- [Source: _bmad-output/planning-artifacts/epics/epic-3-*.md#Story 3.7]
- [Source: docs/project-context.md]

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
