import { type NextRequest, NextResponse } from 'next/server'
import { createMiddlewareSupabaseClient } from '@monprojetpro/supabase'
import { detectLocale, setLocaleCookie } from './middleware-locale'

export const PUBLIC_PATHS = ['/login', '/setup-mfa', '/auth/callback']

export function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  )
}

export function isStaticOrApi(pathname: string): boolean {
  return (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/webhooks') ||
    pathname.startsWith('/api/dev-login') ||
    pathname === '/favicon.ico'
  )
}

export async function middleware(request: NextRequest) {
  // Skip static assets and webhook routes
  if (isStaticOrApi(request.nextUrl.pathname)) {
    return NextResponse.next()
  }

  // 1. Detect and set locale (before auth check)
  const locale = detectLocale(request)

  const { supabase, user, response } = await createMiddlewareSupabaseClient(request)

  // Set locale cookie on response
  setLocaleCookie(response, locale)

  const isPublic = isPublicPath(request.nextUrl.pathname)

  // 2. Unauthenticated user on protected route → login
  if (!user && !isPublic) {
    const redirectUrl = new URL('/login', request.url)
    redirectUrl.searchParams.set('redirectTo', request.nextUrl.pathname)
    const redirectResponse = NextResponse.redirect(redirectUrl)
    setLocaleCookie(redirectResponse, locale)
    return redirectResponse
  }

  // 3. Authenticated user on public auth page → redirect to dashboard if already aal2
  // Skip AAL check on verify-mfa: user is in the process of verifying, cannot be AAL2 yet.
  // Avoids an extra Supabase round-trip that pushes total calls to 5 and causes TOTP expiry on slow connections.
  if (user && isPublic && !request.nextUrl.pathname.startsWith('/login/verify-mfa')) {
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
    if (aal?.currentLevel === 'aal2') {
      const redirectResponse = NextResponse.redirect(new URL('/', request.url))
      setLocaleCookie(redirectResponse, locale)
      return redirectResponse
    }
    // Not AAL2 yet — let them proceed to MFA verification/setup pages
    return response
  }

  // 4. Authenticated user on protected route → verify operator + AAL2
  // TODO: Optimize — consider caching operator role in JWT custom claims
  // to avoid a DB query on every protected route navigation.
  if (user && !isPublic) {
    // Verify operator exists via SECURITY DEFINER function (bypasses RLS)
    // Direct table query would fail if auth_user_id not yet linked
    const { data: operator } = (await supabase.rpc('fn_get_operator_by_email' as never, {
      p_email: user.email ?? '',
    } as never)) as unknown as {
      data: { id: string; name: string; role: string; twoFactorEnabled: boolean; authUserId: string | null } | null
    }

    if (!operator) {
      // Not an operator — sign out and redirect
      await supabase.auth.signOut()
      const redirectUrl = new URL('/login', request.url)
      redirectUrl.searchParams.set('error', 'unauthorized')
      const redirectResponse = NextResponse.redirect(redirectUrl)
      setLocaleCookie(redirectResponse, locale)
      return redirectResponse
    }

    // Check AAL (Authentication Assurance Level)
    // DEV: Skip MFA check in development
    if (process.env.NODE_ENV !== 'development') {
      const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()

      if (aal?.currentLevel !== 'aal2') {
        // 2FA not yet setup → redirect to setup
        if (!operator.twoFactorEnabled) {
          const redirectResponse = NextResponse.redirect(new URL('/setup-mfa', request.url))
          setLocaleCookie(redirectResponse, locale)
          return redirectResponse
        }
        // Guard against inconsistent state: DB says 2FA enabled but Supabase Auth
        // has no verified TOTP factor (e.g. factor deleted after session revocation)
        const { data: factors } = await supabase.auth.mfa.listFactors()
        const hasVerifiedFactor = factors?.totp?.some(
          (f: { status: string }) => f.status === 'verified'
        )
        if (!hasVerifiedFactor) {
          // Re-enrollment required — reset DB flag so setup flow is clean
          await supabase
            .from('operators')
            .update({ two_factor_enabled: false } as never)
            .eq('email', user.email ?? '')
          const redirectResponse = NextResponse.redirect(new URL('/setup-mfa', request.url))
          setLocaleCookie(redirectResponse, locale)
          return redirectResponse
        }
        // 2FA setup and verified factor exists — just not verified this session yet
        const redirectResponse = NextResponse.redirect(new URL('/login/verify-mfa', request.url))
        setLocaleCookie(redirectResponse, locale)
        return redirectResponse
      }
    }
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
