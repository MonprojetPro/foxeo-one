// API Route: /api/auth/google-calendar/callback
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@monprojetpro/supabase'

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v3/userinfo'

interface GoogleTokenResponse {
  access_token: string
  refresh_token?: string
  expires_in: number
  scope: string
}

export async function GET(req: NextRequest) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3002'
  const agendaUrl = `${appUrl}/modules/agenda`

  try {
    const { searchParams } = new URL(req.url)
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')

    if (error) return NextResponse.redirect(`${agendaUrl}?calendar_error=access_denied`)

    const savedState = req.cookies.get('google_oauth_state')?.value
    if (!state || state !== savedState) {
      return NextResponse.redirect(`${agendaUrl}?calendar_error=invalid_state`)
    }
    if (!code) return NextResponse.redirect(`${agendaUrl}?calendar_error=missing_code`)

    // Récupérer label + color depuis le cookie
    let label = 'Google'
    let color = '#06b6d4'
    try {
      const meta = JSON.parse(req.cookies.get('google_oauth_meta')?.value ?? '{}')
      if (meta.label) label = meta.label
      if (meta.color) color = meta.color
    } catch { /* non bloquant */ }

    const clientId = process.env.GOOGLE_CLIENT_ID
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET
    const redirectUri = `${appUrl}/api/auth/google-calendar/callback`

    if (!clientId || !clientSecret) {
      return NextResponse.redirect(`${agendaUrl}?calendar_error=not_configured`)
    }

    // Échange du code
    const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code, client_id: clientId, client_secret: clientSecret,
        redirect_uri: redirectUri, grant_type: 'authorization_code',
      }),
    })

    if (!tokenRes.ok) {
      console.error('[GOOGLE_OAUTH] Token exchange failed:', await tokenRes.text())
      return NextResponse.redirect(`${agendaUrl}?calendar_error=token_exchange_failed`)
    }

    const tokens: GoogleTokenResponse = await tokenRes.json()
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString()

    // Email du compte Google
    let email: string | undefined
    try {
      const userRes = await fetch(GOOGLE_USERINFO_URL, {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      })
      if (userRes.ok) {
        const info = await userRes.json()
        email = info.email
      }
    } catch { /* non bloquant */ }

    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.redirect(`${agendaUrl}?calendar_error=not_authenticated`)
    }

    const { error: upsertError } = await supabase
      .from('calendar_integrations')
      .upsert({
        user_id: user.id,
        provider: 'google',
        label,
        color,
        connected: true,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token ?? null,
        token_expires_at: expiresAt,
        metadata: { scope: tokens.scope, email },
      }, { onConflict: 'user_id,provider,label' })

    if (upsertError) {
      console.error('[GOOGLE_OAUTH] DB upsert error:', upsertError)
      return NextResponse.redirect(`${agendaUrl}?calendar_error=db_error`)
    }

    const response = NextResponse.redirect(
      `${agendaUrl}?calendar_connected=google&label=${encodeURIComponent(label)}`
    )
    response.cookies.delete('google_oauth_state')
    response.cookies.delete('google_oauth_meta')
    return response

  } catch (err) {
    console.error('[GOOGLE_OAUTH] Unexpected error:', err)
    return NextResponse.redirect(`${agendaUrl}?calendar_error=unexpected`)
  }
}
