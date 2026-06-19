import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@monprojetpro/supabase'

// Supabase auth callback — chemin PUBLIC (cf. middleware PUBLIC_PATHS '/auth/callback').
// Utilisé par :
//  - le lien « mot de passe oublié » (forgotPasswordAction → resetPasswordForEmail)
//  - le lien d'invitation Lab (LOT C — sendWelcomeLabInvite → generateLink recovery)
// Échange le code PKCE contre une session puis redirige vers la page cible (next).
//
// Note : un précédent handler existe sous /api/auth/callback mais ce chemin n'est PAS
// public dans le middleware → inatteignable sans session. C'est CE chemin-ci (/auth/callback)
// qui est référencé par le middleware et les redirectTo. À consolider ultérieurement.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const supabase = await createServerSupabaseClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=callback_failed`)
}
