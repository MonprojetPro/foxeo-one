import { describe, it, expect, vi } from 'vitest'

vi.mock('@monprojetpro/supabase', () => ({
  createServerSupabaseClient: vi.fn(),
}))

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { assignDocumentProject } from './assign-document-project'

const mockCreateServerSupabaseClient = vi.mocked(createServerSupabaseClient)

const DOCUMENT_ID = '9b6e2c1d-0c2e-4d53-9d41-6f9c7a2b1e55'
const PROJECT_ID = '444f3b89-5303-459f-a128-dfb0df99abf7'

function makeSupabase(options: { authenticated?: boolean; updateError?: { message: string } | null } = {}) {
  const { authenticated = true, updateError = null } = options
  const eq = vi.fn(async () => ({ error: updateError }))
  const update = vi.fn(() => ({ eq }))
  return {
    auth: {
      getUser: vi.fn(async () => ({
        data: { user: authenticated ? { id: 'user-1' } : null },
        error: authenticated ? null : { message: 'not authenticated' },
      })),
    },
    from: vi.fn(() => ({ update })),
    __update: update,
  }
}

describe('assignDocumentProject', () => {
  it('rejette sans documentId', async () => {
    const result = await assignDocumentProject('', PROJECT_ID)
    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })

  it('rejette si non authentifié', async () => {
    mockCreateServerSupabaseClient.mockResolvedValue(makeSupabase({ authenticated: false }) as never)
    const result = await assignDocumentProject(DOCUMENT_ID, PROJECT_ID)
    expect(result.error?.code).toBe('UNAUTHORIZED')
  })

  it('assigne le document au projet', async () => {
    const supabase = makeSupabase()
    mockCreateServerSupabaseClient.mockResolvedValue(supabase as never)
    const result = await assignDocumentProject(DOCUMENT_ID, PROJECT_ID)
    expect(result.error).toBeNull()
    expect(supabase.__update).toHaveBeenCalledWith({ client_project_id: PROJECT_ID })
  })

  it('retire le document du projet quand projectId est null', async () => {
    const supabase = makeSupabase()
    mockCreateServerSupabaseClient.mockResolvedValue(supabase as never)
    const result = await assignDocumentProject(DOCUMENT_ID, null)
    expect(result.error).toBeNull()
    expect(supabase.__update).toHaveBeenCalledWith({ client_project_id: null })
  })

  it("remonte l'erreur de mise a jour", async () => {
    mockCreateServerSupabaseClient.mockResolvedValue(makeSupabase({ updateError: { message: 'db down' } }) as never)
    const result = await assignDocumentProject(DOCUMENT_ID, PROJECT_ID)
    expect(result.error?.code).toBe('UPDATE_FAILED')
  })
})
