import { describe, it, expect, vi, beforeEach } from 'vitest'
import { generateWelcomeMessage, getWelcomeMessage } from './generate-welcome-message'

const mockInsert = vi.fn()
const mockSingle = vi.fn()
const mockSelect = vi.fn(() => ({ single: mockSingle }))

vi.mock('@foxeo/supabase', () => ({
  createServerSupabaseClient: vi.fn(async () => ({
    from: vi.fn(() => ({
      insert: mockInsert,
    })),
  })),
}))

describe('getWelcomeMessage', () => {
  it('retourne le message formel par défaut (tutoiement=false)', () => {
    expect(getWelcomeMessage('lab', false)).toContain('Bienvenue')
    expect(getWelcomeMessage('hub', false)).toContain('Bonjour MiKL')
    expect(getWelcomeMessage('one', false)).toContain('Bonjour')
  })

  it('retourne le message casual (tutoiement=true)', () => {
    expect(getWelcomeMessage('lab', true)).toContain('Salut')
    expect(getWelcomeMessage('hub', true)).toContain('Hey MiKL')
    expect(getWelcomeMessage('one', true)).toContain('Salut')
  })

  it('Task 2.2 — message Hub casual contient les capacités spécifiques (AC1)', () => {
    const msg = getWelcomeMessage('hub', true)
    expect(msg).toContain('naviguer dans le Hub')
    expect(msg).toContain('chercher des infos clients')
    expect(msg).toContain("Qu'est-ce que tu veux faire")
  })

  it('Task 2.2 — message Hub formel contient les capacités spécifiques (AC1)', () => {
    const msg = getWelcomeMessage('hub', false)
    expect(msg).toContain('naviguer dans le Hub')
    expect(msg).toContain('chercher des infos clients')
  })

  it('couvre tous les dashboardTypes', () => {
    const dashboards = ['hub', 'lab', 'one'] as const
    dashboards.forEach((dt) => {
      expect(getWelcomeMessage(dt, false)).toBeTruthy()
      expect(getWelcomeMessage(dt, true)).toBeTruthy()
    })
  })

  describe('Story 8.7 — Task 2.1 : customGreeting', () => {
    it('Task 2.1 — utilise le customGreeting si fourni', () => {
      const custom = 'Bienvenue dans votre espace One, Alice !'
      expect(getWelcomeMessage('one', false, custom)).toBe(custom)
    })

    it('Task 2.1 — ignore un customGreeting vide (espaces)', () => {
      expect(getWelcomeMessage('one', false, '   ')).toContain('Bonjour')
    })

    it('Task 2.2 — utilise le message par défaut si pas de customGreeting', () => {
      expect(getWelcomeMessage('one', false)).toContain('Bonjour')
      expect(getWelcomeMessage('one', true)).toContain('Salut')
    })

    it('Task 2.1 — customGreeting prend priorité sur tutoiement', () => {
      const custom = 'Salut champion, on y va !'
      expect(getWelcomeMessage('one', false, custom)).toBe(custom)
    })
  })
})

describe('generateWelcomeMessage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockInsert.mockReturnValue({ select: mockSelect })
  })

  it('crée le message d\'accueil en base et le retourne', async () => {
    const mockMessage = {
      id: 'msg-welcome-1',
      conversation_id: 'conv-1',
      role: 'assistant',
      content: "Salut ! On reprend ton parcours ? Sur quoi tu veux bosser ?",
      metadata: {},
      created_at: '2026-03-02T10:00:00Z',
    }

    mockSingle.mockResolvedValueOnce({ data: mockMessage, error: null })

    const result = await generateWelcomeMessage('conv-1', 'lab', true)

    expect(result.error).toBeNull()
    expect(result.data?.role).toBe('assistant')
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        conversation_id: 'conv-1',
        role: 'assistant',
      })
    )
  })

  it('retourne VALIDATION_ERROR si conversationId manquant', async () => {
    const result = await generateWelcomeMessage('', 'lab', false)
    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })

  it('adapte le contenu au tutoiement', async () => {
    mockSingle.mockResolvedValueOnce({
      data: {
        id: 'msg-1',
        conversation_id: 'conv-1',
        role: 'assistant',
        content: 'Salut !',
        metadata: {},
        created_at: '2026-03-02T10:00:00Z',
      },
      error: null,
    })

    await generateWelcomeMessage('conv-1', 'hub', true)

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.stringContaining('Hey MiKL'),
      })
    )
  })

  it('retourne DB_ERROR si l\'insertion échoue', async () => {
    mockSingle.mockResolvedValueOnce({ data: null, error: new Error('DB error') })

    const result = await generateWelcomeMessage('conv-1', 'lab', false)
    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('DB_ERROR')
  })
})
