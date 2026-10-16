// API Route: /api/cron/sync-meeting-results
//
// Rattrapage des transcriptions de visio — T-050.
//
// 🔑 POURQUOI CETTE ROUTE EXISTE. Le seul déclencheur de la récupération était
// `endMeeting`, qui l'appelait en tâche de fond IMMÉDIATEMENT après l'appel.
// Google met plusieurs minutes à produire sa transcription : à cet instant
// l'API ne rend rien, la synchro sort bredouille — et PERSONNE ne repassait.
// La transcription était donc demandée une fois, trop tôt, et plus jamais.
//
// 🔑 POURQUOI ICI ET PAS DANS UNE EDGE FUNCTION. Les secrets Google
// (`GOOGLE_MEET_REFRESH_TOKEN`, `GOOGLE_CLIENT_ID/SECRET`) vivent sur Vercel,
// pas dans les secrets Supabase (leçon : secrets Vercel ≠ secrets Edge). Les
// porter en double multiplierait les endroits où un jeton peut mourir sans
// qu'on le voie. La route réutilise donc EXACTEMENT le même cœur que le
// bouton « Récupérer maintenant » — zéro logique Google dupliquée.
//
// Auth : `Authorization: Bearer <CRON_SECRET>`. Sans secret configuré, la
// route répond 503 et ne travaille pas : jamais ouverte par défaut.
//
// Déclenchement : pg_cron, toutes les 15 minutes
// (voir supabase/migrations/20261016113000_schedule_visio_transcript_cron.sql).

import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleSupabaseClient } from '@monprojetpro/supabase'
import {
  syncMeetingResultsCore,
  shouldAttemptTranscriptSync,
  hasExceededGiveUpDelay,
  readTranscriptSyncState,
} from '@monprojetpro/module-visio'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Fenêtre de sélection : au-delà, même l'abandon a déjà été enregistré. */
const LOOKBACK_HOURS = 26

/** Garde-fou : un cron ne doit jamais partir en traitement de masse. */
const MAX_MEETINGS_PER_RUN = 20

interface CandidateRow {
  id: string
  title: string
  ended_at: string | null
  meet_space_name: string | null
  metadata: Record<string, unknown> | null
}

function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}

export async function POST(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    console.error('[VISIO:CRON] CRON_SECRET absent — rattrapage désactivé')
    return NextResponse.json({ error: 'Cron not configured' }, { status: 503 })
  }
  if (request.headers.get('authorization') !== `Bearer ${secret}`) {
    return unauthorized()
  }

  const supabase = createServiceRoleSupabaseClient()
  const now = Date.now()
  const since = new Date(now - LOOKBACK_HOURS * 60 * 60 * 1000).toISOString()

  const { data: meetings, error } = await supabase
    .from('meetings')
    .select('id, title, ended_at, meet_space_name, metadata')
    .eq('status', 'completed')
    .not('meet_space_name', 'is', null)
    .gte('ended_at', since)
    .order('ended_at', { ascending: true })
    .limit(MAX_MEETINGS_PER_RUN * 3)

  if (error) {
    console.error('[VISIO:CRON] Lecture des visios échouée:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const rows = (meetings ?? []) as CandidateRow[]

  // ── Abandon : les visios trop anciennes cessent d'être réessayées, et ça
  //    s'écrit. Un rattrapage qui s'arrête en silence laisse l'écran afficher
  //    « en cours » pour l'éternité.
  const givingUp = rows.filter((m) => {
    if (!hasExceededGiveUpDelay(m.ended_at, now)) return false
    const state = readTranscriptSyncState(m.metadata)
    return !state.done && !state.gaveUpAt
  })

  for (const meeting of givingUp) {
    const metadata = (meeting.metadata ?? {}) as Record<string, unknown>
    const previous = (metadata.transcript_sync ?? {}) as Record<string, unknown>
    const { error: giveUpError } = await supabase
      .from('meetings')
      .update({
        metadata: {
          ...metadata,
          transcript_sync: { ...previous, gaveUpAt: new Date().toISOString() },
        },
      })
      .eq('id', meeting.id)
    if (giveUpError) console.error('[VISIO:CRON] Abandon non tracé:', giveUpError.message)
  }

  const eligible = rows.filter((m) => shouldAttemptTranscriptSync(m, now))
  const candidates = eligible.slice(0, MAX_MEETINGS_PER_RUN)

  // 🔕 PAS DE TRONCATURE SILENCIEUSE : si le plafond coupe, on le dit.
  if (eligible.length > candidates.length) {
    console.warn(
      `[VISIO:CRON] ${eligible.length} visios éligibles, ${candidates.length} traitées ce tour (plafond ${MAX_MEETINGS_PER_RUN}). Le reste passera au tour suivant.`
    )
  }

  const results: Array<{ meetingId: string; reason: string; archived: boolean }> = []

  for (const meeting of candidates) {
    try {
      const outcome = await syncMeetingResultsCore(supabase, meeting.id)
      results.push({
        meetingId: meeting.id,
        reason: outcome.reason,
        archived: outcome.archived,
      })
    } catch (err) {
      // Une visio qui casse ne doit pas emporter les suivantes.
      console.error('[VISIO:CRON] Échec sur la visio', meeting.id, err)
      results.push({ meetingId: meeting.id, reason: 'exception', archived: false })
    }
  }

  const archived = results.filter((r) => r.archived).length
  console.log(
    `[VISIO:CRON] ${candidates.length} visio(s) traitée(s), ${archived} compte(s) rendu(s) déposé(s), ${givingUp.length} abandon(s).`
  )

  return NextResponse.json({
    processed: candidates.length,
    archived,
    gaveUp: givingUp.length,
    results,
  })
}
