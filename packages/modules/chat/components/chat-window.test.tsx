import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { Message } from '../types/chat.types'

// Mock the hooks at the top level
const mockUseChatMessages = vi.fn()
const mockUseChatRealtime = vi.fn()
const mockUsePresenceStatus = vi.fn()

vi.mock('../hooks/use-chat-messages', () => ({
  useChatMessages: (...args: unknown[]) => mockUseChatMessages(...args),
}))

vi.mock('../hooks/use-chat-realtime', () => ({
  useChatRealtime: (...args: unknown[]) => mockUseChatRealtime(...args),
}))

vi.mock('../hooks/use-presence-status', () => ({
  usePresenceStatus: (...args: unknown[]) => mockUsePresenceStatus(...args),
}))

// Server Actions appelees par la fenetre de chat : elles chargent le client
// Supabase serveur, qui ne peut pas etre importe depuis un composant client.
vi.mock('../actions/upload-message-attachment', () => ({
  uploadMessageAttachment: vi.fn(async () => ({ data: null, error: null })),
}))

vi.mock('@monprojetpro/module-elio', () => ({
  transformMessageForClient: vi.fn(async () => ({ data: null, error: null })),
}))

const defaultHookReturn = {
  messages: [] as Message[],
  isPending: false,
  isFetching: false,
  isSending: false,
  sendMessage: vi.fn(),
  sendMessageAsync: vi.fn(),
  sendError: null,
  error: null,
}

function wrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}

describe('ChatWindow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseChatMessages.mockReturnValue(defaultHookReturn)
    mockUseChatRealtime.mockReturnValue(undefined)
    mockUsePresenceStatus.mockReturnValue('offline')
  })

  it('renders the chat window container', async () => {
    const { ChatWindow } = await import('./chat-window')
    render(
      <ChatWindow clientId="client-id" operatorId="op-id" currentUserType="operator" />,
      { wrapper }
    )
    expect(screen.getByTestId('chat-window')).toBeInTheDocument()
  })

  it('shows empty state when no messages', async () => {
    const { ChatWindow } = await import('./chat-window')
    render(
      <ChatWindow clientId="client-id" operatorId="op-id" currentUserType="operator" />,
      { wrapper }
    )
    expect(screen.getByText(/aucun message/i)).toBeInTheDocument()
  })

  it('shows skeleton when loading', async () => {
    mockUseChatMessages.mockReturnValue({ ...defaultHookReturn, isPending: true })
    const { ChatWindow } = await import('./chat-window')
    render(
      <ChatWindow clientId="client-id" operatorId="op-id" currentUserType="operator" />,
      { wrapper }
    )
    expect(screen.getByTestId('chat-skeleton')).toBeInTheDocument()
  })

  it('renders chat-input', async () => {
    const { ChatWindow } = await import('./chat-window')
    render(
      <ChatWindow clientId="client-id" operatorId="op-id" currentUserType="operator" />,
      { wrapper }
    )
    expect(screen.getByTestId('chat-input')).toBeInTheDocument()
  })

  it('renders messages when available', async () => {
    const messages: Message[] = [
      {
        id: 'msg-1',
        clientId: 'client-id',
        operatorId: 'op-id',
        senderType: 'operator',
        content: 'Hello!',
        readAt: null,
        createdAt: '2026-02-17T10:00:00Z',
      },
    ]
    mockUseChatMessages.mockReturnValue({ ...defaultHookReturn, messages })
    const { ChatWindow } = await import('./chat-window')
    render(
      <ChatWindow clientId="client-id" operatorId="op-id" currentUserType="operator" />,
      { wrapper }
    )
    expect(screen.getByText('Hello!')).toBeInTheDocument()
  })

  // AC3: Operator presence header tests
  it('shows operator presence header when currentUserType is client', async () => {
    mockUsePresenceStatus.mockReturnValue('online')
    const { ChatWindow } = await import('./chat-window')
    render(
      <ChatWindow clientId="client-id" operatorId="op-id" currentUserType="client" />,
      { wrapper }
    )
    expect(screen.getByTestId('operator-presence-header')).toBeInTheDocument()
    expect(screen.getByText('Votre conseiller est en ligne')).toBeInTheDocument()
  })

  it('shows offline message when operator is offline (client view)', async () => {
    mockUsePresenceStatus.mockReturnValue('offline')
    const { ChatWindow } = await import('./chat-window')
    render(
      <ChatWindow clientId="client-id" operatorId="op-id" currentUserType="client" />,
      { wrapper }
    )
    expect(screen.getByTestId('operator-presence-header')).toBeInTheDocument()
    expect(screen.getByText('Votre conseiller vous répondra dès que possible')).toBeInTheDocument()
  })

  it('does NOT show operator presence header when currentUserType is operator', async () => {
    mockUsePresenceStatus.mockReturnValue('online')
    const { ChatWindow } = await import('./chat-window')
    render(
      <ChatWindow clientId="client-id" operatorId="op-id" currentUserType="operator" />,
      { wrapper }
    )
    expect(screen.queryByTestId('operator-presence-header')).not.toBeInTheDocument()
  })
})
