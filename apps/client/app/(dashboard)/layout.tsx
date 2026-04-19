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
import { manifest as parcoursMani } from '@monprojetpro/module-parcours/manifest'
import { manifest as elioMani } from '@monprojetpro/module-elio/manifest'
import { manifest as chatMani } from '@monprojetpro/modules-chat/manifest'
import { manifest as docsMani } from '@monprojetpro/module-documents/manifest'
import { manifest as coreMani } from '@monprojetpro/module-core-dashboard/manifest'
import type { ModuleManifest } from '@monprojetpro/types'

const ALL_CLIENT_MANIFESTS: ModuleManifest[] = [
  parcoursMani,
  elioMani,
  chatMani,
  docsMani,
  coreMani,
]
import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { NotificationBadge } from '@monprojetpro/modules-notifications'
import { PresenceProvider } from '@monprojetpro/modules-chat'
import { LogoutButton } from './logout-button'
import { ThemeClassSetter } from './theme-class-setter'
import { ImpersonationWrapper } from './impersonation-wrapper'
import type { ModuleTarget, CustomBranding } from '@monprojetpro/types'

function ClientSidebar({
  dashboardType,
  activeModules,
  logoUrl,
}: {
  dashboardType: string
  activeModules: string[]
  logoUrl?: string | null
}) {
  const target: ModuleTarget =
    dashboardType === 'one' ? 'client-one' : 'client-lab'

  const modules = ALL_CLIENT_MANIFESTS
    .filter((m) => m.targets.includes(target) && activeModules.includes(m.id))
    .sort((a, b) => a.navigation.position - b.navigation.position)

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
  type ClientRecord = {
    id: string
    first_name: string | null
    name: string | null
    operator_id: string | null
    client_configs:
      | {
          dashboard_type: string
          active_modules: string[] | null
          custom_branding: CustomBranding | null
          lab_mode_available: boolean | null
        }
      | Array<{
          dashboard_type: string
          active_modules: string[] | null
          custom_branding: CustomBranding | null
          lab_mode_available: boolean | null
        }>
      | null
  }

  let clientRecord: ClientRecord | null = null
  if (user) {
    const { data } = await supabase
      .from('clients')
      .select('id, first_name, name, operator_id, client_configs(dashboard_type, active_modules, custom_branding, lab_mode_available)')
      .eq('auth_user_id', user.id)
      .maybeSingle()
    clientRecord = (data as ClientRecord | null) ?? null
  }

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
      <ThemeClassSetter activeMode={activeMode} />
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
        <ImpersonationWrapper>
          <PresenceProvider userId={clientId} userType="client" operatorId={operatorId}>
            {children}
          </PresenceProvider>
        </ImpersonationWrapper>
      </DashboardShell>
    </div>
  )
}
