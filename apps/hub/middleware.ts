import { type NextRequest, NextResponse } from 'next/server'
import { createMiddlewareSupabaseClient } from '@monprojetpro/supabase'
import { hasCrossedNightlyCutoff, getLoginEntryUrl } from '@monprojetpro/utils'
import { detectLocale, setLocaleCookie } from './middleware-locale'

// `/auth/handoff` : arrivée de l'entrée de connexion unique. Public par nécessité —
// c'est cette requête qui crée la session, elle ne peut donc pas en exiger une.
export const PUBLIC_PATHS = ['/login', '/setup-mfa', '/auth/callback', '/auth/handoff']

export function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  )
}

/**
 * Chemins qui ne passent PAS par le contrôle de session.
 *
 * ⚠️ `/api/cron` ajouté le 2026-10-16, sur sonde `curl`. Le rattrapage des
 * transcriptions de visio appelait `/api/cron/sync-meeting-results` et
 * recevait un **307 vers la page de login** : le middleware traitait la route
 * comme une page protégée, et pg_cron récupérait du HTML au lieu de
 * déclencher le travail. Le cron rapportait pourtant « succeeded » à chaque
 * passage — il ne mesure que l'envoi de la requête, jamais ce qu'elle a
 * obtenu. Aucun test unitaire ne pouvait le voir : il fallait interroger la
 * vraie URL.
 *
 * 🔑 Ces routes ne sont pas pour autant ouvertes : `/api/webhooks` vérifie une
 * signature ou un secret partagé, `/api/cron` exige
 * `Authorization: Bearer <CRON_SECRET>` et répond 503 si le secret n'est pas
 * configuré. On remplace un contrôle de session — qu'une machine ne peut pas
 * satisfaire — par un contrôle de secret, pas par rien.
 *
 * ⚠️ `/api/internal` ajouté le 2026-10-18 (T-049) : appelé par l'Edge Function
 * `calcom-webhook`, qui ne peut pas non plus présenter de session. Même garde
 * que `/api/cron` : `Authorization: Bearer <CALCOM_MEET_LINK_SECRET>`, 503 si
 * le secret n'est pas configuré.
 */
export function isStaticOrApi(pathname: string): boolean {
  return (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/webhooks') ||
    pathname.startsWith('/api/cron') ||
    pathname.startsWith('/api/internal') ||
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

  // 2. Non authentifié sur une route protégée → ENTRÉE DE CONNEXION UNIQUE.
  //
  // ⚠️ Ce branchement pointait vers `/login` du Hub — la page d'avant l'entrée
  // unique, sans branding ni « mot de passe oublié ». C'était LE chemin emprunté
  // par tous les liens profonds : un clic sur « Voir le message » depuis un email,
  // session expirée, et MiKL atterrissait sur l'ancienne page (signalé le
  // 2026-09-09). Les deux autres redirections de ce même fichier utilisaient
  // déjà `getLoginEntryUrl()` : c'était une incohérence interne, pas une doctrine.
  //
  // La destination voulue voyage en clair jusqu'à la passerelle, qui la
  // reposera après connexion — d'où le nettoyage à l'arrivée, jamais ici.
  if (!user && !isPublic) {
    const redirectUrl = new URL(getLoginEntryUrl())
    redirectUrl.searchParams.set('redirectTo', request.nextUrl.pathname + request.nextUrl.search)
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
      // Compte non-opérateur : on referme la session et on renvoie vers l'entrée
      // unique, comme partout ailleurs. Le renvoyer sur `/login` du Hub lui
      // montrerait une page qui ne le concerne pas — il n'a rien à faire ici,
      // sa place est à la porte commune.
      await supabase.auth.signOut()
      const redirectUrl = new URL(getLoginEntryUrl())
      redirectUrl.searchParams.set('error', 'unauthorized')
      const redirectResponse = NextResponse.redirect(redirectUrl)
      setLocaleCookie(redirectResponse, locale)
      return redirectResponse
    }

    // Check AAL (Authentication Assurance Level)
    // DEV: Skip MFA check in development
    if (process.env.NODE_ENV !== 'development') {
      const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()

      // Coupure nocturne (décision MiKL du 2026-08-04) : aucune session du cockpit ne
      // traverse 2 h du matin. On date le DÉBUT de session par la plus ancienne méthode
      // d'authentification — contrairement au `iat` du jeton, cet horodatage ne bouge
      // pas quand la session se rafraîchit, sinon une session éternellement rafraîchie
      // paraîtrait éternellement neuve.
      const methods = aal?.currentAuthenticationMethods ?? []
      const startedAt = methods.length
        ? Math.min(...methods.map((m: { timestamp: number }) => m.timestamp))
        : null

      if (startedAt && hasCrossedNightlyCutoff(new Date(startedAt * 1000))) {
        // Scope 'local' : on ferme CETTE session, pas toutes celles du compte — un
        // signOut global révoquerait les refresh tokens (le piège d'avril 2026).
        await supabase.auth.signOut({ scope: 'local' })

        const expiredUrl = new URL(getLoginEntryUrl())
        expiredUrl.searchParams.set('error', 'session_expired')
        const redirectResponse = NextResponse.redirect(expiredUrl)

        // Les cookies de suppression posés par signOut atterrissent sur la réponse
        // interne du helper, pas sur cette redirection-ci : sans effacement explicite,
        // le navigateur repartirait avec sa session intacte et rien ne serait coupé.
        request.cookies
          .getAll()
          .filter((cookie) => cookie.name.startsWith('sb-'))
          .forEach((cookie) =>
            redirectResponse.cookies.set(cookie.name, '', { path: '/', maxAge: 0 })
          )

        setLocaleCookie(redirectResponse, locale)
        return redirectResponse
      }

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
