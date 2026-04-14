import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ConversationList } from './conversation-list'
import type { ElioConversation } from '../types/elio.types'

vi.mock('@monprojetpro/utils', () => ({
  formatRelativeDate: vi.fn(() => 'il y a 2 min'),
}))

vi.mock('./conversation-item', () => ({
  ConversationItem: ({ conversation }: { conversation: ElioConversation }) => (
    <div data-testid="conversation-item">{conversation.title}</div>
  ),
}))

const makeConv = (id: string, title: string, dashboardType: 'one' | 'lab' = 'one'): ElioConversation => ({
  id,
  userId: 'user-1',
  dashboardType,
  title,
  createdAt: '2026-03-04T10:00:00Z',
  updatedAt: '2026-03-04T10:00:00Z',
})

const defaultProps = {
  conversations: [makeConv('c1', 'Conv One 1')],
  activeConversationId: null,
  dashboardType: 'one' as const,
  onSelectConversation: vi.fn(),
  onNewConversation: vi.fn(),
}

describe('ConversationList (Story 8.7 — Task 6.3)', () => {
  it('Task 6.3 — affiche la section "Historique Lab" quand des conversations Lab sont présentes', () => {
    const labConversations = [makeConv('lab-1', 'Conv Lab 1', 'lab')]

    render(<ConversationList {...defaultProps} labConversations={labConversations} />)

    expect(screen.getByText('Historique Lab')).toBeDefined()
  })

  it('Task 6.3 — affiche les conversations Lab dans la section historique', () => {
    const labConversations = [makeConv('lab-1', 'Conv Lab 1', 'lab')]

    render(<ConversationList {...defaultProps} labConversations={labConversations} />)

    expect(screen.getByText('Conv Lab 1')).toBeDefined()
  })

  it('Task 6.2 — n\'affiche pas la section Historique Lab si labConversations est vide', () => {
    render(<ConversationList {...defaultProps} labConversations={[]} />)

    expect(screen.queryByText('Historique Lab')).toBeNull()
  })

  it('Task 6.2 — n\'affiche pas la section Historique Lab si labConversations non fourni', () => {
    render(<ConversationList {...defaultProps} />)

    expect(screen.queryByText('Historique Lab')).toBeNull()
  })

  it('affiche les conversations One courantes normalement', () => {
    render(<ConversationList {...defaultProps} />)

    expect(screen.getByText('Conv One 1')).toBeDefined()
  })

  it('affiche "Aucune conversation" si liste vide (sans Lab)', () => {
    render(<ConversationList {...defaultProps} conversations={[]} />)

    expect(screen.getByText(/Aucune conversation/)).toBeDefined()
  })
})
