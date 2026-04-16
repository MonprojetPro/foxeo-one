import { describe, it, expect } from 'vitest'
import { generateCredentialsJson, generateEmailDraft, generateTransferChecklist } from './run-handoff'
import type { HandoffCredentials } from './types'

const mockCredentials: HandoffCredentials = {
  vercel: { projectId: 'prj_123', projectUrl: 'https://vercel.com/team/monprojetpro-test' },
  github: { repoUrl: 'https://github.com/MonprojetPro/monprojetpro-test', cloneUrl: 'https://github.com/MonprojetPro/monprojetpro-test.git' },
  supabase: {
    projectUrl: 'https://supabase.com/dashboard/project/proj-123',
    supabaseUrl: 'https://proj-123.supabase.co',
    anonKey: 'anon-key-abc',
    serviceRoleKey: 'svc-key-xyz',
  },
  deploymentUrl: 'https://monprojetpro-test.vercel.app',
}

describe('generateCredentialsJson', () => {
  it('generates valid JSON with all credentials', () => {
    const json = generateCredentialsJson('test-client', mockCredentials)
    const parsed = JSON.parse(json)

    expect(parsed.client).toBe('test-client')
    expect(parsed.vercel.deploymentUrl).toBe('https://monprojetpro-test.vercel.app')
    expect(parsed.github.repoUrl).toContain('MonprojetPro')
    expect(parsed.supabase.anonKey).toBe('anon-key-abc')
    expect(parsed.supabase.serviceRoleKey).toBe('svc-key-xyz')
    expect(parsed.generatedAt).toBeDefined()
  })
})

describe('generateEmailDraft', () => {
  it('generates a French email draft with deployment URL', () => {
    const draft = generateEmailDraft('test-client', 'https://monprojetpro-test.vercel.app')

    expect(draft).toContain('test-client')
    expect(draft).toContain('https://monprojetpro-test.vercel.app')
    expect(draft).toContain('MonprojetPro')
    expect(draft).toContain('Bonjour')
  })
})

describe('generateTransferChecklist', () => {
  it('generates checklist with all 3 transfer steps', () => {
    const checklist = generateTransferChecklist('test-client')

    expect(checklist).toContain('Vercel')
    expect(checklist).toContain('GitHub')
    expect(checklist).toContain('Supabase')
    expect(checklist).toContain('monprojetpro-test-client')
    expect(checklist).toContain('Transfer')
  })
})
