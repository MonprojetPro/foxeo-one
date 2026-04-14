import { describe, it, expect, vi, beforeEach } from 'vitest'
import { saveParcourTemplate, duplicateParcourTemplate, archiveParcourTemplate } from './save-parcours-template'

// ============================================================
// Mocks
// ============================================================

vi.mock('@monprojetpro/supabase', () => ({
  createServerSupabaseClient: vi.fn(),
}))

import { createServerSupabaseClient } from '@monprojetpro/supabase'

const VALID_UUID_TEMPLATE = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'
const VALID_UUID_OPERATOR = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'

const VALID_STAGES = [
  { key: 'vision', name: 'Vision', description: 'Definir la vision', order: 1 },
  { key: 'offre', name: 'Offre', description: 'Construire l offre', order: 2 },
]

const MOCK_TEMPLATE_ROW = {
  id: VALID_UUID_TEMPLATE,
  operator_id: VALID_UUID_OPERATOR,
  name: 'Mon template',
  description: 'description',
  parcours_type: 'complet',
  stages: VALID_STAGES,
  is_active: true,
  created_at: '2026-03-01T00:00:00Z',
  updated_at: '2026-03-01T00:00:00Z',
}

function makeChain(resolved: unknown) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(resolved),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
  }
  return chain
}

function makeSupabase({
  user = { id: 'user-1' } as { id: string } | null,
  operatorData = { id: VALID_UUID_OPERATOR } as { id: string } | null,
  operatorError = null as null | { message: string },
  templateResult = { data: MOCK_TEMPLATE_ROW, error: null } as unknown,
  originalResult = { data: MOCK_TEMPLATE_ROW, error: null } as unknown,
  insertCopyResult = { data: { ...MOCK_TEMPLATE_ROW, id: 'new-id', name: '[Copie] Mon template' }, error: null } as unknown,
  archiveError = null as null | { message: string },
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
        return makeChain({ data: operatorData, error: operatorError })
      }
      if (table === 'parcours_templates') {
        // Distinguish calls by checking what the test needs
        const templateChain = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn()
            .mockResolvedValueOnce(originalResult)  // first call = fetch original
            .mockResolvedValueOnce(templateResult),  // second call = save result
          insert: vi.fn().mockReturnThis(),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: archiveError }),
            }),
          }),
        }
        return templateChain
      }
      return {}
    }),
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ============================================================
// saveParcourTemplate
// ============================================================

describe('saveParcourTemplate', () => {
  it('retourne VALIDATION_ERROR si moins de 2 étapes', async () => {
    vi.mocked(createServerSupabaseClient).mockResolvedValue(makeSupabase() as never)
    const result = await saveParcourTemplate({
      name: 'Test',
      stages: [{ key: 'step1', name: 'Step1', description: '', order: 1 }],
    })
    expect(result.error).not.toBeNull()
    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })

  it('retourne UNAUTHORIZED si non authentifié', async () => {
    vi.mocked(createServerSupabaseClient).mockResolvedValue(makeSupabase({ user: null }) as never)
    const result = await saveParcourTemplate({ name: 'Test', stages: VALID_STAGES })
    expect(result.error?.code).toBe('UNAUTHORIZED')
  })

  it('retourne FORBIDDEN si non opérateur', async () => {
    vi.mocked(createServerSupabaseClient).mockResolvedValue(
      makeSupabase({ operatorData: null }) as never
    )
    const result = await saveParcourTemplate({ name: 'Test', stages: VALID_STAGES })
    expect(result.error?.code).toBe('FORBIDDEN')
  })

  it('insère un nouveau template avec succès', async () => {
    const supabase = makeSupabase({ templateResult: { data: MOCK_TEMPLATE_ROW, error: null } })
    // Override parcours_templates to directly return on insert chain
    ;(supabase.from as ReturnType<typeof vi.fn>).mockImplementation((table: string) => {
      if (table === 'operators') return makeChain({ data: { id: VALID_UUID_OPERATOR }, error: null })
      if (table === 'parcours_templates') {
        return {
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: MOCK_TEMPLATE_ROW, error: null }),
            }),
          }),
          update: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: MOCK_TEMPLATE_ROW, error: null }),
        }
      }
      return {}
    })
    vi.mocked(createServerSupabaseClient).mockResolvedValue(supabase as never)
    const result = await saveParcourTemplate({ name: 'Mon template', stages: VALID_STAGES })
    expect(result.error).toBeNull()
    expect(result.data?.name).toBe('Mon template')
    expect(result.data?.stages).toHaveLength(2)
  })

  it('met à jour un template existant si templateId fourni (UUID valide)', async () => {
    const supabase = makeSupabase()
    ;(supabase.from as ReturnType<typeof vi.fn>).mockImplementation((table: string) => {
      if (table === 'operators') return makeChain({ data: { id: VALID_UUID_OPERATOR }, error: null })
      if (table === 'parcours_templates') {
        return {
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: MOCK_TEMPLATE_ROW, error: null }),
                }),
              }),
            }),
          }),
          insert: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: MOCK_TEMPLATE_ROW, error: null }),
        }
      }
      return {}
    })
    vi.mocked(createServerSupabaseClient).mockResolvedValue(supabase as never)
    const result = await saveParcourTemplate({
      templateId: VALID_UUID_TEMPLATE,
      name: 'Mon template',
      stages: VALID_STAGES,
    })
    expect(result.error).toBeNull()
    expect(result.data?.id).toBe(VALID_UUID_TEMPLATE)
  })

  it('retourne DATABASE_ERROR si l\'insert échoue', async () => {
    const supabase = makeSupabase()
    ;(supabase.from as ReturnType<typeof vi.fn>).mockImplementation((table: string) => {
      if (table === 'operators') return makeChain({ data: { id: VALID_UUID_OPERATOR }, error: null })
      if (table === 'parcours_templates') {
        return {
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } }),
            }),
          }),
        }
      }
      return {}
    })
    vi.mocked(createServerSupabaseClient).mockResolvedValue(supabase as never)
    const result = await saveParcourTemplate({ name: 'Test', stages: VALID_STAGES })
    expect(result.error?.code).toBe('DATABASE_ERROR')
  })
})

// ============================================================
// duplicateParcourTemplate
// ============================================================

describe('duplicateParcourTemplate', () => {
  it('duplique un template avec le préfixe [Copie]', async () => {
    const copyRow = { ...MOCK_TEMPLATE_ROW, id: 'new-id', name: '[Copie] Mon template' }
    const supabase = makeSupabase()
    ;(supabase.from as ReturnType<typeof vi.fn>).mockImplementation((table: string) => {
      if (table === 'operators') return makeChain({ data: { id: VALID_UUID_OPERATOR }, error: null })
      if (table === 'parcours_templates') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: MOCK_TEMPLATE_ROW, error: null }),
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: copyRow, error: null }),
            }),
          }),
        }
      }
      return {}
    })
    vi.mocked(createServerSupabaseClient).mockResolvedValue(supabase as never)
    const result = await duplicateParcourTemplate(VALID_UUID_TEMPLATE)
    expect(result.error).toBeNull()
    expect(result.data?.name).toContain('[Copie]')
  })

  it('retourne NOT_FOUND si le template source est introuvable', async () => {
    const supabase = makeSupabase()
    ;(supabase.from as ReturnType<typeof vi.fn>).mockImplementation((table: string) => {
      if (table === 'operators') return makeChain({ data: { id: VALID_UUID_OPERATOR }, error: null })
      if (table === 'parcours_templates') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } }),
        }
      }
      return {}
    })
    vi.mocked(createServerSupabaseClient).mockResolvedValue(supabase as never)
    const result = await duplicateParcourTemplate('unknown-id')
    expect(result.error?.code).toBe('NOT_FOUND')
  })
})

// ============================================================
// archiveParcourTemplate
// ============================================================

describe('archiveParcourTemplate', () => {
  it('archive le template avec succès', async () => {
    vi.mocked(createServerSupabaseClient).mockResolvedValue(makeSupabase({ archiveError: null }) as never)
    const result = await archiveParcourTemplate(VALID_UUID_TEMPLATE)
    expect(result.error).toBeNull()
    expect(result.data?.id).toBe(VALID_UUID_TEMPLATE)
  })

  it('retourne DATABASE_ERROR si l\'archivage échoue', async () => {
    vi.mocked(createServerSupabaseClient).mockResolvedValue(
      makeSupabase({ archiveError: { message: 'DB fail' } }) as never
    )
    const result = await archiveParcourTemplate(VALID_UUID_TEMPLATE)
    expect(result.error?.code).toBe('DATABASE_ERROR')
  })
})
