import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getHubDirectives, addHubDirective, removeHubDirective } from './hub-directives'
import { MAX_HUB_DIRECTIVES, type HubDirective } from '../types/hub-directives.types'

const HUB_DIRECTIVES_KEY = 'elio_hub_directives' // constante locale pour les tests

const mockUpsert = vi.fn().mockResolvedValue({ error: null })
const mockMaybeSingle = vi.fn()
const mockGetUser = vi.fn()
const mockRpc = vi.fn()

const mockSupabase = {
  from: vi.fn(() => ({
    upsert: mockUpsert,
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        maybeSingle: mockMaybeSingle,
      })),
    })),
  })),
  auth: { getUser: mockGetUser },
  rpc: mockRpc,
}

vi.mock('@monprojetpro/supabase', () => ({
  createServerSupabaseClient: vi.fn(() => Promise.resolve(mockSupabase)),
}))

const existingDirective: HubDirective = {
  id: 'dir-1',
  text: 'Toujours tutoyer les clients',
  createdAt: '2026-07-06T10:00:00.000Z',
}

function authAsOperator() {
  mockGetUser.mockResolvedValue({ data: { user: { id: 'user-mikl' } }, error: null })
  mockRpc.mockResolvedValue({ data: true, error: null })
}

describe('getHubDirectives', () => {
  beforeEach(() => vi.clearAllMocks())

  it('retourne les directives stockées si valides', async () => {
    mockMaybeSingle.mockResolvedValue({ data: { value: [existingDirective] }, error: null })
    const { data, error } = await getHubDirectives()
    expect(error).toBeNull()
    expect(data).toEqual([existingDirective])
  })

  it('fallback [] si clé absente', async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: null })
    const { data, error } = await getHubDirectives()
    expect(error).toBeNull()
    expect(data).toEqual([])
  })

  it('fallback [] si la valeur stockée est invalide (schéma non conforme)', async () => {
    mockMaybeSingle.mockResolvedValue({ data: { value: { pas: 'un tableau' } }, error: null })
    const { data, error } = await getHubDirectives()
    expect(error).toBeNull()
    expect(data).toEqual([])
  })

  it('fallback [] si la lecture DB échoue (jamais bloquant)', async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: { message: 'DB down' } })
    const { data, error } = await getHubDirectives()
    expect(error).toBeNull()
    expect(data).toEqual([])
  })
})

describe('addHubDirective', () => {
  beforeEach(() => vi.clearAllMocks())

  it('ajoute une directive (opérateur) — id + createdAt générés, upsert avec le tableau enrichi', async () => {
    authAsOperator()
    mockMaybeSingle.mockResolvedValue({ data: { value: [existingDirective] }, error: null })
    mockUpsert.mockResolvedValue({ error: null })

    const { data, error } = await addHubDirective('  Ne jamais envoyer d’email le week-end  ')

    expect(error).toBeNull()
    expect(data).toMatchObject({ text: 'Ne jamais envoyer d’email le week-end' })
    expect(data!.id).toBeTruthy()
    expect(data!.createdAt).toBeTruthy()
    expect(mockUpsert).toHaveBeenCalledWith(
      { key: HUB_DIRECTIVES_KEY, value: [existingDirective, data] },
      { onConflict: 'key' },
    )
  })

  it('retourne VALIDATION_ERROR si le texte est vide', async () => {
    authAsOperator()
    const { data, error } = await addHubDirective('   ')
    expect(data).toBeNull()
    expect(error!.code).toBe('VALIDATION_ERROR')
    expect(mockUpsert).not.toHaveBeenCalled()
  })

  it('retourne VALIDATION_ERROR si le texte dépasse 500 caractères', async () => {
    authAsOperator()
    const { data, error } = await addHubDirective('x'.repeat(501))
    expect(data).toBeNull()
    expect(error!.code).toBe('VALIDATION_ERROR')
  })

  it('retourne LIMIT_REACHED si les 30 directives sont déjà occupées', async () => {
    authAsOperator()
    const full = Array.from({ length: MAX_HUB_DIRECTIVES }, (_, i) => ({
      id: `dir-${i}`,
      text: `Directive ${i}`,
      createdAt: '2026-07-06T10:00:00.000Z',
    }))
    mockMaybeSingle.mockResolvedValue({ data: { value: full }, error: null })

    const { data, error } = await addHubDirective('Une de trop')
    expect(data).toBeNull()
    expect(error!.code).toBe('LIMIT_REACHED')
    expect(mockUpsert).not.toHaveBeenCalled()
  })

  it('retourne UNAUTHORIZED si non authentifié', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'No session' } })
    const { data, error } = await addHubDirective('Directive test')
    expect(data).toBeNull()
    expect(error!.code).toBe('UNAUTHORIZED')
  })

  it('retourne FORBIDDEN si non opérateur', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-client' } }, error: null })
    mockRpc.mockResolvedValue({ data: false, error: null })
    const { data, error } = await addHubDirective('Directive test')
    expect(data).toBeNull()
    expect(error!.code).toBe('FORBIDDEN')
  })

  it("retourne DATABASE_ERROR si l'upsert échoue", async () => {
    authAsOperator()
    mockMaybeSingle.mockResolvedValue({ data: null, error: null })
    mockUpsert.mockResolvedValue({ error: { message: 'DB error' } })
    const { data, error } = await addHubDirective('Directive test')
    expect(data).toBeNull()
    expect(error!.code).toBe('DATABASE_ERROR')
  })
})

describe('removeHubDirective', () => {
  beforeEach(() => vi.clearAllMocks())

  it('supprime la directive et retourne la liste restante', async () => {
    authAsOperator()
    const other: HubDirective = { id: 'dir-2', text: 'Autre directive', createdAt: '2026-07-06T11:00:00.000Z' }
    mockMaybeSingle.mockResolvedValue({ data: { value: [existingDirective, other] }, error: null })
    mockUpsert.mockResolvedValue({ error: null })

    const { data, error } = await removeHubDirective('dir-1')

    expect(error).toBeNull()
    expect(data).toEqual([other])
    expect(mockUpsert).toHaveBeenCalledWith(
      { key: HUB_DIRECTIVES_KEY, value: [other] },
      { onConflict: 'key' },
    )
  })

  it('retourne NOT_FOUND si la directive n’existe pas', async () => {
    authAsOperator()
    mockMaybeSingle.mockResolvedValue({ data: { value: [existingDirective] }, error: null })
    const { data, error } = await removeHubDirective('dir-inconnu')
    expect(data).toBeNull()
    expect(error!.code).toBe('NOT_FOUND')
    expect(mockUpsert).not.toHaveBeenCalled()
  })

  it('retourne VALIDATION_ERROR si id vide', async () => {
    const { data, error } = await removeHubDirective('')
    expect(data).toBeNull()
    expect(error!.code).toBe('VALIDATION_ERROR')
  })

  it('retourne FORBIDDEN si non opérateur', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-client' } }, error: null })
    mockRpc.mockResolvedValue({ data: false, error: null })
    const { data, error } = await removeHubDirective('dir-1')
    expect(data).toBeNull()
    expect(error!.code).toBe('FORBIDDEN')
  })
})
