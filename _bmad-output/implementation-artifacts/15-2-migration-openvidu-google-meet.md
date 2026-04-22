# Story 15.2 : Migration Visio — OpenVidu → Google Meet + Refonte UX

Status: ready-for-dev

## Story

As a **MiKL depuis le Hub**,
I want **créer des meetings qui génèrent automatiquement un lien Google Meet**,
so that **toi et tes clients rejoignez la visio d'un clic, sans infrastructure OpenVidu à maintenir**.

## Acceptance Criteria

**Given** MiKL clique "Nouveau meeting" dans le Hub
**When** il renseigne titre, client, date/heure et soumet
**Then** un meeting est créé en DB avec un `meet_uri` (`https://meet.google.com/xxx-yyy-zzz`) et un `meet_space_name`

**Given** un meeting est planifié
**When** MiKL ou le client clique "Rejoindre"
**Then** le lien Google Meet s'ouvre dans un nouvel onglet navigateur

**Given** MiKL veut clore un meeting actif depuis le Hub
**When** il clique "Terminer le meeting"
**Then** `spaces.endActiveConference()` est appelé + meeting.status → `completed` + meeting.ended_at mis à jour

**Given** la page Visio du Hub se charge
**When** il n'y a aucun meeting
**Then** l'état vide affiche "Aucun meeting" avec un bouton "Créer le premier meeting"

**Given** le client ouvre l'onglet Visio (Lab ou One)
**When** la page se charge
**Then** il voit : son prochain meeting (s'il existe) avec bouton "Rejoindre", le widget Cal.com pour réserver, un lien "Pas de créneau ? Contactez MiKL via le Chat", et l'historique de ses meetings passés

**Given** le formulaire de demande manuelle (ancienne Story 5.3) existait
**When** la migration est terminée
**Then** la page `/modules/visio/request` redirige vers `/modules/visio` (plus de formulaire manuel — remplacé par le Chat)

## Tasks / Subtasks

- [ ] Task 1 — Migration DB : ajout colonnes meet_space_name + meet_uri
  - [ ] 1.1 Créer migration `00106_add_google_meet_fields_to_meetings.sql`
  - [ ] 1.2 `ALTER TABLE meetings ADD COLUMN meet_space_name TEXT` (nullable)
  - [ ] 1.3 `ALTER TABLE meetings ADD COLUMN meet_uri TEXT` (nullable)
  - [ ] 1.4 Régénérer les types DB si nécessaire

- [ ] Task 2 — Server Action : createMeeting (refonte)
  - [ ] 2.1 Modifier `packages/modules/visio/actions/create-meeting.ts`
  - [ ] 2.2 Appel `googleMeetClient.spaces.create({})` → récupère `name` et `meetingUri`
  - [ ] 2.3 Stocker `meet_space_name` et `meet_uri` dans la DB
  - [ ] 2.4 Configurer `spaceConfig` : `accessType: 'TRUSTED'` (seuls les invités peuvent rejoindre)
  - [ ] 2.5 Mettre à jour le test co-localisé (mock googleapis)

- [ ] Task 3 — Server Action : startMeeting (simplification)
  - [ ] 3.1 Modifier `packages/modules/visio/actions/start-meeting.ts`
  - [ ] 3.2 Supprimer l'appel à `getOpenViduToken` (Edge Function)
  - [ ] 3.3 Garder uniquement : update meeting.status → `in_progress`, meeting.started_at
  - [ ] 3.4 Mettre à jour le test

- [ ] Task 4 — Server Action : endMeeting (refonte)
  - [ ] 4.1 Modifier `packages/modules/visio/actions/end-meeting.ts`
  - [ ] 4.2 Appel `googleMeetClient.spaces.endActiveConference({ name: meet_space_name })`
  - [ ] 4.3 Update meeting.status → `completed`, meeting.ended_at, calcul duration_seconds
  - [ ] 4.4 Mettre à jour le test

- [ ] Task 5 — UX Hub : refonte page principale Visio
  - [ ] 5.1 Modifier `apps/hub/app/(dashboard)/modules/visio/page.tsx`
  - [ ] 5.2 Layout avec 3 onglets : "À venir" / "En cours" / "Historique"
  - [ ] 5.3 Bouton "Nouveau meeting" en haut à droite (ouvre MeetingScheduleDialog existant)
  - [ ] 5.4 Chaque meeting : titre, date, client, statut + bouton "Rejoindre" (lien `meet_uri`, target="_blank") ou "Terminer" si in_progress
  - [ ] 5.5 Supprimer la route `/modules/visio/requests` (onglet Demandes supprimé)

- [ ] Task 6 — UX Client : refonte page Visio (Lab + One)
  - [ ] 6.1 Modifier `apps/client/app/(dashboard)/modules/visio/page.tsx`
  - [ ] 6.2 Section haute : "Prochain meeting" (carte avec date + bouton "Rejoindre sur Google Meet")
  - [ ] 6.3 Section milieu : widget Cal.com pour réserver un créneau
  - [ ] 6.4 Lien sous le Cal.com : "Pas de créneau disponible ? Contactez MiKL via le Chat" → `/modules/chat`
  - [ ] 6.5 Section basse : "Mes réunions passées" (liste compacte, lien vers enregistrement si disponible)
  - [ ] 6.6 Supprimer `apps/client/app/(dashboard)/modules/visio/request/page.tsx` → remplacer par redirect `/modules/visio`

- [ ] Task 7 — Supprimer MeetingRoom OpenVidu
  - [ ] 7.1 Supprimer `packages/modules/visio/components/meeting-room.tsx`
  - [ ] 7.2 Supprimer `packages/modules/visio/components/meeting-controls.tsx`
  - [ ] 7.3 Supprimer `packages/modules/visio/hooks/use-openvidu.ts`
  - [ ] 7.4 Supprimer `packages/modules/visio/__mocks__/openvidu-browser.ts`
  - [ ] 7.5 Supprimer les routes `apps/hub/.../visio/[meetingId]/page.tsx` et `apps/client/.../visio/[meetingId]/page.tsx` (remplacées par lien externe)
  - [ ] 7.6 Désinstaller `openvidu-browser` : `npm uninstall openvidu-browser` dans le bon workspace

- [ ] Task 8 — Supprimer système meeting_requests
  - [ ] 8.1 Supprimer `packages/modules/visio/actions/request-meeting.ts`
  - [ ] 8.2 Supprimer `packages/modules/visio/actions/accept-meeting-request.ts`
  - [ ] 8.3 Supprimer `packages/modules/visio/actions/reject-meeting-request.ts`
  - [ ] 8.4 Supprimer `packages/modules/visio/actions/get-meeting-requests.ts`
  - [ ] 8.5 Supprimer `packages/modules/visio/hooks/use-meeting-requests.ts`
  - [ ] 8.6 Supprimer `packages/modules/visio/hooks/use-meeting-realtime.ts` (lobby realtime)
  - [ ] 8.7 Supprimer `packages/modules/visio/components/meeting-request-list.tsx`
  - [ ] 8.8 Supprimer `packages/modules/visio/components/meeting-request-card.tsx`
  - [ ] 8.9 Supprimer `packages/modules/visio/components/meeting-request-form.tsx`
  - [ ] 8.10 Supprimer `packages/modules/visio/components/calcom-booking-widget.tsx` → le recréer simplifié côté client directement
  - [ ] 8.11 Supprimer `packages/modules/visio/components/meeting-lobby.tsx` et routes lobby Hub + Client
  - [ ] 8.12 Supprimer `apps/hub/app/(dashboard)/modules/visio/requests/` (dossier entier)
  - [ ] 8.13 Note : NE PAS supprimer la table `meeting_requests` en DB pour l'instant (migration destructive — laisser à 15.3)

- [ ] Task 9 — Tests
  - [ ] 9.1 Tests actions createMeeting, startMeeting, endMeeting avec mock googleapis
  - [ ] 9.2 Tests composants Hub et Client (snapshot ou render tests)
  - [ ] 9.3 Supprimer tous les tests liés aux fichiers supprimés

## Dev Notes

### Appel spaces.create

```typescript
import { googleMeetClient } from '@/lib/google-meet-client'

const space = await googleMeetClient.spaces.create({
  requestBody: {
    config: {
      accessType: 'TRUSTED',
      entryPointAccess: 'ALL',
    },
  },
})

// space.data.name       → "spaces/abc123"
// space.data.meetingUri → "https://meet.google.com/abc-def-ghi"
// space.data.meetingCode → "abc-def-ghi"
```

### Appel endActiveConference

```typescript
await googleMeetClient.spaces.endActiveConference({
  name: meeting.meet_space_name, // "spaces/abc123"
})
```

### UX Client — structure page

```
/modules/visio (Client)
├─ Carte "Prochain meeting" (si exists)
│   ├─ titre, date formatée
│   └─ Bouton "Rejoindre sur Google Meet" → meet_uri (target="_blank")
├─ Cal.com iframe
│   └─ Lien "Pas de créneau ? → Chat MiKL" (/modules/chat)
└─ Liste "Meetings passés"
    ├─ titre, date
    └─ Lien "Enregistrement" (si disponible — Story 15.3)
```

### Fichiers à créer / modifier

```
supabase/migrations/00106_add_google_meet_fields_to_meetings.sql            # CRÉER

packages/modules/visio/actions/create-meeting.ts                            # MODIFIER
packages/modules/visio/actions/create-meeting.test.ts                       # MODIFIER
packages/modules/visio/actions/start-meeting.ts                             # MODIFIER
packages/modules/visio/actions/start-meeting.test.ts                        # MODIFIER
packages/modules/visio/actions/end-meeting.ts                               # MODIFIER
packages/modules/visio/actions/end-meeting.test.ts                          # MODIFIER

packages/modules/visio/components/meeting-room.tsx                          # SUPPRIMER
packages/modules/visio/components/meeting-controls.tsx                      # SUPPRIMER
packages/modules/visio/components/meeting-request-list.tsx                  # SUPPRIMER
packages/modules/visio/components/meeting-request-card.tsx                  # SUPPRIMER
packages/modules/visio/components/meeting-request-form.tsx                  # SUPPRIMER
packages/modules/visio/components/meeting-lobby.tsx                         # SUPPRIMER
packages/modules/visio/hooks/use-openvidu.ts                                # SUPPRIMER
packages/modules/visio/hooks/use-meeting-requests.ts                        # SUPPRIMER
packages/modules/visio/hooks/use-meeting-realtime.ts                        # SUPPRIMER
packages/modules/visio/__mocks__/openvidu-browser.ts                        # SUPPRIMER

packages/modules/visio/actions/request-meeting.ts                           # SUPPRIMER
packages/modules/visio/actions/accept-meeting-request.ts                    # SUPPRIMER
packages/modules/visio/actions/reject-meeting-request.ts                    # SUPPRIMER
packages/modules/visio/actions/get-meeting-requests.ts                      # SUPPRIMER
packages/modules/visio/hooks/use-meeting-requests.ts                        # SUPPRIMER

apps/hub/app/(dashboard)/modules/visio/page.tsx                             # MODIFIER
apps/hub/app/(dashboard)/modules/visio/requests/                            # SUPPRIMER (dossier)
apps/hub/app/(dashboard)/modules/visio/[meetingId]/page.tsx                 # SUPPRIMER

apps/client/app/(dashboard)/modules/visio/page.tsx                          # MODIFIER
apps/client/app/(dashboard)/modules/visio/request/page.tsx                  # MODIFIER → redirect
apps/client/app/(dashboard)/modules/visio/[meetingId]/page.tsx              # SUPPRIMER

apps/hub/lib/google-meet-client.ts                                          # DÉPENDANCE (Story 15.1)
```

## File List (auto-generated at completion)

## Completion Notes
