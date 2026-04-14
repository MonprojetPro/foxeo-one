import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code')
  const state = req.nextUrl.searchParams.get('state')
  const error = req.nextUrl.searchParams.get('error')

  console.log('[GMAIL_CALLBACK] code:', !!code, 'state:', !!state, 'error:', error)

  // Construire les URLs depuis l'origin de la requête (cohérent avec auth/route.ts)
  const origin = req.nextUrl.origin
  const callbackUrl = `${origin}/api/gmail/callback`

  // Décoder le state (userId + returnTo)
  let userId: string | null = null
  let returnTo = '/modules/crm'
  if (state) {
    try {
      const decoded = JSON.parse(Buffer.from(decodeURIComponent(state), 'base64').toString('utf-8'))
      userId = decoded.userId ?? null
      returnTo = decoded.returnTo ?? '/modules/crm'
      console.log('[GMAIL_CALLBACK] decoded state:', { userId, returnTo })
    } catch {
      // state malformé — fallback (ancienne version sans userId)
      console.warn('[GMAIL_CALLBACK] state decode failed, falling back to decodeURIComponent')
      returnTo = decodeURIComponent(state)
    }
  }

  if (error || !code) {
    console.error('[GMAIL_CALLBACK] OAuth error or missing code:', error)
    return NextResponse.redirect(`${origin}${returnTo}?gmail_error=access_denied`)
  }

  if (!userId) {
    console.error('[GMAIL_CALLBACK] Missing userId in state')
    return NextResponse.redirect(`${origin}${returnTo}?gmail_error=missing_user_id`)
  }

  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    console.error('[GMAIL_CALLBACK] Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET')
    return NextResponse.redirect(`${origin}${returnTo}?gmail_error=config`)
  }

  // Échanger le code contre des tokens
  console.log('[GMAIL_CALLBACK] Exchanging code for tokens, redirect_uri:', callbackUrl)
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: callbackUrl,
      grant_type: 'authorization_code',
    }),
  })

  console.log('[GMAIL_CALLBACK] token exchange status:', tokenRes.status)

  if (!tokenRes.ok) {
    const errText = await tokenRes.text()
    console.error('[GMAIL_CALLBACK] Token exchange failed:', errText)
    return NextResponse.redirect(`${origin}${returnTo}?gmail_error=token_exchange`)
  }

  const tokens = await tokenRes.json()
  const { access_token, refresh_token, expires_in } = tokens

  // Récupérer l'adresse Gmail via l'API Gmail (scope gmail.readonly suffit)
  const profileRes = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/profile', {
    headers: { Authorization: `Bearer ${access_token}` },
  })
  const profile = await profileRes.json()
  const gmailEmail = (profile.emailAddress ?? profile.email) as string | undefined

  console.log('[GMAIL_CALLBACK] gmailEmail:', gmailEmail)

  if (!gmailEmail) {
    console.error('[GMAIL_CALLBACK] No email in profile response:', profile)
    return NextResponse.redirect(`${origin}${returnTo}?gmail_error=no_email`)
  }

  // Utiliser le service role pour bypass RLS (pas de cookies dans la callback OAuth)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  const adminClient = createClient(supabaseUrl, serviceRoleKey)

  const tokenExpiry = new Date(Date.now() + (expires_in ?? 3600) * 1000).toISOString()

  const { error: upsertError } = await adminClient
    .from('gmail_integrations')
    .upsert(
      {
        operator_id: userId,
        gmail_email: gmailEmail,
        access_token,
        refresh_token: refresh_token ?? null,
        token_expiry: tokenExpiry,
      },
      { onConflict: 'operator_id' }
    )

  if (upsertError) {
    console.error('[GMAIL_CALLBACK] Upsert error:', upsertError)
    return NextResponse.redirect(
      `${origin}${returnTo}?gmail_error=db_error&detail=${encodeURIComponent(upsertError.message)}`
    )
  }

  console.log('[GMAIL_CALLBACK] Success — gmail connected for userId:', userId)
  return NextResponse.redirect(`${origin}${returnTo}?gmail_connected=1`)
}
