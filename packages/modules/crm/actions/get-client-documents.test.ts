import { describe, it, expect, vi } from 'vitest'

// ============================================================
// T-063 (suite, 27-10) — verrou de non-regression.
//
// La version precedente interrogeait des colonnes qui n'existent pas
// (`type`, `url`, `visible_to_client`) : l'onglet Dossier n'affichait jamais
// aucun document, quoi qu'il y ait en base, et aucun test ne l'attrapait.
// Ce test verifie que la requete porte sur les VRAIES colonnes de `documents`
// (verifiees en base par execute_sql) et que le mapping camelCase est correct.
// ============================================================

vi.mock('@monprojetpro/supabase', () => ({
  createServerSupabaseClient: vi.fn(),
}))

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { getClientDocuments } from './get-client-documents'

const mockCreateServerSupabaseClient = vi.mocked(createServerSupabaseClient)

const CLIENT_ID = '444f3b89-5303-459f-a128-dfb0df99abf7'

const DOCUMENT_ROW = {
  id: '9b6e2c1d-0c2e-4d53-9d41-6f9c7a2b1e55',
  client_id: CLIENT_ID,
  name: 'devis.pdf',
  file_type: 'pdf',
  visibility: 'private',
  tags: ['Facturation'],
  client_project_id: null,
  created_at: '2026-10-20T10:00:00Z',
  updated_at: '2026-10-20T10:00:00Z',
}

function makeSupabase() {
  const selectSpy = vi.fn()
  const eqSpy = vi.fn()

  const from = vi.fn(() => ({
    select: vi.fn((cols: string) => {
      selectSpy(cols)
      // Sonde de table (Epic 4) — select('id').limit(1)
      if (cols.trim() === 'id') {
        return { limit: vi.fn(async () => ({ error: null })) }
      }
      // Requete reelle
      return {
        eq: vi.fn((col: string, value: string) => {
          eqSpy(col, value)
          return {
            is: vi.fn(() => ({
              order: vi.fn(() => ({
                limit: vi.fn(async () => ({ data: [DOCUMENT_ROW], error: null })),
              })),
            })),
          }
        }),
      }
    }),
  }))

  return {
    auth: { getUser: vi.fn(async () => ({ data: { user: { id: 'user-1' } }, error: null })) },
    from,
    __selectSpy: selectSpy,
    __eqSpy: eqSpy,
  }
}

describe('getClientDocuments', () => {
  it('interroge les vraies colonnes de `documents`, jamais type/url/visible_to_client', async () => {
    const supabase = makeSupabase()
    mockCreateServerSupabaseClient.mockResolvedValue(supabase as never)

    await getClientDocuments(CLIENT_ID)

    const realColumnsSelect = supabase.__selectSpy.mock.calls.find(([cols]) => cols.includes('file_type'))
    expect(realColumnsSelect?.[0]).toMatch(/file_type/)
    expect(realColumnsSelect?.[0]).toMatch(/visibility/)
    expect(realColumnsSelect?.[0]).toMatch(/tags/)
    expect(realColumnsSelect?.[0]).not.toMatch(/\btype\b/)
    expect(realColumnsSelect?.[0]).not.toMatch(/\burl\b/)
    expect(realColumnsSelect?.[0]).not.toMatch(/visible_to_client/)
    expect(supabase.__eqSpy).toHaveBeenCalledWith('client_id', CLIENT_ID)
  })

  it('convertit la ligne DB en camelCase', async () => {
    const supabase = makeSupabase()
    mockCreateServerSupabaseClient.mockResolvedValue(supabase as never)

    const result = await getClientDocuments(CLIENT_ID)

    expect(result.error).toBeNull()
    expect(result.data).toEqual([
      {
        id: DOCUMENT_ROW.id,
        clientId: CLIENT_ID,
        name: 'devis.pdf',
        fileType: 'pdf',
        visibility: 'private',
        tags: ['Facturation'],
        clientProjectId: null,
        createdAt: DOCUMENT_ROW.created_at,
        updatedAt: DOCUMENT_ROW.updated_at,
      },
    ])
  })
})
