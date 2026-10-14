/**
 * Client Google Meet API v2 + Google Calendar API v3
 * Utilise OAuth2 avec refresh token (compte MiKL Workspace)
 * Story 15.1 — Auth Google Meet API
 */

import { google } from 'googleapis'

/**
 * Erreur de CONFIGURATION — à ne jamais confondre avec un refus de Google.
 *
 * « Variable absente » et « Google refuse » demandent deux réparations
 * totalement différentes : poser un secret sur Vercel d'un côté, régénérer un
 * jeton ou activer une API de l'autre. Les confondre dans un seul message fait
 * chercher au mauvais endroit — c'est ce qui s'est produit au premier envoi
 * réel du 2026-10-14 (T-052).
 *
 * ⚠️ On nomme la variable manquante, JAMAIS sa valeur.
 */
export class GoogleMeetConfigError extends Error {
  readonly missing: string[]

  constructor(missing: string[]) {
    super(`GOOGLE_MEET_CONFIG_MISSING: ${missing.join(', ')}`)
    this.name = 'GoogleMeetConfigError'
    this.missing = missing
  }
}

function createGoogleClients() {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  const refreshToken = process.env.GOOGLE_MEET_REFRESH_TOKEN

  const missing: string[] = []
  if (!clientId) missing.push('GOOGLE_CLIENT_ID')
  if (!clientSecret) missing.push('GOOGLE_CLIENT_SECRET')
  if (!refreshToken) missing.push('GOOGLE_MEET_REFRESH_TOKEN')

  if (missing.length > 0) {
    throw new GoogleMeetConfigError(missing)
  }

  const auth = new google.auth.OAuth2(clientId, clientSecret)
  auth.setCredentials({ refresh_token: refreshToken })

  return {
    meet: google.meet({ version: 'v2', auth }),
    calendar: google.calendar({ version: 'v3', auth }),
  }
}

export function getGoogleMeetClient() {
  return createGoogleClients().meet
}

export function getGoogleCalendarClient() {
  return createGoogleClients().calendar
}
