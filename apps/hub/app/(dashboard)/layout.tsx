import { Bell, Search, Sun } from 'lucide-react'
import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { NotificationBadge } from '@monprojetpro/modules-notifications'
import { PresenceProvider, MAX_HUB_CLIENT_PRESENCE_CHANNELS } from '@monprojetpro/modules-chat'
import { ThemeToggle } from '@monprojetpro/ui'
import { HubSidebarClient } from '../../components/hub-sidebar-client'
import { LogoutButton } from './logout-button'
import { SessionKeepAlive } from './session-keep-alive'
import { RealtimeDashboardRefresh } from '../../components/realtime-dashboard-refresh'

async function HubHeader({ authUserId }: { authUserId: string }) {
  return (
    <header className="h-16 shrink-0 border-b border-border bg-background flex items-center px-6 gap-4">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logos/logo-hub.png" alt="MonprojetPro Hub" className="w-auto object-contain shrink-0 hidden md:block" style={{ height: '36px' }} />

      <div className="mx-auto w-full max-w-md">
        <div className="flex items-center gap-2 rounded-md border border-border bg-accent/50 px-3 py-2">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <input
            type="text"
            placeholder="Recherche client, document, validation…"
            className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
          />
        </div>
      </div>

      <div className="flex items-center gap-3 ml-auto">
        {authUserId && <NotificationBadge recipientId={authUserId} />}
        <ThemeToggle />
        <div className="flex items-center gap-2 border-l border-border pl-3">
          <div className="h-7 w-7 rounded-full bg-primary flex items-center justify-center text-xs font-bold text-primary-foreground shrink-0">
            M
          </div>
          <span className="text-sm font-medium hidden md:block">MiKL</span>
        </div>
        <LogoutButton />
      </div>
    </header>
  )
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: operator } = await supabase
    .from('operators')
    .select('id')
    .eq('auth_user_id', user?.id ?? '')
    .maybeSingle()

  const operatorId = (operator as { id: string } | null)?.id ?? ''

  // T-064 : presence sur canaux prives, un sujet par client. Le Hub ecoute chacun de ses
  // clients encore actifs et dotes d'un compte (sans compte, jamais en ligne), du plus
  // recent au plus ancien (+1 pour detecter le plafond).
  const { data: presenceClients } = operatorId
    ? await supabase
        .from('clients')
        .select('id')
        .eq('operator_id', operatorId)
        .not('auth_user_id', 'is', null)
        .not('status', 'in', '(archived,archived_lab,deleted,handed_off)')
        .order('updated_at', { ascending: false })
        .limit(MAX_HUB_CLIENT_PRESENCE_CHANNELS + 1)
    : { data: [] }

  const presenceClientIds = ((presenceClients ?? []) as { id: string }[]).map((c) => c.id)

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <SessionKeepAlive />
      <RealtimeDashboardRefresh operatorId={operatorId} authUserId={user?.id ?? ''} />
      <HubHeader authUserId={user?.id ?? ''} />
      <div className="flex flex-1 overflow-hidden">
        <PresenceProvider
          userId={operatorId}
          userType="operator"
          operatorId={operatorId}
          clientIds={presenceClientIds}
        >
          <HubSidebarClient operatorId={operatorId} userId={user?.id ?? ''} />
          <main className="flex-1 overflow-y-auto">
            {children}
          </main>
        </PresenceProvider>
      </div>
    </div>
  )
}
