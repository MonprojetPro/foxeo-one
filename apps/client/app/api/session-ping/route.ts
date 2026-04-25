import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@monprojetpro/supabase'

// Endpoint léger utilisé par SessionKeepAlive pour maintenir la session active.
// Le middleware Supabase (seul responsable des tokens) s'exécute automatiquement
// sur cet appel et rafraîchit le JWT si nécessaire.
// Ne jamais faire le refresh côté browser (risque de réutilisation du refresh token).
export async function GET() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  return NextResponse.json({ ok: !!user }, { status: 200 })
}
