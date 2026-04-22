/**
 * Client Google Meet API v2 + Google Calendar API v3
 * Utilise OAuth2 avec refresh token (compte MiKL Workspace)
 * Story 15.1 — Auth Google Meet API
 */

import { google } from 'googleapis'

function createGoogleClients() {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  const refreshToken = process.env.GOOGLE_MEET_REFRESH_TOKEN

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error(
      'GOOGLE_MEET_AUTH_ERROR: variables manquantes (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_MEET_REFRESH_TOKEN)'
    )
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
