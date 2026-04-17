// Story 13-9 — Edge Function : sync-accountant-emails
// DÉSACTIVÉE PAR DÉFAUT — sera activée quand MiKL fournit un vrai email de référence.
//
// Cron (à décommenter dans supabase/config.toml quand prêt) :
// [functions.sync-accountant-emails]
// cron = "0 9 * * *"   # 9h00 UTC chaque jour
//
// Scope Gmail requis (à ajouter à l'OAuth app Google Workspace) :
//   https://www.googleapis.com/auth/gmail.readonly
//   https://www.googleapis.com/auth/gmail.modify

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { parseAccountantEmail } from './email-parser.ts'

// ── Types locaux (pas d'import workspace en Edge Function) ────────────────────

interface SystemConfigRow {
  key: string
  value: string
}

interface GmailMessage {
  id: string
  threadId: string
}

interface GmailListResponse {
  messages?: GmailMessage[]
  nextPageToken?: string
}

interface GmailMessagePayload {
  headers?: { name: string; value: string }[]
  snippet?: string
}

interface GmailMessageDetail {
  id: string
  payload?: GmailMessagePayload
  snippet?: string
}

// ── Constants ─────────────────────────────────────────────────────────────────

const GMAIL_API_BASE = 'https://gmail.googleapis.com/gmail/v1/users/me'

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseConfigString(value: string): string {
  try { return JSON.parse(value) } catch { return value }
}

function getHeader(payload: GmailMessagePayload, name: string): string {
  return payload.headers?.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value ?? ''
}

// ── Main ──────────────────────────────────────────────────────────────────────

serve(async () => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, serviceRoleKey)

  // 1. Vérifier que la synchro est activée
  const { data: configRows, error: configError } = await supabase
    .from('system_config')
    .select('key, value')
    .in('key', ['accountant_email_sync_enabled', 'accountant_email', 'google_workspace_access_token'])

  if (configError) {
    console.error('[sync-accountant-emails] Erreur lecture system_config:', configError.message)
    return new Response(JSON.stringify({ error: configError.message }), { status: 500 })
  }

  const config = new Map((configRows as SystemConfigRow[]).map((r) => [r.key, r.value]))

  const syncEnabled = config.get('accountant_email_sync_enabled') === 'true'
  if (!syncEnabled) {
    console.log('[sync-accountant-emails] Synchro désactivée — exit early')
    return new Response(JSON.stringify({ skipped: true, reason: 'sync_disabled' }), { status: 200 })
  }

  const accountantEmail = parseConfigString(config.get('accountant_email') ?? '')
  if (!accountantEmail) {
    console.log('[sync-accountant-emails] Aucun email comptable configuré — exit early')
    return new Response(JSON.stringify({ skipped: true, reason: 'no_accountant_email' }), { status: 200 })
  }

  const accessToken = parseConfigString(config.get('google_workspace_access_token') ?? '')
  if (!accessToken) {
    console.error('[sync-accountant-emails] Pas de token Google Workspace — synchro impossible')
    return new Response(JSON.stringify({ error: 'no_access_token' }), { status: 500 })
  }

  // 2. Lister les emails non lus de l'adresse comptable
  const listUrl = `${GMAIL_API_BASE}/messages?q=${encodeURIComponent(`from:${accountantEmail} is:unread`)}`
  const listRes = await fetch(listUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!listRes.ok) {
    const err = await listRes.text()
    console.error('[sync-accountant-emails] Erreur Gmail list:', err)
    return new Response(JSON.stringify({ error: 'gmail_list_failed' }), { status: 502 })
  }

  const listData: GmailListResponse = await listRes.json()
  const messages = listData.messages ?? []
  console.log(`[sync-accountant-emails] ${messages.length} message(s) non lu(s) trouvé(s)`)

  let inserted = 0
  let skipped = 0

  for (const msg of messages) {
    // 3. Récupérer le détail de chaque email
    const detailRes = await fetch(`${GMAIL_API_BASE}/messages/${msg.id}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })

    if (!detailRes.ok) {
      console.error(`[sync-accountant-emails] Erreur lecture message ${msg.id}`)
      continue
    }

    const detail: GmailMessageDetail = await detailRes.json()
    const subject = getHeader(detail.payload ?? {}, 'subject')
    const snippet = detail.snippet ?? ''

    // 4. Parser l'email (stub actuel)
    const parsed = parseAccountantEmail(subject, snippet)

    // 5. Insérer en base si pas déjà traité (raw_email_id unique)
    const { error: insertError } = await supabase
      .from('accountant_notifications')
      .insert({
        type: parsed.type,
        title: parsed.title,
        body: parsed.body,
        source_email: accountantEmail,
        raw_email_id: msg.id,
        status: 'unread',
      })

    if (insertError) {
      if (insertError.code === '23505') {
        // Violation de contrainte unique — déjà traité
        skipped++
      } else {
        console.error(`[sync-accountant-emails] Erreur insert notification:`, insertError.message)
      }
      continue
    }

    // 6. Marquer l'email comme lu dans Gmail
    await fetch(`${GMAIL_API_BASE}/messages/${msg.id}/modify`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ removeLabelIds: ['UNREAD'] }),
    })

    inserted++
  }

  console.log(`[sync-accountant-emails] Terminé — insérés: ${inserted}, ignorés (déjà traités): ${skipped}`)
  return new Response(JSON.stringify({ inserted, skipped }), { status: 200 })
})
