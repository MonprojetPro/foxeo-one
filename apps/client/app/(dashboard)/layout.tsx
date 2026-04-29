import { redirect } from 'next/navigation'
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
import { manifest as visioMani } from '@monprojetpro/module-visio/manifest'
import { manifest as facturationMani } from '@monprojetpro/modules-facturation/manifest'
import { manifest as supportMani } from '@monprojetpro/modules-support/manifest'
import { coreDashboardManifest as coreMani } from '@monprojetpro/module-core-dashboard/manifest'
import type { ModuleManifest } from '@monprojetpro/types'

// Catalogue exhaustif des modules clients — TOUT module ciblant client-lab ou client-one
// doit être listé ici. Le filtre targets + activeModules décide ce qui s'affiche.
// ⚠️ Checklist ajout module : (1) ajouter ici, (2) créer apps/client/app/(dashboard)/modules/[name]/page.tsx
const ALL_CLIENT_MANIFESTS: ModuleManifest[] = [
  coreMani,      // Dashboard accueil → /
  parcoursMani,  // Lab uniquement → /modules/parcours
  chatMani,      // Lab + One → /modules/chat
  docsMani,      // Lab + One → /modules/documents
  elioMani,      // Lab + One → widget sidebar (One) / /modules/elio (Lab)
  visioMani,     // Lab + One → /modules/visio
  facturationMani, // One → /modules/facturation
  supportMani,   // Lab + One → /modules/support
]
import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { NotificationBadge } from '@monprojetpro/modules-notifications'
import { PresenceProvider } from '@monprojetpro/modules-chat'
import { LogoutButton } from './logout-button'
import { ThemeClassSetter } from './theme-class-setter'
import { ImpersonationWrapper } from './impersonation-wrapper'
import { OneElioBox } from '../../components/one-elio-box'
import { SessionKeepAlive } from './session-keep-alive'
import type { ModuleTarget, CustomBranding } from '@monprojetpro/types'

function ClientSidebar({
  dashboardType,
  activeModules,
  logoUrl,
  userId,
}: {
  dashboardType: string
  activeModules: string[]
  logoUrl?: string | null
  userId: string
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

  // Widget Élio en bas de sidebar pour One (si le module elio est actif)
  const elioWidget =
    target === 'client-one' && activeModules.includes('elio')
      ? <OneElioBox userId={userId} />
      : undefined

  return (
    <ModuleSidebar target={target} modules={modules} elioWidget={elioWidget} />
  )
}

function ClientHeader({
  authUserId,
  logoUrl,
  activeMode,
  labModeAvailable,
  userInitials,
}: {
  authUserId: string
  logoUrl?: string | null
  activeMode: 'lab' | 'one'
  labModeAvailable: boolean
  userInitials: string
}) {
  const accentFrom = activeMode === 'lab' ? '#7c3aed' : '#16a34a'
  const accentTo   = activeMode === 'lab' ? '#a78bfa' : '#4ade80'
  const accentText = activeMode === 'lab' ? '#a78bfa' : '#4ade80'

  return (
    <div className="flex w-full items-center justify-between relative">
      {/* Gauche — logo */}
      <div className="flex items-center" style={{ width: 220 }}>
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt="Logo" className="h-8 w-auto object-contain" />
        ) : activeMode === 'lab' ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src="/logos/logo-lab.png" alt="MonprojetPro Lab" className="h-12 w-auto object-contain" />
        ) : (
          <div className="flex items-center gap-2.5">
            <div
              className="w-[30px] h-[30px] rounded-lg flex items-center justify-center text-white font-extrabold text-[14px] tracking-[-0.04em] shrink-0"
              style={{ background: `linear-gradient(135deg, ${accentFrom}, ${accentTo})` }}
            >
              M
            </div>
            <div className="text-[15px] font-bold leading-none tracking-[-0.01em]">
              <span style={{ color: accentText }}>Monprojet</span>
              <span className="text-[#f9fafb]">Pro</span>
            </div>
          </div>
        )}
      </div>

      {/* Centre — toggle Lab / One */}
      <div className="absolute left-1/2 -translate-x-1/2">
        <ModeToggle currentMode={activeMode} labModeAvailable={labModeAvailable} />
      </div>

      {/* Droite — cloche + avatar */}
      <div className="flex items-center gap-3.5" style={{ width: 220, justifyContent: 'flex-end' }}>
        {authUserId && <NotificationBadge recipientId={authUserId} />}
        <div
          className="w-[34px] h-[34px] rounded-full flex items-center justify-center text-white font-bold text-[12px] tracking-[0.5px] shrink-0 cursor-default"
          style={{ background: `linear-gradient(135deg, ${accentFrom}, ${accentTo})` }}
          title="Compte"
          aria-label="Avatar utilisateur"
        >
          {userInitials}
        </div>
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

  if (!user) {
    redirect('/login')
  }

  let clientRecord: ClientRecord | null = null
  {
    const { data } = await supabase
      .from('clients')
      .select('id, first_name, name, operator_id, client_configs(dashboard_type, active_modules, custom_branding, lab_mode_available)')
      .eq('auth_user_id', user.id)
      .maybeSingle()
    clientRecord = (data as ClientRecord | null) ?? null
  }

  if (!clientRecord) {
    await supabase.auth.signOut()
    redirect('/login')
  }

  const clientId = clientRecord?.id ?? ''
  const operatorId = clientRecord?.operator_id ?? ''

  // Calcul des initiales pour l'avatar header
  const firstName = clientRecord?.first_name ?? ''
  const lastName  = clientRecord?.name ?? ''
  const userInitials = ((firstName[0] ?? '') + (lastName[0] ?? '')).toUpperCase() || 'CL'

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

  // Build accent color CSS override style
  const accentStyle: React.CSSProperties = accentColor
    ? ({ '--accent': accentColor } as React.CSSProperties)
    : {}

  return (
    <div style={accentStyle}>
      <SessionKeepAlive />
      <ThemeClassSetter activeMode={activeMode} />
      <DashboardShell
        density={density}
        sidebar={
          <ClientSidebar dashboardType={activeMode} activeModules={activeModules} logoUrl={logoUrl} userId={user?.id ?? ''} />
        }
        header={
          <ClientHeader
            authUserId={user?.id ?? ''}
            logoUrl={logoUrl}
            activeMode={activeMode}
            labModeAvailable={labModeAvailable}
            userInitials={userInitials}
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
