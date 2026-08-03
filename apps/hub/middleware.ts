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
        // L'aiguillage « enrôler un facteur » vs « saisir son code » se décide sur les
        // facteurs RÉELS, jamais sur le drapeau DB. Un drapeau resté à false alors qu'un
        // facteur vérifié existe (cas constaté le 2026-08-03) enverrait une session
        // mot-de-passe-seul vers /setup-mfa — page publique d'enrôlement — au lieu de
        // /login/verify-mfa qui, lui, exige le code à 6 chiffres.
        const { data: factors } = await supabase.auth.mfa.listFactors()
        const hasVerifiedFactor =
          factors?.totp?.some((f: { status: string }) => f.status === 'verified') ?? false

        // Resynchronisation du drapeau dans les DEUX sens — il n'est qu'un miroir d'affichage.
        // Ciblage par auth_user_id, pas par email : une divergence entre auth.users.email et
        // operators.email ferait échouer cet UPDATE en silence (0 ligne touchée, aucune erreur).
        if (hasVerifiedFactor !== operator.twoFactorEnabled) {
          await supabase
            .from('operators')
            .update({ two_factor_enabled: hasVerifiedFactor } as never)
            .eq('auth_user_id', user.id)
        }

        const redirectResponse = NextResponse.redirect(
          new URL(hasVerifiedFactor ? '/login/verify-mfa' : '/setup-mfa', request.url)
        )
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
