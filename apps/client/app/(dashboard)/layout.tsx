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
import { MaintenanceRealtimeGuard } from '../../components/maintenance-realtime-guard'
import { ImpersonationWrapper } from './impersonation-wrapper'
import { OneElioBox } from '../../components/one-elio-box'
import { ElioOnePopup } from '../../components/elio-one-popup'
import { ElioOneSessionProvider } from '../../components/elio-one-session'
import { SessionKeepAlive } from './session-keep-alive'
import type { ModuleTarget, CustomBranding } from '@monprojetpro/types'

function ClientSidebar({
  dashboardType,
  activeModules,
  badges,
  iaConsentGranted,
}: {
  dashboardType: string
  activeModules: string[]
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

  // Widget Élio en bas de sidebar pour One (si le module elio est actif). Branché sur la
  // session Élio One partagée (via ElioOneSessionProvider du layout) → continuité avec la pop-up.
  const elioWidget =
    target === 'client-one' && activeModules.includes('elio')
      ? <OneElioBox iaConsentGranted={iaConsentGranted} />
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
  displayName,
  activeMode,
  labModeAvailable,
  oneLocked,
  labLocked,
  userInitials,
  oneInConstruction,
}: {
  authUserId: string
  displayName?: string | null
  activeMode: 'lab' | 'one'
  labModeAvailable: boolean
  oneLocked: boolean
  labLocked: boolean
  userInitials: string
  /** One uniquement : true tant que l'outil sur-mesure n'est pas livré (one_status='construction').
   *  Déclenche la signature « chantier » du header (rubalise orange/blanc + plot animé). */
  oneInConstruction: boolean
}) {
  // Couleurs Lab : violet fixe (pas de personnalisation brand côté Lab)
  // Couleurs One : via var(--brand-accent) qui vaut la couleur client ou le vert par défaut
  const labAccentFrom = '#7c3aed'
  const labAccentTo   = '#a78bfa'
  const avatarGradient = activeMode === 'lab'
    ? `linear-gradient(135deg, ${labAccentFrom}, ${labAccentTo})`
    : 'linear-gradient(135deg, var(--brand-accent, #16a34a), color-mix(in srgb, var(--brand-accent, #16a34a) 60%, white))'

  // Signature « chantier » du header — One uniquement, état construction.
  // Code couleur travaux assumé : orange/jaune + blanc (PAS le vert du thème). Deux éléments :
  // - une SEULE bande de rubalise oblique (rayures à -45°) en fond de toute la barre, faible
  //   opacité pour rester lisible, qui défile lentement → effet « barre habillée de chantier ».
  // - un PLOT de chantier en SVG, posé À GAUCHE à côté du nom de la société, qui se balance.
  // Tout en `motion-safe:` → sur prefers-reduced-motion : rubalise figée + cône immobile.
  const showConstructionFx = activeMode === 'one' && oneInConstruction

  const constructionCone = (
    <div
      aria-hidden="true"
      className="shrink-0 origin-bottom motion-safe:[animation:one-cone-sway_3.4s_ease-in-out_infinite]"
      style={{ transformBox: 'fill-box' }}
    >
      <svg width="22" height="26" viewBox="0 0 26 30" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* ombre au sol */}
        <ellipse cx="13" cy="27.5" rx="11" ry="2.2" fill="rgba(0,0,0,0.35)" />
        {/* socle */}
        <rect x="2" y="24" width="22" height="3.6" rx="1.2" fill="#fb923c" />
        <rect x="2" y="24" width="22" height="1.4" rx="0.7" fill="#fdba74" />
        {/* corps du cône */}
        <path d="M13 2 L20 24 H6 Z" fill="#f97316" />
        {/* bandes réfléchissantes blanches */}
        <path d="M10.7 9 L15.3 9 L15.9 12 L10.1 12 Z" fill="#fff7ed" />
        <path d="M9.2 16 L16.8 16 L17.6 19.5 L8.4 19.5 Z" fill="#fff7ed" />
        {/* pointe + reflet */}
        <circle cx="13" cy="2.5" r="1.4" fill="#fdba74" />
        <path d="M13 3 L11 12" stroke="rgba(255,255,255,0.35)" strokeWidth="0.8" strokeLinecap="round" />
      </svg>
    </div>
  )

  return (
    <div className="flex w-full items-center justify-between relative">
      {showConstructionFx && (
        <div
          aria-hidden="true"
          className="one-hazard-band pointer-events-none absolute inset-0 z-0 rounded-md motion-safe:[animation:one-hazard-band-scroll_3s_linear_infinite]"
        />
      )}
      {/* Gauche — (cône chantier) + logo + displayName
          Logique (mode One) :
            - displayName défini → symbole MPP blanc + nom en texte blanc Poppins gras
            - pas de displayName → logo /logos/logo-one.png (vert, défaut)
          Mode Lab : logo /logos/logo-lab.png — inchangé */}
      <div className="relative z-10 flex items-center gap-2" style={{ width: 220 }}>
        {showConstructionFx && constructionCone}
        {activeMode === 'lab' ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src="/logos/logo-lab.png" alt="MonprojetPro Lab" className="w-auto object-contain" style={{ height: '60px' }} />
        ) : displayName ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logos/logo-symbol.png" alt="MonprojetPro" className="w-auto object-contain shrink-0" style={{ height: '36px' }} />
            <span
              className="font-bold truncate max-w-[140px] text-white"
              style={{ fontFamily: 'Poppins, sans-serif', fontSize: '1rem', lineHeight: 1.2 }}
              title={displayName}
            >
              {displayName}
            </span>
          </>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src="/logos/logo-one.png" alt="MonprojetPro One" className="w-auto object-contain" style={{ height: '60px' }} />
        )}
      </div>

      {/* Centre — toggle Lab / One */}
      <div className="absolute left-1/2 -translate-x-1/2 z-10">
        <ModeToggle currentMode={activeMode} labModeAvailable={labModeAvailable} oneLocked={oneLocked} labLocked={labLocked} />
      </div>

      {/* Droite — cloche + avatar */}
      <div className="relative z-10 flex items-center gap-3.5" style={{ width: 220, justifyContent: 'flex-end' }}>
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
          one_status: string | null
        }
      | Array<{
          dashboard_type: string
          active_modules: string[] | null
          custom_branding: CustomBranding | null
          lab_mode_available: boolean | null
          one_mode_available: boolean | null
          one_status: string | null
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
      .select('id, first_name, name, operator_id, client_configs(dashboard_type, active_modules, custom_branding, lab_mode_available, one_mode_available, one_status)')
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

  // Cycle de vie visuel du One (vision v2) : tant que l'outil sur-mesure n'est pas livré
  // (one_status = 'construction'), on affiche un bandeau "en chantier" au-dessus du contenu.
  // Purement visuel : le socle reste entièrement accessible. Concerne uniquement le mode One.
  const oneStatus = clientConfig?.one_status ?? 'construction'
  const showConstructionBanner = activeMode === 'one' && oneStatus === 'construction'

  // Custom branding (from Hub operator configuration)
  // Note : logoUrl est conservé dans le type CustomBranding pour rétro-compat DB mais
  // n'est plus affiché dans le header depuis 2026-06-21 (modèle symbole MPP + nom texte).
  const customBranding = (clientConfig?.custom_branding ?? null) as CustomBranding | null
  const accentColor = customBranding?.accentColor ?? null
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
  // --brand-accent     : couleur personnalisée du client, utilisée partout dans le dashboard One
  // --brand-accent-fg  : foreground sur fond accent (blanc si bon contraste, noir sinon)
  // --brand-accent-muted : version très transparente pour les fonds d'éléments secondaires
  // --accent           : variable Tailwind standard (surcharge pour les composants UI shadcn/radix)
  // Fallback : vert One #16a34a quand pas de couleur définie
  const ONE_DEFAULT_ACCENT = '#16a34a'
  const effectiveAccent = accentColor ?? ONE_DEFAULT_ACCENT

  // Calcul du foreground (blanc ou noir) selon la luminance de l'accent — WCAG AA large (ratio ≥ 3.0)
  function computeAccentFg(hex: string): string {
    const hexClean = hex.replace('#', '')
    if (hexClean.length !== 6) return '#ffffff'
    const r = parseInt(hexClean.slice(0, 2), 16) / 255
    const g = parseInt(hexClean.slice(2, 4), 16) / 255
    const b = parseInt(hexClean.slice(4, 6), 16) / 255
    const toLinear = (c: number) => c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
    const lum = 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b)
    const contrastVsWhite = (1 + 0.05) / (lum + 0.05)
    return contrastVsWhite >= 3.0 ? '#ffffff' : '#000000'
  }

  const accentFg = computeAccentFg(effectiveAccent)

  const accentStyle: React.CSSProperties = {
    '--brand-accent': effectiveAccent,
    '--brand-accent-fg': accentFg,
    '--brand-accent-muted': `color-mix(in srgb, ${effectiveAccent} 12%, transparent)`,
    '--brand-accent-border': `color-mix(in srgb, ${effectiveAccent} 30%, transparent)`,
    ...(accentColor ? { '--accent': accentColor } : {}),
  } as React.CSSProperties

  // Élio One actif → widget sidebar + pop-up partagent UNE session éphémère (continuité).
  const oneElioActive = activeMode === 'one' && activeModules.includes('elio')

  const shell = (
    <DashboardShell
      density={density}
      sidebar={
        <ClientSidebar dashboardType={activeMode} activeModules={activeModules} badges={sidebarBadges} iaConsentGranted={iaConsentGranted} />
      }
      header={
        <ClientHeader
          authUserId={user?.id ?? ''}
          displayName={displayName}
          activeMode={activeMode}
          labModeAvailable={labModeAvailable}
          oneLocked={oneLocked}
          labLocked={labLocked}
          userInitials={userInitials}
          oneInConstruction={showConstructionBanner}
        />
      }
    >
      <ImpersonationWrapper>
        <PresenceProvider userId={clientId} userType="client" operatorId={operatorId}>
          {children}
        </PresenceProvider>
      </ImpersonationWrapper>
    </DashboardShell>
  )

  return (
    <div style={accentStyle}>
      <SessionKeepAlive />
      <RealtimeDashboardRefresh clientId={clientId} />
      {/* Bascule maintenance instantanée : redirige le client vers /maintenance dès que
          MiKL active le mode depuis le Hub (sans rechargement). */}
      <MaintenanceRealtimeGuard />
      <ThemeClassSetter activeMode={activeMode} />
      {/* Session Élio One partagée + pop-up UNIQUE : le widget sidebar (dans le shell) et la
          pop-up consomment la même conversation → « Voir dans Élio » montre l'échange en cours. */}
      {oneElioActive ? (
        <ElioOneSessionProvider clientId={clientId}>
          <ElioOnePopup clientId={clientId} iaConsentGranted={iaConsentGranted} />
          {shell}
        </ElioOneSessionProvider>
      ) : (
        shell
      )}
    </div>
  )
}
