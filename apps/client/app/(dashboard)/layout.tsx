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
import type { ModuleSidebarBadge } from '@monprojetpro/ui'
import { manifest as parcoursMani } from '@monprojetpro/module-parcours/manifest'
import { manifest as elioMani } from '@monprojetpro/module-elio/manifest'
import { manifest as chatMani } from '@monprojetpro/modules-chat/manifest'
import { manifest as docsMani } from '@monprojetpro/module-documents/manifest'
import { manifest as visioMani } from '@monprojetpro/module-visio/manifest'
import { manifest as facturationMani } from '@monprojetpro/modules-facturation/manifest'
import { manifest as supportMani } from '@monprojetpro/modules-support/manifest'
import { manifest as suiviOutilMani } from '@monprojetpro/module-suivi-outil/manifest'
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
  elioMani,      // One → widget sidebar + /modules/elio. Lab → Concierge en pop-up éphémère (depuis Mon Parcours)
  visioMani,     // Lab + One → /modules/visio
  facturationMani, // One → /modules/facturation
  supportMani,   // Lab + One → /modules/support
  suiviOutilMani, // Lab + One → /modules/suivi-outil
]
import { createServerSupabaseClient, hasIaConsent } from '@monprojetpro/supabase'
import { CURRENT_IA_POLICY_VERSION, resolveClientMode } from '@monprojetpro/utils'
import { NotificationBadge } from '@monprojetpro/modules-notifications'
import { PresenceProvider } from '@monprojetpro/modules-chat'
import { LogoutButton } from './logout-button'
import { ThemeClassSetter } from './theme-class-setter'
import { RealtimeDashboardRefresh } from '../../components/realtime-dashboard-refresh'
import { ImpersonationWrapper } from './impersonation-wrapper'
import { OneElioBox } from '../../components/one-elio-box'
import { SessionKeepAlive } from './session-keep-alive'
import type { ModuleTarget, CustomBranding } from '@monprojetpro/types'

function ClientSidebar({
  dashboardType,
  activeModules,
  logoUrl,
  userId,
  badges,
  iaConsentGranted,
}: {
  dashboardType: string
  activeModules: string[]
  logoUrl?: string | null
  userId: string
  badges?: Record<string, ModuleSidebarBadge>
  iaConsentGranted: boolean
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
      ? <OneElioBox userId={userId} iaConsentGranted={iaConsentGranted} />
      : undefined

  return (
    <ModuleSidebar target={target} modules={modules} elioWidget={elioWidget} badges={badges} />
  )
}

/**
 * Calcule le badge à afficher sur l'item "parcours" de la sidebar gauche client.
 * - rouge : feedbacks MiKL non lus (priorité absolue)
 * - orange : la dernière soumission a été refusée
 * - jaune : soumission en attente de validation
 * Retourne undefined si rien à signaler.
 *
 * Les 3 queries tournent en parallèle (Promise.all) pour réduire la pression sur le pool
 * DB Supabase — au SSR avec `router.refresh()` fréquent, des queries séquentielles ont
 * fait sauter "Connection closed" en mai 2026.
 */
async function computeParcoursBadge(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  clientId: string,
): Promise<ModuleSidebarBadge | undefined> {
  if (!clientId) return undefined

  const [unreadFeedbackRes, latestSubmissionRes, pendingReviewRes] = await Promise.all([
    supabase
      .from('step_feedback_injections')
      .select('id', { count: 'exact', head: true })
      .eq('client_id', clientId)
      .is('read_at', null),
    supabase
      .from('step_submissions')
      .select('status')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('client_parcours_agents')
      .select('id')
      .eq('client_id', clientId)
      .eq('status', 'pending_review')
      .limit(1)
      .maybeSingle(),
  ])

  const unreadFeedbackCount = unreadFeedbackRes.count ?? 0
  if (unreadFeedbackCount > 0) {
    return {
      variant: 'red',
      count: unreadFeedbackCount,
      ariaLabel: `${unreadFeedbackCount} feedback(s) MiKL non lu(s)`,
    }
  }

  if ((latestSubmissionRes.data as { status: string } | null)?.status === 'rejected') {
    return { variant: 'orange', ariaLabel: 'Document refusé — à corriger' }
  }

  if (pendingReviewRes.data) {
    return { variant: 'yellow', ariaLabel: 'Soumission en attente de validation' }
  }

  return undefined
}

/**
 * Badge "Chat" : nombre de messages non lus envoyés par l'opérateur au client.
 * Toujours rouge avec compteur.
 */
async function computeChatBadge(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  clientId: string,
): Promise<ModuleSidebarBadge | undefined> {
  if (!clientId) return undefined

  const { count } = await supabase
    .from('messages')
    .select('id', { count: 'exact', head: true })
    .eq('client_id', clientId)
    .eq('sender_type', 'operator')
    .is('read_at', null)

  const unread = count ?? 0
  if (unread === 0) return undefined

  return {
    variant: 'red',
    count: unread,
    ariaLabel: `${unread} message(s) non lu(s) de MiKL`,
  }
}

function ClientHeader({
  authUserId,
  logoUrl,
  displayName,
  activeMode,
  labModeAvailable,
  oneLocked,
  labLocked,
  userInitials,
}: {
  authUserId: string
  logoUrl?: string | null
  displayName?: string | null
  activeMode: 'lab' | 'one'
  labModeAvailable: boolean
  oneLocked: boolean
  labLocked: boolean
  userInitials: string
}) {
  // Couleurs Lab : violet fixe (pas de personnalisation brand côté Lab)
  // Couleurs One : via var(--brand-accent) qui vaut la couleur client ou le vert par défaut
  const labAccentFrom = '#7c3aed'
  const labAccentTo   = '#a78bfa'
  const avatarGradient = activeMode === 'lab'
    ? `linear-gradient(135deg, ${labAccentFrom}, ${labAccentTo})`
    : 'linear-gradient(135deg, var(--brand-accent, #16a34a), color-mix(in srgb, var(--brand-accent, #16a34a) 60%, white))'

  // Nom affiché dans le header : priorité → displayName custom → logo → rien (logo suffit)
  const brandName = displayName ?? (activeMode === 'lab' ? 'MonprojetPro Lab' : 'MonprojetPro One')

  return (
    <div className="flex w-full items-center justify-between relative">
      {/* Gauche — logo + displayName */}
      <div className="flex items-center gap-2" style={{ width: 220 }}>
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt={brandName} className="h-8 w-auto object-contain" />
        ) : activeMode === 'lab' ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src="/logos/logo-lab.png" alt="MonprojetPro Lab" className="w-auto object-contain" style={{ height: '60px' }} />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src="/logos/logo-one.png" alt="MonprojetPro One" className="w-auto object-contain" style={{ height: '60px' }} />
        )}
        {/* displayName personnalisé : affiché seulement quand défini ET pas de logo custom
            (quand il y a un logo, le logo porte déjà l'identité de marque) */}
        {displayName && !logoUrl && (
          <span className="text-sm font-semibold truncate max-w-[120px]" title={displayName}>
            {displayName}
          </span>
        )}
      </div>

      {/* Centre — toggle Lab / One */}
      <div className="absolute left-1/2 -translate-x-1/2">
        <ModeToggle currentMode={activeMode} labModeAvailable={labModeAvailable} oneLocked={oneLocked} labLocked={labLocked} />
      </div>

      {/* Droite — cloche + avatar */}
      <div className="flex items-center gap-3.5" style={{ width: 220, justifyContent: 'flex-end' }}>
        {authUserId && <NotificationBadge recipientId={authUserId} />}
        <div
          className="w-[34px] h-[34px] rounded-full flex items-center justify-center text-white font-bold text-[12px] tracking-[0.5px] shrink-0 cursor-default"
          style={{ background: avatarGradient }}
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
          one_mode_available: boolean | null
        }
      | Array<{
          dashboard_type: string
          active_modules: string[] | null
          custom_branding: CustomBranding | null
          lab_mode_available: boolean | null
          one_mode_available: boolean | null
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
      .select('id, first_name, name, operator_id, client_configs(dashboard_type, active_modules, custom_branding, lab_mode_available, one_mode_available)')
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

  // Re-consentement IA — déclenché UNIQUEMENT si une décision IA antérieure est périmée
  // (jamais les clients sans consentement, ni ceux à jour). On le fait ici avec redirect()
  // côté serveur (et non dans le middleware) car les redirections middleware échouent en
  // navigation interne (soft-nav RSC). /ia-consent-update est hors du groupe (dashboard) :
  // pas de boucle.
  if (clientId) {
    const { data: latestIa } = (await supabase
      .from('consents')
      .select('version')
      .eq('client_id', clientId)
      .eq('consent_type', 'ia_processing')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()) as { data: { version: string } | null }

    if (latestIa && latestIa.version !== CURRENT_IA_POLICY_VERSION) {
      redirect('/ia-consent-update')
    }
  }

  // Calcul des initiales pour l'avatar header
  const firstName = clientRecord?.first_name ?? ''
  const lastName  = clientRecord?.name ?? ''
  const userInitials = ((firstName[0] ?? '') + (lastName[0] ?? '')).toUpperCase() || 'CL'

  // Normalize joined relation (array or object)
  const configRelation = clientRecord?.client_configs
  const clientConfig = Array.isArray(configRelation) ? configRelation[0] : configRelation

  const labModeAvailable = clientConfig?.lab_mode_available ?? false
  const activeModules: string[] = clientConfig?.active_modules ?? ['core-dashboard']

  // ADR-01 Révision 2 — Le mode actif est piloté par cookie navigateur, clampé aux
  // modes réellement disponibles (résolveur centralisé, source unique de vérité).
  const cookieStore = await cookies()
  const { activeMode, oneLocked, labLocked } = resolveClientMode({
    dashboardType: clientConfig?.dashboard_type,
    labModeAvailable,
    oneModeAvailable: clientConfig?.one_mode_available ?? false,
    cookieMode: cookieStore.get(MODE_TOGGLE_COOKIE)?.value,
  })

  const density = activeMode === 'one' ? 'comfortable' : 'spacious'

  // Custom branding (from Hub operator configuration)
  const customBranding = (clientConfig?.custom_branding ?? null) as CustomBranding | null
  const accentColor = customBranding?.accentColor ?? null
  const logoUrl = customBranding?.logoUrl ?? null
  const displayName = customBranding?.displayName ?? null

  // Badges sidebar — calculés côté serveur, propagés via prop (Kit Complet).
  // Realtime branché via `RealtimeDashboardRefresh` qui écoute aussi `messages`.
  const sidebarBadges: Record<string, ModuleSidebarBadge> = {}
  const needsIaConsent = activeMode === 'one' && activeModules.includes('elio')
  const [parcoursBadge, chatBadge, iaConsentGranted] = await Promise.all([
    activeModules.includes('parcours') ? computeParcoursBadge(supabase, clientId) : Promise.resolve(undefined),
    activeModules.includes('chat') ? computeChatBadge(supabase, clientId) : Promise.resolve(undefined),
    needsIaConsent && clientId ? hasIaConsent(clientId) : Promise.resolve(false),
  ])
  if (parcoursBadge) sidebarBadges.parcours = parcoursBadge
  if (chatBadge) sidebarBadges.chat = chatBadge

  // Build accent color CSS override style
  // --brand-accent : couleur personnalisée du client, utilisée partout dans le dashboard One
  // --accent       : variable Tailwind standard (surcharge pour les composants UI shadcn/radix)
  // Fallback : vert One #16a34a quand pas de couleur définie
  const ONE_DEFAULT_ACCENT = '#16a34a'
  const effectiveAccent = accentColor ?? ONE_DEFAULT_ACCENT
  const accentStyle: React.CSSProperties = {
    '--brand-accent': effectiveAccent,
    ...(accentColor ? { '--accent': accentColor } : {}),
  } as React.CSSProperties

  return (
    <div style={accentStyle}>
      <SessionKeepAlive />
      <RealtimeDashboardRefresh clientId={clientId} />
      <ThemeClassSetter activeMode={activeMode} />
      <DashboardShell
        density={density}
        sidebar={
          <ClientSidebar dashboardType={activeMode} activeModules={activeModules} logoUrl={logoUrl} userId={user?.id ?? ''} badges={sidebarBadges} iaConsentGranted={iaConsentGranted} />
        }
        header={
          <ClientHeader
            authUserId={user?.id ?? ''}
            logoUrl={logoUrl}
            displayName={displayName}
            activeMode={activeMode}
            labModeAvailable={labModeAvailable}
            oneLocked={oneLocked}
            labLocked={labLocked}
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
