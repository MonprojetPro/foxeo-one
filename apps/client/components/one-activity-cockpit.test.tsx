import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'

// ── Mocks des hooks de données (sources réelles, mockées pour le test unitaire) ──

const mocks = {
  posts: [] as Array<{ id: string; title: string | null; body: string; createdAt: string }>,
  postsPending: false,
  messages: [] as Array<{ id: string; senderType: 'client' | 'operator'; readAt: string | null }>,
  messagesPending: false,
  documents: [] as Array<{ id: string; name: string; createdAt: string }>,
  documentsPending: false,
  scheduled: [] as Array<{ id: string; title: string; scheduledAt: string }>,
  completed: [] as Array<{ id: string; title: string; scheduledAt: string }>,
  meetingsPending: false,
  tickets: [] as Array<{ id: string; status: string }>,
  ticketsPending: false,
  summary: { evolutionPendingCount: 0, elioTier: 'one' as 'one' | 'one_plus', oneStatus: null },
  summaryPending: false,
}

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}))

vi.mock('@monprojetpro/utils', () => ({
  formatRelativeDate: () => 'il y a 2 jours',
}))

vi.mock('@monprojetpro/module-suivi-outil', () => ({
  useToolPosts: () => ({ posts: mocks.posts, isPending: mocks.postsPending }),
  useSuiviOutilRealtime: () => undefined,
}))

vi.mock('@monprojetpro/modules-chat', () => ({
  useChatMessages: () => ({ messages: mocks.messages, isPending: mocks.messagesPending }),
  useChatRealtime: () => undefined,
}))

vi.mock('@monprojetpro/module-documents', () => ({
  useDocuments: () => ({ documents: mocks.documents, isPending: mocks.documentsPending }),
  useDocumentsRealtime: () => undefined,
}))

vi.mock('@monprojetpro/module-visio', () => ({
  useMeetings: ({ status }: { status: string }) => ({
    data: status === 'scheduled' ? mocks.scheduled : mocks.completed,
    isPending: mocks.meetingsPending,
  }),
}))

vi.mock('@monprojetpro/modules-support', () => ({
  useSupportTickets: () => ({ data: mocks.tickets, isPending: mocks.ticketsPending }),
  useSupportTicketsRealtime: () => undefined,
}))

vi.mock('./use-one-cockpit-summary', () => ({
  useOneCockpitSummary: () => ({ data: mocks.summary, isPending: mocks.summaryPending }),
  useOneCockpitSummaryRealtime: () => undefined,
}))

import { OneActivityCockpit } from './one-activity-cockpit'

function reset() {
  mocks.posts = []
  mocks.postsPending = false
  mocks.messages = []
  mocks.messagesPending = false
  mocks.documents = []
  mocks.documentsPending = false
  mocks.scheduled = []
  mocks.completed = []
  mocks.meetingsPending = false
  mocks.tickets = []
  mocks.ticketsPending = false
  mocks.summary = { evolutionPendingCount: 0, elioTier: 'one', oneStatus: null }
  mocks.summaryPending = false
}

describe('OneActivityCockpit — cockpit One (données réelles)', () => {
  beforeEach(reset)

  it('rend les 6 cartes du cockpit', () => {
    render(<OneActivityCockpit clientId="c1" userId="u1" />)
    expect(screen.getByText('À traiter')).toBeInTheDocument()
    expect(screen.getByText("Suivi de l'outil")).toBeInTheDocument()
    expect(screen.getByText('Messages')).toBeInTheDocument()
    expect(screen.getByText('Documents')).toBeInTheDocument()
    expect(screen.getByText('Visio')).toBeInTheDocument()
    expect(screen.getByText('Mon abonnement')).toBeInTheDocument()
  })

  it('« À traiter » agrège demandes d’évolution + tickets ouverts', () => {
    mocks.summary = { evolutionPendingCount: 2, elioTier: 'one', oneStatus: null }
    mocks.tickets = [
      { id: 't1', status: 'open' },
      { id: 't2', status: 'resolved' },
    ]
    render(<OneActivityCockpit clientId="c1" userId="u1" />)
    expect(screen.getByText(/Demande\(s\) d'évolution en attente/)).toBeInTheDocument()
    expect(screen.getByText(/Ticket\(s\) support ouvert\(s\)/)).toBeInTheDocument()
  })

  it('« À traiter » montre l’état « rien à traiter » quand vide', () => {
    render(<OneActivityCockpit clientId="c1" userId="u1" />)
    expect(screen.getByText(/Rien à traiter pour le moment/)).toBeInTheDocument()
  })

  it('« Suivi de l’outil » affiche le nombre de publications', () => {
    mocks.posts = [
      { id: 'p1', title: 'Maj', body: 'x', createdAt: '2026-06-20T10:00:00Z' },
      { id: 'p2', title: 'Maj2', body: 'y', createdAt: '2026-06-19T10:00:00Z' },
    ]
    render(<OneActivityCockpit clientId="c1" userId="u1" />)
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByText('publications')).toBeInTheDocument()
  })

  it('« Messages » compte les non-lus venant de MiKL (operator)', () => {
    mocks.messages = [
      { id: 'm1', senderType: 'operator', readAt: null },
      { id: 'm2', senderType: 'operator', readAt: '2026-06-20T10:00:00Z' },
      { id: 'm3', senderType: 'client', readAt: null },
    ]
    render(<OneActivityCockpit clientId="c1" userId="u1" />)
    // « 1 » apparaît à la fois en pastille (badge) et en gros chiffre.
    expect(screen.getAllByText('1').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('non lu')).toBeInTheDocument()
    expect(screen.getByText('MiKL')).toBeInTheDocument()
  })

  it('« Mon abonnement » affiche le tier One+ et son prix', () => {
    mocks.summary = { evolutionPendingCount: 0, elioTier: 'one_plus', oneStatus: null }
    render(<OneActivityCockpit clientId="c1" userId="u1" />)
    expect(screen.getByText('One+')).toBeInTheDocument()
    expect(screen.getByText('99 €/mois')).toBeInTheDocument()
  })

  it('« Visio » met en avant le prochain RDV planifié', () => {
    mocks.scheduled = [
      { id: 'v1', title: 'Coaching mensuel', scheduledAt: '2099-01-01T10:00:00Z' },
    ]
    render(<OneActivityCockpit clientId="c1" userId="u1" />)
    expect(screen.getByText('Coaching mensuel')).toBeInTheDocument()
    expect(screen.getByText('Prochain rendez-vous')).toBeInTheDocument()
  })
})
