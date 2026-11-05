import { NextRequest, NextResponse } from 'next/server'
import type { EmailOtpType } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '@monprojetpro/supabase'

// Supabase auth callback — chemin PUBLIC (cf. middleware PUBLIC_PATHS '/auth/callback').
// Utilisé par :
//  - le lien « mot de passe oublié » (forgotPasswordAction → resetPasswordForEmail, PKCE
//    côté navigateur) → arrive avec `?code=`
//  - le lien d'invitation Lab/One (sendWelcomeLabInvite/sendWelcomeOneInvite →
//    generatePasswordSetupLink, genere cote serveur via l'Admin API) → arrive avec
//    `?token_hash=`&`type=` (T-073 : l'Admin API ne peut pas produire de `?code=` PKCE,
//    seulement un flow implicite dont les tokens partent dans le fragment `#`, jamais
//    recu par ce handler serveur — d'ou la verification directe via verifyOtp ici)
//
// Note : un précédent handler existe sous /api/auth/callback mais ce chemin n'est PAS
// public dans le middleware → inatteignable sans session. C'est CE chemin-ci (/auth/callback)
// qui est référencé par le middleware et les redirectTo. À consolider ultérieurement.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const next = searchParams.get('next') ?? '/'

  const supabase = await createServerSupabaseClient()

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=callback_failed`)
}
