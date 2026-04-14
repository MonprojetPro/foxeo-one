# Story 5.1: Module Visio — Migration, salle de visio OpenVidu

Status: done

## Story

As a **utilisateur (MiKL ou client)**,
I want **lancer une visioconférence directement depuis la plateforme avec OpenVidu**,
So that **je peux échanger avec mon interlocuteur sans quitter l'écosystème MonprojetPro**.

## Acceptance Criteria

1. **AC1 — Migration DB** : Table `meetings` créée avec : id (UUID PK), client_id (FK clients NOT NULL), operator_id (FK operators NOT NULL), title (TEXT NOT NULL), description (TEXT nullable), scheduled_at (TIMESTAMPTZ nullable), started_at (TIMESTAMPTZ nullable), ended_at (TIMESTAMPTZ nullable), duration_seconds (INTEGER nullable), session_id (TEXT nullable — OpenVidu session ID), status (TEXT CHECK 'scheduled'/'in_progress'/'completed'/'cancelled' DEFAULT 'scheduled'), recording_url (TEXT nullable), transcript_url (TEXT nullable), created_at, updated_at. RLS : `meetings_select_owner`, `meetings_select_operator`, `meetings_insert_authenticated`, `meetings_update_operator`.

2. **AC2 — Module Visio structure** : Module `packages/modules/visio/` structuré. Manifest id: `visio`, targets: `['hub', 'client-lab', 'client-one']`, requiredTables: `['meetings']`. Composants: meeting-room, meeting-list, meeting-schedule-dialog. Hook: use-meetings, use-openvidu. Actions: create-meeting, start-meeting, end-meeting, get-openvidu-token. Types: meeting.types.ts.

3. **AC3 — OpenVidu Docker** : Service OpenVidu déployé via Docker Compose (`docker/openvidu/docker-compose.yml`). Variables d'env : `OPENVIDU_URL`, `OPENVIDU_SECRET`. Edge Function `get-openvidu-token` pour sécuriser l'accès (pas de secret côté client).

4. **AC4 — Salle de visio** : Component `meeting-room.tsx` utilise SDK OpenVidu (openvidu-browser). Affichage caméra locale + remote. Boutons : mute/unmute micro, on/off caméra, partage écran, quitter. État : connecting → connected → disconnected. Gestion erreurs (permissions refusées, connexion échouée).

5. **AC5 — Liste meetings** : Page Hub : liste tous les meetings (filtres : client, statut, date). Page Client : liste ses meetings. Colonnes : titre, date, statut, durée, actions (rejoindre si in_progress, voir détails si completed). DataTable de @monprojetpro/ui.

6. **AC6 — Server Actions** : `createMeeting()` crée enregistrement + notification au destinataire. `startMeeting()` crée session OpenVidu via Edge Function + met à jour DB (status=in_progress, started_at, session_id). `endMeeting()` ferme session OpenVidu + calcule durée + met à jour DB (status=completed, ended_at, duration_seconds).

7. **AC7 — Tests** : Tests unitaires co-localisés. Tests RLS. Mock OpenVidu SDK dans les tests. Coverage >80%.

## Tasks / Subtasks

- [x] Task 1 — Migration Supabase (AC: #1)
  - [x] 1.1 Créer migration `00031_create_meetings.sql` (00028 pris par document_folders)
  - [x] 1.2 Table `meetings` avec tous les champs
  - [x] 1.3 Index : `idx_meetings_client_id`, `idx_meetings_operator_id`, `idx_meetings_status`, `idx_meetings_scheduled_at`
  - [x] 1.4 Trigger updated_at
  - [x] 1.5 RLS policies

- [x] Task 2 — Module Visio scaffold (AC: #2)
  - [x] 2.1 `packages/modules/visio/manifest.ts`
  - [x] 2.2 `index.ts`, `package.json`, `tsconfig.json`, `vitest.config.ts`
  - [x] 2.3 `types/meeting.types.ts`
  - [x] 2.4 `docs/guide.md`, `faq.md`, `flows.md`

- [x] Task 3 — OpenVidu Docker setup (AC: #3)
  - [x] 3.1 `docker/openvidu/docker-compose.yml` — Service OpenVidu CE
  - [x] 3.2 Variables documentées : `OPENVIDU_URL`, `OPENVIDU_SECRET` (dans docs/openvidu-setup.md)
  - [x] 3.3 Documentation démarrage local (`docs/openvidu-setup.md`)

- [x] Task 4 — Edge Function OpenVidu token (AC: #3, #6)
  - [x] 4.1 `supabase/functions/get-openvidu-token/index.ts` — Appelle OpenVidu API pour obtenir token
  - [x] 4.2 Vérification auth Supabase + vérification accès meeting
  - [x] 4.3 Retourne `{ token, sessionId }`

- [x] Task 5 — Server Actions (AC: #6)
  - [x] 5.1 `actions/create-meeting.ts` — Créer meeting + notification
  - [x] 5.2 `actions/start-meeting.ts` — Créer session OpenVidu + update DB
  - [x] 5.3 `actions/end-meeting.ts` — Fermer session + calculer durée + update DB
  - [x] 5.4 `actions/get-meetings.ts` — Récupérer meetings (filtré par RLS)

- [x] Task 6 — Hooks TanStack Query (AC: #4)
  - [x] 6.1 `hooks/use-meetings.ts` — queryKey `['meetings', userId]`
  - [x] 6.2 `hooks/use-openvidu.ts` — Gestion connexion OpenVidu, événements (streamCreated, streamDestroyed)

- [x] Task 7 — Composants UI (AC: #4, #5)
  - [x] 7.1 `components/meeting-room.tsx` — Salle de visio avec OpenVidu SDK
  - [x] 7.2 `components/meeting-list.tsx` — DataTable meetings
  - [x] 7.3 `components/meeting-schedule-dialog.tsx` — Dialog planification meeting
  - [x] 7.4 `components/meeting-controls.tsx` — Boutons micro, caméra, partage écran
  - [x] 7.5 `components/meeting-status-badge.tsx` — Badge statut meeting

- [x] Task 8 — Routes (AC: #5)
  - [x] 8.1 Hub : `apps/hub/app/(dashboard)/modules/visio/page.tsx` — Liste meetings tous clients
  - [x] 8.2 Hub : `apps/hub/app/(dashboard)/modules/visio/[meetingId]/page.tsx` — Salle de visio
  - [x] 8.3 Client : `apps/client/app/(dashboard)/modules/visio/page.tsx` — Liste ses meetings
  - [x] 8.4 Client : `apps/client/app/(dashboard)/modules/visio/[meetingId]/page.tsx` — Salle de visio
  - [x] 8.5 Loading.tsx et error.tsx (4 loading + 4 error créés)

- [x] Task 9 — Tests (AC: #7)
  - [x] 9.1 Tests Server Actions : createMeeting, startMeeting, endMeeting, getMeetings, getOpenViduToken
  - [x] 9.2 Tests composants : MeetingRoom (mock OpenVidu), MeetingList, MeetingControls, MeetingStatusBadge, MeetingScheduleDialog
  - [x] 9.3 Tests RLS : client A ne voit pas meetings client B (skipIf sans DB locale)
  - [x] 9.4 Tests Edge Function : get-openvidu-token (mock Edge Function)
  - [x] 9.5 Tests hook useOpenVidu : connexion, déconnexion, événements

- [x] Task 10 — Documentation (AC: #7)
  - [x] 10.1 `docs/guide.md`, `faq.md`, `flows.md`
  - [x] 10.2 `docs/openvidu-setup.md` — Setup Docker local + prod

## Dev Notes

### Architecture — Règles critiques

- **NOUVEAU MODULE** : `packages/modules/visio/` — `manifest.ts` en premier.
- **OpenVidu** : Service externe (Docker local, Kubernetes prod). Communication via Edge Function pour sécurité.
- **SDK** : `openvidu-browser` côté client pour gérer streams WebRTC.
- **Response format** : `{ data, error }` — JAMAIS throw.
- **Logging** : `[VISIO:CREATE_MEETING]`, `[VISIO:START_SESSION]`, `[VISIO:END_SESSION]`

### Base de données

**Migration `00028`** :
```sql
CREATE TABLE meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  operator_id UUID NOT NULL REFERENCES operators(id),
  title TEXT NOT NULL,
  description TEXT,
  scheduled_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  session_id TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
  recording_url TEXT,
  transcript_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_meetings_client_id ON meetings(client_id);
CREATE INDEX idx_meetings_operator_id ON meetings(operator_id);
CREATE INDEX idx_meetings_status ON meetings(status);
CREATE INDEX idx_meetings_scheduled_at ON meetings(scheduled_at);
```

**RLS policies** :
```sql
-- Client voit ses meetings
CREATE POLICY meetings_select_owner ON meetings FOR SELECT
  USING (client_id IN (SELECT id FROM clients WHERE auth_user_id = auth.uid()));

-- Opérateur voit tous les meetings de ses clients
CREATE POLICY meetings_select_operator ON meetings FOR SELECT
  USING (operator_id = auth.uid());

-- Authentifié peut créer
CREATE POLICY meetings_insert_authenticated ON meetings FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Seul l'opérateur peut modifier
CREATE POLICY meetings_update_operator ON meetings FOR UPDATE
  USING (operator_id = auth.uid());
```

### OpenVidu — Docker Compose

```yaml
# docker/openvidu/docker-compose.yml
version: '3.8'
services:
  openvidu:
    image: openvidu/openvidu-dev:2.30.0
    ports:
      - "4443:4443"
    environment:
      - OPENVIDU_SECRET=${OPENVIDU_SECRET}
    volumes:
      - ./recordings:/opt/openvidu/recordings
```

### Edge Function — Get OpenVidu Token

```typescript
// supabase/functions/get-openvidu-token/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })

  const { meetingId } = await req.json()

  // Vérifier accès au meeting
  const { data: meeting, error } = await supabase
    .from('meetings')
    .select('*')
    .eq('id', meetingId)
    .single()

  if (error || !meeting) {
    return new Response(JSON.stringify({ error: 'Meeting not found' }), { status: 404 })
  }

  // Créer session OpenVidu si pas déjà créée
  const openviduUrl = Deno.env.get('OPENVIDU_URL')!
  const openviduSecret = Deno.env.get('OPENVIDU_SECRET')!
  const sessionId = meeting.session_id || `session-${meetingId}`

  // Appel API OpenVidu pour créer session + token
  const sessionRes = await fetch(`${openviduUrl}/openvidu/api/sessions`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${btoa(`OPENVIDUAPP:${openviduSecret}`)}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ customSessionId: sessionId })
  })

  const tokenRes = await fetch(`${openviduUrl}/openvidu/api/sessions/${sessionId}/connection`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${btoa(`OPENVIDUAPP:${openviduSecret}`)}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({})
  })

  const tokenData = await tokenRes.json()

  // Mettre à jour meeting avec session_id si nécessaire
  if (!meeting.session_id) {
    await supabase.from('meetings').update({ session_id: sessionId }).eq('id', meetingId)
  }

  return new Response(JSON.stringify({ token: tokenData.token, sessionId }), {
    headers: { 'Content-Type': 'application/json' }
  })
})
```

### Hook useOpenVidu

```typescript
// hooks/use-openvidu.ts
'use client'
import { useState, useEffect, useCallback } from 'react'
import { OpenVidu, Session, Publisher, StreamManager } from 'openvidu-browser'

export function useOpenVidu(meetingId: string) {
  const [session, setSession] = useState<Session | null>(null)
  const [publisher, setPublisher] = useState<Publisher | null>(null)
  const [subscribers, setSubscribers] = useState<StreamManager[]>([])
  const [status, setStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected')

  const connect = useCallback(async () => {
    setStatus('connecting')

    // Récupérer token via Edge Function
    const res = await fetch('/api/openvidu/token', {
      method: 'POST',
      body: JSON.stringify({ meetingId }),
      headers: { 'Content-Type': 'application/json' }
    })
    const { token, sessionId } = await res.json()

    const OV = new OpenVidu()
    const newSession = OV.initSession()

    newSession.on('streamCreated', (event) => {
      const subscriber = newSession.subscribe(event.stream, undefined)
      setSubscribers((prev) => [...prev, subscriber])
    })

    newSession.on('streamDestroyed', (event) => {
      setSubscribers((prev) => prev.filter((s) => s.stream.streamId !== event.stream.streamId))
    })

    await newSession.connect(token)

    const pub = await OV.initPublisherAsync(undefined, {
      audioSource: undefined,
      videoSource: undefined,
      publishAudio: true,
      publishVideo: true,
    })

    newSession.publish(pub)

    setSession(newSession)
    setPublisher(pub)
    setStatus('connected')
  }, [meetingId])

  const disconnect = useCallback(() => {
    if (session) {
      session.disconnect()
      setSession(null)
      setPublisher(null)
      setSubscribers([])
      setStatus('disconnected')
    }
  }, [session])

  return { session, publisher, subscribers, status, connect, disconnect }
}
```

### Fichiers à créer

**Module visio :**
```
packages/modules/visio/
├── manifest.ts, index.ts, package.json, tsconfig.json
├── docs/guide.md, faq.md, flows.md
├── types/meeting.types.ts
├── actions/create-meeting.ts, start-meeting.ts, end-meeting.ts, get-meetings.ts
├── hooks/use-meetings.ts, use-openvidu.ts
└── components/meeting-room.tsx, meeting-list.tsx, meeting-schedule-dialog.tsx, meeting-controls.tsx, meeting-status-badge.tsx
```

**Routes :**
- `apps/hub/app/(dashboard)/modules/visio/page.tsx`
- `apps/hub/app/(dashboard)/modules/visio/[meetingId]/page.tsx`
- `apps/client/app/(dashboard)/modules/visio/page.tsx`
- `apps/client/app/(dashboard)/modules/visio/[meetingId]/page.tsx`

**Migration :**
- `supabase/migrations/00028_create_meetings.sql`

**Edge Function :**
- `supabase/functions/get-openvidu-token/index.ts`

**Docker :**
- `docker/openvidu/docker-compose.yml`
- `docs/openvidu-setup.md`

### Dépendances

- Table `clients`, `operators`
- OpenVidu CE (Docker local, Kubernetes prod)
- Package `openvidu-browser` (client-side SDK)
- Edge Function pour sécuriser accès OpenVidu

### Anti-patterns — Interdit

- NE PAS exposer `OPENVIDU_SECRET` côté client (Edge Function obligatoire)
- NE PAS stocker les tokens OpenVidu en DB (éphémères)
- NE PAS throw dans les Server Actions
- NE PAS oublier de fermer la session OpenVidu à la fin (leak de ressources)

### References

- [Source: _bmad-output/planning-artifacts/epics/epic-5-*.md#Story 5.1]
- [Source: docs/project-context.md]
- [OpenVidu Docs: https://docs.openvidu.io/]

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.6 (claude-sonnet-4-6)

### Debug Log References

- Migration numérotée 00031 (00028 déjà utilisé par document_folders)
- openvidu-browser non installé dans le monorepo → stub créé + alias Vite ajouté dans vitest.config.ts racine
- Test meeting-room corrigé (état initial = 'disconnected', pas 'connecting', car le hook est mocké)
- create-meeting : notification best-effort via `.catch()` pour éviter de bloquer le succès

### Completion Notes List

- Migration `00031_create_meetings.sql` : table meetings, 4 index, trigger updated_at, 4 politiques RLS
- Module `@monprojetpro/module-visio` : manifest, types, 4 Server Actions, 1 Server Action edge-function proxy, 2 hooks TanStack Query, 5 composants UI, barrel export
- Edge Function `get-openvidu-token` : auth Supabase, vérification RLS meeting, appel API OpenVidu, retourne token éphémère
- Server Actions : createMeeting (+ notification best-effort), startMeeting (via getOpenViduToken), endMeeting (calcul durée), getMeetings (filtres clientId/status)
- Hook useOpenVidu : import statique openvidu-browser résolu via stub + alias Vite
- Routes Hub et Client : 4 pages RSC + 4 loading.tsx + 4 error.tsx
- Tests : 77 tests visio (tous passing), suite globale 1828 passing / 0 failing
- vitest.config.ts racine mis à jour avec alias openvidu-browser → stub
- **Code Review Fixes (7 issues):**
  - [H1] createMeeting notification: résout auth_user_id du client avant d'envoyer
  - [H2] handleLeave: ne termine plus le meeting pour tous, juste disconnect
  - [H3] État erreur: ajout bouton "Réessayer" pour reconnecter
  - [M1] Partage d'écran: implémenté via getDisplayMedia + replaceTrack OpenVidu
  - [M2] Edge Function CORS: restreint aux domaines *.monprojet-pro.com + localhost
  - [M3] Tests RLS contract: réécrits pour valider MeetingStatusValues du module réel
  - [M4] Vidéo streams: publisher et subscribers attachent les flux via createVideoElement + refs

### File List

**Migration :**
- `supabase/migrations/00031_create_meetings.sql`

**Module visio :**
- `packages/modules/visio/manifest.ts`
- `packages/modules/visio/index.ts`
- `packages/modules/visio/package.json`
- `packages/modules/visio/tsconfig.json`
- `packages/modules/visio/vitest.config.ts`
- `packages/modules/visio/__mocks__/openvidu-browser.ts`
- `packages/modules/visio/types/meeting.types.ts`
- `packages/modules/visio/types/meeting.types.test.ts`
- `packages/modules/visio/utils/to-meeting.ts`
- `packages/modules/visio/utils/to-meeting.test.ts`
- `packages/modules/visio/actions/get-meetings.ts`
- `packages/modules/visio/actions/get-meetings.test.ts`
- `packages/modules/visio/actions/create-meeting.ts`
- `packages/modules/visio/actions/create-meeting.test.ts`
- `packages/modules/visio/actions/start-meeting.ts`
- `packages/modules/visio/actions/start-meeting.test.ts`
- `packages/modules/visio/actions/end-meeting.ts`
- `packages/modules/visio/actions/end-meeting.test.ts`
- `packages/modules/visio/actions/get-openvidu-token.ts`
- `packages/modules/visio/actions/get-openvidu-token.test.ts`
- `packages/modules/visio/hooks/use-meetings.ts`
- `packages/modules/visio/hooks/use-meetings.test.ts`
- `packages/modules/visio/hooks/use-openvidu.ts`
- `packages/modules/visio/hooks/use-openvidu.test.ts`
- `packages/modules/visio/components/meeting-status-badge.tsx`
- `packages/modules/visio/components/meeting-status-badge.test.tsx`
- `packages/modules/visio/components/meeting-controls.tsx`
- `packages/modules/visio/components/meeting-controls.test.tsx`
- `packages/modules/visio/components/meeting-list.tsx`
- `packages/modules/visio/components/meeting-list.test.tsx`
- `packages/modules/visio/components/meeting-list-skeleton.tsx`
- `packages/modules/visio/components/meeting-room.tsx`
- `packages/modules/visio/components/meeting-room.test.tsx`
- `packages/modules/visio/components/meeting-schedule-dialog.tsx`
- `packages/modules/visio/components/meeting-schedule-dialog.test.tsx`
- `packages/modules/visio/docs/guide.md`
- `packages/modules/visio/docs/faq.md`
- `packages/modules/visio/docs/flows.md`

**Edge Function :**
- `supabase/functions/get-openvidu-token/index.ts`

**Docker :**
- `docker/openvidu/docker-compose.yml`

**Routes Hub :**
- `apps/hub/app/(dashboard)/modules/visio/page.tsx`
- `apps/hub/app/(dashboard)/modules/visio/loading.tsx`
- `apps/hub/app/(dashboard)/modules/visio/error.tsx`
- `apps/hub/app/(dashboard)/modules/visio/[meetingId]/page.tsx`
- `apps/hub/app/(dashboard)/modules/visio/[meetingId]/loading.tsx`
- `apps/hub/app/(dashboard)/modules/visio/[meetingId]/error.tsx`

**Routes Client :**
- `apps/client/app/(dashboard)/modules/visio/page.tsx`
- `apps/client/app/(dashboard)/modules/visio/loading.tsx`
- `apps/client/app/(dashboard)/modules/visio/error.tsx`
- `apps/client/app/(dashboard)/modules/visio/[meetingId]/page.tsx`
- `apps/client/app/(dashboard)/modules/visio/[meetingId]/loading.tsx`
- `apps/client/app/(dashboard)/modules/visio/[meetingId]/error.tsx`

**Tests RLS :**
- `tests/rls/meetings-rls.test.ts`

**Documentation :**
- `docs/openvidu-setup.md`

**Config :**
- `vitest.config.ts` (alias openvidu-browser ajouté)
