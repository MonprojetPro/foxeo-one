import { describe, it, expect, vi, beforeEach } from 'vitest'
import { injectElioDocumentation } from './inject-elio-documentation'
import type { ElioModuleDoc } from '@foxeo/types'

const CLIENT_ID = '123e4567-e89b-12d3-a456-426614174000'
const OPERATOR_ID = '223e4567-e89b-12d3-a456-426614174001'
const CONFIG_ID = '323e4567-e89b-12d3-a456-426614174002'

const VALID_DOC: ElioModuleDoc = {
  moduleId: 'crm',
  description: 'Module CRM pour gérer les contacts et les opportunités',
  faq: [{ question: 'Comment créer un contact ?', answer: 'Cliquez sur Nouveau contact' }],
  commonIssues: [{ problem: 'Contact introuvable', diagnostic: 'Vérifier les filtres', escalation: 'Contacter MiKL' }],
  updatedAt: '2026-03-07T00:00:00Z',
}

let operatorResponse: { data: unknown; error: unknown } = { data: { id: OPERATOR_ID }, error: null }
let clientResponse: { data: unknown; error: unknown } = {
  data: { id: CLIENT_ID, operator_id: OPERATOR_ID },
  error: null,
}
let configResponse: { data: unknown; error: unknown } = {
  data: { id: CONFIG_ID, elio_module_docs: [] },
  error: null,
}
let updateResult: { error: unknown } = { error: null }
let insertResult: { error: unknown } = { error: null }

const mockUpdate = vi.fn()
const mockInsert = vi.fn()

vi.mock('@foxeo/supabase', () => ({
  createServerSupabaseClient: vi.fn(async () => ({
    auth: {
      getUser: vi.fn(async () => ({
        data: { user: { id: 'auth-uid-1' } },
        error: null,
      })),
    },
    from: vi.fn((table: string) => {
      if (table === 'operators') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(async () => operatorResponse),
            })),
          })),
        }
      }
      if (table === 'clients') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(async () => clientResponse),
              })),
            })),
          })),
        }
      }
      if (table === 'client_configs') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(async () => configResponse),
            })),
          })),
          update: mockUpdate,
        }
      }
      if (table === 'activity_logs') {
        return { insert: mockInsert }
      }
      return {}
    }),
  })),
}))

describe('injectElioDocumentation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    operatorResponse = { data: { id: OPERATOR_ID }, error: null }
    clientResponse = { data: { id: CLIENT_ID, operator_id: OPERATOR_ID }, error: null }
    configResponse = { data: { id: CONFIG_ID, elio_module_docs: [] }, error: null }
    updateResult = { error: null }
    insertResult = { error: null }

    mockUpdate.mockReturnValue({
      eq: vi.fn(async () => updateResult),
    })
    mockInsert.mockResolvedValue(insertResult)
  })

  describe('Validation Zod', () => {
    it('retourne VALIDATION_ERROR si clientId invalide', async () => {
      const result = await injectElioDocumentation('not-uuid', VALID_DOC)
      expect(result.error?.code).toBe('VALIDATION_ERROR')
      expect(result.data).toBeNull()
    })

    it('retourne VALIDATION_ERROR si description trop courte', async () => {
      const result = await injectElioDocumentation(CLIENT_ID, {
        ...VALID_DOC,
        description: 'Court',
      })
      expect(result.error?.code).toBe('VALIDATION_ERROR')
    })

    it('retourne VALIDATION_ERROR si moduleId vide', async () => {
      const result = await injectElioDocumentation(CLIENT_ID, {
        ...VALID_DOC,
        moduleId: '',
      })
      expect(result.error?.code).toBe('VALIDATION_ERROR')
    })
  })

  describe('Création — module inexistant', () => {
    it('ajoute le doc dans l\'array si moduleId absent', async () => {
      configResponse = { data: { id: CONFIG_ID, elio_module_docs: [] }, error: null }

      const result = await injectElioDocumentation(CLIENT_ID, VALID_DOC)

      expect(result.error).toBeNull()
      const callArg = mockUpdate.mock.calls[0]?.[0] as { elio_module_docs: ElioModuleDoc[] }
      expect(callArg.elio_module_docs).toHaveLength(1)
      expect(callArg.elio_module_docs[0]?.moduleId).toBe('crm')
    })

    it('updatedAt est mis à jour avec la date courante', async () => {
      const before = Date.now()
      await injectElioDocumentation(CLIENT_ID, VALID_DOC)
      const after = Date.now()

      const callArg = mockUpdate.mock.calls[0]?.[0] as { elio_module_docs: ElioModuleDoc[] }
      const updatedAt = new Date(callArg.elio_module_docs[0]?.updatedAt ?? '').getTime()
      expect(updatedAt).toBeGreaterThanOrEqual(before)
      expect(updatedAt).toBeLessThanOrEqual(after)
    })
  })

  describe('Mise à jour — module existant', () => {
    it('remplace le doc existant pour le même moduleId', async () => {
      const existingDoc: ElioModuleDoc = {
        moduleId: 'crm',
        description: 'Ancienne description du CRM et gestion',
        faq: [],
        commonIssues: [],
        updatedAt: '2026-01-01T00:00:00Z',
      }
      configResponse = { data: { id: CONFIG_ID, elio_module_docs: [existingDoc] }, error: null }

      const newDoc: ElioModuleDoc = {
        ...VALID_DOC,
        description: 'Nouvelle description complète du module CRM',
      }
      await injectElioDocumentation(CLIENT_ID, newDoc)

      const callArg = mockUpdate.mock.calls[0]?.[0] as { elio_module_docs: ElioModuleDoc[] }
      expect(callArg.elio_module_docs).toHaveLength(1)
      expect(callArg.elio_module_docs[0]?.description).toBe('Nouvelle description complète du module CRM')
    })

    it('conserve les autres modules lors de la mise à jour', async () => {
      const otherDoc: ElioModuleDoc = {
        moduleId: 'visio',
        description: 'Module de visioconférence pour les réunions',
        faq: [],
        commonIssues: [],
        updatedAt: '2026-01-01T00:00:00Z',
      }
      configResponse = { data: { id: CONFIG_ID, elio_module_docs: [otherDoc] }, error: null }

      await injectElioDocumentation(CLIENT_ID, VALID_DOC)

      const callArg = mockUpdate.mock.calls[0]?.[0] as { elio_module_docs: ElioModuleDoc[] }
      expect(callArg.elio_module_docs).toHaveLength(2)
      expect(callArg.elio_module_docs.map((d) => d.moduleId)).toContain('visio')
      expect(callArg.elio_module_docs.map((d) => d.moduleId)).toContain('crm')
    })
  })

  describe('Activity log', () => {
    it('logge un activity_log type elio_doc_injected', async () => {
      await injectElioDocumentation(CLIENT_ID, VALID_DOC)

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'elio_doc_injected',
          entity_id: CLIENT_ID,
          metadata: expect.objectContaining({
            moduleId: 'crm',
          }),
        })
      )
    })
  })

  describe('Import JSON — validation Zod', () => {
    it('retourne une erreur si description absente', async () => {
      const incompleteDoc = {
        moduleId: 'crm',
        // description missing
        faq: [],
        commonIssues: [],
        updatedAt: '2026-03-07T00:00:00Z',
      } as unknown as ElioModuleDoc

      const result = await injectElioDocumentation(CLIENT_ID, incompleteDoc)
      expect(result.error?.code).toBe('VALIDATION_ERROR')
    })

    it('accepte un doc avec faq et commonIssues vides', async () => {
      const minimalDoc: ElioModuleDoc = {
        moduleId: 'crm',
        description: 'Module CRM minimal pour gérer les contacts',
        faq: [],
        commonIssues: [],
        updatedAt: '2026-03-07T00:00:00Z',
      }

      const result = await injectElioDocumentation(CLIENT_ID, minimalDoc)
      expect(result.error).toBeNull()
    })
  })
})
