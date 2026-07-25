import { describe, it, expect, afterEach } from 'vitest'
import {
  getClientAppUrl,
  getHubUrl,
  DEFAULT_CLIENT_APP_URL,
  DEFAULT_HUB_URL,
} from './app-urls'

const originalClient = process.env.NEXT_PUBLIC_CLIENT_URL
const originalHub = process.env.NEXT_PUBLIC_HUB_URL

function restore(name: string, value: string | undefined) {
  if (value === undefined) delete process.env[name]
  else process.env[name] = value
}

afterEach(() => {
  restore('NEXT_PUBLIC_CLIENT_URL', originalClient)
  restore('NEXT_PUBLIC_HUB_URL', originalHub)
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
