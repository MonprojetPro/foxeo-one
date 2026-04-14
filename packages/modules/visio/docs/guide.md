# Guide — Module Visio

## Vue d'ensemble

Le module Visio permet aux utilisateurs MonprojetPro (MiKL et clients) de lancer des visioconférences directement depuis la plateforme, sans quitter l'écosystème.

La technologie sous-jacente est **OpenVidu CE** (open source, auto-hébergé), qui utilise WebRTC pour la communication en temps réel.

## Fonctionnalités

- **Liste des meetings** : Hub (tous les clients) et Client (ses propres meetings)
- **Salle de visio** : caméra locale + participants distants
- **Contrôles** : micro on/off, caméra on/off, partage d'écran, quitter
- **États** : scheduled → in_progress → completed / cancelled
- **Sécurité** : token OpenVidu généré côté serveur (Edge Function), secret jamais exposé au client

## Architecture

```
Client Browser          Next.js Server          Supabase          OpenVidu
     │                       │                     │                  │
     ├─ MeetingRoom ─────────┤                     │                  │
     │   useOpenVidu()        │                     │                  │
     │   connect() ──────────► getOpenViduToken()   │                  │
     │                       │── invoke Edge Fn ───►│                  │
     │                       │                     ├── call OpenVidu ─►│
     │                       │                     │◄─ token ──────────┤
     │                       │◄── { token, id } ───┤                  │
     │◄──── token ────────────┤                     │                  │
     │── OV.initSession() ────────────────────────────────────────────►│
     │   session.connect(token)                                         │
```

## Utilisation — Hub

Page : `/modules/visio`

- Liste tous les meetings de tous les clients
- Filtres disponibles : par statut
- Accès salle : bouton "Rejoindre" sur meetings `in_progress`

## Utilisation — Client (Lab/One)

Page : `/modules/visio`

- Liste uniquement ses propres meetings (RLS automatique)
- Bouton "Rejoindre" sur meetings actifs

## Démarrer un meeting

1. Créer via `createMeeting()` (Server Action)
2. Démarrer via `startMeeting()` → crée la session OpenVidu + active l'enregistrement
3. Rejoindre la salle via `/modules/visio/[meetingId]`
4. Terminer via `endMeeting()` → arrête enregistrement + calcule durée + ferme session

## Enregistrements et transcription (Story 5.2)

### Vue d'ensemble

Les visioconférences sont automatiquement enregistrées. Après chaque meeting, l'enregistrement est stocké dans Supabase Storage et une transcription automatique est générée via l'API Whisper (OpenAI).

### Architecture

```
OpenVidu                    Supabase Edge Functions              Supabase
  │                              │                                  │
  ├─ Recording ready ───────────► openvidu-webhook                  │
  │                              │── download from OpenVidu         │
  │                              │── upload to Storage (recordings) │
  │                              │── insert meeting_recordings ────►│
  │                              │── trigger transcribe-recording   │
  │                              │                                  │
  │                              ├─ transcribe-recording            │
  │                              │── download from Storage          │
  │                              │── call Whisper API               │
  │                              │── upload SRT to Storage          │
  │                              │── update transcription_status ──►│
```

### Fonctionnalités recordings

- **Enregistrement automatique** : démarre avec `startMeeting()`, s'arrête avec `endMeeting()`
- **Stockage sécurisé** : bucket `recordings` privé, accès via signed URLs
- **Transcription automatique** : API Whisper, format SRT, langue configurable
- **Player vidéo** : lecture en ligne avec transcription synchronisée
- **Historique** : page `/modules/visio/[meetingId]/recordings`
- **Téléchargement** : vidéo et transcription via signed URLs (1h validité)

### Configuration requise

Variables d'environnement pour les Edge Functions :
- `OPENVIDU_WEBHOOK_SECRET` — secret de vérification webhook
- `OPENVIDU_URL` — URL du serveur OpenVidu
- `OPENVIDU_SECRET` — secret OpenVidu (API)
- `OPENAI_API_KEY` — clé API pour Whisper
- `SUPABASE_SERVICE_ROLE_KEY` — pour accès Storage depuis Edge Functions

### Statuts transcription

| Statut | Description |
|--------|-------------|
| `pending` | Enregistrement uploadé, transcription en file d'attente |
| `processing` | Transcription en cours via Whisper |
| `completed` | Transcription terminée, SRT disponible |
| `failed` | Erreur de transcription (retry possible) |

## Demande de visio et salle d'attente (Story 5.3)

### Vue d'ensemble

Les clients peuvent demander un RDV visio via deux méthodes :
1. **Cal.com** : widget de réservation intégré (self-hosted, Docker)
2. **Formulaire manuel** : proposition de 3 créneaux horaires + message

MiKL gère les demandes depuis le Hub et contrôle l'admission via une salle d'attente.

### Architecture

```
Client                     Supabase                    Hub (MiKL)
  │                            │                           │
  ├─ Cal.com booking ─────────►│ calcom-webhook            │
  │   (iframe)                 │── create meeting          │
  │                            │── create meeting_request  │
  │                            │── notify client           │
  │                            │                           │
  ├─ Manual request ──────────►│ requestMeeting()          │
  │   (3 créneaux)             │── create meeting_request  │
  │                            │── notify MiKL ───────────►│
  │                            │                           ├─ acceptMeetingRequest()
  │                            │◄─────────────────────────│── create meeting
  │◄── notification ───────────│                           │── select créneau
  │                            │                           │
  ├─ Enter lobby ─────────────►│ Realtime Broadcast        │
  │   broadcast client_waiting │── channel meeting:X:status│
  │                            │──────────────────────────►│ "Client en attente"
  │                            │                           ├─ "Accepter l'entrée"
  │◄── operator_joined ────────│◄──────────────────────────│
  │── redirect /visio/X ──────►│                           │
```

### Routes

| Route | App | Description |
|-------|-----|-------------|
| `/modules/visio/request` | Client | Page de demande (Cal.com + formulaire) |
| `/modules/visio/requests` | Hub | Liste des demandes côté MiKL |
| `/modules/visio/[meetingId]/lobby` | Both | Salle d'attente (client attend, MiKL admet) |

### Statuts meeting_request

| Statut | Description |
|--------|-------------|
| `pending` | Demande envoyée, en attente de réponse MiKL |
| `accepted` | MiKL a sélectionné un créneau, meeting créé |
| `rejected` | MiKL a refusé la demande |
| `completed` | Meeting terminé |

### Cal.com — Configuration

Voir `docs/calcom-setup.md` pour la configuration Docker et webhook.

### Salle d'attente — Realtime

La salle d'attente utilise Supabase Realtime Broadcast (pas Presence) pour les messages custom :
- `client_waiting` : le client entre dans le lobby
- `operator_joined` : MiKL accepte l'entrée → client redirigé vers la salle principale

## Flux post-visio — Onboarding prospect (Story 5.4)

### Vue d'ensemble

À la fin d'une visio prospect, MiKL dispose d'un dialog guidé "Suite à donner" pour traiter rapidement le prospect sans quitter la plateforme. Le dialog s'ouvre automatiquement si `meeting.type === 'prospect'`.

### Architecture

```
MiKL                        Server Actions              Supabase / Email
  │                              │                           │
  ├─ endMeeting() ───────────────►│                           │
  │   type='prospect'             │                           │
  │◄── { data: { type:'prospect'}}│                           │
  │                              │                           │
  ├─ PostMeetingDialog (open)     │                           │
  │   4 options                   │                           │
  │                              │                           │
  ├─ "Créer parcours Lab" ───────►│ createLabOnboarding()     │
  │   clientName, email, template │── insert clients ────────►│
  │                              │── insert parcours ───────►│
  │                              │── update meeting.metadata ►│
  │                              │── POST send-email ────────►│ (welcome-lab)
  │                              │                           │
  ├─ "Envoyer ressources" ───────►│ sendProspectResources()   │
  │   prospectEmail, documentIds  │── createSignedUrl (7j) ──►│
  │                              │── POST send-email ────────►│ (prospect-resources)
  │                              │── insert reminders ───────►│ (3 jours)
  │                              │                           │
  ├─ "Programmer rappel" ────────►│ scheduleFollowUp()        │
  │   date + message              │── insert reminders ───────►│
  │                              │                           │
  └─ "Pas intéressé" ───────────►│ markProspectNotInterested()│
      raison optionnelle          │── update meeting.metadata ►│
                                 │── update meeting.status ──►│ (completed)
```

### Meeting types

| Type | Description |
|------|-------------|
| `standard` | Meeting classique (défaut) |
| `prospect` | Visio avec un prospect — déclenche dialog post-visio |
| `onboarding` | Session d'onboarding client |
| `support` | Meeting de support |

### Champ `metadata` (JSONB)

Le champ `meetings.metadata` enregistre les décisions post-visio :

```json
// Prospect converti
{ "prospect_converted": true, "client_id": "uuid" }

// Pas intéressé
{ "not_interested": true, "reason": "budget", "timestamp": "2026-02-23T14:00:00Z" }
```

### Actions disponibles

| Action | Server Action | Description |
|--------|--------------|-------------|
| Créer parcours Lab | `createLabOnboarding()` | Crée client (status=prospect) + parcours + email bienvenue |
| Envoyer ressources | `sendProspectResources()` | Génère signed URLs (7j) + email + rappel 3j |
| Programmer rappel | `scheduleFollowUp()` | Crée reminder pour MiKL |
| Pas intéressé | `markProspectNotInterested()` | Update metadata + status=completed |

### Hook `usePostMeetingDialog`

```typescript
const { dialogState, openDialog, closeDialog } = usePostMeetingDialog()

// Après endMeeting() — si prospect
if (result.data?.type === 'prospect') {
  openDialog(result.data.id)
}

// Dans le JSX
<PostMeetingDialog
  meetingId={dialogState.meetingId!}
  isOpen={dialogState.isOpen}
  onClose={closeDialog}
  templates={templates}
  prospectDocuments={documents}
  onLabCreated={(clientId) => router.push(`/crm/clients/${clientId}`)}
/>
```

### Email templates

| Template | Fichier | Données requises |
|----------|---------|-----------------|
| `welcome-lab` | `_shared/email-templates/welcome-lab.ts` | `{ clientName, parcoursName, activationLink }` |
| `prospect-resources` | `_shared/email-templates/prospect-resources.ts` | `{ links: [{name, url}] }` |

Les deux templates utilisent `escapeHtml()` pour prévenir les injections XSS.

### Utilitaires

- `generateResourceLinks(supabase, documentIds)` → `ResourceLink[]` — Génère les signed URLs (7 jours) depuis Supabase Storage
