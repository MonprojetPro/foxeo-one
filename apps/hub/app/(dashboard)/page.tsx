import { LayoutDashboard } from 'lucide-react'
import { CockpitHeader, StatusPill } from '@monprojetpro/ui'
import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { getTokenUsageSummary, getAlertThresholds, DEFAULT_ALERT_THRESHOLDS, listRecentEscalations } from '@monprojetpro/module-elio'
import { buildElioSuggestions, type SilentClient, type StagnantParcoursClient } from '../../lib/elio-suggestions'
import { MetricCard } from '../../components/dashboard/metric-card'
import { InteractiveMetricCard } from '../../components/dashboard/interactive-metric-card'
import { AgendaItem } from '../../components/dashboard/agenda-item'
import { MessageItem } from '../../components/dashboard/message-item'
import { AlertItem } from '../../components/dashboard/alert-item'
import { DashboardCard } from '../../components/dashboard/dashboard-card'
import { SystemHealthAlert } from '@monprojetpro/module-admin'
import { getClientsBreakdown } from '../../actions/get-clients-breakdown'

// ─── Types ────────────────────────────────────────────────────────────────────

interface MeetingRow {
  id: string
  title: string | null
  scheduled_at: string | null
  status: string
  meet_uri: string | null
  clients: { company: string } | { company: string }[] | null
}

interface MessageRow {
  id: string
  content: string
  created_at: string
  client_id: string
  clients: { company: string } | { company: string }[] | null
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatTime(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'À l\'instant'
  if (mins < 60) return `Il y a ${mins} min`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `Il y a ${hours}h`
  return `Il y a ${Math.floor(hours / 24)}j`
}

function getClientName(clients: MeetingRow['clients']): string {
  if (!clients) return ''
  const c = Array.isArray(clients) ? clients[0] : clients
  return c?.company ?? ''
}

function minutesUntil(iso: string | null): number | null {
  if (!iso) return null
  return Math.floor((new Date(iso).getTime() - Date.now()) / 60000)
}

// ─── Data fetching ────────────────────────────────────────────────────────────

async function getPendingValidations(operatorId: string) {
  const supabase = await createServerSupabaseClient()
  const { data } = await supabase
    .from('validation_requests')
    .select('id, title, type, created_at, clients(name, company)')
    .eq('operator_id', operatorId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(5)
  return (data ?? []) as {
    id: string
    title: string
    type: string
    created_at: string
    clients: { name: string; company: string } | { name: string; company: string }[] | null
  }[]
}

async function getNewProspects(operatorId: string) {
  const supabase = await createServerSupabaseClient()
  const { data } = await supabase
    .from('clients')
    .select('id, first_name, name, company, email, lead_message, created_at')
    .eq('operator_id', operatorId)
    .eq('status', 'prospect')
    .is('hub_seen_at', null)
    .order('created_at', { ascending: false })
    .limit(5)
  return (data ?? []) as { id: string; first_name: string | null; name: string; company: string; email: string; lead_message: string | null; created_at: string }[]
}

async function getHubStats(operatorId: string) {
  const supabase = await createServerSupabaseClient()

  // Clients
  type ClientRow = { id: string; name: string; company: string | null; client_configs: { dashboard_type: string }[] | { dashboard_type: string } | null }
  const { data: rawClients } = await supabase
    .from('clients')
    .select('id, name, company, client_configs(dashboard_type)')
    .eq('operator_id', operatorId)
  const clients = (rawClients ?? []) as ClientRow[]

  const labCount = clients.filter((c) => {
    const cfg = Array.isArray(c.client_configs) ? c.client_configs[0] : c.client_configs
    return cfg?.dashboard_type === 'lab'
  }).length

  const oneCount = clients.filter((c) => {
    const cfg = Array.isArray(c.client_configs) ? c.client_configs[0] : c.client_configs
    return cfg?.dashboard_type === 'one'
  }).length

  const clientIds = clients.map((c) => c.id)
  const clientNameMap = new Map(clients.map((c) => [c.id, c.company || c.name || 'Client']))

  // Meetings today
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const todayEnd = new Date()
  todayEnd.setHours(23, 59, 59, 999)

  const { data: meetings } = await supabase
    .from('meetings')
    .select('id, title, scheduled_at, status, meet_uri, clients(company)')
    .eq('operator_id', operatorId)
    .gte('scheduled_at', todayStart.toISOString())
    .lte('scheduled_at', todayEnd.toISOString())
    .in('status', ['scheduled', 'in_progress'])
    .order('scheduled_at', { ascending: true })

  // Messages non lus
  let unreadCount = 0
  let recentMessages: MessageRow[] = []
  if (clientIds.length > 0) {
    const { count } = await supabase
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .in('client_id', clientIds)
      .eq('sender_type', 'client')
      .is('read_at', null)
    unreadCount = count ?? 0

    const { data: msgs } = await supabase
      .from('messages')
      .select('id, content, created_at, client_id')
      .in('client_id', clientIds)
      .eq('sender_type', 'client')
      .is('read_at', null)
      .order('created_at', { ascending: false })
      .limit(3)
    recentMessages = ((msgs ?? []) as { id: string; content: string; created_at: string; client_id: string }[])
      .map((m) => ({ ...m, clients: null }))
  }

  // MRR + impayés
  type BillingRow = { amount: number | null; data: Record<string, unknown> | null }
  const { data: rawSubscriptions } = await supabase
    .from('billing_sync')
    .select('amount, data')
    .eq('entity_type', 'subscription')
    .eq('status', 'active')
  const subscriptions = (rawSubscriptions ?? []) as BillingRow[]

  let mrr = 0
  for (const sub of subscriptions) {
    const amountEur = (sub.amount ?? 0) / 100
    const period = (sub.data?.billing_period as string) ?? 'monthly'
    if (period === 'monthly') mrr += amountEur
    else if (period === 'quarterly') mrr += amountEur / 3
    else if (period === 'yearly') mrr += amountEur / 12
  }

  const { data: rawUnpaid } = await supabase
    .from('billing_sync')
    .select('amount')
    .eq('entity_type', 'invoice')
    .in('status', ['unpaid', 'pending'])
  const unpaidInvoices = (rawUnpaid ?? []) as { amount: number | null }[]
  const unpaidCount = unpaidInvoices.length
  const unpaidAmount = unpaidInvoices.reduce((sum, inv) => sum + ((inv.amount ?? 0) / 100), 0)

  const { data: rawQuotes } = await supabase
    .from('billing_sync')
    .select('id')
    .eq('entity_type', 'quote')
    .eq('status', 'pending')
  const pendingQuotesCount = rawQuotes?.length ?? 0

  // Clients avec parcours en pause (abandoned)
  const { data: pausedParcours } = await supabase
    .from('parcours')
    .select('id, client_id, abandonment_reason, updated_at, clients(id, name, company)')
    .eq('status', 'abandoned')
    .in('client_id', clientIds.length > 0 ? clientIds : ['00000000-0000-0000-0000-000000000000'])
    .order('updated_at', { ascending: false })

  const pausedClients = (pausedParcours ?? []) as {
    id: string
    client_id: string
    abandonment_reason: string | null
    updated_at: string
    clients: { id: string; name: string; company: string } | { id: string; name: string; company: string }[] | null
  }[]

  return {
    totalClients: clients?.length ?? 0,
    labCount,
    oneCount,
    meetings: (meetings ?? []) as MeetingRow[],
    unreadCount,
    recentMessages,
    clientNameMap,
    mrr,
    unpaidAmount,
    unpaidCount,
    pendingQuotesCount,
    pausedClients,
  }
}

// ─── Suggestions Élio (alertes calculées selon elio_alert_thresholds) ────────

async function getElioAlertData(operatorId: string): Promise<{
  oldValidations: { count: number; oldestDays: number }
  stagnantParcours: StagnantParcoursClient[]
  silentClients: SilentClient[]
}> {
  const supabase = await createServerSupabaseClient()
  const { data: thresholdsData } = await getAlertThresholds()
  const thresholds = thresholdsData ?? DEFAULT_ALERT_THRESHOLDS
  const daysAgo = (iso: string) => Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000))

  // Clients actifs (non prospects, non archivés) de l'opérateur
  const { data: rawActive } = await supabase
    .from('clients')
    .select('id, name, company')
    .eq('operator_id', operatorId)
    .eq('status', 'active')
  const activeClients = (rawActive ?? []) as { id: string; name: string; company: string | null }[]
  const activeIds = activeClients.map((c) => c.id)
  const nameOf = new Map(activeClients.map((c) => [c.id, c.company || c.name || 'Client']))

  // Validations en attente depuis plus de N jours
  const validationCutoff = new Date(Date.now() - thresholds.oldValidationDays * 86_400_000).toISOString()
  const { data: oldVals } = await supabase
    .from('validation_requests')
    .select('id, created_at')
    .eq('operator_id', operatorId)
    .eq('status', 'pending')
    .lt('created_at', validationCutoff)
    .order('created_at', { ascending: true })
    .limit(100)
  const oldValidationRows = (oldVals ?? []) as { id: string; created_at: string }[]
  const oldestDays = oldValidationRows.length > 0 ? daysAgo(oldValidationRows[0].created_at) : 0

  // Parcours stagnants : étapes actives sans progression depuis N jours (agrégées par client)
  const stagnantByClient = new Map<string, { stepsCount: number; inactiveDays: number }>()
  if (activeIds.length > 0) {
    const stagnantCutoff = new Date(Date.now() - thresholds.stagnantParcoursDays * 86_400_000).toISOString()
    const { data: stagnantRows } = await supabase
      .from('client_parcours_agents')
      .select('client_id, updated_at')
      .eq('status', 'active')
      .lt('updated_at', stagnantCutoff)
      .in('client_id', activeIds)
      .limit(200)
    for (const row of (stagnantRows ?? []) as { client_id: string; updated_at: string }[]) {
      const days = daysAgo(row.updated_at)
      const agg = stagnantByClient.get(row.client_id)
      if (agg) {
        agg.stepsCount += 1
        agg.inactiveDays = Math.max(agg.inactiveDays, days)
      } else {
        stagnantByClient.set(row.client_id, { stepsCount: 1, inactiveDays: days })
      }
    }
  }

  // Clients silencieux : dernier message (tous sens confondus) plus vieux que N jours
  const silentClients: SilentClient[] = []
  if (activeIds.length > 0) {
    const { data: lastMsgs } = await supabase
      .from('messages')
      .select('client_id, created_at')
      .in('client_id', activeIds)
      .order('created_at', { ascending: false })
      .limit(1000)
    const lastByClient = new Map<string, string>()
    for (const m of (lastMsgs ?? []) as { client_id: string; created_at: string }[]) {
      if (!lastByClient.has(m.client_id)) lastByClient.set(m.client_id, m.created_at)
    }
    const cutoffMs = Date.now() - thresholds.silentClientDays * 86_400_000
    for (const c of activeClients) {
      const clientName = nameOf.get(c.id) ?? 'Client'
      const last = lastByClient.get(c.id)
      if (!last) {
        silentClients.push({ clientId: c.id, clientName, silentDays: null })
      } else if (new Date(last).getTime() < cutoffMs) {
        silentClients.push({ clientId: c.id, clientName, silentDays: daysAgo(last) })
      }
    }
  }

  return {
    oldValidations: { count: oldValidationRows.length, oldestDays },
    stagnantParcours: [...stagnantByClient.entries()].map(([clientId, agg]) => ({
      clientId,
      clientName: nameOf.get(clientId) ?? 'Client',
      stepsCount: agg.stepsCount,
      inactiveDays: agg.inactiveDays,
    })),
    silentClients,
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function HubHomePage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return (
      <div className="p-6 text-muted-foreground">
        Session expirée. Veuillez vous reconnecter.
      </div>
    )
  }

  const { data: operator } = await supabase
    .from('operators')
    .select('id')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  const operatorId = (operator as { id: string } | null)?.id ?? ''
  const [
    { totalClients, labCount, oneCount, meetings, unreadCount, recentMessages, clientNameMap, mrr, unpaidAmount, unpaidCount, pendingQuotesCount, pausedClients },
    breakdown,
    newProspects,
    tokenSummaryResult,
    pendingValidations,
    elioAlertData,
    escalationsResult,
  ] = await Promise.all([
    getHubStats(operatorId),
    getClientsBreakdown(operatorId),
    getNewProspects(operatorId),
    getTokenUsageSummary(),
    getPendingValidations(operatorId),
    getElioAlertData(operatorId),
    listRecentEscalations(5),
  ])

  const recentEscalations = escalationsResult.data ?? []

  const elioSuggestions = buildElioSuggestions({
    unpaid: { count: unpaidCount, amountEur: unpaidAmount },
    oldValidations: elioAlertData.oldValidations,
    stagnantParcours: elioAlertData.stagnantParcours,
    silentClients: elioAlertData.silentClients,
  })

  const tokenSummary = tokenSummaryResult.data

  const today = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
  const todayCap = today.charAt(0).toUpperCase() + today.slice(1)

  const mrrDisplay = mrr > 0 ? `${Math.round(mrr).toLocaleString('fr-FR')} €` : '—'
  const unpaidDisplay = unpaidAmount > 0 ? `${Math.round(unpaidAmount).toLocaleString('fr-FR')} €` : '—'

  return (
    <div className="space-y-6 p-6 md:p-8">
      {/* En-tête cockpit */}
      <CockpitHeader
        icon={LayoutDashboard}
        title="Bonjour MiKL 👋"
        subtitle={`Voici votre tableau de bord pour aujourd'hui — ${todayCap}`}
        status={<StatusPill state="live" label="En ligne" />}
      />

      {/* Alerte système — s'affiche uniquement si un voyant du monitoring est orange/rouge (Realtime) */}
      <SystemHealthAlert />

      {/* Encart Coût IA */}
      {tokenSummary && (
        <a
          href="/elio/lab"
          className="group relative flex items-center justify-between overflow-hidden rounded-2xl border border-white/10 bg-cyan-400/[0.05] px-5 py-3.5 transition-colors hover:bg-cyan-400/[0.08]"
        >
          <div
            aria-hidden
            className="pointer-events-none absolute -left-10 -top-16 h-40 w-40 rounded-full bg-cyan-400/10 blur-3xl"
          />
          <div className="relative flex items-center gap-4">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-400/25 bg-cyan-400/10 text-lg">🤖</span>
            <div>
              <p className="text-xs text-gray-500">Coût IA ce mois</p>
              <p className="text-lg font-semibold leading-tight text-cyan-300">
                {tokenSummary.totalCostEur.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
              </p>
            </div>
            <div className="hidden border-l border-white/10 pl-4 sm:block">
              <p className="text-xs text-gray-500">Tokens</p>
              <p className="text-sm font-medium tabular-nums text-gray-200">
                {tokenSummary.totalTokens.toLocaleString('fr-FR')}
              </p>
            </div>
            <div className="hidden border-l border-white/10 pl-4 md:block">
              <p className="text-xs text-gray-500">Agents actifs</p>
              <p className="text-sm font-medium tabular-nums text-gray-200">
                {tokenSummary.byAgent.length}
              </p>
            </div>
          </div>
          <span className="relative text-xs text-cyan-300/60 transition-colors group-hover:text-cyan-300">
            Voir le détail →
          </span>
        </a>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        <MetricCard
          title="Total clients"
          value={String(totalClients)}
          subtitle={`${labCount} Lab · ${oneCount} One`}
          accentColor="primary"
        />
        <InteractiveMetricCard
          title="Clients Lab"
          value={String(labCount)}
          subtitle={[
            breakdown.lab.pendingPayment.length > 0 ? `${breakdown.lab.pendingPayment.length} en attente` : null,
            breakdown.lab.active.length > 0 ? `${breakdown.lab.active.length} actifs` : null,
            breakdown.lab.suspended.length > 0 ? `${breakdown.lab.suspended.length} suspendu${breakdown.lab.suspended.length > 1 ? 's' : ''}` : null,
          ].filter(Boolean).join(' · ') || 'Aucun client Lab'}
          sections={[
            {
              label: 'En attente de paiement',
              count: breakdown.lab.pendingPayment.length,
              items: breakdown.lab.pendingPayment,
              emptyText: 'Aucun client en attente',
              accentColor: 'yellow',
            },
            {
              label: 'Lab actifs',
              count: breakdown.lab.active.length,
              items: breakdown.lab.active,
              emptyText: 'Aucun client Lab actif',
              accentColor: 'green',
            },
            {
              label: 'Suspendus (parcours en pause)',
              count: breakdown.lab.suspended.length,
              items: breakdown.lab.suspended,
              emptyText: 'Aucun parcours suspendu',
              accentColor: 'red',
            },
          ]}
        />
        <InteractiveMetricCard
          title="Clients One"
          value={String(oneCount)}
          subtitle={`${breakdown.one.active.length} actifs`}
          sections={[
            {
              label: 'Clients One actifs',
              count: breakdown.one.active.length,
              items: breakdown.one.active,
              emptyText: 'Aucun client One',
              accentColor: 'green',
            },
          ]}
        />
        <MetricCard
          title="MRR"
          value={mrrDisplay}
          subtitle="Abonnements actifs"
          accentColor={mrr > 0 ? 'primary' : 'muted'}
        />
        <MetricCard
          title="Devis en cours"
          value={String(pendingQuotesCount)}
          subtitle="devis en attente"
          accentColor={pendingQuotesCount > 0 ? 'primary' : 'muted'}
        />
        <InteractiveMetricCard
          title="Impayés"
          value={unpaidDisplay}
          subtitle={`${breakdown.unpaidInvoices.length} facture${breakdown.unpaidInvoices.length > 1 ? 's' : ''} en attente`}
          accentColor={unpaidAmount > 0 ? 'destructive' : 'muted'}
          sections={[
            {
              label: 'Factures impayées',
              count: breakdown.unpaidInvoices.length,
              items: breakdown.unpaidInvoices.map((inv) => ({
                id: inv.clientId,
                name: inv.clientName,
                company: `${inv.amount.toLocaleString('fr-FR')} €`,
              })),
              emptyText: 'Aucune facture impayée',
              accentColor: breakdown.unpaidInvoices.length > 0 ? 'red' : 'default',
            },
          ]}
        />
      </div>

      {/* Agenda + Validations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <DashboardCard title="Agenda du jour" linkHref="/modules/visio">
          {meetings.length === 0 ? (
            <p className="px-3 py-4 text-sm text-muted-foreground italic">
              Aucune réunion programmée aujourd'hui
            </p>
          ) : (
            meetings.map((m) => {
              const minsUntil = minutesUntil(m.scheduled_at)
              const isLive = m.status === 'in_progress'
              const isSoon = minsUntil !== null && minsUntil > 0 && minsUntil <= 30
              return (
                <AgendaItem
                  key={m.id}
                  time={formatTime(m.scheduled_at)}
                  title={m.title ?? 'Réunion'}
                  detail={getClientName(m.clients) || undefined}
                  actionLabel={m.meet_uri ? 'Rejoindre' : 'Détails'}
                  actionHref={`/modules/visio/${m.id}`}
                  badgeText={isLive ? 'En cours' : isSoon ? `Dans ${minsUntil} min` : undefined}
                />
              )
            })
          )}
        </DashboardCard>

        <DashboardCard title="Validations en attente" badge={pendingValidations.length || undefined} linkHref="/modules/validation-hub">
          {pendingValidations.length === 0 ? (
            <p className="px-3 py-4 text-sm text-muted-foreground italic">
              Aucune validation en attente
            </p>
          ) : (
            pendingValidations.map((v) => {
              const clientObj = Array.isArray(v.clients) ? v.clients[0] : v.clients
              const clientName = clientObj?.company || clientObj?.name || 'Client'
              const typeLabel = v.type === 'step_submission' ? 'Soumission étape' : v.type === 'brief_lab' ? 'Brief Lab' : v.type === 'evolution_one' ? 'Évolution One' : v.type
              return (
                <AlertItem
                  key={v.id}
                  icon="bell"
                  title={v.title}
                  detail={`${clientName} · ${typeLabel} · ${formatRelativeTime(v.created_at)}`}
                  href="/modules/validation-hub"
                />
              )
            })
          )}
        </DashboardCard>
      </div>

      {/* Escalades Élio One — questions transmises par l'agent des clients gradués.
          Réactif : RealtimeDashboardRefresh écoute déjà les INSERT notifications du user. */}
      <DashboardCard
        title="Escalades Élio One"
        badge={recentEscalations.length || undefined}
        linkHref="/elio/one"
      >
        {recentEscalations.length === 0 ? (
          <p className="px-3 py-4 text-sm text-muted-foreground italic">
            Aucune escalade — Élio répond seul aux clients gradués
          </p>
        ) : (
          recentEscalations.map((esc) => (
            <AlertItem
              key={esc.id}
              icon="warning"
              title={esc.title}
              detail={formatRelativeTime(esc.createdAt)}
              iconColor="text-amber-400"
              href="/elio/one"
            />
          ))
        )}
      </DashboardCard>

      {/* Nouveaux prospects non vus */}
      {newProspects.length > 0 && (
        <DashboardCard
          title="Nouveaux prospects"
          badge={newProspects.length}
          linkHref="/modules/crm?status=prospect"
        >
          {newProspects.map((p) => {
            const displayName = p.first_name ? `${p.first_name} ${p.name}` : p.name
            return (
              <div
                key={p.id}
                className="flex items-start gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-white/[0.03]"
              >
                <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-blue-400 animate-pulse" />
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-medium text-gray-100">{displayName}</p>
                  <p className="truncate text-xs text-gray-500">{p.company} · {p.email}</p>
                  {p.lead_message && (
                    <p className="mt-0.5 line-clamp-1 text-xs italic text-gray-600">
                      {p.lead_message}
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </DashboardCard>
      )}

      {/* Clients en pause */}
      {pausedClients.length > 0 && (
        <DashboardCard title="Parcours en pause" badge={pausedClients.length}>
          {pausedClients.map((p) => {
            const c = Array.isArray(p.clients) ? p.clients[0] : p.clients
            const clientName = c?.company || c?.name || 'Client'
            const reason = p.abandonment_reason ? `Raison : ${p.abandonment_reason}` : 'Aucune raison précisée'
            return (
              <AlertItem
                key={p.id}
                icon="warning"
                title={`${clientName} a mis son parcours en pause`}
                detail={reason}
                iconColor="text-amber-400"
                href={`/modules/crm/clients/${p.client_id}`}
              />
            )
          })}
        </DashboardCard>
      )}

      {/* Messages + Alertes Élio */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <DashboardCard title="Messages non lus" badge={unreadCount} linkHref="/modules/chat">
          {recentMessages.length === 0 ? (
            <p className="px-3 py-4 text-sm text-muted-foreground italic">
              Aucun message en attente
            </p>
          ) : (
            recentMessages.map((msg) => {
              const clientName = clientNameMap.get(msg.client_id) ?? 'Client'
              return (
                <MessageItem
                  key={msg.id}
                  sender={clientName}
                  preview={msg.content}
                  time={formatRelativeTime(msg.created_at)}
                  href={`/modules/chat/${msg.client_id}`}
                />
              )
            })
          )}
        </DashboardCard>

        <DashboardCard
          title="Alertes & Actions — Suggestions Élio"
          badge={elioSuggestions.length || undefined}
          linkHref="/elio/hub"
        >
          {elioSuggestions.length === 0 ? (
            <p className="px-3 py-4 text-sm text-muted-foreground italic">
              Rien à signaler — tout roule 🦊
            </p>
          ) : (
            elioSuggestions.map((s) => (
              <AlertItem
                key={s.key}
                icon={s.icon}
                title={s.title}
                detail={s.detail}
                iconColor={s.iconColor}
                href={s.href}
              />
            ))
          )}
        </DashboardCard>
      </div>
    </div>
  )
}
