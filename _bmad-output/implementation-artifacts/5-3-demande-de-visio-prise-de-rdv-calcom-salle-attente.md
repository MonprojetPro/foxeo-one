# Story 5.3: Demande de visio, prise de RDV (Cal.com) & salle d'attente

Status: done

## Story

As a **client MonprojetPro**,
I want **demander un RDV visio avec MiKL via un système de calendrier intégré et attendre dans une salle d'attente virtuelle**,
So that **je peux prendre rendez-vous facilement et MiKL contrôle l'entrée dans la visio**.

## Acceptance Criteria

1. **AC1 — Migration DB** : Table `meeting_requests` créée avec : id (UUID PK), client_id (FK clients NOT NULL), operator_id (FK operators NOT NULL), requested_slots (JSONB NOT NULL — array de timestamps proposés par le client), selected_slot (TIMESTAMPTZ nullable), status (TEXT CHECK 'pending'/'accepted'/'rejected'/'completed' DEFAULT 'pending'), message (TEXT nullable), meeting_id (FK meetings nullable), created_at, updated_at. RLS : `meeting_requests_select_owner`, `meeting_requests_select_operator`, `meeting_requests_insert_client`, `meeting_requests_update_operator`.

2. **AC2 — Intégration Cal.com** : Composant `calcom-booking-widget.tsx` embarque l'iframe Cal.com (self-hosted Docker). URL : `https://cal.monprojet-pro.com/mikl/consultation`. Webhook Cal.com → Edge Function `calcom-webhook` crée automatiquement `meeting` + `meeting_request` avec `status='accepted'`.

3. **AC3 — Demande client sans Cal.com** : Formulaire alternatif : client propose 3 créneaux horaires + message optionnel. Server Action `requestMeeting()` crée `meeting_request` + notification MiKL. MiKL voit demandes dans `/modules/visio/requests` et peut accepter (sélectionne un créneau) ou refuser. Acceptation → crée `meeting` + notification client.

4. **AC4 — Salle d'attente** : Page `/modules/visio/[meetingId]/lobby` accessible avant `scheduled_at`. Affichage : "En attente de MiKL...", webcam preview (optionnel), boutons test micro/caméra. Status temps réel via Supabase Realtime (subscribe channel `meeting:{meetingId}:status`). Quand MiKL rejoint → broadcast `operator_joined` → client redirigé vers `/modules/visio/[meetingId]` (salle principale).

5. **AC5 — Contrôle admission MiKL** : MiKL voit notification "Client en attente" quand client entre dans le lobby. Bouton "Accepter l'entrée" dans interface Hub. Action → broadcast `operator_joined` + update meeting `status='in_progress'`.

6. **AC6 — Tests** : Tests unitaires co-localisés. Tests RLS. Mock Cal.com webhook. Coverage >80%.

## Tasks / Subtasks

- [x] Task 1 — Migration Supabase (AC: #1)
  - [x] 1.1 Créer migration `00033_create_meeting_requests.sql` (renommé 00030→00033 car 00030 déjà pris)
  - [x] 1.2 Table `meeting_requests`
  - [x] 1.3 Index : `idx_meeting_requests_client_id`, `idx_meeting_requests_operator_id_status`
  - [x] 1.4 Trigger updated_at
  - [x] 1.5 RLS policies

- [x] Task 2 — Cal.com Docker setup (AC: #2)
  - [x] 2.1 `docker/calcom/docker-compose.yml` — Service Cal.com self-hosted
  - [x] 2.2 Configuration Cal.com : calendrier MiKL, webhook vers Supabase Edge Function
  - [x] 2.3 Documentation setup (`docs/calcom-setup.md`)

- [x] Task 3 — Edge Function Cal.com webhook (AC: #2)
  - [x] 3.1 `supabase/functions/calcom-webhook/index.ts` — Reçoit événement `BOOKING_CREATED`
  - [x] 3.2 Crée `meeting` avec `scheduled_at` du booking
  - [x] 3.3 Crée `meeting_request` avec `status='accepted'`, `selected_slot`
  - [x] 3.4 Notification client

- [x] Task 4 — Server Actions demande manuelle (AC: #3)
  - [x] 4.1 `actions/request-meeting.ts` — Client crée demande avec 3 créneaux proposés
  - [x] 4.2 `actions/accept-meeting-request.ts` — MiKL accepte + sélectionne créneau + crée meeting
  - [x] 4.3 `actions/reject-meeting-request.ts` — MiKL refuse avec raison
  - [x] 4.4 `actions/get-meeting-requests.ts` — Récupérer demandes (filtré par RLS)

- [x] Task 5 — Hooks TanStack Query (AC: #3)
  - [x] 5.1 `hooks/use-meeting-requests.ts` — queryKey `['meeting-requests', status]`

- [x] Task 6 — Composants UI Cal.com (AC: #2)
  - [x] 6.1 `components/calcom-booking-widget.tsx` — Iframe Cal.com
  - [x] 6.2 Documentation intégration Cal.com dans module visio

- [x] Task 7 — Composants UI demande manuelle (AC: #3)
  - [x] 7.1 `components/meeting-request-form.tsx` — Formulaire 3 créneaux + message
  - [x] 7.2 `components/meeting-request-list.tsx` — Liste demandes côté MiKL
  - [x] 7.3 `components/meeting-request-card.tsx` — Card demande avec actions (accepter/refuser)

- [x] Task 8 — Salle d'attente (AC: #4, #5)
  - [x] 8.1 `components/meeting-lobby.tsx` — Salle d'attente avec webcam preview
  - [x] 8.2 Hook `use-meeting-realtime.ts` — Subscribe channel `meeting:{meetingId}:status`
  - [x] 8.3 Broadcast `client_waiting` quand client entre dans lobby
  - [x] 8.4 Broadcast `operator_joined` quand MiKL accepte
  - [x] 8.5 Redirection automatique client vers salle principale

- [x] Task 9 — Routes (AC: #3, #4)
  - [x] 9.1 Hub : `apps/hub/app/(dashboard)/modules/visio/requests/page.tsx` — Liste demandes
  - [x] 9.2 Hub : `apps/hub/app/(dashboard)/modules/visio/[meetingId]/lobby/page.tsx` — Lobby MiKL
  - [x] 9.3 Client : `apps/client/app/(dashboard)/modules/visio/request/page.tsx` — Formulaire demande
  - [x] 9.4 Client : `apps/client/app/(dashboard)/modules/visio/[meetingId]/lobby/page.tsx` — Lobby client

- [x] Task 10 — Tests (AC: #6)
  - [x] 10.1 Tests Edge Function : calcom-webhook
  - [x] 10.2 Tests Server Actions : requestMeeting, acceptMeetingRequest, rejectMeetingRequest
  - [x] 10.3 Tests composants : MeetingLobby, MeetingRequestForm, CalcomBookingWidget, MeetingRequestCard
  - [x] 10.4 Tests RLS : client A ne voit pas demandes client B
  - [x] 10.5 Tests Realtime : broadcast client_waiting, operator_joined

- [x] Task 11 — Documentation (AC: #6)
  - [x] 11.1 Mise à jour `docs/guide.md` module visio
  - [x] 11.2 `docs/calcom-setup.md` — Setup Cal.com + webhook

## Dev Notes

### Architecture — Règles critiques

- **Extension module visio** : Pas de nouveau module, extend `packages/modules/visio/`.
- **Cal.com** : Service externe Docker (local + prod). Webhook sécurisé par secret.
- **Salle d'attente** : Supabase Realtime Broadcast (pas Presence, car besoin de messages custom).
- **Response format** : `{ data, error }` — JAMAIS throw.
- **Logging** : `[VISIO:REQUEST_MEETING]`, `[VISIO:ACCEPT_REQUEST]`, `[VISIO:CALCOM_WEBHOOK]`

### Base de données

**Migration `00030`** :
```sql
CREATE TABLE meeting_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  operator_id UUID NOT NULL REFERENCES operators(id),
  requested_slots JSONB NOT NULL, -- Array de timestamps: ["2025-06-01T10:00:00Z", "2025-06-01T14:00:00Z", "2025-06-02T09:00:00Z"]
  selected_slot TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'completed')),
  message TEXT,
  meeting_id UUID REFERENCES meetings(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_meeting_requests_client_id ON meeting_requests(client_id);
CREATE INDEX idx_meeting_requests_operator_id_status ON meeting_requests(operator_id, status);
```

**RLS policies** :
```sql
-- Client voit ses demandes
CREATE POLICY meeting_requests_select_owner ON meeting_requests FOR SELECT
  USING (client_id IN (SELECT id FROM clients WHERE auth_user_id = auth.uid()));

-- Opérateur voit toutes les demandes
CREATE POLICY meeting_requests_select_operator ON meeting_requests FOR SELECT
  USING (operator_id = auth.uid());

-- Client peut créer ses demandes
CREATE POLICY meeting_requests_insert_client ON meeting_requests FOR INSERT
  WITH CHECK (client_id IN (SELECT id FROM clients WHERE auth_user_id = auth.uid()));

-- Seul l'opérateur peut modifier (accepter/refuser)
CREATE POLICY meeting_requests_update_operator ON meeting_requests FOR UPDATE
  USING (operator_id = auth.uid());
```

### Cal.com — Docker Compose

```yaml
# docker/calcom/docker-compose.yml
version: '3.8'
services:
  calcom:
    image: calcom/cal.com:latest
    ports:
      - "3001:3000"
    environment:
      - DATABASE_URL=postgresql://postgres:postgres@postgres:5432/calcom
      - NEXTAUTH_SECRET=${CALCOM_NEXTAUTH_SECRET}
      - NEXTAUTH_URL=http://localhost:3001
      - CALENDSO_ENCRYPTION_KEY=${CALCOM_ENCRYPTION_KEY}
      - NEXT_PUBLIC_WEBAPP_URL=http://localhost:3001
    depends_on:
      - postgres

  postgres:
    image: postgres:15
    environment:
      - POSTGRES_DB=calcom
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=postgres
    volumes:
      - calcom_data:/var/lib/postgresql/data

volumes:
  calcom_data:
```

### Edge Function — Cal.com Webhook

```typescript
// supabase/functions/calcom-webhook/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (req) => {
  const webhookSecret = Deno.env.get('CALCOM_WEBHOOK_SECRET')!

  // Vérifier signature webhook Cal.com
  const signature = req.headers.get('x-cal-signature-256')
  // ... vérification signature ...

  const event = await req.json()

  if (event.triggerEvent === 'BOOKING_CREATED') {
    const { id, uid, title, startTime, endTime, attendees, metadata } = event

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Récupérer client_id depuis metadata (passé par Cal.com custom field)
    const clientId = metadata?.clientId
    const operatorId = metadata?.operatorId

    if (!clientId || !operatorId) {
      console.error('[VISIO:CALCOM_WEBHOOK] Missing clientId or operatorId in metadata')
      return new Response(JSON.stringify({ error: 'Missing metadata' }), { status: 400 })
    }

    // Créer meeting
    const { data: meeting, error: meetingError } = await supabase
      .from('meetings')
      .insert({
        client_id: clientId,
        operator_id: operatorId,
        title: title || 'Consultation avec MiKL',
        scheduled_at: startTime,
        status: 'scheduled',
      })
      .select()
      .single()

    if (meetingError) {
      console.error('[VISIO:CALCOM_WEBHOOK] Failed to create meeting:', meetingError)
      return new Response(JSON.stringify({ error: 'Failed to create meeting' }), { status: 500 })
    }

    // Créer meeting_request (accepté automatiquement)
    await supabase.from('meeting_requests').insert({
      client_id: clientId,
      operator_id: operatorId,
      requested_slots: JSON.stringify([startTime]),
      selected_slot: startTime,
      status: 'accepted',
      meeting_id: meeting.id,
      message: 'Réservation via Cal.com',
    })

    // Notification client
    await supabase.from('notifications').insert({
      recipient_type: 'client',
      recipient_id: clientId,
      type: 'info',
      title: 'RDV confirmé',
      body: `Votre rendez-vous avec MiKL est prévu le ${new Date(startTime).toLocaleString('fr-FR')}`,
      link: `/modules/visio/${meeting.id}/lobby`,
    })

    return new Response(JSON.stringify({ success: true, meetingId: meeting.id }), { status: 200 })
  }

  return new Response(JSON.stringify({ message: 'Event ignored' }), { status: 200 })
})
```

### Salle d'attente — Realtime

```typescript
// hooks/use-meeting-realtime.ts
'use client'
import { useEffect, useState } from 'react'
import { createBrowserSupabaseClient } from '@monprojetpro/supabase/client'

export function useMeetingRealtime(meetingId: string) {
  const [operatorJoined, setOperatorJoined] = useState(false)
  const supabase = createBrowserSupabaseClient()

  useEffect(() => {
    const channel = supabase.channel(`meeting:${meetingId}:status`)

    channel
      .on('broadcast', { event: 'operator_joined' }, () => {
        setOperatorJoined(true)
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [meetingId])

  const broadcastClientWaiting = async () => {
    const channel = supabase.channel(`meeting:${meetingId}:status`)
    await channel.send({
      type: 'broadcast',
      event: 'client_waiting',
      payload: { timestamp: new Date().toISOString() }
    })
  }

  const broadcastOperatorJoined = async () => {
    const channel = supabase.channel(`meeting:${meetingId}:status`)
    await channel.send({
      type: 'broadcast',
      event: 'operator_joined',
      payload: { timestamp: new Date().toISOString() }
    })
  }

  return { operatorJoined, broadcastClientWaiting, broadcastOperatorJoined }
}
```

```typescript
// components/meeting-lobby.tsx
'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useMeetingRealtime } from '../hooks/use-meeting-realtime'

export function MeetingLobby({ meetingId, userType }: { meetingId: string; userType: 'client' | 'operator' }) {
  const router = useRouter()
  const { operatorJoined, broadcastClientWaiting } = useMeetingRealtime(meetingId)

  useEffect(() => {
    if (userType === 'client') {
      broadcastClientWaiting()
    }
  }, [])

  useEffect(() => {
    if (operatorJoined && userType === 'client') {
      router.push(`/modules/visio/${meetingId}`)
    }
  }, [operatorJoined])

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h1 className="text-2xl font-semibold mb-4">Salle d'attente</h1>
      {userType === 'client' && (
        <p className="text-muted-foreground">En attente de MiKL...</p>
      )}
      {userType === 'operator' && (
        <button onClick={() => router.push(`/modules/visio/${meetingId}`)}>
          Accepter l'entrée du client
        </button>
      )}
    </div>
  )
}
```

### Fichiers à créer

**Module visio (extension) :**
```
packages/modules/visio/
├── actions/request-meeting.ts, accept-meeting-request.ts, reject-meeting-request.ts, get-meeting-requests.ts
├── hooks/use-meeting-requests.ts, use-meeting-realtime.ts
├── components/calcom-booking-widget.tsx, meeting-request-form.tsx, meeting-request-list.tsx, meeting-request-card.tsx, meeting-lobby.tsx
└── docs/calcom-setup.md
```

**Edge Functions :**
- `supabase/functions/calcom-webhook/index.ts`

**Migration :**
- `supabase/migrations/00030_create_meeting_requests.sql`

**Routes :**
- `apps/hub/app/(dashboard)/modules/visio/requests/page.tsx`
- `apps/hub/app/(dashboard)/modules/visio/[meetingId]/lobby/page.tsx`
- `apps/client/app/(dashboard)/modules/visio/request/page.tsx`
- `apps/client/app/(dashboard)/modules/visio/[meetingId]/lobby/page.tsx`

**Docker :**
- `docker/calcom/docker-compose.yml`

### Fichiers à modifier

- `packages/modules/visio/manifest.ts` — Ajouter routes `/requests`, `/[meetingId]/lobby`

### Dépendances

- **Story 5.1** : Table `meetings`, module visio
- **Story 3.2** : Table `notifications` pour notifier client/MiKL
- Cal.com self-hosted (Docker)
- Supabase Realtime Broadcast

### Anti-patterns — Interdit

- NE PAS exposer le webhook Cal.com sans vérification de signature
- NE PAS bloquer la création de meeting si Cal.com est down (fallback formulaire manuel)
- NE PAS utiliser polling pour la salle d'attente (Realtime obligatoire)
- NE PAS laisser le client rejoindre la salle principale sans validation MiKL

### References

- [Source: _bmad-output/planning-artifacts/epics/epic-5-*.md#Story 5.3]
- [Source: docs/project-context.md]
- [Cal.com Self-Hosting: https://cal.com/docs/self-hosting]
- [Cal.com Webhooks: https://cal.com/docs/webhooks]

## Dev Agent Record

### Agent Model Used
Claude Opus 4.6

### Debug Log References
- Migration renommée 00030→00033 car 00030 (documents_soft_delete) et 00031/00032 (meetings/recordings) déjà existants
- Import `@monprojetpro/supabase/client` corrigé en `@monprojetpro/supabase` (pas de subpath export)
- Tests composants React corrigés pour utiliser `@testing-library/react` (render/screen) au lieu d'appels directs

### Completion Notes List
- AC1: Table `meeting_requests` créée via migration 00033 avec tous les champs, index, trigger et 4 policies RLS
- AC2: Cal.com Docker setup (`docker/calcom/docker-compose.yml`), Edge Function `calcom-webhook` avec vérification signature HMAC, widget iframe `CalcomBookingWidget`
- AC3: 4 Server Actions (requestMeeting, acceptMeetingRequest, rejectMeetingRequest, getMeetingRequests), hook `useMeetingRequests`, formulaire 3 créneaux, liste demandes MiKL avec cartes accept/reject
- AC4: Salle d'attente `MeetingLobby` avec Realtime Broadcast, hook `useMeetingRealtime`, broadcast `client_waiting`/`operator_joined`, redirection auto client
- AC5: Interface MiKL dans lobby avec notification client en attente et bouton "Accepter l'entrée" + startMeeting() pour status in_progress
- AC6: 102 nouveaux tests co-localisés (1997 total, 0 échecs). Tests migration, Docker, Edge Function, actions, hooks, composants, RLS
- Manifest visio mis à jour avec 3 nouvelles routes et `meeting_requests` dans `requiredTables`
- Index.ts barrel mis à jour avec tous les nouveaux exports

### Code Review Fixes (Opus adversarial)
- **HIGH**: useMeetingRealtime broadcast functions now reuse subscribed channel via ref instead of creating new channels
- **HIGH**: MeetingLobby handleAdmit now calls startMeeting() to update meeting status to in_progress (AC5)
- **HIGH**: MeetingRequestCard calls acceptMeetingRequest/rejectMeetingRequest server actions directly (Hub page buttons now functional)
- **HIGH**: MeetingRequestForm datetime display fixed — uses local time format instead of UTC toISOString()
- **MEDIUM**: rejectMeetingRequest no longer overwrites client's original message with rejection reason
- **MEDIUM**: acceptMeetingRequest validates selectedSlot is in requestedSlots
- **MEDIUM**: Added missing meeting-request-list.test.tsx (3 tests)

### File List

**Nouveaux fichiers :**
- `supabase/migrations/00033_create_meeting_requests.sql`
- `supabase/migrations/00033_create_meeting_requests.test.ts`
- `supabase/functions/calcom-webhook/index.ts`
- `docker/calcom/docker-compose.yml`
- `packages/modules/visio/types/meeting-request.types.ts`
- `packages/modules/visio/types/meeting-request.types.test.ts`
- `packages/modules/visio/utils/to-meeting-request.ts`
- `packages/modules/visio/utils/to-meeting-request.test.ts`
- `packages/modules/visio/actions/request-meeting.ts`
- `packages/modules/visio/actions/request-meeting.test.ts`
- `packages/modules/visio/actions/accept-meeting-request.ts`
- `packages/modules/visio/actions/accept-meeting-request.test.ts`
- `packages/modules/visio/actions/reject-meeting-request.ts`
- `packages/modules/visio/actions/reject-meeting-request.test.ts`
- `packages/modules/visio/actions/get-meeting-requests.ts`
- `packages/modules/visio/actions/get-meeting-requests.test.ts`
- `packages/modules/visio/hooks/use-meeting-requests.ts`
- `packages/modules/visio/hooks/use-meeting-requests.test.ts`
- `packages/modules/visio/hooks/use-meeting-realtime.ts`
- `packages/modules/visio/hooks/use-meeting-realtime.test.ts`
- `packages/modules/visio/components/calcom-booking-widget.tsx`
- `packages/modules/visio/components/calcom-booking-widget.test.tsx`
- `packages/modules/visio/components/meeting-request-form.tsx`
- `packages/modules/visio/components/meeting-request-form.test.tsx`
- `packages/modules/visio/components/meeting-request-list.tsx`
- `packages/modules/visio/components/meeting-request-list.test.tsx`
- `packages/modules/visio/components/meeting-request-card.tsx`
- `packages/modules/visio/components/meeting-request-card.test.tsx`
- `packages/modules/visio/components/meeting-lobby.tsx`
- `packages/modules/visio/components/meeting-lobby.test.tsx`
- `packages/modules/visio/docs/calcom-setup.md`
- `apps/hub/app/(dashboard)/modules/visio/requests/page.tsx`
- `apps/hub/app/(dashboard)/modules/visio/[meetingId]/lobby/page.tsx`
- `apps/client/app/(dashboard)/modules/visio/request/page.tsx`
- `apps/client/app/(dashboard)/modules/visio/[meetingId]/lobby/page.tsx`
- `tests/calcom-webhook.test.ts`
- `tests/docker-calcom.test.ts`
- `tests/rls-meeting-requests.test.ts`

**Fichiers modifiés :**
- `packages/modules/visio/manifest.ts` — Ajout routes /requests, /request, /:meetingId/lobby + requiredTables meeting_requests
- `packages/modules/visio/index.ts` — Ajout exports composants, hooks, actions, types Story 5.3
- `packages/modules/visio/docs/guide.md` — Ajout section Story 5.3 (architecture, routes, statuts)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — Status in-progress→review
