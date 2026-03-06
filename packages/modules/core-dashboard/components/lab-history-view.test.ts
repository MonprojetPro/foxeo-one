import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import { createElement } from 'react'
import { LabHistoryView } from './lab-history-view'
import type { ParcoursData } from './lab-history-view'

vi.mock('@foxeo/ui', () => ({
  Card: ({ children }: { children: React.ReactNode }) =>
    createElement('div', { 'data-testid': 'card' }, children),
  CardContent: ({ children }: { children: React.ReactNode }) =>
    createElement('div', { 'data-testid': 'card-content' }, children),
  CardHeader: ({ children }: { children: React.ReactNode }) =>
    createElement('div', { 'data-testid': 'card-header' }, children),
  CardTitle: ({ children }: { children: React.ReactNode }) =>
    createElement('div', { 'data-testid': 'card-title' }, children),
  Badge: ({ children }: { children: React.ReactNode }) =>
    createElement('span', { 'data-testid': 'badge' }, children),
}))

const makeParcours = (overrides: Partial<ParcoursData> = {}): ParcoursData => ({
  id: 'parcours-1',
  status: 'termine',
  startedAt: '2025-10-01T00:00:00Z',
  completedAt: '2026-01-15T00:00:00Z',
  steps: [
    {
      id: 'step-1',
      name: 'Étape 1 — Brief initial',
      completedAt: '2025-10-15T00:00:00Z',
      documentId: 'doc-1',
    },
    {
      id: 'step-2',
      name: 'Étape 2 — Modèle économique',
      completedAt: '2025-11-01T00:00:00Z',
      documentId: null,
    },
  ],
  ...overrides,
})

describe('LabHistoryView', () => {
  it('shows "no parcours" message when parcours is null', () => {
    const { container } = render(
      createElement(LabHistoryView, { parcours: null })
    )
    expect(container.textContent).toContain('Vous n\'avez pas de parcours Lab')
  })

  it('renders parcours steps when parcours is provided', () => {
    const { container } = render(
      createElement(LabHistoryView, { parcours: makeParcours() })
    )
    expect(container.textContent).toContain('Étape 1 — Brief initial')
    expect(container.textContent).toContain('Étape 2 — Modèle économique')
  })

  it('shows completed dates for each step', () => {
    const { container } = render(
      createElement(LabHistoryView, { parcours: makeParcours() })
    )
    // Should show formatted date
    expect(container.textContent).toMatch(/15|oct|2025/i)
  })

  it('shows total duration when startedAt and completedAt are present', () => {
    const { container } = render(
      createElement(LabHistoryView, { parcours: makeParcours() })
    )
    // Parcours from Oct 1 to Jan 15 = ~3.5 months
    expect(container.textContent).toMatch(/durée|mois|semaine/i)
  })

  it('renders no action buttons (read-only)', () => {
    const { container } = render(
      createElement(LabHistoryView, { parcours: makeParcours() })
    )
    // No buttons for action
    expect(container.querySelectorAll('button')).toHaveLength(0)
  })

  it('shows link to document when step has documentId', () => {
    const { container } = render(
      createElement(LabHistoryView, { parcours: makeParcours() })
    )
    // Step with documentId should show a link
    const links = container.querySelectorAll('a')
    expect(links.length).toBeGreaterThan(0)
  })

  it('does not show link when step has no documentId', () => {
    const parcours = makeParcours({
      steps: [{ id: 'step-1', name: 'Étape sans document', completedAt: '2025-11-01T00:00:00Z', documentId: null }],
    })
    const { container } = render(
      createElement(LabHistoryView, { parcours })
    )
    // No links expected for steps without documentId
    expect(container.querySelectorAll('a')).toHaveLength(0)
  })
})
