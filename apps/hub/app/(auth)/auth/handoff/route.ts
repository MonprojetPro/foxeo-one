import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { getLoginEntryUrl } from '@monprojetpro/utils'

// Entrée de connexion UNIQUE — arrivée côté Hub (décision MiKL du 2026-08-03).
//
// L'opérateur s'authentifie sur l'unique page de login (app client). Le Hub vivant sur
// un autre sous-domaine, aucun cookie n'y est partagé : la page de login émet un jeton
// à usage unique (buildHubHandoffLink) que cette route consomme pour poser ici la
// session. Chemin PUBLIC — au moment où l'on arrive, aucune session n'existe encore
// dans ce navigateur, c'est cette requête qui la crée.
//
// La session posée est en AAL1 : le middleware réclame ensuite le code 2FA, exactement
// comme pour une connexion directe. Cette passerelle raccourcit le chemin, jamais les
// exigences.

function fail(reason: string) {
  const url = new URL(getLoginEntryUrl())
  url.searchParams.set('error', reason)
  return NextResponse.redirect(url)
}

export async function GET(request: NextRequest) {
  const tokenHash = new URL(request.url).searchParams.get('token_hash')

  if (!tokenHash) {
    return fail('handoff_invalid')
  }

  const supabase = await createServerSupabaseClient()

  // 1. Consommer le jeton → session posée en cookies côté serveur.
  const { data: verified, error: verifyError } = await supabase.auth.verifyOtp({
    type: 'magiclink',
    token_hash: tokenHash,
  })

  if (verifyError || !verified.user) {
    console.error('[HUB:HANDOFF] verifyOtp échoué:', verifyError?.message)
    return fail('handoff_expired')
  }

  // 2. Ceinture ET bretelles : le jeton n'est émis que pour un opérateur, mais on le
  // revérifie ici plutôt que de faire confiance à l'émetteur. Résolution par
  // auth_user_id — jamais par email, qui vit à deux endroits que rien n'oblige à
  // rester synchronisés (incident du 2026-07-27).
  const { data: operator } = await supabase
    .from('operators')
    .select('id')
    .eq('auth_user_id', verified.user.id)
    .maybeSingle()

  if (!operator) {
    // Un compte non-opérateur n'a rien à faire ici : on referme la session posée
    // à l'étape 1 plutôt que de laisser traîner un accès inutile.
    await supabase.auth.signOut()
    console.error('[HUB:HANDOFF] Compte non-opérateur refusé:', verified.user.id)
    return fail('handoff_unauthorized')
  }

  // 3. Le middleware prend le relais : il exigera le code 2FA avant d'ouvrir le cockpit.
  return NextResponse.redirect(new URL('/', request.url))
}
