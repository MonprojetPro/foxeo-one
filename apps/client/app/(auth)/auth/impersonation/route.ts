import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerSupabaseClient } from '@monprojetpro/supabase'
import {
  IMPERSONATION_COOKIE,
  IMPERSONATION_COOKIE_MAX_AGE_S,
} from '../../../../impersonation-session'

// Story 13.3 (correctif 2026-07-25) — Callback d'impersonation.
//
// Chemin PUBLIC (cf. middleware PUBLIC_PATHS) : au moment où MiKL arrive ici, aucune
// session client n'existe encore dans ce navigateur — c'est précisément cette requête
// qui la crée.
//
// Consomme le `token_hash` généré côté Hub (buildImpersonationLink → generateLink admin)
// avec verifyOtp() : la session du COMPTE CLIENT est posée en cookies côté serveur.
// Puis on pose le cookie d'impersonation (httpOnly) qui déclenche la bannière rouge et
// les garde-fous du middleware.
//
// ⚠️ Next n'autorise dans un route.ts que les handlers (GET/POST/…) et quelques options
// réservées : les constantes partagées vivent dans apps/client/impersonation-session.ts,
// sinon `next build` échoue sur un export invalide.

function fail(request: NextRequest, reason: string) {
  const url = new URL('/login', request.url)
  url.searchParams.set('error', reason)
  return NextResponse.redirect(url)
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const tokenHash = searchParams.get('token_hash')
  const sessionId = searchParams.get('session')

  if (!tokenHash || !sessionId) {
    return fail(request, 'impersonation_invalid')
  }

  const supabase = await createServerSupabaseClient()

  // 1. Consommer le jeton → crée la session du compte client (cookies posés ici).
  const { data: verified, error: verifyError } = await supabase.auth.verifyOtp({
    type: 'magiclink',
    token_hash: tokenHash,
  })

  if (verifyError || !verified.user) {
    console.error('[IMPERSONATION:CALLBACK] verifyOtp error:', verifyError?.message)
    return fail(request, 'impersonation_expired')
  }

  // 2. La session d'impersonation doit exister, être active, non expirée, et porter
  // sur le compte qu'on vient d'ouvrir. La policy RLS client
  // (client_auth_user_id = auth.uid()) garantit qu'on ne lit que la sienne.
  const { data: session } = await supabase
    .from('impersonation_sessions')
    .select('id, status, expires_at, client_auth_user_id')
    .eq('id', sessionId)
    .maybeSingle()

  const isUsable =
    session &&
    session.status === 'active' &&
    session.client_auth_user_id === verified.user.id &&
    new Date(session.expires_at) > new Date()

  if (!isUsable) {
    console.error('[IMPERSONATION:CALLBACK] Session inutilisable:', sessionId)
    await supabase.auth.signOut()
    return fail(request, 'impersonation_invalid')
  }

  // 3. Cookie d'impersonation — httpOnly : la bannière est alimentée par le layout
  // serveur, aucun besoin d'y accéder en JS, et l'opérateur ne peut pas le retirer
  // depuis la console pour masquer la bannière.
  const cookieStore = await cookies()
  cookieStore.set(
    IMPERSONATION_COOKIE,
    encodeURIComponent(
      JSON.stringify({ sessionId: session.id, expiresAt: session.expires_at })
    ),
    {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: IMPERSONATION_COOKIE_MAX_AGE_S,
    }
  )

  return NextResponse.redirect(new URL('/', request.url))
}
