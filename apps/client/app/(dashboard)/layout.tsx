import Link from 'next/link'
import { DashboardShell, ThemeToggle, ModuleSidebar, Button } from '@foxeo/ui'
import { discoverModules, getModulesForTarget } from '@foxeo/utils'
import { createServerSupabaseClient } from '@foxeo/supabase'
import { NotificationBadge } from '@foxeo/modules-notifications'
import { PresenceProvider } from '@foxeo/modules-chat'
import { LogoutButton } from './logout-button'
import type { ModuleTarget, CustomBranding } from '@foxeo/types'

async function ClientSidebar({
  dashboardType,
  activeModules,
  logoUrl,
}: {
  dashboardType: string
  activeModules: string[]
  logoUrl?: string | null
}) {
  await discoverModules()
  const target: ModuleTarget =
    dashboardType === 'one' ? 'client-one' : 'client-lab'

  const modules = activeModules.length > 0
    ? getModulesForTarget(target).filter((m) => activeModules.includes(m.id))
    : []

  if (modules.length === 0) {
    return (
      <div className="p-4 text-sm text-muted-foreground">
        Contactez MiKL pour activer vos modules.
      </div>
    )
  }

  return (
    <div>
      {logoUrl && (
        <div className="px-4 py-3">
          <img src={logoUrl} alt="Logo" className="h-8 w-auto" />
        </div>
      )}
      <ModuleSidebar target={target} modules={modules} />
    </div>
  )
}

function ClientHeader({
  authUserId,
  displayName,
  logoUrl,
}: {
  authUserId: string
  displayName?: string | null
  logoUrl?: string | null
}) {
  return (
    <div className="flex w-full items-center justify-between">
      <div className="flex items-center gap-2">
        {logoUrl && <img src={logoUrl} alt="Logo" className="h-6 w-auto" />}
        <span className="text-sm font-medium">{displayName || 'Mon espace'}</span>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/help">Aide</Link>
        </Button>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/support">Signaler</Link>
        </Button>
        {authUserId && <NotificationBadge recipientId={authUserId} />}
        <ThemeToggle />
        <LogoutButton />
      </div>
    </div>
  )
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Single query: fetch client record with joined client_configs (including custom_branding)
  const { data: clientRecord } = user
    ? await supabase
        .from('clients')
        .select('id, first_name, name, operator_id, client_configs(dashboard_type, active_modules, density, custom_branding)')
        .eq('auth_user_id', user.id)
        .maybeSingle()
    : { data: null }

  const clientId = clientRecord?.id ?? ''
  const operatorId = clientRecord?.operator_id ?? ''

  // Normalize joined relation (array or object)
  const configRelation = clientRecord?.client_configs
  const clientConfig = Array.isArray(configRelation) ? configRelation[0] : configRelation

  const dashboardType = clientConfig?.dashboard_type ?? 'lab'
  const activeModules: string[] = clientConfig?.active_modules ?? ['core-dashboard']
  const density = dashboardType === 'one' ? 'comfortable' : 'spacious'

  // Custom branding (from Hub operator configuration)
  const customBranding = (clientConfig?.custom_branding ?? null) as CustomBranding | null
  const accentColor = customBranding?.accentColor ?? null
  const logoUrl = customBranding?.logoUrl ?? null
  const displayName = customBranding?.displayName ?? null

  // Build accent color CSS override style
  const accentStyle: React.CSSProperties = accentColor
    ? ({ '--accent': accentColor } as React.CSSProperties)
    : {}

  return (
    <div style={accentStyle}>
      <DashboardShell
        density={density}
        sidebar={
          <ClientSidebar dashboardType={dashboardType} activeModules={activeModules} logoUrl={logoUrl} />
        }
        header={<ClientHeader authUserId={user?.id ?? ''} displayName={displayName} logoUrl={logoUrl} />}
      >
        <PresenceProvider userId={clientId} userType="client" operatorId={operatorId}>
          {children}
        </PresenceProvider>
      </DashboardShell>
    </div>
  )
}
