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
  │   └─ Notification client (type='system' — 'meeting_scheduled' n'est pas dans la CHECK notifications)
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
  │   └─ (One+) Bandeau au-dessus du widget : « Il te reste N séance(s) incluse(s) »
  │       ou « crédit épuisé — prochaine séance 45 € »
  │
  ├─ Sélectionne un créneau dans l'agenda MiKL
  │
  ├─ Cal.com envoie webhook → calcom-webhook [Edge Function, service_role]
  │   ├─ INSERT meetings (status='scheduled', metadata.calcomUid)
  │   ├─ Si client One+ (elio_tier='one_plus') → séance de COACHING :
  │   │   ├─ UPDATE meetings.type='coaching'
  │   │   ├─ get_coaching_balance() > 0 → ledger -1 (session_booked)
  │   │   └─ sinon → INSERT billable_items (coaching_session, 4500 cts, pending)
  │   └─ Notification client (type='system', wording adapté : incluse / hors forfait 45 €)
  │
  └─ Meeting apparaît côté client (cockpit One : carte Visio + carte Coaching, en Realtime)
```

## Flow 6bis : Annulation d'un RDV Cal.com

```
Cal.com envoie webhook BOOKING_CANCELLED → calcom-webhook [Edge Function]
  │
  ├─ Retrouve le meeting via metadata.calcomUid → UPDATE status='cancelled'
  │
  ├─ Si type='coaching' :
  │   ├─ Séance débitée (ledger session_booked) → recrédit +1 (session_cancelled)
  │   └─ Séance hors forfait → billable_items.status='cancelled'
  │
  └─ Notification client (« RDV annulé », mention du recrédit le cas échéant)
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
