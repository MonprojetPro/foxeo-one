import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ElioQueryBox } from './elio-query-box'

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockNewConversation = vi.fn()
const mockSaveElioMessage = vi.fn()
const mockSendToElioHubAgent = vi.fn()
const mockAddHubDirective = vi.fn()
const mockUseSpeechDictation = vi.fn(() => ({
  isSupported: false,
  isListening: false,
  toggle: vi.fn(),
  error: null as string | null,
}))

// Coupe la chaîne d'imports serveur du barrel (elio-hub-agent → hub-tools → server-only)
vi.mock('@monprojetpro/module-elio', () => ({
  newConversation: (...args: unknown[]) => mockNewConversation(...args),
  saveElioMessage: (...args: unknown[]) => mockSaveElioMessage(...args),
  sendToElioHubAgent: (...args: unknown[]) => mockSendToElioHubAgent(...args),
  addHubDirective: (...args: unknown[]) => mockAddHubDirective(...args),
  useSpeechDictation: (...args: unknown[]) =>
    (mockUseSpeechDictation as (...a: unknown[]) => ReturnType<typeof mockUseSpeechDictation>)(...args),
}))

vi.mock('@monprojetpro/utils', () => ({
  readFileContent: vi.fn(async () => ({ text: null, error: 'non utilisé ici' })),
}))

vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}))

// ── Helpers ───────────────────────────────────────────────────────────────────

function typeAndSend(text: string) {
  const textarea = screen.getByLabelText('Message rapide à Élio')
  fireEvent.change(textarea, { target: { value: text } })
  fireEvent.click(screen.getByLabelText('Envoyer le message'))
}

function agentReply(overrides: Partial<{ content: string; pendingActions: unknown[]; toolsUsed: string[] }> = {}) {
  return {
    data: {
      content: 'Voici ma réponse.',
      pendingActions: [],
      toolsUsed: [],
      conversationId: 'conv-1',
      ...overrides,
    },
    error: null,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  window.sessionStorage.clear()
  mockNewConversation.mockResolvedValue({ data: { id: 'conv-1' }, error: null })
  mockSaveElioMessage.mockResolvedValue({ data: null, error: null })
  mockSendToElioHubAgent.mockResolvedValue(agentReply())
  mockAddHubDirective.mockResolvedValue({
    data: { id: 'dir-1', text: 'Toujours tutoyer', createdAt: '2026-07-06T10:00:00.000Z' },
    error: null,
  })
})

// ── Mode Màj Élio : directive persistée, AUCUN appel LLM ─────────────────────

describe('ElioQueryBox — mode Màj Élio (directives)', () => {
  it('appelle addHubDirective avec le texte brut, sans LLM ni conversation', async () => {
    render(<ElioQueryBox userId="user-1" />)

    fireEvent.click(screen.getByLabelText('Màj Élio'))
    typeAndSend('À partir de maintenant, toujours tutoyer les clients')

    await screen.findByText('✅ Directive enregistrée — Élio l’appliquera désormais')

    expect(mockAddHubDirective).toHaveBeenCalledWith('À partir de maintenant, toujours tutoyer les clients')
    expect(mockSendToElioHubAgent).not.toHaveBeenCalled()
    expect(mockNewConversation).not.toHaveBeenCalled()
    expect(mockSaveElioMessage).not.toHaveBeenCalled()
  })

  it('affiche l’erreur et restaure la saisie si addHubDirective échoue', async () => {
    mockAddHubDirective.mockResolvedValue({
      data: null,
      error: { message: 'Limite de 30 directives atteinte', code: 'LIMIT_REACHED' },
    })
    render(<ElioQueryBox userId="user-1" />)

    fireEvent.click(screen.getByLabelText('Màj Élio'))
    typeAndSend('Une directive de trop')

    await screen.findByText('Limite de 30 directives atteinte')
    // La saisie n'est pas perdue
    expect(screen.getByLabelText('Message rapide à Élio')).toHaveProperty('value', 'Une directive de trop')
  })
})

// ── Modes Ordre / Avis / Brouillon : agent outillé ───────────────────────────

describe('ElioQueryBox — agent Élio Hub outillé', () => {
  it('mode Ordre : préfixe [ORDRE], persiste user + assistant, affiche la réponse', async () => {
    render(<ElioQueryBox userId="user-1" />)

    typeAndSend('combien de clients ?')

    await screen.findByText('Voici ma réponse.')

    expect(mockNewConversation).toHaveBeenCalledWith('hub')
    expect(mockSendToElioHubAgent).toHaveBeenCalledWith({
      conversationId: 'conv-1',
      message: '[ORDRE] combien de clients ?',
    })
    // Persistance : user AVANT l'agent, assistant APRÈS (l'agent ne persiste pas)
    expect(mockSaveElioMessage).toHaveBeenNthCalledWith(1, 'conv-1', 'user', '[ORDRE] combien de clients ?')
    expect(mockSaveElioMessage).toHaveBeenNthCalledWith(2, 'conv-1', 'assistant', 'Voici ma réponse.', {})
  })

  it('conversation continue : réutilise le même conversationId au 2e envoi + sessionStorage', async () => {
    render(<ElioQueryBox userId="user-1" />)

    typeAndSend('premier message')
    await screen.findByText('Voici ma réponse.')

    expect(window.sessionStorage.getItem('elio-widget-conversation-id')).toBe('conv-1')

    typeAndSend('deuxième message')
    await screen.findByText('Voici ma réponse.')

    expect(mockNewConversation).toHaveBeenCalledTimes(1)
    expect(mockSendToElioHubAgent).toHaveBeenLastCalledWith({
      conversationId: 'conv-1',
      message: '[ORDRE] deuxième message',
    })
  })

  it('bouton « Nouvelle conversation » : reset → le prochain envoi recrée une conversation', async () => {
    mockNewConversation
      .mockResolvedValueOnce({ data: { id: 'conv-1' }, error: null })
      .mockResolvedValueOnce({ data: { id: 'conv-2' }, error: null })
    render(<ElioQueryBox userId="user-1" />)

    typeAndSend('premier message')
    await screen.findByText('Voici ma réponse.')

    fireEvent.click(screen.getByLabelText('Nouvelle conversation'))
    expect(window.sessionStorage.getItem('elio-widget-conversation-id')).toBeNull()

    typeAndSend('nouveau départ')
    await screen.findByText('Voici ma réponse.')

    expect(mockNewConversation).toHaveBeenCalledTimes(2)
    expect(mockSendToElioHubAgent).toHaveBeenLastCalledWith({
      conversationId: 'conv-2',
      message: '[ORDRE] nouveau départ',
    })
  })

  it('pendingActions ≥ 1 → encart « en attente de ta validation » + metadata persistée', async () => {
    mockSendToElioHubAgent.mockResolvedValue(
      agentReply({
        content: 'Proposition créée, à toi de valider.',
        pendingActions: [{ id: 'action-1', toolName: 'send_chat_message', summary: 'Envoyer…', status: 'pending', input: {} }],
        toolsUsed: ['search_client'],
      }),
    )
    render(<ElioQueryBox userId="user-1" />)

    typeAndSend('dis salut à Dupont')

    await screen.findByText('1 action en attente de ta validation')
    expect(mockSaveElioMessage).toHaveBeenNthCalledWith(
      2,
      'conv-1',
      'assistant',
      'Proposition créée, à toi de valider.',
      { hub_action_ids: ['action-1'], hub_tools_used: ['search_client'] },
    )
  })

  it('erreur agent → message affiché, pas de saveElioMessage assistant', async () => {
    mockSendToElioHubAgent.mockResolvedValue({
      data: null,
      error: { message: 'Élio a mis trop de temps à répondre (timeout).', code: 'TIMEOUT' },
    })
    render(<ElioQueryBox userId="user-1" />)

    typeAndSend('question lente')

    await screen.findByText('Élio a mis trop de temps à répondre (timeout).')
    // Seul le message user a été persisté
    expect(mockSaveElioMessage).toHaveBeenCalledTimes(1)
  })
})

// ── Micro ─────────────────────────────────────────────────────────────────────

describe('ElioQueryBox — dictée vocale', () => {
  it('masque le bouton micro si le navigateur ne supporte pas la Web Speech API', () => {
    render(<ElioQueryBox userId="user-1" />)
    expect(screen.queryByLabelText('Démarrer la dictée vocale')).toBeNull()
  })

  it('affiche le bouton micro et déclenche toggle au clic quand supporté', () => {
    const toggle = vi.fn()
    mockUseSpeechDictation.mockReturnValue({ isSupported: true, isListening: false, toggle, error: null })
    render(<ElioQueryBox userId="user-1" />)

    fireEvent.click(screen.getByLabelText('Démarrer la dictée vocale'))
    expect(toggle).toHaveBeenCalledTimes(1)
  })

  it('icône rouge pulsante pendant l’écoute', () => {
    mockUseSpeechDictation.mockReturnValue({ isSupported: true, isListening: true, toggle: vi.fn(), error: null })
    render(<ElioQueryBox userId="user-1" />)

    const micBtn = screen.getByLabelText('Arrêter la dictée vocale')
    expect(micBtn.className).toContain('text-red-500')
    expect(micBtn.className).toContain('animate-pulse')
  })
})
