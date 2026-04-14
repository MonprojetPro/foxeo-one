import { describe, it, expect, vi, beforeEach } from 'vitest'
import { saveEmailTemplate, resetEmailTemplate } from './save-email-template'

// ============================================================
// Mocks
// ============================================================

vi.mock('@monprojetpro/supabase', () => ({
  createServerSupabaseClient: vi.fn(),
}))

import { createServerSupabaseClient } from '@monprojetpro/supabase'

const VALID_UUID_OPERATOR = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'

const MOCK_EMAIL_ROW = {
  id: 'email-uuid-1',
  template_key: 'brief_valide',
  subject: 'Votre brief a été validé',
  body: 'Bonjour {prenom}, votre brief est validé.',
  variables: ['prenom', 'titre_brief'],
  created_at: '2026-03-01T00:00:00Z',
  updated_at: '2026-03-01T00:00:00Z',
}

function makeChain(resolved: unknown) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(resolved),
    update: vi.fn().mockReturnThis(),
  }
}

function makeSupabase({
  user = { id: 'user-1' } as { id: string } | null,
  operatorData = { id: VALID_UUID_OPERATOR } as { id: string } | null,
  emailUpdateResult = { data: MOCK_EMAIL_ROW, error: null } as unknown,
} = {}) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user },
        error: user ? null : { message: 'Not auth' },
      }),
    },
    from: vi.fn((table: string) => {
      if (table === 'operators') {
        return makeChain({ data: operatorData, error: operatorData ? null : { message: 'No operator' } })
      }
      if (table === 'email_templates') {
        return {
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue(emailUpdateResult),
              }),
            }),
          }),
        }
      }
      return {}
    }),
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ============================================================
// saveEmailTemplate
// ============================================================

describe('saveEmailTemplate', () => {
  it('retourne UNAUTHORIZED si non authentifié', async () => {
    vi.mocked(createServerSupabaseClient).mockResolvedValue(makeSupabase({ user: null }) as never)
    const result = await saveEmailTemplate({ templateKey: 'brief_valide', subject: 'Test', body: 'Test body' })
    expect(result.error?.code).toBe('UNAUTHORIZED')
  })

  it('retourne FORBIDDEN si non opérateur', async () => {
    vi.mocked(createServerSupabaseClient).mockResolvedValue(makeSupabase({ operatorData: null }) as never)
    const result = await saveEmailTemplate({ templateKey: 'brief_valide', subject: 'Test', body: 'Test body' })
    expect(result.error?.code).toBe('FORBIDDEN')
  })

  it('retourne VALIDATION_ERROR si sujet vide', async () => {
    vi.mocked(createServerSupabaseClient).mockResolvedValue(makeSupabase() as never)
    const result = await saveEmailTemplate({ templateKey: 'brief_valide', subject: '', body: 'Test body' })
    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })

  it('met à jour le template avec succès', async () => {
    vi.mocked(createServerSupabaseClient).mockResolvedValue(makeSupabase() as never)
    const result = await saveEmailTemplate({
      templateKey: 'brief_valide',
      subject: 'Votre brief a été validé',
      body: 'Bonjour {prenom}, votre brief est validé.',
    })
    expect(result.error).toBeNull()
    expect(result.data?.templateKey).toBe('brief_valide')
    expect(result.data?.subject).toBe('Votre brief a été validé')
  })

  it('retourne DATABASE_ERROR si la mise à jour échoue', async () => {
    vi.mocked(createServerSupabaseClient).mockResolvedValue(
      makeSupabase({ emailUpdateResult: { data: null, error: { message: 'DB error' } } }) as never
    )
    const result = await saveEmailTemplate({
      templateKey: 'brief_valide',
      subject: 'Test',
      body: 'Test body',
    })
    expect(result.error?.code).toBe('DATABASE_ERROR')
  })
})

// ============================================================
// resetEmailTemplate
// ============================================================

describe('resetEmailTemplate', () => {
  it('retourne NOT_FOUND pour un template_key inconnu', async () => {
    vi.mocked(createServerSupabaseClient).mockResolvedValue(makeSupabase() as never)
    const result = await resetEmailTemplate('unknown_key')
    expect(result.error?.code).toBe('NOT_FOUND')
  })

  it('réinitialise le template au défaut avec succès', async () => {
    const resetRow = { ...MOCK_EMAIL_ROW, subject: 'Votre brief a été validé — MonprojetPro' }
    vi.mocked(createServerSupabaseClient).mockResolvedValue(
      makeSupabase({ emailUpdateResult: { data: resetRow, error: null } }) as never
    )
    const result = await resetEmailTemplate('brief_valide')
    expect(result.error).toBeNull()
    expect(result.data?.templateKey).toBe('brief_valide')
  })
})
