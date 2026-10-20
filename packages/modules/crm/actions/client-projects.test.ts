import { describe, it, expect, vi } from 'vitest'

// ============================================================
// T-063 — projets (chantiers) d'un client : actions serveur.
// Supabase mocké — ces tests vérifient le câblage de l'action, pas la RLS
// réelle (vérifiée séparément par migrations.test.ts + lecture directe en base).
// ============================================================

vi.mock('@monprojetpro/supabase', () => ({
  createServerSupabaseClient: vi.fn(),
}))

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { getClientProjects } from './get-client-projects'
import { createClientProject } from './create-client-project'
import { deleteClientProject } from './delete-client-project'

const mockCreateServerSupabaseClient = vi.mocked(createServerSupabaseClient)

const CLIENT_ID = '444f3b89-5303-459f-a128-dfb0df99abf7'
const PROJECT_ID = '9b6e2c1d-0c2e-4d53-9d41-6f9c7a2b1e55'

const PROJECT_ROW = {
  id: PROJECT_ID,
  client_id: CLIENT_ID,
  name: 'Refonte site vitrine',
  created_at: '2026-10-20T10:00:00Z',
  updated_at: '2026-10-20T10:00:00Z',
}

type MockOptions = {
  authenticated?: boolean
  rows?: Record<string, unknown>[]
  insertError?: { message: string } | null
  deleteError?: { message: string } | null
}

function makeSupabase(options: MockOptions = {}) {
  const { authenticated = true, rows = [PROJECT_ROW], insertError = null, deleteError = null } = options

  const insert = vi.fn(() => ({
    select: vi.fn(() => ({
      single: vi.fn(async () => ({ data: insertError ? null : rows[0], error: insertError })),
    })),
  }))

  const from = vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        order: vi.fn(async () => ({ data: rows, error: null })),
      })),
    })),
    insert,
    delete: vi.fn(() => ({ eq: vi.fn(async () => ({ error: deleteError })) })),
  }))

  return {
    auth: {
      getUser: vi.fn(async () => ({
        data: { user: authenticated ? { id: 'user-1' } : null },
        error: authenticated ? null : { message: 'not authenticated' },
      })),
    },
    from,
  }
}

describe('getClientProjects', () => {
  it('rejette sans clientId', async () => {
    const result = await getClientProjects('')
    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })

  it('rejette si non authentifié', async () => {
    mockCreateServerSupabaseClient.mockResolvedValue(makeSupabase({ authenticated: false }) as never)
    const result = await getClientProjects(CLIENT_ID)
    expect(result.error?.code).toBe('UNAUTHORIZED')
  })

  it('retourne les projets convertis en camelCase', async () => {
    mockCreateServerSupabaseClient.mockResolvedValue(makeSupabase() as never)
    const result = await getClientProjects(CLIENT_ID)
    expect(result.error).toBeNull()
    expect(result.data?.[0]).toMatchObject({ id: PROJECT_ID, clientId: CLIENT_ID, name: 'Refonte site vitrine' })
  })
})

describe('createClientProject', () => {
  it('rejette un nom vide', async () => {
    mockCreateServerSupabaseClient.mockResolvedValue(makeSupabase() as never)
    const result = await createClientProject({ clientId: CLIENT_ID, name: '  ' })
    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })

  it('crée un projet et le renvoie en camelCase', async () => {
    mockCreateServerSupabaseClient.mockResolvedValue(makeSupabase() as never)
    const result = await createClientProject({ clientId: CLIENT_ID, name: 'Refonte site vitrine' })
    expect(result.error).toBeNull()
    expect(result.data).toMatchObject({ id: PROJECT_ID, clientId: CLIENT_ID })
  })

  it("remonte l'erreur d'insertion", async () => {
    mockCreateServerSupabaseClient.mockResolvedValue(makeSupabase({ insertError: { message: 'db down' } }) as never)
    const result = await createClientProject({ clientId: CLIENT_ID, name: 'X' })
    expect(result.error?.code).toBe('CREATE_FAILED')
  })
})

describe('deleteClientProject', () => {
  it('rejette sans projectId', async () => {
    const result = await deleteClientProject('')
    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })

  it('supprime le projet', async () => {
    mockCreateServerSupabaseClient.mockResolvedValue(makeSupabase() as never)
    const result = await deleteClientProject(PROJECT_ID)
    expect(result.error).toBeNull()
  })
})
