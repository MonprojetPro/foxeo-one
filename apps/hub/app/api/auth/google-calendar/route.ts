// API Route: /api/auth/google-calendar
// ?label=MonCalendrier&color=#06b6d4
import { NextRequest, NextResponse } from 'next/server'

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
const SCOPES = [
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/calendar.events',
  'openid',
  'email',
].join(' ')

export async function GET(req: NextRequest) {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3002'

  if (!clientId) {
    return NextResponse.json({ error: 'GOOGLE_CLIENT_ID manquant' }, { status: 500 })
  }

  const label = req.nextUrl.searchParams.get('label') || 'Google'
  const color = req.nextUrl.searchParams.get('color') || '#06b6d4'
  const state = crypto.randomUUID()
  const redirectUri = `${appUrl}/api/auth/google-calendar/callback`

  const url = new URL(GOOGLE_AUTH_URL)
  url.searchParams.set('client_id', clientId)
  url.searchParams.set('redirect_uri', redirectUri)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('scope', SCOPES)
  url.searchParams.set('access_type', 'offline')
  url.searchParams.set('prompt', 'consent')
  url.searchParams.set('state', state)

  const response = NextResponse.redirect(url.toString())
  response.cookies.set('google_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600,
    path: '/',
  })
  // Stocker label + color pour le callback
  response.cookies.set('google_oauth_meta', JSON.stringify({ label, color }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600,
    path: '/',
  })

  return response
}
