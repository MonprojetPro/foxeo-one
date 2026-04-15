// API Route: /api/webhooks/pennylane/paid
// Story 13.4 — Webhook Pennylane "facture payee" → activation automatique du compte client
//
// Flow:
//  1. Verify HMAC signature (x-pennylane-signature)
//  2. Parse payload, extraire pennylane_invoice_id + pennylane_quote_id
//  3. Match quote_metadata
//  4. Dispatch vers le bon handler selon quote_type
//  5. Retourner 200 OK (idempotent) meme si rien a faire

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  verifyPennylaneHmac,
  matchQuoteFromInvoice,
  dispatchPaidQuote,
} from '@monprojetpro/modules-facturation/server'

export const runtime = 'nodejs'

// Extract invoice id + quote id depuis le payload Pennylane. La doc Pennylane
// n'est pas stable sur tous les endpoints — on accepte plusieurs clefs.
interface PennylanePaidPayload {
  invoice?: { id?: string | number; quote_id?: string | number }
  quote?: { id?: string | number }
  pennylane_invoice_id?: string | number
  pennylane_quote_id?: string | number
  invoice_id?: string | number
  quote_id?: string | number
}

function extractIds(body: unknown): { invoiceId: string | null; quoteId: string | null } {
  const payload = (body ?? {}) as PennylanePaidPayload
  const invoiceId =
    payload.pennylane_invoice_id ?? payload.invoice_id ?? payload.invoice?.id ?? null
  const quoteId =
    payload.pennylane_quote_id ??
    payload.quote_id ??
    payload.quote?.id ??
    payload.invoice?.quote_id ??
    null
  return {
    invoiceId: invoiceId !== null && invoiceId !== undefined ? String(invoiceId) : null,
    quoteId: quoteId !== null && quoteId !== undefined ? String(quoteId) : null,
  }
}

async function sendDirectEmail(
  template: 'welcome-lab' | 'welcome-one' | 'final-payment-confirmation',
  to: string,
  data: Record<string, unknown>
): Promise<{ success: boolean; error?: string }> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) {
    return { success: false, error: 'SUPABASE env vars missing' }
  }

  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ to, template, data }),
    })
    if (!response.ok) {
      const text = await response.text()
      return { success: false, error: `send-email ${response.status}: ${text}` }
    }
    const json = (await response.json()) as { success?: boolean; error?: string }
    return {
      success: json.success === true,
      error: json.error,
    }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) }
  }
}

export async function POST(req: NextRequest) {
  // 1. Read raw body (needed for HMAC)
  const rawBody = await req.text()

  // 2. Verify HMAC
  const signature = req.headers.get('x-pennylane-signature')
  const secret = process.env.PENNYLANE_WEBHOOK_SECRET ?? null

  if (!secret) {
    // Misconfigured env : on rejette plutot que d'accepter aveuglement
    console.error('[PENNYLANE_WEBHOOK] PENNYLANE_WEBHOOK_SECRET missing')
    return NextResponse.json({ error: 'server misconfigured' }, { status: 500 })
  }

  if (!verifyPennylaneHmac(rawBody, signature, secret)) {
    return NextResponse.json({ error: 'invalid signature' }, { status: 401 })
  }

  // 3. Parse payload
  let body: unknown
  try {
    body = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'invalid JSON' }, { status: 400 })
  }

  const { invoiceId, quoteId } = extractIds(body)
  if (!invoiceId && !quoteId) {
    return NextResponse.json({ error: 'missing invoice_id or quote_id' }, { status: 400 })
  }

  // 4. Service-role supabase (bypass RLS, webhook n'a pas de session)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) {
    console.error('[PENNYLANE_WEBHOOK] SUPABASE env vars missing')
    return NextResponse.json({ error: 'server misconfigured' }, { status: 500 })
  }
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  // 5. Match quote_metadata
  const quote = await matchQuoteFromInvoice(supabase, {
    pennylaneInvoiceId: invoiceId,
    pennylaneQuoteId: quoteId,
  })

  if (!quote) {
    // Pas de match → log et retour 200 (idempotent, pas de retry cote Pennylane)
    console.warn('[PENNYLANE_WEBHOOK] No quote_metadata match for', { invoiceId, quoteId })
    return NextResponse.json({ received: true, matched: false })
  }

  // 6. Dispatch
  const result = await dispatchPaidQuote(
    { supabase, sendDirectEmail },
    quote
  )

  if (result.error) {
    console.error('[PENNYLANE_WEBHOOK] Handler error:', result.error)
    // On renvoie 200 pour ne pas declencher de retry Pennylane en masse,
    // mais on log et on cree une notification MiKL pour visibilite
    const { data: operators } = await supabase
      .from('operators')
      .select('auth_user_id')

    if (operators?.length) {
      const rows = operators
        .filter((op: { auth_user_id: string | null }) => op.auth_user_id)
        .map((op: { auth_user_id: string | null }) => ({
          type: 'alert',
          title: '⚠️ Webhook Pennylane en echec',
          body: `quote_type=${quote.quote_type} — ${result.error?.message ?? 'erreur inconnue'}`,
          recipient_type: 'operator',
          recipient_id: op.auth_user_id,
          link: '/modules/facturation',
        }))
      if (rows.length > 0) {
        await supabase.from('notifications').insert(rows)
      }
    }

    return NextResponse.json({ received: true, handler_error: result.error.code })
  }

  return NextResponse.json({ received: true, matched: true, action: result.data?.action })
}
