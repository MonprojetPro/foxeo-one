import { createServerSupabaseClient } from '@foxeo/supabase'
import { MetricCard } from '../../components/dashboard/metric-card'
import { AgendaItem } from '../../components/dashboard/agenda-item'
import { MessageItem } from '../../components/dashboard/message-item'
import { AlertItem } from '../../components/dashboard/alert-item'
import { DashboardCard } from '../../components/dashboard/dashboard-card'

// ─── Types ────────────────────────────────────────────────────────────────────

interface MeetingRow {
  id: string
  title: string | null
  scheduled_at: string | null
  status: string
  session_id: string | null
  clients: { company_name: string } | { company_name: string }[] | null
}

interface MessageRow {
  id: string
  content: string
  created_at: string
  client_id: string
  clients: { company_name: string } | { company_name: string }[] | null
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
  return c?.company_name ?? ''
}

function minutesUntil(iso: string | null): number | null {
  if (!iso) return null
  return Math.floor((new Date(iso).getTime() - Date.now()) / 60000)
}

// ─── Data fetching ────────────────────────────────────────────────────────────

async function getHubStats(operatorId: string) {
  const supabase = await createServerSupabaseClient()

  // Clients
  type ClientRow = { id: string; client_configs: { dashboard_type: string }[] | { dashboard_type: string } | null }
  const { data: rawClients } = await supabase
    .from('clients')
    .select('id, client_configs(dashboard_type)')
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

  // Meetings today
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const todayEnd = new Date()
  todayEnd.setHours(23, 59, 59, 999)

  const { data: meetings } = await supabase
    .from('meetings')
    .select('id, title, scheduled_at, status, session_id, clients(company_name)')
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
      .select('id, content, created_at, client_id, clients(company_name)')
      .in('client_id', clientIds)
      .eq('sender_type', 'client')
      .is('read_at', null)
      .order('created_at', { ascending: false })
      .limit(3)
    recentMessages = (msgs ?? []) as MessageRow[]
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
    .eq('status', 'unpaid')
  const unpaidInvoices = (rawUnpaid ?? []) as { amount: number | null }[]
  const unpaidAmount = unpaidInvoices.reduce((sum, inv) => sum + ((inv.amount ?? 0) / 100), 0)

  return {
    totalClients: clients?.length ?? 0,
    labCount,
    oneCount,
    meetings: (meetings ?? []) as MeetingRow[],
    unreadCount,
    recentMessages,
    mrr,
    unpaidAmount,
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
  const { totalClients, labCount, oneCount, meetings, unreadCount, recentMessages, mrr, unpaidAmount } =
    await getHubStats(operatorId)

  const today = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
  const todayCap = today.charAt(0).toUpperCase() + today.slice(1)

  const mrrDisplay = mrr > 0 ? `${Math.round(mrr).toLocaleString('fr-FR')} €` : '—'
  const unpaidDisplay = unpaidAmount > 0 ? `${Math.round(unpaidAmount).toLocaleString('fr-FR')} €` : '—'

  return (
    <div className="p-6 space-y-6">
      {/* Greeting */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Bonjour MiKL 👋</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Voici votre tableau de bord pour aujourd'hui — {todayCap}
          </p>
        </div>
        <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-400">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
          En ligne
        </span>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <MetricCard
          title="Total clients"
          value={String(totalClients)}
          subtitle={`${labCount} Lab · ${oneCount} One`}
          accentColor="primary"
        />
        <MetricCard title="Clients Lab" value={String(labCount)} subtitle="En incubation" />
        <MetricCard title="Clients One" value={String(oneCount)} subtitle="En activité" />
        <MetricCard
          title="MRR"
          value={mrrDisplay}
          subtitle="Abonnements actifs"
          accentColor={mrr > 0 ? 'primary' : 'muted'}
        />
        <MetricCard
          title="Impayés"
          value={unpaidDisplay}
          subtitle="Factures en retard"
          accentColor={unpaidAmount > 0 ? 'destructive' : 'muted'}
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
                  actionLabel={m.session_id ? 'Rejoindre' : undefined}
                  actionHref={m.session_id ? `/modules/visio/${m.session_id}` : undefined}
                  badgeText={isLive ? 'En cours' : isSoon ? `Dans ${minsUntil} min` : undefined}
                />
              )
            })
          )}
        </DashboardCard>

        <DashboardCard title="Validations en attente" linkHref="/modules/validation-hub">
          <p className="px-3 py-4 text-sm text-muted-foreground italic">
            Voir la file d'attente →
          </p>
        </DashboardCard>
      </div>

      {/* Messages + Alertes Élio */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <DashboardCard title="Messages non lus" badge={unreadCount} linkHref="/modules/chat">
          {recentMessages.length === 0 ? (
            <p className="px-3 py-4 text-sm text-muted-foreground italic">
              Aucun message en attente
            </p>
          ) : (
            recentMessages.map((msg) => {
              const clientName = getClientName(msg.clients as MeetingRow['clients']) || 'Client'
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

        <DashboardCard title="Alertes & Actions — Suggestions Élio" linkHref="/modules/elio">
          {unpaidAmount > 0 && (
            <AlertItem
              icon="warning"
              title="Factures impayées"
              detail={`${Math.round(unpaidAmount).toLocaleString('fr-FR')} € en retard`}
              iconColor="text-destructive"
              href="/modules/facturation"
            />
          )}
          <AlertItem
            icon="graduation"
            title="Vérifier les progressions Lab"
            detail="Consulter les étapes en attente de validation"
            iconColor="text-primary"
            href="/modules/validation-hub"
          />
          <AlertItem
            icon="bell"
            title="Élio disponible"
            detail="Demandez-lui une analyse ou une suggestion"
            href="/modules/elio"
          />
        </DashboardCard>
      </div>
    </div>
  )
}
