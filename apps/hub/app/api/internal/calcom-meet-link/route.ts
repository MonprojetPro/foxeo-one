// API Route: /api/internal/calcom-meet-link
//
// Crée une salle Google Meet pour une réservation Cal.com — T-049 (volet ①).
//
// 🔑 POURQUOI ICI ET PAS DANS L'EDGE FUNCTION `calcom-webhook`. Même raison
// que `/api/cron/sync-meeting-results` (T-050) : les secrets Google
// (`GOOGLE_MEET_REFRESH_TOKEN`, `GOOGLE_CLIENT_ID/SECRET`) vivent sur Vercel,
// pas dans les secrets Supabase Edge. Les poser en double multiplierait les
// endroits où un jeton peut mourir sans qu'on le voie (leçon déjà payée).
// Cette route réutilise `createGoogleMeetSpace` — EXACTEMENT le même cœur que
// `createHubMeeting` et `sendMeetLink`, zéro logique Google dupliquée.
//
// Auth : `Authorization: Bearer <CALCOM_MEET_LINK_SECRET>`. Sans secret
// configuré, la route répond 503 et ne travaille pas — jamais ouverte par
// défaut (même garde que `/api/cron`).
//
// Appelant : supabase/functions/calcom-webhook/index.ts, à la création d'un
// meeting. Non-bloquant côté webhook : un échec ici ne doit jamais empêcher
// la création du rendez-vous, seulement le priver de son lien (comportement
// identique à ce que gardait déjà `createHubMeeting` avant T-049, mais avec
// le motif réel loggé au lieu d'un échec muet).

import { NextRequest, NextResponse } from 'next/server'
import { createGoogleMeetSpace } from '../../../../lib/google-meet-client'
import { describeGoogleMeetFailure } from '../../../../lib/google-meet-error'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}

export async function POST(request: NextRequest) {
  const secret = process.env.CALCOM_MEET_LINK_SECRET
  if (!secret) {
    console.error('[VISIO:CALCOM_MEET_LINK] CALCOM_MEET_LINK_SECRET absent — route désactivée')
    return NextResponse.json({ error: 'Not configured' }, { status: 503 })
  }
  if (request.headers.get('authorization') !== `Bearer ${secret}`) {
    return unauthorized()
  }

  try {
    const { meetSpaceName, meetUri } = await createGoogleMeetSpace()

    if (!meetUri) {
      console.error('[VISIO:CALCOM_MEET_LINK] Google Meet a répondu sans meetingUri')
      return NextResponse.json({ error: 'NO_MEET_URI' }, { status: 502 })
    }

    return NextResponse.json({ data: { meetSpaceName, meetUri } })
  } catch (err) {
    const failure = describeGoogleMeetFailure(err)
    console.error(`[VISIO:CALCOM_MEET_LINK] Google Meet ${failure.kind}:`, failure.detail)
    return NextResponse.json({ error: failure.kind, detail: failure.detail }, { status: 502 })
  }
}
