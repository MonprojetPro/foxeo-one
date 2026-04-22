import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { StepElioChat } from './step-elio-chat'

vi.mock('../actions/get-or-create-step-conversation', () => ({
  getOrCreateStepConversation: vi.fn().mockResolvedValue({
    data: {
      conversationId: '00000000-0000-0000-0000-000000000003',
      clientId: '00000000-0000-0000-0000-000000000002',
    },
    error: null,
  }),
}))

vi.mock('@monprojetpro/module-elio', () => ({
  getMessages: vi.fn().mockResolvedValue({ data: [], error: null }),
  saveElioMessage: vi.fn().mockResolvedValue({ data: {}, error: null }),
  sendToElio: vi.fn().mockResolvedValue({
    data: {
      id: 'reply-1',
      role: 'assistant',
      content: 'Bonjour, je suis Élio !',
      createdAt: new Date().toISOString(),
      dashboardType: 'lab',
    },
    error: null,
  }),
  getEffectiveStepConfig: vi.fn().mockResolvedValue({
    data: {
      agentName: 'Élio Branding',
      agentImagePath: null,
      systemPrompt: 'Tu es un expert en branding.',
      model: 'claude-opus-4-6',
      temperature: 0.8,
      announcementMessage: null,
      contextId: null,
      source: 'agent',
    },
    error: null,
  }),
  consumeStepContext: vi.fn().mockResolvedValue({ data: { consumed: true }, error: null }),
}))

const STEP_ID = '00000000-0000-0000-0000-000000000001'
const CLIENT_ID = '00000000-0000-0000-0000-000000000002'

describe('StepElioChat', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ── Tests existants (Story 14.4) ────────────────────────────────────────────

  it('affiche le nom de l\'agent dans le header (AC#1)', async () => {
    render(
      <StepElioChat
        stepId={STEP_ID}
        stepStatus="current"
        stepNumber={3}
        clientId={CLIENT_ID}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Élio Branding')).toBeDefined()
    })
  })

  it('affiche "En ligne" quand le chat est prêt', async () => {
    render(
      <StepElioChat
        stepId={STEP_ID}
        stepStatus="current"
        stepNumber={3}
        clientId={CLIENT_ID}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('En ligne')).toBeDefined()
    })
  })

  it('affiche le message d\'accueil quand aucun historique', async () => {
    render(
      <StepElioChat
        stepId={STEP_ID}
        stepStatus="current"
        stepNumber={3}
        clientId={CLIENT_ID}
      />
    )

    await waitFor(() => {
      expect(screen.getByText(/Bonjour ! Je suis là pour vous accompagner/)).toBeDefined()
    })
  })

  it('affiche le message "étape verrouillée" pour le statut locked', async () => {
    render(
      <StepElioChat
        stepId={STEP_ID}
        stepStatus="locked"
        stepNumber={3}
        clientId={CLIENT_ID}
      />
    )

    await waitFor(() => {
      expect(screen.getByText("Cette étape n'est pas encore accessible")).toBeDefined()
    })
  })

  it('applique opacity-50 pour le statut locked', async () => {
    const { container } = render(
      <StepElioChat
        stepId={STEP_ID}
        stepStatus="locked"
        stepNumber={3}
        clientId={CLIENT_ID}
      />
    )

    await waitFor(() => {
      const section = container.querySelector('section')
      expect(section?.className).toContain('opacity-50')
    })
  })

  it('désactive l\'input pour les étapes complétées', async () => {
    render(
      <StepElioChat
        stepId={STEP_ID}
        stepStatus="completed"
        stepNumber={3}
        clientId={CLIENT_ID}
      />
    )

    await waitFor(() => {
      const textarea = screen.getByRole('textbox', { name: /message à élio/i })
      expect((textarea as HTMLTextAreaElement).disabled).toBe(true)
    })
  })

  it('affiche "examen en cours" pour pending_review', async () => {
    render(
      <StepElioChat
        stepId={STEP_ID}
        stepStatus="pending_review"
        stepNumber={3}
        clientId={CLIENT_ID}
      />
    )

    await waitFor(() => {
      expect(
        screen.getByText("Votre soumission est en cours d'examen par MiKL")
      ).toBeDefined()
    })
  })

  it('affiche les messages de l\'historique', async () => {
    const { getMessages } = await import('@monprojetpro/module-elio')
    vi.mocked(getMessages).mockResolvedValueOnce({
      data: [
        {
          id: 'msg-1',
          conversationId: '00000000-0000-0000-0000-000000000003',
          role: 'user',
          content: 'Bonjour Élio',
          metadata: {},
          createdAt: '2026-01-01T00:00:00Z',
        },
        {
          id: 'msg-2',
          conversationId: '00000000-0000-0000-0000-000000000003',
          role: 'assistant',
          content: 'Bonjour ! Comment puis-je vous aider ?',
          metadata: {},
          createdAt: '2026-01-01T00:01:00Z',
        },
      ],
      error: null,
    })

    render(
      <StepElioChat
        stepId={STEP_ID}
        stepStatus="current"
        stepNumber={3}
        clientId={CLIENT_ID}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Bonjour Élio')).toBeDefined()
      expect(screen.getByText('Bonjour ! Comment puis-je vous aider ?')).toBeDefined()
    })
  })

  it('affiche une erreur si getOrCreateStepConversation échoue', async () => {
    const { getOrCreateStepConversation } = await import('../actions/get-or-create-step-conversation')
    vi.mocked(getOrCreateStepConversation).mockResolvedValueOnce({
      data: null,
      error: { message: 'DB error', code: 'DB_ERROR' },
    })

    render(
      <StepElioChat
        stepId={STEP_ID}
        stepStatus="current"
        stepNumber={3}
        clientId={CLIENT_ID}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Impossible de charger le chat Élio')).toBeDefined()
    })
  })

  // ── Nouveaux tests Story 14.5 ────────────────────────────────────────────────

  it('affiche le nom du persona depuis getEffectiveStepConfig (AC#1)', async () => {
    const { getEffectiveStepConfig } = await import('@monprojetpro/module-elio')
    vi.mocked(getEffectiveStepConfig).mockResolvedValueOnce({
      data: {
        agentName: 'Élio Vision',
        agentImagePath: null,
        systemPrompt: null,
        model: 'claude-sonnet-4-6',
        temperature: 1.0,
        announcementMessage: null,
        contextId: null,
        source: 'agent',
      },
      error: null,
    })

    render(
      <StepElioChat
        stepId={STEP_ID}
        stepStatus="current"
        stepNumber={1}
        clientId={CLIENT_ID}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Élio Vision')).toBeDefined()
    })
  })

  it('injecte le message d\'annonce MiKL si contexte non-consommé et aucun historique (AC#3)', async () => {
    const { getEffectiveStepConfig, consumeStepContext } = await import('@monprojetpro/module-elio')
    const CONTEXT_ID = '00000000-0000-0000-0000-000000000010'

    vi.mocked(getEffectiveStepConfig).mockResolvedValueOnce({
      data: {
        agentName: 'Élio Branding',
        agentImagePath: null,
        systemPrompt: null,
        model: 'claude-sonnet-4-6',
        temperature: 1.0,
        announcementMessage: 'MiKL a préparé un contexte pour vous : Votre cliente aime le minimalisme.',
        contextId: CONTEXT_ID,
        source: 'agent',
      },
      error: null,
    })

    render(
      <StepElioChat
        stepId={STEP_ID}
        stepStatus="current"
        stepNumber={2}
        clientId={CLIENT_ID}
      />
    )

    await waitFor(() => {
      expect(
        screen.getByText('MiKL a préparé un contexte pour vous : Votre cliente aime le minimalisme.')
      ).toBeDefined()
    })

    // consumeStepContext doit être appelé pour marquer le contexte consommé
    await waitFor(() => {
      expect(vi.mocked(consumeStepContext)).toHaveBeenCalledWith(CONTEXT_ID)
    })
  })

  it('ne pas injecter le message d\'annonce si l\'historique contient déjà des messages (AC#4)', async () => {
    const { getMessages, getEffectiveStepConfig, consumeStepContext } = await import('@monprojetpro/module-elio')
    const CONTEXT_ID = '00000000-0000-0000-0000-000000000011'

    // Historique existant
    vi.mocked(getMessages).mockResolvedValueOnce({
      data: [
        {
          id: 'msg-existing',
          conversationId: '00000000-0000-0000-0000-000000000003',
          role: 'user',
          content: 'Bonjour',
          metadata: {},
          createdAt: '2026-01-01T00:00:00Z',
        },
      ],
      error: null,
    })

    vi.mocked(getEffectiveStepConfig).mockResolvedValueOnce({
      data: {
        agentName: 'Élio Branding',
        agentImagePath: null,
        systemPrompt: null,
        model: 'claude-sonnet-4-6',
        temperature: 1.0,
        announcementMessage: 'Message MiKL',
        contextId: CONTEXT_ID,
        source: 'agent',
      },
      error: null,
    })

    render(
      <StepElioChat
        stepId={STEP_ID}
        stepStatus="current"
        stepNumber={2}
        clientId={CLIENT_ID}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Bonjour')).toBeDefined()
    })

    // Message MiKL ne doit PAS être injecté (historique non vide)
    expect(screen.queryByText('Message MiKL')).toBeNull()
    expect(vi.mocked(consumeStepContext)).not.toHaveBeenCalled()
  })

  it('utilise le fallback global (source: global) quand aucun agent n\'est assigné (AC#5)', async () => {
    const { getEffectiveStepConfig } = await import('@monprojetpro/module-elio')
    vi.mocked(getEffectiveStepConfig).mockResolvedValueOnce({
      data: {
        agentName: 'Élio',
        agentImagePath: null,
        systemPrompt: null,
        model: 'claude-sonnet-4-6',
        temperature: 1.0,
        announcementMessage: null,
        contextId: null,
        source: 'global',
      },
      error: null,
    })

    render(
      <StepElioChat
        stepId={STEP_ID}
        stepStatus="current"
        stepNumber={5}
        clientId={CLIENT_ID}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Élio')).toBeDefined()
    })
  })
})
