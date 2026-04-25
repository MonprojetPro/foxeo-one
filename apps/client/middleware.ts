import { type NextRequest, NextResponse } from 'next/server'
import { createMiddlewareSupabaseClient } from '@monprojetpro/supabase'
import { checkConsentVersion } from './middleware-consent'
import { detectLocale, setLocaleCookie } from './middleware-locale'

export const PUBLIC_PATHS = ['/login', '/signup', '/auth/callback', '/forgot-password', '/reset-password', '/maintenance']
export const CONSENT_EXCLUDED_PATHS = ['/consent-update', '/legal', '/api', '/suspended', '/transferred', '/graduation', '/archived', '/maintenance']
export const ONBOARDING_EXCLUDED_PATHS = ['/onboarding', '/login', '/signup', '/auth/callback', '/consent-update', '/legal', '/api', '/suspended', '/transferred', '/graduation', '/archived', '/maintenance']
export const GRADUATION_EXCLUDED_PATHS = ['/graduation', '/login', '/signup', '/auth/callback', '/consent-update', '/legal', '/api', '/suspended', '/transferred', '/onboarding', '/archived', '/maintenance']
export const MAINTENANCE_EXCLUDED_PATHS = ['/maintenance', '/login', '/signup', '/auth/callback', '/api']

export function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  )
}

export function isConsentExcluded(pathname: string): boolean {
  return CONSENT_EXCLUDED_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  )
}

export function isStaticOrApi(pathname: string): boolean {
  return (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/webhooks') ||
    pathname === '/favicon.ico'
  )
}

export function isOnboardingExcluded(pathname: string): boolean {
  return ONBOARDING_EXCLUDED_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  )
}

export function isGraduationExcluded(pathname: string): boolean {
  return GRADUATION_EXCLUDED_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  )
}

export function isMaintenanceExcluded(pathname: string): boolean {
  return MAINTENANCE_EXCLUDED_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  )
}

// Story 13.3 — Impersonation detection
const IMPERSONATION_COOKIE = 'mpro-impersonation-session'

function getImpersonationSession(request: NextRequest): { sessionId: string; expiresAt: string } | null {
  const cookie = request.cookies.get(IMPERSONATION_COOKIE)?.value
  if (!cookie) return null
  try {
    const data = JSON.parse(decodeURIComponent(cookie))
    if (data.sessionId && data.expiresAt) {
      // Check expiration
      if (new Date(data.expiresAt) <= new Date()) return null
      return data
    }
    return null
  } catch {
    return null
  }
}

export async function middleware(request: NextRequest) {
  // Skip static assets and webhook routes
  if (isStaticOrApi(request.nextUrl.pathname)) {
    return NextResponse.next()
  }

  // 1. Detect and set locale (before auth check)
  const locale = detectLocale(request)

  const { user, response, supabase } = await createMiddlewareSupabaseClient(request)

  // Story 13.3 — Impersonation: set header for downstream detection
  const impersonationSession = getImpersonationSession(request)
  if (impersonationSession) {
    response.headers.set('x-impersonation-session', impersonationSession.sessionId)
  }

  // Set locale cookie on response
  setLocaleCookie(response, locale)

  // 2. Check maintenance mode (direct Supabase read — no cache)
  if (!isMaintenanceExcluded(request.nextUrl.pathname)) {
    const { data: maintenanceConfig } = await supabase
      .from('system_config')
      .select('value')
      .eq('key', 'maintenance_mode')
      .maybeSingle()

    const isMaintenanceActive = maintenanceConfig?.value === true

    if (isMaintenanceActive) {
      // Operators (MiKL) are not redirected — they see a banner in the UI instead
      if (user) {
        const { data: operator } = await supabase
          .from('operators')
          .select('id')
          .eq('auth_user_id', user.id)
          .maybeSingle()

        if (!operator) {
          // Non-operator client → redirect to maintenance page
          const maintenanceUrl = new URL('/maintenance', request.url)
          const maintenanceResponse = NextResponse.redirect(maintenanceUrl)
          setLocaleCookie(maintenanceResponse, locale)
          return maintenanceResponse
        }
        // Operator → continue normally (banner shown in UI)
      } else {
        // Unauthenticated visitor → redirect to maintenance page
        const maintenanceUrl = new URL('/maintenance', request.url)
        const maintenanceResponse = NextResponse.redirect(maintenanceUrl)
        setLocaleCookie(maintenanceResponse, locale)
        return maintenanceResponse
      }
    }
  }

  const isPublic = isPublicPath(request.nextUrl.pathname)

  // Unauthenticated user trying to access protected route → redirect to login
  if (!user && !isPublic) {
    const redirectUrl = new URL('/login', request.url)
    redirectUrl.searchParams.set('redirectTo', request.nextUrl.pathname)
    const redirectResponse = NextResponse.redirect(redirectUrl)
    setLocaleCookie(redirectResponse, locale)
    return redirectResponse
  }

  // Authenticated user on login/signup → redirect to dashboard
  if (user && isPublic) {
    const redirectResponse = NextResponse.redirect(new URL('/', request.url))
    setLocaleCookie(redirectResponse, locale)
    return redirectResponse
  }

  // Check CGU consent version and client status for authenticated users (exclude specific paths)
  if (user && !isConsentExcluded(request.nextUrl.pathname)) {
    // Get client info from clients table (include onboarding + graduation fields)
    // ADR-01 Révision 2 — Multi-tenant unique : aucune redirection cross-subdomain.
    // client_instances(status) conservé pour Story 9.5b transferred check uniquement.
    const { data: client } = await supabase
      .from('clients')
      .select('id, status, first_login_at, onboarding_completed, password_change_required, graduated_at, graduation_screen_shown, client_configs(dashboard_type), client_instances(status)')
      .eq('auth_user_id', user.id)
      .maybeSingle()

    if (client?.id) {
      // Check if client is suspended
      if (client.status === 'suspended' && request.nextUrl.pathname !== '/suspended') {
        const suspendedUrl = new URL('/suspended', request.url)
        const suspendedResponse = NextResponse.redirect(suspendedUrl)
        setLocaleCookie(suspendedResponse, locale)
        return suspendedResponse
      }

      // Story 9.5c + 13.2 — Check if client is archived, deleted, or archived_lab (accès bloqué)
      if ((client.status === 'archived' || client.status === 'deleted' || client.status === 'archived_lab') && request.nextUrl.pathname !== '/archived') {
        const archivedUrl = new URL('/archived', request.url)
        const archivedResponse = NextResponse.redirect(archivedUrl)
        setLocaleCookie(archivedResponse, locale)
        return archivedResponse
      }

      // Story 9.5b — Check if instance has been transferred
      if (request.nextUrl.pathname !== '/transferred') {
        const instance = Array.isArray(client.client_instances)
          ? client.client_instances[0]
          : client.client_instances

        if (instance?.status === 'transferred') {
          console.log('[TRANSFER:BLOCKED] Instance transferred for client:', user.id)
          const transferredUrl = new URL('/transferred', request.url)
          const transferredResponse = NextResponse.redirect(transferredUrl)
          setLocaleCookie(transferredResponse, locale)
          return transferredResponse
        }
      }

      // Story 13.4 — Premier login avec mot de passe temporaire : forcer le changement
      if (
        client.password_change_required &&
        request.nextUrl.pathname !== '/onboarding/password-change'
      ) {
        const pwdUrl = request.nextUrl.clone()
        pwdUrl.pathname = '/onboarding/password-change'
        const pwdResponse = NextResponse.redirect(pwdUrl)
        setLocaleCookie(pwdResponse, locale)
        return pwdResponse
      }

      // Check consent version
      const consentRedirect = await checkConsentVersion(request, client.id)
      if (consentRedirect) {
        return consentRedirect
      }

      // Onboarding detection — only for non-onboarding paths
      if (!isOnboardingExcluded(request.nextUrl.pathname)) {
        // First login detection: first_login_at IS NULL
        if (!client.first_login_at) {
          // Record first login timestamp
          await supabase
            .from('clients')
            .update({ first_login_at: new Date().toISOString() })
            .eq('auth_user_id', user.id)

          console.log('[ONBOARDING:FIRST_LOGIN] Client:', user.id)

          // Redirect to welcome screen
          const welcomeUrl = request.nextUrl.clone()
          welcomeUrl.pathname = '/onboarding/welcome'
          const welcomeResponse = NextResponse.redirect(welcomeUrl)
          setLocaleCookie(welcomeResponse, locale)
          return welcomeResponse
        }

        // Onboarding not completed → redirect to welcome
        if (!client.onboarding_completed) {
          const welcomeUrl = request.nextUrl.clone()
          welcomeUrl.pathname = '/onboarding/welcome'
          const welcomeResponse = NextResponse.redirect(welcomeUrl)
          setLocaleCookie(welcomeResponse, locale)
          return welcomeResponse
        }
      }

      // Graduation detection — only for non-graduation paths
      // ADR-01 Révision 2 — Le client gradué reste sur le même déploiement multi-tenant.
      // On affiche juste l'écran de bienvenue post-graduation une fois, puis le toggle
      // Mode Lab/One dans le shell prend le relais. Pas de redirect cross-subdomain.
      if (!isGraduationExcluded(request.nextUrl.pathname)) {
        if (client.graduated_at && !client.graduation_screen_shown) {
          console.log('[GRADUATION:CELEBRATE] Client graduated:', user.id)

          const celebrateUrl = request.nextUrl.clone()
          celebrateUrl.pathname = '/graduation/celebrate'
          const celebrateResponse = NextResponse.redirect(celebrateUrl)
          setLocaleCookie(celebrateResponse, locale)
          return celebrateResponse
        }
      }
    }
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
