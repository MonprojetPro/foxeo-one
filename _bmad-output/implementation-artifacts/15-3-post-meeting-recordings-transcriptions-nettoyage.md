# Story 15.3 : Post-meeting Google — Enregistrements, Transcriptions Gemini & Nettoyage final

Status: done

## Story

As a **MiKL et client**,
I want **accéder aux enregistrements et transcriptions Gemini depuis MonprojetPro après chaque meeting Google Meet**,
so that **je retrouve les comptes-rendus automatiquement sans gestion manuelle**.

## Acceptance Criteria

**Given** un meeting Google Meet vient de se terminer
**When** MiKL clique "Récupérer les résultats" (ou action automatique)
**Then** le système interroge `conferenceRecords.list` + `recordings.list` + `transcripts.list` et stocke les liens en DB

**Given** un meeting a un enregistrement disponible
**When** MiKL ou le client ouvre l'historique du meeting
**Then** il voit un lien "Enregistrement (Google Drive)" qui ouvre la vidéo dans Google Drive

**Given** un meeting a une transcription Gemini disponible
**When** MiKL ou le client ouvre l'historique du meeting
**Then** il voit un lien "Transcription (Google Docs)" qui ouvre le document dans Google Docs

**Given** l'enregistrement/transcription n'est pas encore prêt (état ENDED mais pas FILE_GENERATED)
**When** l'utilisateur consulte l'historique
**Then** un badge "En cours de traitement..." s'affiche (pas d'erreur)

**Given** la migration est terminée
**When** on consulte le code base
**Then** il n'existe plus aucune référence à OpenVidu, Whisper, ou Docker OpenVidu

## Tasks / Subtasks

- [x] Task 1 — Server Action : syncMeetingResults
  - [x] 1.1 Créer `packages/modules/visio/actions/sync-meeting-results.ts`
  - [x] 1.2 Requête `conferenceRecords.list` via Google Meet REST API v2
  - [x] 1.3 Pour chaque conferenceRecord : requête `recordings.list` et `transcripts.list`
  - [x] 1.4 SELECT/INSERT ou UPDATE dans `meeting_recordings` : `recording_url` (lien Drive), `transcript_url` (lien Docs), `transcription_status`
  - [x] 1.5 Appeler cette action depuis `endMeeting()` en arrière-plan (non-bloquant)
  - [x] 1.6 Test co-localisé avec 13 tests (mock fetch)

- [x] Task 2 — Adaptation composants recordings
  - [x] 2.1 Modifier `packages/modules/visio/components/recording-list.tsx`
  - [x] 2.2 Remplacer le player HTML5 → lien "Enregistrement (Google Drive)" (icône external link)
  - [x] 2.3 Remplacer le viewer SRT → lien "Transcription (Google Docs)" (icône external link)
  - [x] 2.4 RecordingStatusBadge libellés mis à jour (pending/processing/completed/failed)
  - [x] 2.5 Supprimer `recording-player.tsx` + tests
  - [x] 2.6 Supprimer `transcript-viewer.tsx` + tests
  - [x] 2.7 Supprimer `parse-srt.ts` + tests

- [x] Task 3 — Nettoyage Edge Functions OpenVidu + Whisper
  - [x] 3.1 Supprimer `supabase/functions/openvidu-webhook/`
  - [x] 3.2 Supprimer `supabase/functions/transcribe-recording/`
  - [x] 3.3 Supprimer `supabase/functions/get-openvidu-token/`
  - [x] 3.4 health-check-cron: suppression du check OpenVidu
  - [x] 3.5 .env.example déjà nettoyé (pas de refs OpenVidu/OPENAI)

- [x] Task 4 — Nettoyage Docker OpenVidu
  - [x] 4.1 Supprimer `docker/openvidu/` (dossier entier)
  - [x] 4.2 Pas de docker/README.md existant

- [x] Task 5 — Migration DB nettoyage meeting_requests
  - [x] 5.1 Créer migration `00108_drop_meeting_requests.sql`
  - [x] 5.2 `DROP TABLE IF EXISTS meeting_requests CASCADE`
  - [x] 5.3 + RLS operator INSERT/UPDATE sur meeting_recordings

- [x] Task 6 — Types et manifest
  - [x] 6.1 `meeting-request.types.ts` déjà absent (supprimé en 15.2)
  - [x] 6.2 manifest.ts : routes /requests déjà absentes
  - [x] 6.3 Mettre à jour `index.ts` — suppression RecordingPlayer, TranscriptViewer, parseSrt, downloadRecording, downloadTranscript

- [x] Task 7 — Documentation module Visio (DOC)
  - [x] 7.1-7.3 guide.md, faq.md, flows.md déjà réécrites en Story 15.2
  - [x] 7.4 openvidu-setup.md déjà absent
  - [x] 7.5 calcom-setup.md conservé intact

- [x] Task 8 — Tests nettoyage
  - [x] 8.1 Tests fichiers supprimés retirés
  - [x] 8.2 0 référence `openvidu` dans le code source packages/ et apps/
  - [x] 8.3 0 référence `transcribe-recording` dans le code source

## Dev Notes

### Récupérer les résultats post-meeting

```typescript
// Filtrer par space name pour trouver la conférence du meeting
const records = await googleMeetClient.conferenceRecords.list({
  filter: `space.name="${meetSpaceName}"`,
})

const conferenceRecordName = records.data.conferenceRecords?.[0]?.name

if (conferenceRecordName) {
  const [recordingsRes, transcriptsRes] = await Promise.all([
    googleMeetClient.conferenceRecords.recordings.list({ parent: conferenceRecordName }),
    googleMeetClient.conferenceRecords.transcripts.list({ parent: conferenceRecordName }),
  ])

  // recordings[0].driveDestination.exportUri → lien Google Drive
  // transcripts[0].docsDestination.exportUri → lien Google Docs
  // transcripts[0].state → 'STARTED' | 'ENDED' | 'FILE_GENERATED'
}
```

### Mapping statuts transcription

| Google Meet state | meeting_recordings.transcription_status |
|-------------------|----------------------------------------|
| `STARTED` | `processing` |
| `ENDED` | `processing` |
| `FILE_GENERATED` | `completed` |
| (absent) | `pending` |

### Fichiers à créer / supprimer

```
packages/modules/visio/actions/sync-meeting-results.ts                      # CRÉER
packages/modules/visio/actions/sync-meeting-results.test.ts                 # CRÉER

packages/modules/visio/components/recording-list.tsx                        # MODIFIER
packages/modules/visio/components/recording-player.tsx                      # SUPPRIMER
packages/modules/visio/components/transcript-viewer.tsx                     # SUPPRIMER
packages/modules/visio/utils/parse-srt.ts                                   # SUPPRIMER

supabase/functions/openvidu-webhook/                                        # SUPPRIMER (dossier)
supabase/functions/transcribe-recording/                                    # SUPPRIMER (dossier)
supabase/functions/get-openvidu-token/                                      # SUPPRIMER (dossier)

docker/openvidu/                                                             # SUPPRIMER (dossier)

supabase/migrations/00107_drop_meeting_requests.sql                         # CRÉER

packages/modules/visio/types/meeting-request.types.ts                       # SUPPRIMER
packages/modules/visio/manifest.ts                                          # MODIFIER
packages/modules/visio/index.ts                                             # MODIFIER

packages/modules/visio/docs/guide.md                                        # RÉÉCRIRE
packages/modules/visio/docs/faq.md                                          # RÉÉCRIRE
packages/modules/visio/docs/flows.md                                        # RÉÉCRIRE
packages/modules/visio/docs/openvidu-setup.md                               # SUPPRIMER
```

## File List (auto-generated at completion)

**Créés :**
- `packages/modules/visio/actions/sync-meeting-results.ts`
- `packages/modules/visio/actions/sync-meeting-results.test.ts`
- `supabase/migrations/00108_drop_meeting_requests.sql`

**Modifiés :**
- `packages/modules/visio/actions/end-meeting.ts` (appel background syncMeetingResults)
- `packages/modules/visio/actions/end-meeting.test.ts` (mock + test syncMeetingResults)
- `packages/modules/visio/components/recording-list.tsx` (liens Drive/Docs)
- `packages/modules/visio/components/recording-list.test.tsx` (12 tests)
- `packages/modules/visio/components/recording-status-badge.tsx` (libellés Google Meet)
- `packages/modules/visio/components/recording-status-badge.test.tsx`
- `packages/modules/visio/index.ts` (suppression exports obsolètes)
- `packages/modules/admin/components/system-health.test.tsx` (suppression open_vidu)
- `packages/handoff/src/extract-client-data.ts` (suppression meeting_requests)
- `supabase/functions/health-check-cron/index.ts` (suppression check OpenVidu)

**Supprimés :**
- `packages/modules/visio/components/recording-player.tsx` + test
- `packages/modules/visio/components/transcript-viewer.tsx` + test
- `packages/modules/visio/utils/parse-srt.ts` + test
- `packages/modules/visio/utils/to-meeting-request.ts` + test
- `supabase/functions/openvidu-webhook/`
- `supabase/functions/transcribe-recording/`
- `supabase/functions/get-openvidu-token/`
- `docker/openvidu/`

## Completion Notes

Commit: `30d015a` — 2026-04-23
Tests: 47 passing (13 sync-meeting-results, 12 recording-list, 5 recording-status-badge, 7 end-meeting, 10 system-health)
Migration: 00108_drop_meeting_requests.sql
