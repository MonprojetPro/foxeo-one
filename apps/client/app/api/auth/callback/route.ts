import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@monprojetpro/supabase'

// Supabase auth callback — utilisé par le lien de réinitialisation de mot de passe.
// Échange le code PKCE contre une session, puis redirige vers la page cible.
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
