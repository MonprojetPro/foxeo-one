# Flows — Module Visio

## Flow 1 : Création d'un meeting (MiKL — Hub)

```
MiKL (Hub)
  │
  ├─ Onglet Visio → clique "Nouveau meeting"
  │   └─ MeetingScheduleDialog s'ouvre
  │
  ├─ Renseigne : titre, client, date/heure
  │
  ├─ Soumet → createMeeting() [Server Action]
  │   ├─ Valide les données (Zod)
  │   ├─ googleMeetClient.spaces.create({ config: { accessType: 'TRUSTED' } })
  │   ├─ Récupère meetingUri + meet_space_name
  │   ├─ INSERT meetings (status='scheduled', meet_uri, meet_space_name)
  │   └─ Notification client (type='meeting_scheduled')
  │
  └─ Liste se rafraîchit (TanStack Query invalidation)
```

## Flow 2 : Rejoindre un meeting

```
MiKL ou Client
  │
  ├─ Voit le meeting dans la liste (statut 'scheduled' ou 'in_progress')
  │
  ├─ Clique "Rejoindre" (ou "Rejoindre sur Google Meet")
  │   └─ Ouvre meet_uri dans un NOUVEL ONGLET navigateur
  │
  └─ Google Meet gère la session (vidéo, audio, partage d'écran)
```

## Flow 3 : Démarrer officiellement un meeting (MiKL — Hub)

```
MiKL (Hub)
  │
  ├─ Clique "Démarrer" sur un meeting planifié
  │
  ├─ startMeeting() [Server Action]
  │   ├─ UPDATE meetings SET status='in_progress', started_at=NOW()
  │   └─ Notification client "Meeting démarré"
  │
  └─ Liste se rafraîchit
```

## Flow 4 : Terminer un meeting (MiKL — Hub)

```
MiKL (Hub) — après la visio Google Meet
  │
  ├─ Clique "Terminer" sur le meeting in_progress
  │
  ├─ endMeeting() [Server Action]
  │   ├─ googleMeetClient.spaces.endActiveConference({ name: meet_space_name })
  │   ├─ UPDATE meetings SET status='completed', ended_at=NOW(), duration_seconds
  │   └─ Lance syncMeetingResults() en arrière-plan (non-bloquant)
  │
  └─ Meeting passe dans l'onglet "Historique"
```

## Flow 5 : Récupération enregistrement + transcription Gemini

```
(Déclenché automatiquement après endMeeting, quelques minutes de délai Google)
  │
  ├─ syncMeetingResults() [Server Action]
  │   ├─ googleMeetClient.conferenceRecords.list(filter: space.name=meet_space_name)
  │   ├─ conferenceRecords.recordings.list(parent: conferenceRecordName)
  │   │   └─ Récupère driveDestination.exportUri → lien Google Drive
  │   ├─ conferenceRecords.transcripts.list(parent: conferenceRecordName)
  │   │   └─ Récupère docsDestination.exportUri → lien Google Docs
  │   │   └─ Récupère state → 'FILE_GENERATED' = completed
  │   └─ UPSERT meeting_recordings (recording_url, transcript_url, transcription_status)
  │
  └─ Liens disponibles dans l'historique Hub + Client
```

## Flow 6 : Prise de RDV côté client — Cal.com

```
Client (Lab ou One)
  │
  ├─ Onglet Visio → widget Cal.com intégré
  │
  ├─ Sélectionne un créneau dans l'agenda MiKL
  │
  ├─ Cal.com envoie webhook → calcom-webhook [Edge Function]
  │   ├─ createMeeting() avec les données Cal.com
  │   └─ Notification client + MiKL
  │
  └─ Meeting apparaît dans "Prochain meeting" côté client
```

## Flow 7 : Prise de RDV côté client — Pas de créneau disponible

```
Client (Lab ou One)
  │
  ├─ Onglet Visio → Cal.com complet (aucun créneau)
  │
  ├─ Clique "Pas de créneau ? Contactez MiKL via le Chat"
  │   └─ Redirige vers /modules/chat
  │
  ├─ Écrit à MiKL : "Je suis dispo lundi 14h ou mardi 10h"
  │
  └─ MiKL crée le meeting manuellement depuis le Hub (Flow 1)
```

## Actions disponibles pour Élio (One+)

| Action | Paramètres | Description |
|--------|-----------|-------------|
| `listUpcomingMeetings` | `clientId` | Retourne les meetings planifiés du client |
| `getNextMeeting` | `clientId` | Retourne le prochain meeting (le plus proche) |
| `getMeetingRecordings` | `meetingId` | Retourne les liens enregistrement + transcription |
