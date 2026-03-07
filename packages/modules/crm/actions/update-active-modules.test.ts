import { describe, it, expect, vi, beforeEach } from 'vitest'
import { updateActiveModules } from './update-active-modules'

const CLIENT_ID = '123e4567-e89b-12d3-a456-426614174000'
const OPERATOR_ID = '223e4567-e89b-12d3-a456-426614174001'
const CONFIG_ID = '323e4567-e89b-12d3-a456-426614174002'

let operatorResponse: { data: unknown; error: unknown } = { data: { id: OPERATOR_ID }, error: null }
let clientResponse: { data: unknown; error: unknown } = {
  data: { id: CLIENT_ID, name: 'Alice Dupont', operator_id: OPERATOR_ID },
  error: null,
}
let configResponse: { data: unknown; error: unknown } = {
  data: { id: CONFIG_ID, active_modules: ['core-dashboard', 'chat', 'documents', 'elio'] },
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

describe('updateActiveModules', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    operatorResponse = { data: { id: OPERATOR_ID }, error: null }
    clientResponse = { data: { id: CLIENT_ID, name: 'Alice Dupont', operator_id: OPERATOR_ID }, error: null }
    configResponse = {
      data: { id: CONFIG_ID, active_modules: ['core-dashboard', 'chat', 'documents', 'elio'] },
      error: null,
    }
    updateResult = { error: null }
    insertResult = { error: null }

    mockUpdate.mockReturnValue({
      eq: vi.fn(async () => updateResult),
    })
    mockInsert.mockResolvedValue(insertResult)
  })

  describe('Validation Zod', () => {
    it('retourne VALIDATION_ERROR si clientId invalide', async () => {
      const result = await updateActiveModules('not-uuid', 'crm', true)
      expect(result.error?.code).toBe('VALIDATION_ERROR')
      expect(result.data).toBeNull()
    })

    it('retourne VALIDATION_ERROR si moduleId vide', async () => {
      const result = await updateActiveModules(CLIENT_ID, '', true)
      expect(result.error?.code).toBe('VALIDATION_ERROR')
    })
  })

  describe('Guard modules de base (MODULE_LOCKED)', () => {
    it('retourne MODULE_LOCKED si tentative désactivation core-dashboard', async () => {
      const result = await updateActiveModules(CLIENT_ID, 'core-dashboard', false)
      expect(result.error?.code).toBe('MODULE_LOCKED')
      expect(result.data).toBeNull()
    })

    it('retourne MODULE_LOCKED si tentative désactivation chat', async () => {
      const result = await updateActiveModules(CLIENT_ID, 'chat', false)
      expect(result.error?.code).toBe('MODULE_LOCKED')
    })

    it('retourne MODULE_LOCKED si tentative désactivation documents', async () => {
      const result = await updateActiveModules(CLIENT_ID, 'documents', false)
      expect(result.error?.code).toBe('MODULE_LOCKED')
    })

    it('retourne MODULE_LOCKED si tentative désactivation elio', async () => {
      const result = await updateActiveModules(CLIENT_ID, 'elio', false)
      expect(result.error?.code).toBe('MODULE_LOCKED')
    })

    it('NE retourne PAS MODULE_LOCKED si activation d\'un module de base', async () => {
      const result = await updateActiveModules(CLIENT_ID, 'core-dashboard', true)
      // Should proceed (no MODULE_LOCKED)
      expect(result.error?.code).not.toBe('MODULE_LOCKED')
    })
  })

  describe('Activation module commercial', () => {
    it('ajoute moduleId dans active_modules si enabled=true', async () => {
      configResponse = {
        data: { id: CONFIG_ID, active_modules: ['core-dashboard', 'chat'] },
        error: null,
      }

      await updateActiveModules(CLIENT_ID, 'crm', true)

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          active_modules: expect.arrayContaining(['core-dashboard', 'chat', 'crm']),
        })
      )
    })

    it('déduplique si moduleId déjà présent', async () => {
      configResponse = {
        data: { id: CONFIG_ID, active_modules: ['core-dashboard', 'crm'] },
        error: null,
      }

      await updateActiveModules(CLIENT_ID, 'crm', true)

      const callArg = mockUpdate.mock.calls[0]?.[0] as { active_modules: string[] }
      const crmCount = callArg.active_modules.filter((m) => m === 'crm').length
      expect(crmCount).toBe(1)
    })
  })

  describe('Désactivation module commercial', () => {
    it('retire moduleId de active_modules si enabled=false', async () => {
      configResponse = {
        data: { id: CONFIG_ID, active_modules: ['core-dashboard', 'chat', 'crm'] },
        error: null,
      }

      await updateActiveModules(CLIENT_ID, 'crm', false)

      const callArg = mockUpdate.mock.calls[0]?.[0] as { active_modules: string[] }
      expect(callArg.active_modules).not.toContain('crm')
      expect(callArg.active_modules).toContain('core-dashboard')
    })
  })

  describe('Activity log', () => {
    it('logge un activity_log type module_toggled lors de l\'activation', async () => {
      await updateActiveModules(CLIENT_ID, 'crm', true)

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'module_toggled',
          entity_id: CLIENT_ID,
          metadata: expect.objectContaining({
            moduleId: 'crm',
            enabled: true,
            clientName: 'Alice Dupont',
          }),
        })
      )
    })

    it('logge un activity_log type module_toggled lors de la désactivation', async () => {
      configResponse = {
        data: { id: CONFIG_ID, active_modules: ['core-dashboard', 'crm'] },
        error: null,
      }

      await updateActiveModules(CLIENT_ID, 'crm', false)

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'module_toggled',
          metadata: expect.objectContaining({ enabled: false }),
        })
      )
    })
  })

  describe('Erreurs auth', () => {
    it('retourne UNAUTHORIZED si pas d\'utilisateur connecté', async () => {
      vi.mocked(
        (await import('@foxeo/supabase')).createServerSupabaseClient
      ).mockResolvedValueOnce({
        auth: {
          getUser: vi.fn(async () => ({ data: { user: null }, error: null })),
        },
        from: vi.fn(),
      } as never)

      const result = await updateActiveModules(CLIENT_ID, 'crm', true)
      expect(result.error?.code).toBe('UNAUTHORIZED')
    })
  })
})
