# Story 15.1 : Auth Google Meet API — Setup OAuth2 & client

Status: done

## Story

As a **développeur**,
I want **un client Google Meet API configuré et fonctionnel dans le projet**,
so that **les stories 15.2 et 15.3 peuvent créer des meetings et récupérer les résultats via l'API Google Meet v2**.

## Acceptance Criteria

**Given** les credentials OAuth2 Google sont configurés dans `.env.local`
**When** on appelle `googleMeetClient.spaces.create()`
**Then** on obtient un objet `{ name, meetingUri, meetingCode }` valide

**Given** les credentials sont absents ou invalides
**When** on appelle une méthode du client
**Then** on obtient une erreur explicite (`GOOGLE_MEET_AUTH_ERROR`) sans crash silencieux

**Given** un nouveau développeur clône le projet
**When** il consulte `.env.example`
**Then** il voit les 3 variables Google Meet documentées avec leur description

## Tasks / Subtasks

- [ ] Task 1 — Google Cloud Console (manuel, MiKL)
  - [ ] 1.1 Créer un projet Google Cloud (ou utiliser le projet Workspace existant)
  - [ ] 1.2 Activer l'API "Google Meet" (`meet.googleapis.com`)
  - [ ] 1.3 Activer l'API "Google Calendar" (`calendar-json.googleapis.com`) — pour la création d'events avec Meet link
  - [ ] 1.4 Créer un Service Account avec le rôle "Meet API User"
  - [ ] 1.5 Télécharger la clé JSON du Service Account
  - [ ] 1.6 Dans Google Workspace Admin : délégation de domaine au Service Account (pour agir au nom de MiKL)

- [ ] Task 2 — Variables d'environnement
  - [ ] 2.1 Ajouter dans `apps/hub/.env.local` :
    - `GOOGLE_MEET_SERVICE_ACCOUNT_EMAIL`
    - `GOOGLE_MEET_SERVICE_ACCOUNT_KEY` (clé privée JSON encodée en base64)
    - `GOOGLE_MEET_IMPERSONATE_EMAIL` (email compte MiKL Workspace)
  - [ ] 2.2 Ajouter les 3 variables dans `.env.example` avec description (valeurs vides)

- [ ] Task 3 — Package googleapis
  - [ ] 3.1 Installer `googleapis` dans `apps/hub` : `npm install googleapis`
  - [ ] 3.2 Vérifier compatibilité avec Next.js 16 (import côté serveur uniquement)

- [ ] Task 4 — Client Google Meet (`packages/utils` ou `apps/hub/lib/`)
  - [ ] 4.1 Créer `apps/hub/lib/google-meet-client.ts`
  - [ ] 4.2 Initialiser l'auth Google avec le Service Account + impersonation
  - [ ] 4.3 Exporter `googleMeetClient` (meet v2) et `googleCalendarClient` (calendar v3)
  - [ ] 4.4 Guard : si variables manquantes → throw `GOOGLE_MEET_AUTH_ERROR` clair
  - [ ] 4.5 Test : `google-meet-client.test.ts` — mock googleapis, vérifier init + erreur si config manquante

## Dev Notes

### Scopes OAuth2 requis

```
https://www.googleapis.com/auth/meetings.space.created
https://www.googleapis.com/auth/meetings.space.readonly
https://www.googleapis.com/auth/calendar
```

### Structure du client

```typescript
// apps/hub/lib/google-meet-client.ts
import { google } from 'googleapis'

function createGoogleClients() {
  const email = process.env.GOOGLE_MEET_SERVICE_ACCOUNT_EMAIL
  const keyBase64 = process.env.GOOGLE_MEET_SERVICE_ACCOUNT_KEY
  const impersonate = process.env.GOOGLE_MEET_IMPERSONATE_EMAIL

  if (!email || !keyBase64 || !impersonate) {
    throw new Error('GOOGLE_MEET_AUTH_ERROR: variables manquantes')
  }

  const key = Buffer.from(keyBase64, 'base64').toString('utf-8')

  const auth = new google.auth.JWT({
    email,
    key,
    scopes: [
      'https://www.googleapis.com/auth/meetings.space.created',
      'https://www.googleapis.com/auth/meetings.space.readonly',
      'https://www.googleapis.com/auth/calendar',
    ],
    subject: impersonate, // délégation de domaine
  })

  return {
    meet: google.meet({ version: 'v2', auth }),
    calendar: google.calendar({ version: 'v3', auth }),
  }
}

export const { meet: googleMeetClient, calendar: googleCalendarClient } = createGoogleClients()
```

### Fichiers à créer / modifier

```
apps/hub/lib/google-meet-client.ts                    # CRÉER
apps/hub/lib/google-meet-client.test.ts               # CRÉER
apps/hub/.env.local                                   # MODIFIER — ajouter 3 variables
.env.example                                          # MODIFIER — documenter 3 variables
package.json (apps/hub)                               # MODIFIER — ajouter googleapis
```

## File List (auto-generated at completion)

## Completion Notes
