import { describe, it, expect, afterEach } from 'vitest'
import {
  getClientAppUrl,
  getHubUrl,
  getSiteUrl,
  getLoginEntryUrl,
  DEFAULT_CLIENT_APP_URL,
  DEFAULT_HUB_URL,
  DEFAULT_SITE_URL,
} from './app-urls'

const originalClient = process.env.NEXT_PUBLIC_CLIENT_URL
const originalHub = process.env.NEXT_PUBLIC_HUB_URL
const originalSite = process.env.NEXT_PUBLIC_SITE_URL

function restore(name: string, value: string | undefined) {
  if (value === undefined) delete process.env[name]
  else process.env[name] = value
}

afterEach(() => {
  restore('NEXT_PUBLIC_CLIENT_URL', originalClient)
  restore('NEXT_PUBLIC_HUB_URL', originalHub)
  restore('NEXT_PUBLIC_SITE_URL', originalSite)
})

describe('getClientAppUrl', () => {
  it('uses the env var when defined', () => {
    process.env.NEXT_PUBLIC_CLIENT_URL = 'https://staging.example.com'
    expect(getClientAppUrl()).toBe('https://staging.example.com')
  })

  it('strips trailing slashes so built links never contain //', () => {
    process.env.NEXT_PUBLIC_CLIENT_URL = 'https://staging.example.com/'
    expect(`${getClientAppUrl()}/login`).toBe('https://staging.example.com/login')
  })

  it('falls back to the real Vercel deployment, not an unrouted custom domain', () => {
    delete process.env.NEXT_PUBLIC_CLIENT_URL
    expect(getClientAppUrl()).toBe(DEFAULT_CLIENT_APP_URL)
    // Régression 2026-07-25 : DNS_PROBE_FINISHED_NXDOMAIN sur ces sous-domaines.
    expect(getClientAppUrl()).not.toContain('app.monprojet-pro.com')
    expect(getClientAppUrl()).not.toContain('localhost')
  })

  it('ignores an empty env var', () => {
    process.env.NEXT_PUBLIC_CLIENT_URL = '   '
    expect(getClientAppUrl()).toBe(DEFAULT_CLIENT_APP_URL)
  })
})

describe('getHubUrl', () => {
  it('uses the env var when defined', () => {
    process.env.NEXT_PUBLIC_HUB_URL = 'https://hub-staging.example.com'
    expect(getHubUrl()).toBe('https://hub-staging.example.com')
  })

  it('falls back to the real Vercel deployment', () => {
    delete process.env.NEXT_PUBLIC_HUB_URL
    expect(getHubUrl()).toBe(DEFAULT_HUB_URL)
    expect(getHubUrl()).not.toContain('hub.monprojet-pro.com')
  })
})

describe('getSiteUrl', () => {
  it('falls back to the live marketing site', () => {
    delete process.env.NEXT_PUBLIC_SITE_URL
    // Contrairement aux sous-domaines app./hub., celui-ci EST branché en DNS
    // (vérifié le 2026-08-03 : HTTP 200). Le défaut est donc sûr.
    expect(getSiteUrl()).toBe(DEFAULT_SITE_URL)
    expect(getSiteUrl()).toContain('monprojet-pro.com')
  })

  it('uses the env var when defined', () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://preprod.example.com/'
    expect(getSiteUrl()).toBe('https://preprod.example.com')
  })
})

describe('getLoginEntryUrl', () => {
  it('points at the single login page hosted by the client app', () => {
    process.env.NEXT_PUBLIC_CLIENT_URL = 'https://app.monprojet-pro.com'
    expect(getLoginEntryUrl()).toBe('https://app.monprojet-pro.com/login')
  })

  it('follows the domain switch without any code change', () => {
    // C'est tout l'intérêt de l'entrée unique : le site vitrine et les emails
    // pointent vers cette fonction, jamais vers une URL écrite à la main.
    delete process.env.NEXT_PUBLIC_CLIENT_URL
    expect(getLoginEntryUrl()).toBe(`${DEFAULT_CLIENT_APP_URL}/login`)
  })

  it('never produces a double slash', () => {
    process.env.NEXT_PUBLIC_CLIENT_URL = 'https://app.monprojet-pro.com/'
    expect(getLoginEntryUrl()).not.toContain('.com//')
  })
})
