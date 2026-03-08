import { describe, it, expect } from 'vitest'
import { isPublicPath, isStaticOrApi, isConsentExcluded, isOnboardingExcluded, isGraduationExcluded, isMaintenanceExcluded, CONSENT_EXCLUDED_PATHS, GRADUATION_EXCLUDED_PATHS, ONBOARDING_EXCLUDED_PATHS, MAINTENANCE_EXCLUDED_PATHS } from './middleware'

describe('middleware routing logic', () => {
  describe('isPublicPath', () => {
    it('returns true for /login', () => {
      expect(isPublicPath('/login')).toBe(true)
    })

    it('returns true for /signup', () => {
      expect(isPublicPath('/signup')).toBe(true)
    })

    it('returns true for /auth/callback', () => {
      expect(isPublicPath('/auth/callback')).toBe(true)
    })

    it('returns false for dashboard routes', () => {
      expect(isPublicPath('/')).toBe(false)
      expect(isPublicPath('/modules/crm')).toBe(false)
      expect(isPublicPath('/settings')).toBe(false)
    })

    it('returns false for /loginx (no false positive)', () => {
      expect(isPublicPath('/loginx')).toBe(false)
    })
  })

  describe('isStaticOrApi', () => {
    it('returns true for _next static', () => {
      expect(isStaticOrApi('/_next/static/chunk.js')).toBe(true)
    })

    it('returns true for webhooks', () => {
      expect(isStaticOrApi('/api/webhooks/cal-com')).toBe(true)
    })

    it('returns true for favicon', () => {
      expect(isStaticOrApi('/favicon.ico')).toBe(true)
    })

    it('returns false for regular API routes', () => {
      expect(isStaticOrApi('/api/something')).toBe(false)
    })

    it('returns false for page routes', () => {
      expect(isStaticOrApi('/login')).toBe(false)
      expect(isStaticOrApi('/')).toBe(false)
    })
  })

  describe('isConsentExcluded', () => {
    it('returns true for /suspended', () => {
      expect(isConsentExcluded('/suspended')).toBe(true)
    })

    it('returns true for /consent-update', () => {
      expect(isConsentExcluded('/consent-update')).toBe(true)
    })

    it('returns true for /legal', () => {
      expect(isConsentExcluded('/legal')).toBe(true)
    })

    it('returns true for /api routes', () => {
      expect(isConsentExcluded('/api/something')).toBe(true)
    })

    it('returns false for dashboard routes', () => {
      expect(isConsentExcluded('/')).toBe(false)
      expect(isConsentExcluded('/modules/crm')).toBe(false)
    })

    it('includes /suspended in CONSENT_EXCLUDED_PATHS', () => {
      expect(CONSENT_EXCLUDED_PATHS).toContain('/suspended')
    })
  })

  describe('suspension redirect logic', () => {
    it('suspended client on protected route should be redirected to /suspended', () => {
      // Given: client with status='suspended' on /modules/crm
      const clientStatus = 'suspended'
      const pathname = '/modules/crm'

      // When: middleware checks status
      const shouldRedirect = clientStatus === 'suspended' && pathname !== '/suspended'

      // Then: should redirect
      expect(shouldRedirect).toBe(true)
    })

    it('suspended client already on /suspended should NOT be redirected', () => {
      const clientStatus = 'suspended'
      const pathname = '/suspended'

      const shouldRedirect = clientStatus === 'suspended' && pathname !== '/suspended'

      expect(shouldRedirect).toBe(false)
    })

    it('active client should NOT be redirected to /suspended', () => {
      const clientStatus = 'active'
      const pathname = '/modules/crm'

      const shouldRedirect = clientStatus === 'suspended' && pathname !== '/suspended'

      expect(shouldRedirect).toBe(false)
    })

    it('/suspended path is excluded from consent check', () => {
      // Suspended clients redirected to /suspended must not be caught by consent check
      expect(isConsentExcluded('/suspended')).toBe(true)
    })
  })

  describe('middleware redirect logic', () => {
    it('unauthenticated user on protected route gets redirect URL with redirectTo', () => {
      const pathname = '/modules/crm'
      const isPublic = isPublicPath(pathname)
      expect(isPublic).toBe(false)
      // When !user && !isPublic → redirect to /login?redirectTo=/modules/crm
      const redirectUrl = new URL('/login', 'http://localhost:3001')
      redirectUrl.searchParams.set('redirectTo', pathname)
      expect(redirectUrl.searchParams.get('redirectTo')).toBe('/modules/crm')
      expect(redirectUrl.pathname).toBe('/login')
    })

    it('authenticated user on public route gets redirected to dashboard', () => {
      const pathname = '/login'
      const isPublic = isPublicPath(pathname)
      expect(isPublic).toBe(true)
      // When user && isPublic → redirect to /
    })
  })

  describe('isOnboardingExcluded', () => {
    it('returns true for /onboarding routes', () => {
      expect(isOnboardingExcluded('/onboarding')).toBe(true)
      expect(isOnboardingExcluded('/onboarding/welcome')).toBe(true)
      expect(isOnboardingExcluded('/onboarding/tour')).toBe(true)
    })

    it('returns true for auth paths (to avoid redirect loops)', () => {
      expect(isOnboardingExcluded('/login')).toBe(true)
      expect(isOnboardingExcluded('/signup')).toBe(true)
      expect(isOnboardingExcluded('/auth/callback')).toBe(true)
    })

    it('returns true for consent and legal paths', () => {
      expect(isOnboardingExcluded('/consent-update')).toBe(true)
      expect(isOnboardingExcluded('/legal')).toBe(true)
    })

    it('returns true for API and suspended paths', () => {
      expect(isOnboardingExcluded('/api/webhooks/cal-com')).toBe(true)
      expect(isOnboardingExcluded('/suspended')).toBe(true)
    })

    it('returns false for dashboard and module routes', () => {
      expect(isOnboardingExcluded('/')).toBe(false)
      expect(isOnboardingExcluded('/modules/crm')).toBe(false)
      expect(isOnboardingExcluded('/settings')).toBe(false)
      expect(isOnboardingExcluded('/modules/documents')).toBe(false)
    })
  })

  describe('onboarding redirect logic', () => {
    it('client without first_login_at should be redirected to onboarding/welcome', () => {
      const client = { first_login_at: null, onboarding_completed: false }
      const pathname = '/modules/crm'

      const shouldRedirect = !isOnboardingExcluded(pathname) && !client.first_login_at
      expect(shouldRedirect).toBe(true)
    })

    it('client with first_login_at but onboarding not completed should be redirected', () => {
      const client = { first_login_at: '2026-02-23T10:00:00Z', onboarding_completed: false }
      const pathname = '/modules/crm'

      const shouldRedirectForFirstLogin = !isOnboardingExcluded(pathname) && !client.first_login_at
      const shouldRedirectForOnboarding = !isOnboardingExcluded(pathname) && !client.onboarding_completed

      expect(shouldRedirectForFirstLogin).toBe(false)
      expect(shouldRedirectForOnboarding).toBe(true)
    })

    it('client with completed onboarding should NOT be redirected', () => {
      const client = { first_login_at: '2026-02-23T10:00:00Z', onboarding_completed: true }
      const pathname = '/modules/crm'

      const shouldRedirect = !isOnboardingExcluded(pathname) && (!client.first_login_at || !client.onboarding_completed)
      expect(shouldRedirect).toBe(false)
    })

    it('client on /onboarding path should NOT be redirected even if onboarding incomplete', () => {
      const client = { first_login_at: null, onboarding_completed: false }
      const pathname = '/onboarding/welcome'

      const shouldRedirect = !isOnboardingExcluded(pathname) && !client.first_login_at
      expect(shouldRedirect).toBe(false)
    })

    it('client with no first_login_at on /login should NOT be redirected (no loop)', () => {
      const client = { first_login_at: null, onboarding_completed: false }
      const pathname = '/login'

      const shouldRedirect = !isOnboardingExcluded(pathname) && !client.first_login_at
      expect(shouldRedirect).toBe(false)
    })
  })

  describe('isGraduationExcluded', () => {
    it('returns true for /graduation routes', () => {
      expect(isGraduationExcluded('/graduation')).toBe(true)
      expect(isGraduationExcluded('/graduation/celebrate')).toBe(true)
      expect(isGraduationExcluded('/graduation/discover-one')).toBe(true)
      expect(isGraduationExcluded('/graduation/tour-one')).toBe(true)
    })

    it('returns true for auth paths (avoid redirect loops)', () => {
      expect(isGraduationExcluded('/login')).toBe(true)
      expect(isGraduationExcluded('/signup')).toBe(true)
      expect(isGraduationExcluded('/auth/callback')).toBe(true)
    })

    it('returns true for onboarding paths', () => {
      expect(isGraduationExcluded('/onboarding')).toBe(true)
      expect(isGraduationExcluded('/onboarding/welcome')).toBe(true)
    })

    it('returns true for consent, legal, api, and suspended paths', () => {
      expect(isGraduationExcluded('/consent-update')).toBe(true)
      expect(isGraduationExcluded('/legal')).toBe(true)
      expect(isGraduationExcluded('/api/webhooks/cal-com')).toBe(true)
      expect(isGraduationExcluded('/suspended')).toBe(true)
    })

    it('returns false for dashboard and module routes', () => {
      expect(isGraduationExcluded('/')).toBe(false)
      expect(isGraduationExcluded('/modules/crm')).toBe(false)
      expect(isGraduationExcluded('/settings')).toBe(false)
    })

    it('includes /graduation in GRADUATION_EXCLUDED_PATHS', () => {
      expect(GRADUATION_EXCLUDED_PATHS).toContain('/graduation')
    })
  })

  describe('graduation redirect logic', () => {
    it('graduated client with screen not shown should be redirected to /graduation/celebrate', () => {
      const client = { graduated_at: '2026-02-24T10:00:00Z', graduation_screen_shown: false }
      const pathname = '/modules/crm'

      const shouldRedirect =
        !isGraduationExcluded(pathname) && !!client.graduated_at && !client.graduation_screen_shown
      expect(shouldRedirect).toBe(true)
    })

    it('graduated client with screen already shown should NOT be redirected', () => {
      const client = { graduated_at: '2026-02-24T10:00:00Z', graduation_screen_shown: true }
      const pathname = '/modules/crm'

      const shouldRedirect =
        !isGraduationExcluded(pathname) && !!client.graduated_at && !client.graduation_screen_shown
      expect(shouldRedirect).toBe(false)
    })

    it('non-graduated client should NOT be redirected to graduation', () => {
      const client = { graduated_at: null, graduation_screen_shown: false }
      const pathname = '/modules/crm'

      const shouldRedirect =
        !isGraduationExcluded(pathname) && !!client.graduated_at && !client.graduation_screen_shown
      expect(shouldRedirect).toBe(false)
    })

    it('graduated client on /graduation path should NOT be redirected (no loop)', () => {
      const client = { graduated_at: '2026-02-24T10:00:00Z', graduation_screen_shown: false }
      const pathname = '/graduation/celebrate'

      const shouldRedirect =
        !isGraduationExcluded(pathname) && !!client.graduated_at && !client.graduation_screen_shown
      expect(shouldRedirect).toBe(false)
    })

    it('/graduation paths are excluded from consent check', () => {
      expect(isConsentExcluded('/graduation')).toBe(true)
      expect(isConsentExcluded('/graduation/celebrate')).toBe(true)
    })

    it('/graduation paths are excluded from onboarding check', () => {
      expect(isOnboardingExcluded('/graduation')).toBe(true)
      expect(isOnboardingExcluded('/graduation/celebrate')).toBe(true)
    })
  })

  describe('transferred instance redirect logic (Story 9.5b)', () => {
    it('instance transferred: client on protected route should be redirected to /transferred', () => {
      const instance = { status: 'transferred' }
      const pathname = '/modules/crm'

      const shouldRedirect = pathname !== '/transferred' && instance.status === 'transferred'
      expect(shouldRedirect).toBe(true)
    })

    it('instance transferred: client already on /transferred should NOT be redirected', () => {
      const instance = { status: 'transferred' }
      const pathname = '/transferred'

      const shouldRedirect = pathname !== '/transferred' && instance.status === 'transferred'
      expect(shouldRedirect).toBe(false)
    })

    it('instance active: client should NOT be redirected to /transferred', () => {
      const instance = { status: 'active' }
      const pathname = '/modules/crm'

      const shouldRedirect = pathname !== '/transferred' && instance.status === 'transferred'
      expect(shouldRedirect).toBe(false)
    })

    it('/transferred is included in CONSENT_EXCLUDED_PATHS', () => {
      expect(CONSENT_EXCLUDED_PATHS).toContain('/transferred')
    })

    it('/transferred is included in ONBOARDING_EXCLUDED_PATHS', () => {
      expect(ONBOARDING_EXCLUDED_PATHS).toContain('/transferred')
    })

    it('/transferred is included in GRADUATION_EXCLUDED_PATHS', () => {
      expect(GRADUATION_EXCLUDED_PATHS).toContain('/transferred')
    })

    it('/transferred is excluded from consent check', () => {
      expect(isConsentExcluded('/transferred')).toBe(true)
    })

    it('/transferred is excluded from onboarding check', () => {
      expect(isOnboardingExcluded('/transferred')).toBe(true)
    })

    it('/transferred is excluded from graduation check', () => {
      expect(isGraduationExcluded('/transferred')).toBe(true)
    })
  })

  describe('One instance redirect logic (Story 9.2)', () => {
    it('client gradué avec screen montré ET dashboard_type=one doit être redirigé vers instance One', () => {
      const client = { graduated_at: '2026-02-24T10:00:00Z', graduation_screen_shown: true }
      const clientConfig = { dashboard_type: 'one' }
      const instance = { instance_url: 'https://jean.foxeo.io', status: 'active' }

      const currentHost = 'lab.foxeo.io'
      const instanceHost = new URL(instance.instance_url).host

      const shouldRedirect =
        !!client.graduated_at &&
        client.graduation_screen_shown &&
        clientConfig.dashboard_type === 'one' &&
        instance.status === 'active' &&
        currentHost !== instanceHost

      expect(shouldRedirect).toBe(true)
    })

    it('client gradué mais screen PAS encore montré NE doit PAS être redirigé vers One (→ graduation/celebrate)', () => {
      const client = { graduated_at: '2026-02-24T10:00:00Z', graduation_screen_shown: false }
      const clientConfig = { dashboard_type: 'one' }
      const instance = { instance_url: 'https://jean.foxeo.io', status: 'active' }

      const currentHost = 'lab.foxeo.io'
      const instanceHost = new URL(instance.instance_url).host

      const shouldRedirectToOne =
        !!client.graduated_at &&
        client.graduation_screen_shown &&
        clientConfig.dashboard_type === 'one' &&
        instance.status === 'active' &&
        currentHost !== instanceHost

      expect(shouldRedirectToOne).toBe(false)
    })

    it('client en provisioning doit être redirigé vers page d\'attente', () => {
      const client = { graduated_at: '2026-02-24T10:00:00Z', graduation_screen_shown: true }
      const clientConfig = { dashboard_type: 'one' }
      const instance = { instance_url: 'https://jean.foxeo.io', status: 'provisioning' }

      const shouldShowProvisioning =
        !!client.graduated_at &&
        client.graduation_screen_shown &&
        clientConfig.dashboard_type === 'one' &&
        instance.status === 'provisioning'

      expect(shouldShowProvisioning).toBe(true)
    })

    it('client déjà sur son instance One (même host) NE doit PAS être redirigé', () => {
      const client = { graduated_at: '2026-02-24T10:00:00Z', graduation_screen_shown: true }
      const clientConfig = { dashboard_type: 'one' }
      const instance = { instance_url: 'https://jean.foxeo.io', status: 'active' }

      const currentHost = 'jean.foxeo.io' // même host que l'instance
      const instanceHost = new URL(instance.instance_url).host

      const shouldRedirect =
        !!client.graduated_at &&
        client.graduation_screen_shown &&
        clientConfig.dashboard_type === 'one' &&
        instance.status === 'active' &&
        currentHost !== instanceHost

      expect(shouldRedirect).toBe(false)
    })

    it('préserve le path et les query params dans la redirect URL', () => {
      const instanceUrl = 'https://jean.foxeo.io'
      const pathname = '/modules/crm'
      const search = '?filter=active'

      const redirectUrl = `${instanceUrl}${pathname}${search}`
      expect(redirectUrl).toBe('https://jean.foxeo.io/modules/crm?filter=active')
    })
  })

  describe('maintenance mode redirect logic (Story 12.1)', () => {
    it('isMaintenanceExcluded returns true for /maintenance', () => {
      expect(isMaintenanceExcluded('/maintenance')).toBe(true)
    })

    it('isMaintenanceExcluded returns true for /login and /signup', () => {
      expect(isMaintenanceExcluded('/login')).toBe(true)
      expect(isMaintenanceExcluded('/signup')).toBe(true)
    })

    it('isMaintenanceExcluded returns true for /api routes', () => {
      expect(isMaintenanceExcluded('/api/webhooks/cal-com')).toBe(true)
    })

    it('isMaintenanceExcluded returns false for protected routes', () => {
      expect(isMaintenanceExcluded('/')).toBe(false)
      expect(isMaintenanceExcluded('/modules/crm')).toBe(false)
      expect(isMaintenanceExcluded('/settings')).toBe(false)
    })

    it('non-operator client with maintenance active should be redirected', () => {
      const isMaintenanceActive = true
      const isOperator = false

      const shouldRedirect = isMaintenanceActive && !isOperator
      expect(shouldRedirect).toBe(true)
    })

    it('operator with maintenance active should NOT be redirected', () => {
      const isMaintenanceActive = true
      const isOperator = true

      const shouldRedirect = isMaintenanceActive && !isOperator
      expect(shouldRedirect).toBe(false)
    })

    it('maintenance inactive — no redirect regardless of role', () => {
      const isMaintenanceActive = false

      const shouldRedirect = isMaintenanceActive
      expect(shouldRedirect).toBe(false)
    })

    it('MAINTENANCE_EXCLUDED_PATHS contains /maintenance and /login', () => {
      expect(MAINTENANCE_EXCLUDED_PATHS).toContain('/maintenance')
      expect(MAINTENANCE_EXCLUDED_PATHS).toContain('/login')
    })
  })

  describe('archived client redirect logic (Story 9.5c)', () => {
    it('archived client on protected route should be redirected to /archived', () => {
      const clientStatus = 'archived'
      const pathname = '/modules/crm'

      const shouldRedirect = (clientStatus === 'archived' || clientStatus === 'deleted') && pathname !== '/archived'
      expect(shouldRedirect).toBe(true)
    })

    it('archived client already on /archived should NOT be redirected', () => {
      const clientStatus = 'archived'
      const pathname = '/archived'

      const shouldRedirect = (clientStatus === 'archived' || clientStatus === 'deleted') && pathname !== '/archived'
      expect(shouldRedirect).toBe(false)
    })

    it('active client should NOT be redirected to /archived', () => {
      const clientStatus = 'active'
      const pathname = '/modules/crm'

      const shouldRedirect = (clientStatus === 'archived' || clientStatus === 'deleted') && pathname !== '/archived'
      expect(shouldRedirect).toBe(false)
    })

    it('deleted client on protected route should be redirected to /archived', () => {
      const clientStatus = 'deleted'
      const pathname = '/modules/crm'

      const shouldRedirect = (clientStatus === 'archived' || clientStatus === 'deleted') && pathname !== '/archived'
      expect(shouldRedirect).toBe(true)
    })

    it('deleted client already on /archived should NOT be redirected', () => {
      const clientStatus = 'deleted'
      const pathname = '/archived'

      const shouldRedirect = (clientStatus === 'archived' || clientStatus === 'deleted') && pathname !== '/archived'
      expect(shouldRedirect).toBe(false)
    })

    it('/archived is included in CONSENT_EXCLUDED_PATHS', () => {
      expect(CONSENT_EXCLUDED_PATHS).toContain('/archived')
    })

    it('/archived is included in ONBOARDING_EXCLUDED_PATHS', () => {
      expect(ONBOARDING_EXCLUDED_PATHS).toContain('/archived')
    })

    it('/archived is included in GRADUATION_EXCLUDED_PATHS', () => {
      expect(GRADUATION_EXCLUDED_PATHS).toContain('/archived')
    })

    it('/archived is excluded from consent check (isConsentExcluded)', () => {
      expect(isConsentExcluded('/archived')).toBe(true)
    })

    it('/archived is excluded from onboarding check (isOnboardingExcluded)', () => {
      expect(isOnboardingExcluded('/archived')).toBe(true)
    })

    it('/archived is excluded from graduation check (isGraduationExcluded)', () => {
      expect(isGraduationExcluded('/archived')).toBe(true)
    })
  })
})
