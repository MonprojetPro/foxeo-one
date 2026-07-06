import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ElioChat, HEADER_LABELS } from './elio-chat'

// --- Mocks ---

vi.mock('../hooks/use-elio-chat', () => ({
  useElioChat: () => ({
    messages: [],
    isLoading: false,
    error: null,
    sendMessage: vi.fn(),
    retrySend: vi.fn(),
  }),
}))

vi.mock('../hooks/use-elio-conversations', () => ({
  useElioConversations: () => ({
    conversations: [],
    isLoading: false,
  }),
}))

vi.mock('../hooks/use-elio-messages', () => ({
  useElioMessages: () => ({
    messages: [],
    hasNextPage: false,
    fetchNextPage: vi.fn(),
    isFetchingNextPage: false,
  }),
}))

vi.mock('../actions/new-conversation', () => ({
  newConversation: vi.fn(async () => ({ data: null, error: null })),
}))

vi.mock('../actions/generate-welcome-message', () => ({
  generateWelcomeMessage: vi.fn(async () => ({})),
}))

vi.mock('../actions/generate-conversation-title', () => ({
  generateConversationTitle: vi.fn(async () => ''),
}))

vi.mock('../actions/save-elio-message', () => ({
  saveElioMessage: vi.fn(async () => ({})),
}))

vi.mock('../actions/update-conversation-title', () => ({
  updateConversationTitle: vi.fn(async () => ({})),
}))

vi.mock('../actions/send-to-elio', () => ({
  sendToElio: vi.fn(async () => ({ data: null, error: null })),
}))

// Agent Élio Hub (chantier 2026-07-06) — coupe la chaîne d'imports serveur
// (hub-tools → menu-facile admin-client → server-only) comme pour send-to-elio.
vi.mock('../actions/elio-hub-agent', () => ({
  sendToElioHubAgent: vi.fn(async () => ({ data: null, error: null })),
  confirmElioHubAction: vi.fn(async () => ({ data: null, error: null })),
  rejectElioHubAction: vi.fn(async () => ({ data: null, error: null })),
  getElioHubActions: vi.fn(async () => ({ data: [], error: null })),
}))

vi.mock('../hooks/use-elio-hub-actions', () => ({
  useElioHubActions: () => ({ actions: [], isLoading: false, refetch: vi.fn() }),
}))

vi.mock('../actions/escalate-to-mikl', () => ({
  escalateToMiKL: vi.fn(async () => ({ data: null, error: null })),
}))

vi.mock('../actions/submit-evolution-request', () => ({
  submitEvolutionRequest: vi.fn(async () => ({ data: null, error: null })),
}))

vi.mock('../actions/generate-evolution-brief', () => ({
  generateEvolutionBrief: vi.fn(async () => ({ data: null, error: null })),
}))

vi.mock('../utils/evolution-collection', () => ({
  getNextQuestion: vi.fn(),
  processResponse: vi.fn(),
  isCancel: vi.fn(() => false),
}))

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({
    invalidateQueries: vi.fn(),
  }),
}))

describe('ElioChat — parcours abandoned (Story 9.3)', () => {
  it('shows pause message when Lab parcours is abandoned', () => {
    render(
      <ElioChat
        dashboardType="lab"
        parcoursAbandoned={true}
      />
    )

    expect(screen.getByText(/Votre parcours est en pause/)).toBeDefined()
    expect(screen.getByText(/Contactez MiKL si vous souhaitez reprendre/)).toBeDefined()
  })

  it('shows header even when Lab parcours is abandoned', () => {
    render(
      <ElioChat
        dashboardType="lab"
        parcoursAbandoned={true}
      />
    )

    expect(screen.getByText(HEADER_LABELS.lab)).toBeDefined()
  })

  it('does not show pause message for One dashboard even if parcoursAbandoned is true', () => {
    render(
      <ElioChat
        dashboardType="one"
        parcoursAbandoned={true}
      />
    )

    expect(screen.queryByText(/Votre parcours est en pause/)).toBeNull()
  })

  it('renders normal chat when parcoursAbandoned is false', () => {
    render(
      <ElioChat
        dashboardType="lab"
        parcoursAbandoned={false}
      />
    )

    expect(screen.queryByText(/Votre parcours est en pause/)).toBeNull()
  })
})
