import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@monprojetpro/supabase'

const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.modify',
].join(' ')

export async function GET(req: NextRequest) {
  const clientId = process.env.GOOGLE_CLIENT_ID
  if (!clientId) {
    return NextResponse.json({ error: 'GOOGLE_CLIENT_ID manquant' }, { status: 500 })
  }

  const returnTo = req.nextUrl.searchParams.get('returnTo') ?? '/modules/crm'

  // Récupérer le user ID ici (cookies présents, utilisateur connecté)
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  // Encoder userId + returnTo dans le state (base64 standard + encodeURIComponent pour compatibilité Node/URL)
  const statePayload = encodeURIComponent(
    Buffer.from(JSON.stringify({ userId: user.id, returnTo })).toString('base64')
  )

  // Construire callbackUrl depuis l'origin de la requête (plus fiable que l'env var)
  const callbackUrl = `${req.nextUrl.origin}/api/gmail/callback`

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: callbackUrl,
    response_type: 'code',
    scope: SCOPES,
    access_type: 'offline',
    prompt: 'consent',
    state: statePayload,
  })

  return NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`)
}
