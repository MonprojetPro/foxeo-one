import { describe, it, expect, vi, beforeEach } from 'vitest'
import { deleteStepContext } from './delete-step-context'

const CONTEXT_ID = '00000000-0000-0000-0000-000000000001'

/**
 * Construit un mock Supabase qui supporte la séquence :
 * 1. .from().select('file_path').eq().maybeSingle() → récupère file_path avant suppression
 * 2. .from().delete().eq() → supprime la ligne
 * 3. .storage.from().remove() → nettoie le fichier Storage si applicable
 */
function makeMockSupabase(options: {
  deleteResult?: { error: unknown }
  filePath?: string | null
} = {}) {
  const { deleteResult = { error: null }, filePath = null } = options

  const selectChain: Record<string, unknown> = {}
  for (const fn of ['eq']) {
    selectChain[fn] = vi.fn(() => selectChain)
  }
  selectChain.maybeSingle = vi.fn().mockResolvedValue({ data: { file_path: filePath }, error: null })

  const deleteChain: Record<string, unknown> = {}
  deleteChain.eq = vi.fn().mockResolvedValue(deleteResult)

  const tableChain = {
    select: vi.fn(() => selectChain),
    delete: vi.fn(() => deleteChain),
  }

  return {
    from: vi.fn(() => tableChain),
    storage: {
      from: vi.fn(() => ({
        remove: vi.fn().mockResolvedValue({ data: {}, error: null }),
      })),
    },
  }
}

vi.mock('@monprojetpro/supabase', () => ({
  createServerSupabaseClient: vi.fn(),
}))

describe('deleteStepContext', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('retourne une erreur si contextId est invalide', async () => {
    const result = await deleteStepContext('not-a-uuid')
    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })

  it('supprime le contexte avec succès', async () => {
    const { createServerSupabaseClient } = await import('@monprojetpro/supabase')
    vi.mocked(createServerSupabaseClient).mockResolvedValue(
      makeMockSupabase() as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>
    )

    const result = await deleteStepContext(CONTEXT_ID)
    expect(result.error).toBeNull()
    expect(result.data?.deleted).toBe(true)
  })

  it('retourne une erreur DB si la suppression échoue', async () => {
    const { createServerSupabaseClient } = await import('@monprojetpro/supabase')
    vi.mocked(createServerSupabaseClient).mockResolvedValue(
      makeMockSupabase({
        deleteResult: { error: { message: 'Permission denied', code: '42501' } },
      }) as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>
    )

    const result = await deleteStepContext(CONTEXT_ID)
    expect(result.error?.code).toBe('DB_ERROR')
  })
})
