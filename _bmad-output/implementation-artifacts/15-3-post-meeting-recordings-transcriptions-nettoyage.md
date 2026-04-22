# Story 15.3 : Post-meeting Google — Enregistrements, Transcriptions Gemini & Nettoyage final

Status: ready-for-dev

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

- [ ] Task 1 — Server Action : syncMeetingResults
  - [ ] 1.1 Créer `packages/modules/visio/actions/sync-meeting-results.ts`
  - [ ] 1.2 Requête `googleMeetClient.conferenceRecords.list({ filter: \`space.name="${meet_space_name}"\` })`
  - [ ] 1.3 Pour chaque conferenceRecord : requête `recordings.list` et `transcripts.list`
  - [ ] 1.4 Upsert dans `meeting_recordings` : `recording_url` (lien Drive), `transcript_url` (lien Docs), `transcription_status`
  - [ ] 1.5 Appeler cette action depuis `endMeeting()` en arrière-plan (non-bloquant)
  - [ ] 1.6 Test co-localisé avec mock googleapis

- [ ] Task 2 — Adaptation composants recordings
  - [ ] 2.1 Modifier `packages/modules/visio/components/recording-list.tsx`
  - [ ] 2.2 Remplacer le player HTML5 → lien "Voir sur Google Drive" (icône external link)
  - [ ] 2.3 Remplacer le viewer SRT → lien "Voir la transcription (Google Docs)" (icône external link)
  - [ ] 2.4 Conserver `RecordingStatusBadge` — adapter les libellés :
    - `pending` → "En attente de traitement Google"
    - `processing` → "Gemini transcrit en cours..."
    - `completed` → "Disponible"
    - `failed` → "Non disponible"
  - [ ] 2.5 Supprimer `packages/modules/visio/components/recording-player.tsx`
  - [ ] 2.6 Supprimer `packages/modules/visio/components/transcript-viewer.tsx`
  - [ ] 2.7 Supprimer `packages/modules/visio/utils/parse-srt.ts`

- [ ] Task 3 — Nettoyage Edge Functions OpenVidu + Whisper
  - [ ] 3.1 Supprimer `supabase/functions/openvidu-webhook/`
  - [ ] 3.2 Supprimer `supabase/functions/transcribe-recording/`
  - [ ] 3.3 Supprimer `supabase/functions/get-openvidu-token/`
  - [ ] 3.4 Retirer les variables d'env OpenVidu/Whisper de `supabase/functions/.env`
  - [ ] 3.5 Retirer `OPENVIDU_*` et `OPENAI_API_KEY` (Whisper) de `.env.example` et `.env.local`

- [ ] Task 4 — Nettoyage Docker OpenVidu
  - [ ] 4.1 Supprimer `docker/openvidu/` (dossier entier)
  - [ ] 4.2 Mettre à jour `docker/README.md` si existant (mentionner seulement Cal.com)

- [ ] Task 5 — Migration DB nettoyage meeting_requests
  - [ ] 5.1 Créer migration `00107_drop_meeting_requests.sql`
  - [ ] 5.2 `DROP TABLE IF EXISTS meeting_requests CASCADE`
  - [ ] 5.3 Supprimer les RLS policies associées

- [ ] Task 6 — Types et manifest
  - [ ] 6.1 Supprimer `packages/modules/visio/types/meeting-request.types.ts`
  - [ ] 6.2 Mettre à jour `packages/modules/visio/manifest.ts` : supprimer routes `/requests`, `/request`, `/lobby`
  - [ ] 6.3 Mettre à jour `packages/modules/visio/index.ts` (barrel) — supprimer exports supprimés

- [ ] Task 7 — Documentation module Visio (DOC)
  - [ ] 7.1 Réécrire `packages/modules/visio/docs/guide.md` (Google Meet, plus OpenVidu)
  - [ ] 7.2 Réécrire `packages/modules/visio/docs/faq.md` (nouvelles FAQ Google Meet)
  - [ ] 7.3 Réécrire `packages/modules/visio/docs/flows.md` (nouveaux flows)
  - [ ] 7.4 Supprimer `packages/modules/visio/docs/openvidu-setup.md`
  - [ ] 7.5 Mettre à jour `packages/modules/visio/docs/calcom-setup.md` (toujours valide)

- [ ] Task 8 — Tests nettoyage
  - [ ] 8.1 Supprimer tous les tests fichiers supprimés
  - [ ] 8.2 Vérifier 0 import vers `openvidu-browser` dans le codebase (`grep -r openvidu`)
  - [ ] 8.3 Vérifier 0 import vers `whisper` ou `transcribe-recording` dans le codebase

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

## Completion Notes
