import Link from 'next/link'
import { cookies } from 'next/headers'
import {
  DashboardShell,
  ThemeToggle,
  ModeToggle,
  MODE_TOGGLE_COOKIE,
  ModuleSidebar,
  Button,
} from '@monprojetpro/ui'
import { discoverModules, getModulesForTarget } from '@monprojetpro/utils'
import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { NotificationBadge } from '@monprojetpro/modules-notifications'
import { PresenceProvider } from '@monprojetpro/modules-chat'
import { LogoutButton } from './logout-button'
import type { ModuleTarget, CustomBranding } from '@monprojetpro/types'

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
  activeMode,
  labModeAvailable,
}: {
  authUserId: string
  displayName?: string | null
  logoUrl?: string | null
  activeMode: 'lab' | 'one'
  labModeAvailable: boolean
}) {
  return (
    <div className="flex w-full items-center justify-between">
      <div className="flex items-center gap-2">
        {logoUrl && <img src={logoUrl} alt="Logo" className="h-6 w-auto" />}
        <span className="text-sm font-medium">{displayName || 'Mon espace'}</span>
      </div>
      <div className="flex items-center gap-2">
        <ModeToggle currentMode={activeMode} labModeAvailable={labModeAvailable} />
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
  // ADR-01 Révision 2 — `lab_mode_available` ajouté pour piloter la visibilité du toggle Mode Lab/One.
  const { data: clientRecord } = user
    ? await supabase
        .from('clients')
        .select('id, first_name, name, operator_id, client_configs(dashboard_type, active_modules, density, custom_branding, lab_mode_available)')
        .eq('auth_user_id', user.id)
        .maybeSingle()
    : { data: null }

  const clientId = clientRecord?.id ?? ''
  const operatorId = clientRecord?.operator_id ?? ''

  // Normalize joined relation (array or object)
  const configRelation = clientRecord?.client_configs
  const clientConfig = Array.isArray(configRelation) ? configRelation[0] : configRelation

  const dashboardType: 'lab' | 'one' = (clientConfig?.dashboard_type === 'one' ? 'one' : 'lab')
  const labModeAvailable = clientConfig?.lab_mode_available ?? false
  const activeModules: string[] = clientConfig?.active_modules ?? ['core-dashboard']

  // ADR-01 Révision 2 — Le mode actif est piloté par cookie navigateur.
  // dashboard_type reste le statut canonique. Le cookie ne peut activer le Mode Lab
  // que si le client a effectivement lab_mode_available === true.
  const cookieStore = await cookies()
  const cookieView = cookieStore.get(MODE_TOGGLE_COOKIE)?.value
  const cookieMode: 'lab' | 'one' | null =
    cookieView === 'lab' || cookieView === 'one' ? cookieView : null

  const activeMode: 'lab' | 'one' =
    cookieMode === 'lab' && labModeAvailable
      ? 'lab'
      : cookieMode === 'one' && (dashboardType === 'one' || labModeAvailable)
        ? 'one'
        : dashboardType

  const density = activeMode === 'one' ? 'comfortable' : 'spacious'

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
          <ClientSidebar dashboardType={activeMode} activeModules={activeModules} logoUrl={logoUrl} />
        }
        header={
          <ClientHeader
            authUserId={user?.id ?? ''}
            displayName={displayName}
            logoUrl={logoUrl}
            activeMode={activeMode}
            labModeAvailable={labModeAvailable}
          />
        }
      >
        <PresenceProvider userId={clientId} userType="client" operatorId={operatorId}>
          {children}
        </PresenceProvider>
      </DashboardShell>
    </div>
  )
}
