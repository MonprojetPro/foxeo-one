import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { createElement } from 'react'
import { PresenceProvider, usePresenceContext } from './presence-provider'

// ---- Mock useChatPresence ----
const mockUseChatPresence = vi.fn()

vi.mock('../hooks/use-chat-presence', () => ({
  useChatPresence: (...args: unknown[]) => mockUseChatPresence(...args),
}))

const defaultPresenceState = {
  'op-111': [{ user_id: 'op-111', user_type: 'operator', online_at: '2026-01-01T00:00:00Z' }],
}

function PresenceConsumer() {
  const { presenceState, operatorId } = usePresenceContext()
  const keys = Object.keys(presenceState)
  return (
    <div>
      <span data-testid="operator-id">{operatorId}</span>
      <span data-testid="presence-keys">{keys.join(',')}</span>
    </div>
  )
}

describe('PresenceProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseChatPresence.mockReturnValue({ presenceState: {} })
  })

  it('renders children', () => {
    render(
      <PresenceProvider userId="u1" userType="operator" operatorId="op-111">
        <span data-testid="child">child</span>
      </PresenceProvider>
    )
    expect(screen.getByTestId('child')).toBeInTheDocument()
  })

  it('passes operatorId to context', () => {
    render(
      <PresenceProvider userId="u1" userType="operator" operatorId="op-111">
        <PresenceConsumer />
      </PresenceProvider>
    )
    expect(screen.getByTestId('operator-id').textContent).toBe('op-111')
  })

  it('provides presenceState from useChatPresence hook', () => {
    mockUseChatPresence.mockReturnValue({ presenceState: defaultPresenceState })

    render(
      <PresenceProvider userId="op-111" userType="operator" operatorId="op-111">
        <PresenceConsumer />
      </PresenceProvider>
    )

    expect(screen.getByTestId('presence-keys').textContent).toBe('op-111')
  })

  it('calls useChatPresence with correct args', () => {
    render(
      <PresenceProvider userId="u1" userType="client" operatorId="op-111">
        <span />
      </PresenceProvider>
    )

    expect(mockUseChatPresence).toHaveBeenCalledWith('op-111', 'u1', 'client', undefined)
  })

  it('passes the Hub client list to useChatPresence (T-064)', () => {
    render(
      <PresenceProvider userId="op-111" userType="operator" operatorId="op-111" clientIds={['c-1', 'c-2']}>
        <span />
      </PresenceProvider>
    )

    expect(mockUseChatPresence).toHaveBeenCalledWith('op-111', 'op-111', 'operator', ['c-1', 'c-2'])
  })

  it('context defaults to empty presenceState when no provider', () => {
    render(<PresenceConsumer />)
    expect(screen.getByTestId('presence-keys').textContent).toBe('')
    expect(screen.getByTestId('operator-id').textContent).toBe('')
  })
})
