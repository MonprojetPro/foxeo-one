// Story 13-8 — Edge Function : detect-overdue-invoices
// Cron quotidien 8h00 UTC — détecte les factures impayées, génère brouillons via Élio.
// Runtime : Deno (pas de require, pas d'imports workspace)

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import {
  getDaysSince,
  getReminderLevel,
  hasExistingReminder,
  buildReminderPrompt,
  formatCommunicationProfile,
  type ReminderLevel,
} from './overdue-logic.ts'

// ── Types locaux ──────────────────────────────────────────────────────────────

interface BillingSyncInvoice {
  pennylane_id: string
  client_id: string | null
  status: string
  data: {
    invoice_number?: string
    amount?: number
    date?: string
    deadline?: string
    [key: string]: unknown
  }
}

interface ClientRow {
  id: string
  name: string
  email: string
}

interface CommunicationProfileRow {
  preferred_tone: string
  preferred_length: string
  interaction_style: string
}

interface ExistingReminderRow {
  invoice_id: string
  reminder_level: number
}

// ── Main handler ──────────────────────────────────────────────────────────────

serve(async (_req) => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('[DETECT-OVERDUE] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
    return new Response(JSON.stringify({ error: 'Configuration manquante' }), { status: 500 })
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey)
  const today = new Date().toISOString().split('T')[0]

  console.log(`[DETECT-OVERDUE] Démarrage — date: ${today}`)

  // 1. Fetch toutes les factures impayées
  const { data: invoices, error: invoicesError } = await supabase
    .from('billing_sync')
    .select('pennylane_id, client_id, status, data')
    .eq('entity_type', 'invoice')
    .eq('status', 'unpaid')

  if (invoicesError) {
    console.error('[DETECT-OVERDUE] Erreur fetch billing_sync:', invoicesError.message)
    return new Response(JSON.stringify({ error: invoicesError.message }), { status: 500 })
  }

  // On utilise la deadline (date d'échéance) pour calculer le retard.
  // Fallback sur date d'émission si deadline absente.
  const unpaidInvoices: BillingSyncInvoice[] = (invoices ?? []).filter(
    (inv) => inv.client_id !== null && (inv.data?.deadline || inv.data?.date)
  )

  console.log(`[DETECT-OVERDUE] ${unpaidInvoices.length} factures impayées avec client_id`)

  if (unpaidInvoices.length === 0) {
    return new Response(JSON.stringify({ processed: 0 }), { status: 200 })
  }

  // 2. Fetch les relances existantes (pending ou sent) pour éviter les doublons
  const invoiceIds = unpaidInvoices.map((inv) => inv.pennylane_id)
  const { data: existingReminders } = await supabase
    .from('collection_reminders')
    .select('invoice_id, reminder_level')
    .in('invoice_id', invoiceIds)
    .in('status', ['pending', 'sent'])

  const reminderRows: ExistingReminderRow[] = existingReminders ?? []

  // 3. Fetch les clients concernés (nom + email)
  const clientIds = [...new Set(unpaidInvoices.map((inv) => inv.client_id as string))]
  const { data: clients } = await supabase
    .from('clients')
    .select('id, name, email')
    .in('id', clientIds)

  const clientMap = new Map<string, ClientRow>(
    (clients ?? []).map((c) => [c.id, c])
  )

  // 4. Fetch les profils de communication
  const { data: profiles } = await supabase
    .from('communication_profiles')
    .select('client_id, preferred_tone, preferred_length, interaction_style')
    .in('client_id', clientIds)

  const profileMap = new Map<string, CommunicationProfileRow>(
    (profiles ?? []).map((p) => [p.client_id, p])
  )

  // 5. Traiter chaque facture
  let processedCount = 0

  for (const invoice of unpaidInvoices) {
    // Calculer le retard depuis la deadline (date d'échéance), pas la date d'émission
    const overdueDate = (invoice.data.deadline ?? invoice.data.date) as string
    const invoiceDate = invoice.data.date as string
    const daysSince = getDaysSince(overdueDate, today)
    const level = getReminderLevel(daysSince)

    if (!level) continue

    // Vérifier doublon
    if (hasExistingReminder(reminderRows, invoice.pennylane_id, level)) {
      console.log(`[DETECT-OVERDUE] Doublon ignoré: ${invoice.pennylane_id} niveau ${level}`)
      continue
    }

    const clientId = invoice.client_id as string
    const client = clientMap.get(clientId)

    if (!client) {
      console.warn(`[DETECT-OVERDUE] Client introuvable pour client_id: ${clientId}`)
      continue
    }

    const profile = profileMap.get(clientId)
    const communicationProfile = formatCommunicationProfile(profile ?? null)
    const firstName = client.name.split(' ')[0]
    const amount = typeof invoice.data.amount === 'number' ? invoice.data.amount : 0
    const invoiceNumber = invoice.data.invoice_number ?? invoice.pennylane_id

    // 6. Appeler Élio pour générer le brouillon
    let generatedBody: string | null = null

    try {
      const { systemPrompt, message } = buildReminderPrompt({
        firstName,
        communicationProfile,
        level,
        daysOverdue: daysSince,
        invoiceNumber,
        amount,
        invoiceDate,
      })

      const elioResponse = await fetch(`${supabaseUrl}/functions/v1/elio-chat`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${serviceRoleKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          systemPrompt,
          message,
          maxTokens: 500,
          temperature: 0.7,
        }),
      })

      if (elioResponse.ok) {
        const elioData = await elioResponse.json() as { text?: string; error?: string }
        generatedBody = elioData.text ?? null
      } else {
        console.warn(`[DETECT-OVERDUE] Élio KO pour ${invoiceNumber}:`, await elioResponse.text())
      }
    } catch (elioErr) {
      console.error(`[DETECT-OVERDUE] Élio erreur pour ${invoiceNumber}:`, elioErr)
    }

    // 7. Insérer la relance
    const { error: insertError } = await supabase
      .from('collection_reminders')
      .insert({
        client_id: clientId,
        invoice_id: invoice.pennylane_id,
        invoice_number: invoiceNumber,
        invoice_amount: amount,
        invoice_date: invoiceDate,
        reminder_level: level,
        status: 'pending',
        generated_body: generatedBody,
      })

    if (insertError) {
      console.error(`[DETECT-OVERDUE] Insert échoué pour ${invoiceNumber}:`, insertError.message)
    } else {
      processedCount++
      console.log(`[DETECT-OVERDUE] Relance niveau ${level} créée: ${invoiceNumber} (${client.name})`)
    }
  }

  console.log(`[DETECT-OVERDUE] Terminé — ${processedCount} relances créées`)
  return new Response(JSON.stringify({ processed: processedCount }), { status: 200 })
})
