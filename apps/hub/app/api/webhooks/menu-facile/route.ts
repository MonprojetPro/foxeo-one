// API Route: /api/webhooks/menu-facile
// Reçoit les événements pertinents de MenuFacile (produit externe) et crée une
// notification dans la cloche du Hub pour MiKL (opérateur).
//
// Auth : header `Authorization: Bearer <MENUFACILE_WEBHOOK_SECRET>` (secret partagé,
// défini côté Hub ET côté MenuFacile). Réponse toujours 200 si traité (idempotent).
//
// Contrat attendu (body JSON) :
//   { "event": "new_contact_message" | "contact_reply" | "new_report",
//     "household_name"?: string, "topic"?: string, "reason"?: string,
//     "excerpt"?: string }

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

type MenuFacileEvent = 'new_contact_message' | 'contact_reply' | 'new_report'

interface MenuFacilePayload {
  event?: MenuFacileEvent
  household_name?: string
  topic?: string
  reason?: string
  excerpt?: string
}

const LINK = '/modules/menu-facile'

function buildNotification(p: MenuFacilePayload): {
  type: 'message' | 'alert'
  title: string
  body: string | null
} | null {
  const who = p.household_name ? ` (${p.household_name})` : ''
  const excerpt = p.excerpt ? ` — « ${p.excerpt.slice(0, 120)} »` : ''
  switch (p.event) {
    case 'new_contact_message':
      return {
        type: 'message',
        title: `MenuFacile — nouveau message${who}`,
        body: `${p.topic ? `[${p.topic}] ` : ''}Un utilisateur t'a écrit${excerpt}`,
      }
    case 'contact_reply':
      return {
        type: 'message',
        title: `MenuFacile — réponse d'un utilisateur${who}`,
        body: `Le fil a été relancé${excerpt}`,
      }
    case 'new_report':
      return {
        type: 'alert',
        title: `MenuFacile — nouveau signalement`,
        body: `${p.reason ? `Motif : ${p.reason}` : 'Une recette a été signalée'}${who}`,
      }
    default:
      return null
  }
}

export async function POST(req: NextRequest) {
  // 1. Auth par secret partagé
  const secret = process.env.MENUFACILE_WEBHOOK_SECRET
  if (!secret) {
    console.error('[MENUFACILE_WEBHOOK] MENUFACILE_WEBHOOK_SECRET manquant')
    return NextResponse.json({ error: 'server misconfigured' }, { status: 500 })
  }
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'invalid token' }, { status: 401 })
  }

  // 2. Parse
  let payload: MenuFacilePayload
  try {
    payload = (await req.json()) as MenuFacilePayload
  } catch {
    return NextResponse.json({ error: 'invalid JSON' }, { status: 400 })
  }

  const notif = buildNotification(payload)
  if (!notif) {
    return NextResponse.json({ received: true, handled: false, reason: 'unknown event' })
  }

  // 3. Service-role (le webhook n'a pas de session → bypass RLS)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) {
    console.error('[MENUFACILE_WEBHOOK] SUPABASE env vars manquantes')
    return NextResponse.json({ error: 'server misconfigured' }, { status: 500 })
  }
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  // 4. Destinataires = tous les opérateurs (MiKL)
  const { data: operators, error: opError } = await supabase
    .from('operators')
    .select('auth_user_id')

  if (opError) {
    console.error('[MENUFACILE_WEBHOOK] Erreur lecture operators:', opError)
    return NextResponse.json({ error: 'db error' }, { status: 500 })
  }

  const rows = (operators ?? [])
    .filter((op: { auth_user_id: string | null }) => op.auth_user_id)
    .map((op: { auth_user_id: string | null }) => ({
      recipient_type: 'operator',
      recipient_id: op.auth_user_id,
      type: notif.type,
      title: notif.title,
      body: notif.body,
      link: LINK,
    }))

  if (rows.length > 0) {
    const { error: insertError } = await supabase.from('notifications').insert(rows)
    if (insertError) {
      console.error('[MENUFACILE_WEBHOOK] Erreur insert notifications:', insertError)
      return NextResponse.json({ error: 'db error' }, { status: 500 })
    }
  }

  return NextResponse.json({ received: true, handled: true, notified: rows.length })
}
