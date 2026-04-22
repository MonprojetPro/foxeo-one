# Guide — Module Visio

## Vue d'ensemble

Le module Visio permet à MiKL et ses clients de planifier et rejoindre des visioconférences directement depuis MonprojetPro.

La technologie sous-jacente est **Google Meet** (compte Google Workspace de MiKL). Les réunions s'ouvrent dans un nouvel onglet navigateur. Les enregistrements et transcriptions sont générés automatiquement par **Gemini** et accessibles via Google Drive / Google Docs.

## Fonctionnalités

- **Hub (MiKL)** : créer des meetings, voir les à venir / en cours / historique, rejoindre ou terminer un meeting actif
- **Lab / One (client)** : voir son prochain meeting, réserver un créneau via Cal.com, accéder à l'historique et aux enregistrements
- **Enregistrement automatique** : chaque meeting est enregistré par Google (si activé dans le compte Workspace)
- **Transcription Gemini** : transcription automatique disponible après le meeting dans Google Docs

## Comment fonctionne un meeting

### Côté MiKL (Hub)

1. Cliquer "Nouveau meeting" → renseigner titre, client concerné, date/heure
2. Un lien Google Meet est généré automatiquement (`https://meet.google.com/xxx-yyy-zzz`)
3. Le client reçoit une notification
4. Le jour J : cliquer "Rejoindre" → Google Meet s'ouvre dans un nouvel onglet
5. En fin de meeting : cliquer "Terminer" dans MonprojetPro pour clore officiellement la session
6. Quelques minutes après : l'enregistrement et la transcription Gemini apparaissent dans l'historique

### Côté client (Lab / One)

1. Onglet Visio → voir le prochain meeting planifié
2. Ou réserver un nouveau créneau via le widget Cal.com
3. Pas de créneau disponible ? Cliquer "Contacter MiKL via le Chat" → message libre dans le Chat
4. Le jour J : cliquer "Rejoindre sur Google Meet" → s'ouvre dans un nouvel onglet
5. Après : retrouver l'enregistrement et la transcription dans "Mes réunions passées"

## Architecture

```
MonprojetPro (Hub)          Google Meet API v2           Google Meet
     │                            │                           │
     ├─ createMeeting() ─────────►│ spaces.create()           │
     │                            │◄── { meetingUri, name }   │
     │   store meet_uri + name ──►│ DB (meetings table)       │
     │                            │                           │
     ├─ "Rejoindre" ──────────────────────────────────────────► (nouvel onglet)
     │                            │                           │
     ├─ endMeeting() ────────────►│ spaces.endActiveConference│
     │                            │                           │
     │   (quelques minutes après) │                           │
     ├─ syncMeetingResults() ────►│ conferenceRecords.list()  │
     │                            │ recordings.list()         │
     │                            │ transcripts.list()        │
     │   store links ────────────►│ DB (meeting_recordings)   │
```

## Pages et routes

| Route | App | Description |
|-------|-----|-------------|
| `/modules/visio` | Hub | Vue globale meetings (onglets : À venir / En cours / Historique) |
| `/modules/visio` | Client | Prochain meeting + Cal.com + historique |

## Prise de RDV — deux méthodes

| Méthode | Comment | Pour qui |
|---------|---------|---------|
| **Cal.com** | Widget intégré dans l'onglet Visio client | Réservation directe dans l'agenda MiKL |
| **Chat libre** | Lien vers `/modules/chat` | Si aucun créneau Cal.com disponible |

La demande manuelle avec créneaux (ancienne Story 5.3) a été supprimée — remplacée par le Chat.

## Configuration requise

Variables d'environnement dans `apps/hub/.env.local` :

| Variable | Description |
|----------|-------------|
| `GOOGLE_MEET_SERVICE_ACCOUNT_EMAIL` | Email du Service Account Google Cloud |
| `GOOGLE_MEET_SERVICE_ACCOUNT_KEY` | Clé privée JSON encodée en base64 |
| `GOOGLE_MEET_IMPERSONATE_EMAIL` | Email du compte MiKL Workspace (délégation de domaine) |

## Enregistrements et transcriptions

Après chaque meeting, `syncMeetingResults()` interroge l'API Google Meet pour récupérer :

- **Enregistrement** → lien Google Drive (vidéo)
- **Transcription Gemini** → lien Google Docs (texte intégral)

Ces liens sont stockés dans la table `meeting_recordings` et affichés dans l'historique.

> Note : les enregistrements et transcriptions doivent être activés dans les paramètres Google Meet / Workspace Admin.
