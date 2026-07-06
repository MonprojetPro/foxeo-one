/**
 * Outils LECTURE de l'agent Élio Hub — exécution immédiate avec la session de
 * MiKL (RLS naturelle : l'opérateur ne voit que ses clients).
 *
 * Chaque outil retourne { ok, payload } — payload est sérialisé en JSON dans le
 * tool_result renvoyé au LLM. En cas d'erreur, ok=false et payload contient un
 * message honnête (le system prompt interdit d'inventer des chiffres).
 *
 * Les requêtes de get_hub_overview sont inspirées de getHubStats
 * (apps/hub/app/(dashboard)/page.tsx) SANS importer la page.
 *
 * Fichier serveur ordinaire (PAS 'use server') : importé par la boucle agent.
 */

import type { createServerSupabaseClient } from '@monprojetpro/supabase'
import { searchClientInfo } from '../search-client-info'
import { getMenuFacileMetrics } from '@monprojetpro/module-menu-facile'
import { getMenuFacileTimeseries } from '@monprojetpro/module-menu-facile'
import { resolveClient, clientDisplayName } from './resolve-client'
import type { HubReadToolName } from '../../types/elio-hub-agent.types'

type Supa = Awaited<ReturnType<typeof createServerSupabaseClient>>

export interface ReadToolResult {
  ok: boolean
  payload: unknown
}

function fail(message: string, extra?: Record<string, unknown>): ReadToolResult {
  return { ok: false, payload: { error: message, ...extra } }
}

function daysSince(iso: string | null | undefined): number | null {
  if (!iso) return null
  const ms = Date.now() - new Date(iso).getTime()
  if (Number.isNaN(ms)) return null
  return Math.max(0, Math.floor(ms / 86_400_000))
}

// ── get_hub_overview ──────────────────────────────────────────────────────────

async function getHubOverview(supabase: Supa, operatorId: string): Promise<ReadToolResult> {
  // Clients + répartition Lab/One
  const { data: rawClients, error: clientsError } = await supabase
    .from('clients')
    .select('id, name, company, status, client_configs(dashboard_type)')
    .eq('operator_id', operatorId)

  if (clientsError) return fail(`Lecture clients impossible : ${clientsError.message}`)

  type ClientRow = {
    id: string
    name: string
    company: string | null
    status: string | null
    client_configs: { dashboard_type: string }[] | { dashboard_type: string } | null
  }
  const clients = (rawClients ?? []) as unknown as ClientRow[]
  const dashboardOf = (c: ClientRow) => {
    const cfg = Array.isArray(c.client_configs) ? c.client_configs[0] : c.client_configs
    return cfg?.dashboard_type ?? null
  }
  const labCount = clients.filter((c) => dashboardOf(c) === 'lab').length
  const oneCount = clients.filter((c) => dashboardOf(c) === 'one').length
  const clientIds = clients.map((c) => c.id)

  // MRR (abonnements actifs) + impayés — billing_sync
  const { data: rawSubs } = await supabase
    .from('billing_sync')
    .select('amount, data')
    .eq('entity_type', 'subscription')
    .eq('status', 'active')

  let mrrEur = 0
  for (const sub of (rawSubs ?? []) as { amount: number | null; data: Record<string, unknown> | null }[]) {
    const amountEur = (sub.amount ?? 0) / 100
    const period = (sub.data?.billing_period as string) ?? 'monthly'
    if (period === 'monthly') mrrEur += amountEur
    else if (period === 'quarterly') mrrEur += amountEur / 3
    else if (period === 'yearly') mrrEur += amountEur / 12
  }

  const { data: rawUnpaid } = await supabase
    .from('billing_sync')
    .select('amount')
    .eq('entity_type', 'invoice')
    .in('status', ['unpaid', 'pending'])
  const unpaid = (rawUnpaid ?? []) as { amount: number | null }[]
  const unpaidAmountEur = unpaid.reduce((sum, inv) => sum + (inv.amount ?? 0) / 100, 0)

  // Validations en attente
  const { count: pendingValidationsCount } = await supabase
    .from('validation_requests')
    .select('id', { count: 'exact', head: true })
    .eq('operator_id', operatorId)
    .eq('status', 'pending')

  // Messages clients non lus
  let unreadMessagesCount = 0
  if (clientIds.length > 0) {
    const { count } = await supabase
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .in('client_id', clientIds)
      .eq('sender_type', 'client')
      .is('read_at', null)
    unreadMessagesCount = count ?? 0
  }

  // Meetings à venir (7 prochains jours)
  const now = new Date()
  const in7Days = new Date(now.getTime() + 7 * 86_400_000)
  const { data: meetings } = await supabase
    .from('meetings')
    .select('id, title, scheduled_at, status, type, clients(name, company)')
    .eq('operator_id', operatorId)
    .gte('scheduled_at', now.toISOString())
    .lte('scheduled_at', in7Days.toISOString())
    .in('status', ['scheduled', 'in_progress'])
    .order('scheduled_at', { ascending: true })
    .limit(10)

  return {
    ok: true,
    payload: {
      clients: { total: clients.length, lab: labCount, one: oneCount },
      mrrEur: Math.round(mrrEur * 100) / 100,
      unpaidInvoices: { count: unpaid.length, totalEur: Math.round(unpaidAmountEur * 100) / 100 },
      pendingValidations: pendingValidationsCount ?? 0,
      unreadClientMessages: unreadMessagesCount,
      upcomingMeetings7d: ((meetings ?? []) as unknown as Array<{
        title: string
        scheduled_at: string
        type: string | null
        clients: { name: string; company: string | null } | { name: string; company: string | null }[] | null
      }>).map((m) => {
        const c = Array.isArray(m.clients) ? m.clients[0] : m.clients
        return {
          title: m.title,
          scheduledAt: m.scheduled_at,
          type: m.type,
          client: c ? clientDisplayName(c) : null,
        }
      }),
    },
  }
}

// ── get_client_activity ───────────────────────────────────────────────────────

async function getClientActivity(supabase: Supa, clientIdOuNom: string): Promise<ReadToolResult> {
  const resolved = await resolveClient(supabase, clientIdOuNom)
  if (!resolved.ok) return fail(resolved.message, { candidates: resolved.candidates })
  const client = resolved.client

  // Derniers messages chat (envoyé par MiKL / reçu du client)
  const { data: lastSentRows } = await supabase
    .from('messages')
    .select('content, created_at')
    .eq('client_id', client.id)
    .eq('sender_type', 'operator')
    .order('created_at', { ascending: false })
    .limit(1)
  const { data: lastReceivedRows } = await supabase
    .from('messages')
    .select('content, created_at')
    .eq('client_id', client.id)
    .eq('sender_type', 'client')
    .order('created_at', { ascending: false })
    .limit(1)

  type Msg = { content: string; created_at: string }
  const lastSent = ((lastSentRows ?? []) as Msg[])[0] ?? null
  const lastReceived = ((lastReceivedRows ?? []) as Msg[])[0] ?? null

  // Dernière visio passée
  const { data: lastMeetingRows } = await supabase
    .from('meetings')
    .select('title, scheduled_at, status, type')
    .eq('client_id', client.id)
    .lte('scheduled_at', new Date().toISOString())
    .order('scheduled_at', { ascending: false })
    .limit(1)
  const lastMeeting =
    (((lastMeetingRows ?? []) as { title: string; scheduled_at: string; status: string; type: string | null }[])[0]) ?? null

  // Dernières validations
  const { data: validations } = await supabase
    .from('validation_requests')
    .select('title, type, status, created_at')
    .eq('client_id', client.id)
    .order('created_at', { ascending: false })
    .limit(3)

  // Dernières séances de coaching terminées + extrait du transcript
  // (meeting_recordings.transcript_text — alimenté par syncMeetingResults)
  const { data: coachingRows } = await supabase
    .from('meetings')
    .select('title, scheduled_at, meeting_recordings(transcript_text)')
    .eq('client_id', client.id)
    .eq('type', 'coaching')
    .eq('status', 'completed')
    .order('scheduled_at', { ascending: false })
    .limit(2)

  type CoachingRow = {
    title: string | null
    scheduled_at: string
    meeting_recordings:
      | { transcript_text: string | null }[]
      | { transcript_text: string | null }
      | null
  }
  const TRANSCRIPT_EXCERPT_MAX = 1500
  const recentCoachingSessions = ((coachingRows ?? []) as unknown as CoachingRow[]).map((m) => {
    const recs = Array.isArray(m.meeting_recordings)
      ? m.meeting_recordings
      : m.meeting_recordings
        ? [m.meeting_recordings]
        : []
    const fullText = recs
      .map((r) => r.transcript_text?.trim())
      .find((t): t is string => Boolean(t)) ?? null
    return {
      title: m.title ?? 'Séance de coaching',
      at: m.scheduled_at,
      daysAgo: daysSince(m.scheduled_at),
      transcriptExcerpt: fullText
        ? fullText.length > TRANSCRIPT_EXCERPT_MAX
          ? `${fullText.slice(0, TRANSCRIPT_EXCERPT_MAX)}…`
          : fullText
        : null,
    }
  })

  // « Dernier contact il y a N jours » = échange le plus récent (chat ou visio)
  const contactDates = [lastSent?.created_at, lastReceived?.created_at, lastMeeting?.scheduled_at]
    .filter((d): d is string => Boolean(d))
    .map((d) => new Date(d).getTime())
  const lastContactDays = contactDates.length > 0
    ? Math.max(0, Math.floor((Date.now() - Math.max(...contactDates)) / 86_400_000))
    : null

  const preview = (content: string) => (content.length > 200 ? `${content.slice(0, 200)}…` : content)

  return {
    ok: true,
    payload: {
      client: { id: client.id, name: clientDisplayName(client), email: client.email },
      lastMessageSentToClient: lastSent
        ? { at: lastSent.created_at, daysAgo: daysSince(lastSent.created_at), preview: preview(lastSent.content) }
        : null,
      lastMessageReceivedFromClient: lastReceived
        ? { at: lastReceived.created_at, daysAgo: daysSince(lastReceived.created_at), preview: preview(lastReceived.content) }
        : null,
      lastMeeting: lastMeeting
        ? { title: lastMeeting.title, at: lastMeeting.scheduled_at, daysAgo: daysSince(lastMeeting.scheduled_at), status: lastMeeting.status, type: lastMeeting.type }
        : null,
      recentValidations: ((validations ?? []) as { title: string; type: string; status: string; created_at: string }[]).map((v) => ({
        title: v.title,
        type: v.type,
        status: v.status,
        createdAt: v.created_at,
      })),
      recentCoachingSessions,
      lastContactDaysAgo: lastContactDays,
    },
  }
}

// ── list_unpaid_invoices ──────────────────────────────────────────────────────

async function listUnpaidInvoices(supabase: Supa): Promise<ReadToolResult> {
  const { data, error } = await supabase
    .from('billing_sync')
    .select('pennylane_id, amount, status, client_id, last_synced_at, data')
    .eq('entity_type', 'invoice')
    .in('status', ['unpaid', 'pending'])
    .order('last_synced_at', { ascending: false })
    .limit(50)

  if (error) return fail(`Lecture des factures impossible : ${error.message}`)

  type Row = {
    pennylane_id: string
    amount: number | null
    status: string
    client_id: string | null
    data: Record<string, unknown> | null
  }
  const rows = (data ?? []) as unknown as Row[]

  // Résoudre les noms clients en une requête
  const clientIds = [...new Set(rows.map((r) => r.client_id).filter((id): id is string => Boolean(id)))]
  const nameMap = new Map<string, string>()
  if (clientIds.length > 0) {
    const { data: clientRows } = await supabase
      .from('clients')
      .select('id, name, company')
      .in('id', clientIds)
    for (const c of (clientRows ?? []) as { id: string; name: string; company: string | null }[]) {
      nameMap.set(c.id, clientDisplayName(c))
    }
  }

  return {
    ok: true,
    payload: {
      count: rows.length,
      totalEur: Math.round(rows.reduce((s, r) => s + (r.amount ?? 0) / 100, 0) * 100) / 100,
      invoices: rows.map((r) => ({
        pennylaneId: r.pennylane_id,
        client: r.client_id ? nameMap.get(r.client_id) ?? r.client_id : 'inconnu',
        amountEur: (r.amount ?? 0) / 100,
        status: r.status,
        label: (r.data?.label as string | undefined) ?? null,
      })),
    },
  }
}

// ── list_pending_validations ──────────────────────────────────────────────────

async function listPendingValidations(supabase: Supa, operatorId: string): Promise<ReadToolResult> {
  const { data, error } = await supabase
    .from('validation_requests')
    .select('id, title, type, created_at, clients(name, company)')
    .eq('operator_id', operatorId)
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(50)

  if (error) return fail(`Lecture des validations impossible : ${error.message}`)

  type Row = {
    id: string
    title: string
    type: string
    created_at: string
    clients: { name: string; company: string | null } | { name: string; company: string | null }[] | null
  }
  const rows = (data ?? []) as unknown as Row[]

  return {
    ok: true,
    payload: {
      count: rows.length,
      validations: rows.map((r) => {
        const c = Array.isArray(r.clients) ? r.clients[0] : r.clients
        return {
          title: r.title,
          type: r.type,
          client: c ? clientDisplayName(c) : 'inconnu',
          waitingDays: daysSince(r.created_at),
        }
      }),
    },
  }
}

// ── list_stagnant_parcours ────────────────────────────────────────────────────

async function listStagnantParcours(supabase: Supa, days: number): Promise<ReadToolResult> {
  const cutoff = new Date(Date.now() - days * 86_400_000).toISOString()

  const { data, error } = await supabase
    .from('client_parcours_agents')
    .select('client_id, step_label, step_order, status, updated_at, clients(name, company)')
    .eq('status', 'active')
    .lt('updated_at', cutoff)
    .order('updated_at', { ascending: true })
    .limit(50)

  if (error) return fail(`Lecture des parcours impossible : ${error.message}`)

  type Row = {
    client_id: string
    step_label: string
    step_order: number
    updated_at: string
    clients: { name: string; company: string | null } | { name: string; company: string | null }[] | null
  }
  const rows = (data ?? []) as unknown as Row[]

  return {
    ok: true,
    payload: {
      thresholdDays: days,
      count: rows.length,
      stagnantSteps: rows.map((r) => {
        const c = Array.isArray(r.clients) ? r.clients[0] : r.clients
        return {
          client: c ? clientDisplayName(c) : r.client_id,
          step: `${r.step_order}. ${r.step_label}`,
          inactiveDays: daysSince(r.updated_at),
        }
      }),
    },
  }
}

// ── list_silent_clients ───────────────────────────────────────────────────────

async function listSilentClients(supabase: Supa, operatorId: string, days: number): Promise<ReadToolResult> {
  const { data: rawClients, error } = await supabase
    .from('clients')
    .select('id, name, company, status')
    .eq('operator_id', operatorId)
    .neq('status', 'prospect')

  if (error) return fail(`Lecture clients impossible : ${error.message}`)

  const clients = (rawClients ?? []) as { id: string; name: string; company: string | null; status: string | null }[]
  if (clients.length === 0) return { ok: true, payload: { thresholdDays: days, count: 0, silentClients: [] } }

  // Dernier message (tous sens confondus) par client
  const { data: lastMsgs } = await supabase
    .from('messages')
    .select('client_id, created_at')
    .in('client_id', clients.map((c) => c.id))
    .order('created_at', { ascending: false })
    .limit(1000)

  const lastByClient = new Map<string, string>()
  for (const m of (lastMsgs ?? []) as { client_id: string; created_at: string }[]) {
    if (!lastByClient.has(m.client_id)) lastByClient.set(m.client_id, m.created_at)
  }

  const cutoffMs = Date.now() - days * 86_400_000
  const silent = clients
    .map((c) => {
      const last = lastByClient.get(c.id) ?? null
      return {
        client: clientDisplayName(c),
        lastMessageAt: last,
        silentDays: last ? daysSince(last) : null,
      }
    })
    .filter((c) => !c.lastMessageAt || new Date(c.lastMessageAt).getTime() < cutoffMs)
    .sort((a, b) => (b.silentDays ?? 9999) - (a.silentDays ?? 9999))

  return {
    ok: true,
    payload: {
      thresholdDays: days,
      count: silent.length,
      silentClients: silent.map((c) => ({
        ...c,
        silentDays: c.silentDays ?? 'jamais de message échangé',
      })),
    },
  }
}

// ── get_menufacile_report ─────────────────────────────────────────────────────

async function getMenuFacileReport(days: number): Promise<ReadToolResult> {
  const [metricsRes, seriesRes] = await Promise.all([
    getMenuFacileMetrics(),
    getMenuFacileTimeseries(days),
  ])

  if (metricsRes.error && seriesRes.error) {
    return fail(
      `Le guichet MenuFacile est injoignable (${metricsRes.error.message}). Aucun chiffre disponible — ne rien inventer.`,
    )
  }

  const series = seriesRes.data?.series ?? []
  const aggregates = series.length > 0
    ? {
        periodDays: seriesRes.data?.range.days ?? days,
        from: seriesRes.data?.range.from,
        to: seriesRes.data?.range.to,
        newUsers: series.reduce((s, p) => s + (p.new_users ?? 0), 0),
        newRecipes: series.reduce((s, p) => s + (p.new_recipes ?? 0), 0),
        recipeCopies: series.reduce((s, p) => s + (p.recipe_copies ?? 0), 0),
      }
    : null

  return {
    ok: true,
    payload: {
      totals: metricsRes.data
        ? {
            users: metricsRes.data.users,
            recipes: metricsRes.data.recipes,
            moderation: metricsRes.data.moderation,
            contact: metricsRes.data.contact ?? null,
            generatedAt: metricsRes.data.generated_at,
          }
        : { error: `Totaux indisponibles : ${metricsRes.error?.message ?? 'erreur inconnue'}` },
      period: aggregates ?? { error: `Série temporelle indisponible : ${seriesRes.error?.message ?? 'aucune donnée'}` },
    },
  }
}

// ── Dispatcher ────────────────────────────────────────────────────────────────

function clampDays(value: unknown, fallback: number): number {
  const n = typeof value === 'number' && Number.isFinite(value) ? Math.floor(value) : fallback
  return Math.min(Math.max(1, n), 90)
}

export async function runHubReadTool(
  supabase: Supa,
  operatorId: string,
  name: HubReadToolName,
  input: Record<string, unknown>,
): Promise<ReadToolResult> {
  try {
    switch (name) {
      case 'get_hub_overview':
        return await getHubOverview(supabase, operatorId)
      case 'search_client': {
        const query = typeof input.query === 'string' ? input.query : ''
        const { data, error } = await searchClientInfo(query)
        if (error) return fail(error.message)
        return { ok: true, payload: data }
      }
      case 'get_client_activity':
        return await getClientActivity(supabase, typeof input.client === 'string' ? input.client : '')
      case 'list_unpaid_invoices':
        return await listUnpaidInvoices(supabase)
      case 'list_pending_validations':
        return await listPendingValidations(supabase, operatorId)
      case 'list_stagnant_parcours':
        return await listStagnantParcours(supabase, clampDays(input.days, 7))
      case 'list_silent_clients':
        return await listSilentClients(supabase, operatorId, clampDays(input.days, 7))
      case 'get_menufacile_report':
        return await getMenuFacileReport(clampDays(input.days, 7))
    }
  } catch (err) {
    console.error(`[ELIO:HUB_AGENT] Outil lecture ${name} en erreur:`, err)
    return fail(`L'outil ${name} a échoué : ${err instanceof Error ? err.message : String(err)}`)
  }
}
