import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ParcoursStepDetail } from './parcours-step-detail'
import type { ParcoursStep } from '../types/parcours.types'

vi.mock('./step-elio-chat', () => ({
  StepElioChat: () => <div data-testid="step-elio-chat">StepElioChat</div>,
}))
vi.mock('./generate-document-button', () => ({
  GenerateDocumentButton: () => <div data-testid="generate-document-button">GenerateDocumentButton</div>,
}))
vi.mock('./step-history-panel', () => ({
  StepHistoryPanel: () => <div data-testid="step-history-panel">StepHistoryPanel</div>,
}))
// Hook Realtime testé isolément (use-step-realtime-refresh.test.ts) — no-op ici pour éviter
// d'avoir à monter un app-router + QueryClientProvider dans ce test de composant.
vi.mock('../hooks/use-step-realtime-refresh', () => ({
  useStepRealtimeRefresh: () => {},
}))
vi.mock('./step-mobile-tabs', () => ({
  StepMobileTabs: ({ activeTab, onTabChange }: { activeTab: string; onTabChange: (t: string) => void }) => (
    <div data-testid="step-mobile-tabs" data-active-tab={activeTab}>
      <button onClick={() => onTabChange('step')}>Étape</button>
      <button onClick={() => onTabChange('history')}>Historique</button>
    </div>
  ),
}))
vi.mock('react-markdown', () => ({
  default: ({ children }: { children: string }) => <div data-testid="markdown-content">{children}</div>,
}))
vi.mock('remark-gfm', () => ({ default: () => {} }))
vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode; [key: string]: unknown }) => (
    <a href={href} {...props}>{children}</a>
  ),
}))
const mockUseClientReadOnly = vi.hoisted(() => vi.fn(() => false))

vi.mock('@monprojetpro/ui', () => ({
  Button: ({ children, disabled, variant, size, ...props }: { children: React.ReactNode; disabled?: boolean; variant?: string; size?: string; [key: string]: unknown }) => (
    <button disabled={disabled} data-variant={variant} data-size={size} {...props}>{children}</button>
  ),
  useClientReadOnly: () => mockUseClientReadOnly(),
}))

const baseStep: ParcoursStep = {
  id: '00000000-0000-0000-0000-000000000010',
  parcoursId: '00000000-0000-0000-0000-000000000001',
  stepNumber: 2,
  title: 'Valider mon concept',
  description: 'Décrivez et validez votre concept auprès de MiKL.',
  briefTemplate: null,
  briefContent: '## Mon brief\n\nContenu markdown.',
  briefAssets: [],
  oneTeasingMessage: 'Dans One, cela sera automatisé.',
  status: 'current',
  completedAt: null,
  validationRequired: true,
  validationId: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

describe('ParcoursStepDetail', () => {
  it('renders breadcrumb with step title', () => {
    render(<ParcoursStepDetail step={baseStep} totalSteps={5} />)
    expect(screen.getByText(/Mon Parcours/)).toBeDefined()
    expect(screen.getByText(/Étape 2 : Valider mon concept/)).toBeDefined()
  })

  it('renders step title and number', () => {
    render(<ParcoursStepDetail step={baseStep} totalSteps={5} />)
    expect(screen.getByText('02')).toBeDefined()
    expect(screen.getByText('Valider mon concept')).toBeDefined()
  })

  it('renders "Pourquoi cette étape ?" section', () => {
    render(<ParcoursStepDetail step={baseStep} totalSteps={5} />)
    expect(screen.getByText('Pourquoi cette étape ?')).toBeDefined()
  })

  it('renders brief content with markdown renderer', () => {
    render(<ParcoursStepDetail step={baseStep} totalSteps={5} />)
    expect(screen.getByText('Votre brief')).toBeDefined()
    expect(screen.getByTestId('markdown-content')).toBeDefined()
  })

  it('renders StepElioChat when clientId is provided', () => {
    render(<ParcoursStepDetail step={baseStep} totalSteps={5} clientId="client-001" />)
    expect(screen.getByTestId('step-elio-chat')).toBeDefined()
  })

  it('does not render StepElioChat when clientId is absent', () => {
    render(<ParcoursStepDetail step={baseStep} totalSteps={5} />)
    expect(screen.queryByTestId('step-elio-chat')).toBeNull()
  })

  it('renders GenerateDocumentButton for current step with clientId', () => {
    render(<ParcoursStepDetail step={baseStep} totalSteps={5} clientId="client-001" />)
    expect(screen.getByTestId('generate-document-button')).toBeDefined()
  })

  it('does not render GenerateDocumentButton for pending_review step (MiKL examine, pas de resoumission tant que pending)', () => {
    const pendingStep = { ...baseStep, status: 'pending_review' as const }
    render(<ParcoursStepDetail step={pendingStep} totalSteps={5} clientId="client-001" />)
    expect(screen.queryByTestId('generate-document-button')).toBeNull()
  })

  it('renders GenerateDocumentButton for rejected step (client doit pouvoir corriger et resoumettre)', () => {
    const rejectedStep = { ...baseStep, status: 'rejected' as const }
    render(<ParcoursStepDetail step={rejectedStep} totalSteps={5} clientId="client-001" />)
    expect(screen.getByTestId('generate-document-button')).toBeDefined()
  })

  it('does not render GenerateDocumentButton for locked step', () => {
    const lockedStep = { ...baseStep, status: 'locked' as const }
    render(<ParcoursStepDetail step={lockedStep} totalSteps={5} clientId="client-001" />)
    expect(screen.queryByTestId('generate-document-button')).toBeNull()
  })

  it('does not render GenerateDocumentButton for completed step', () => {
    const completedStep = { ...baseStep, status: 'completed' as const }
    render(<ParcoursStepDetail step={completedStep} totalSteps={5} clientId="client-001" />)
    expect(screen.queryByTestId('generate-document-button')).toBeNull()
  })

  it('renders "Voir ma soumission" for completed step', () => {
    const completed = { ...baseStep, status: 'completed' as const }
    render(<ParcoursStepDetail step={completed} totalSteps={5} />)
    expect(screen.getByText('Voir ma soumission')).toBeDefined()
  })

  it('does not render "Voir ma soumission" for current step', () => {
    render(<ParcoursStepDetail step={baseStep} totalSteps={5} />)
    expect(screen.queryByText('Voir ma soumission')).toBeNull()
  })

  it('does not render "Voir ma soumission" for locked step', () => {
    const lockedStep = { ...baseStep, status: 'locked' as const }
    render(<ParcoursStepDetail step={lockedStep} totalSteps={5} />)
    expect(screen.queryByText('Voir ma soumission')).toBeNull()
  })

  it('renders StepHistoryPanel', () => {
    render(<ParcoursStepDetail step={baseStep} totalSteps={5} />)
    expect(screen.getByTestId('step-history-panel')).toBeDefined()
  })

  it('renders StepMobileTabs', () => {
    render(<ParcoursStepDetail step={baseStep} totalSteps={5} />)
    expect(screen.getByTestId('step-mobile-tabs')).toBeDefined()
  })

  it('falls back to briefTemplate when briefContent is null', () => {
    const stepNoContent = { ...baseStep, briefContent: null, briefTemplate: 'Template texte' }
    render(<ParcoursStepDetail step={stepNoContent} totalSteps={5} />)
    expect(screen.getByText('Template texte')).toBeDefined()
  })

  it('renders status badge', () => {
    render(<ParcoursStepDetail step={baseStep} totalSteps={5} />)
    expect(screen.getByText('En cours')).toBeDefined()
  })

  it('StepMobileTabs switches to history tab and StepHistoryPanel remains in DOM', () => {
    render(<ParcoursStepDetail step={baseStep} totalSteps={5} />)
    fireEvent.click(screen.getByText('Historique'))
    expect(screen.getByTestId('step-history-panel')).toBeDefined()
  })

  it('StepMobileTabs switches back to step tab', () => {
    render(<ParcoursStepDetail step={baseStep} totalSteps={5} />)
    fireEvent.click(screen.getByText('Historique'))
    fireEvent.click(screen.getByText('Étape'))
    expect(screen.getByText('Pourquoi cette étape ?')).toBeDefined()
  })

  // Espace figé — abonnement terminé : l'étape reste consultable, sans aucune invitation à agir.
  describe('parcours arrêté (abonnement terminé)', () => {
    afterEach(() => mockUseClientReadOnly.mockReturnValue(false))

    it('affiche le bandeau « parcours arrêté » et masque le bouton Générer', () => {
      mockUseClientReadOnly.mockReturnValue(true)
      const { container } = render(<ParcoursStepDetail step={baseStep} totalSteps={5} clientId="client-1" />)

      expect(container.textContent).toContain("ton parcours s'est arrêté ici")
      expect(screen.queryByTestId('generate-document-button')).toBeNull()
    })

    it('ne demande plus de corriger une étape refusée', () => {
      mockUseClientReadOnly.mockReturnValue(true)
      const rejected = { ...baseStep, status: 'rejected' as const }
      const { container } = render(<ParcoursStepDetail step={rejected} totalSteps={5} clientId="client-1" />)

      expect(container.textContent).not.toContain('régénère ton document')
    })

    it('ne renvoie plus vers l\'étape suivante sur une étape validée', () => {
      mockUseClientReadOnly.mockReturnValue(true)
      const completed = { ...baseStep, status: 'completed' as const }
      const { container } = render(<ParcoursStepDetail step={completed} totalSteps={5} clientId="client-1" />)

      expect(container.textContent).toContain('Cette étape a été validée par MiKL')
      expect(container.textContent).not.toContain("Passez à l'étape")
    })

    it('neutralise le badge de statut « En cours »', () => {
      mockUseClientReadOnly.mockReturnValue(true)
      const { container } = render(<ParcoursStepDetail step={baseStep} totalSteps={5} clientId="client-1" />)

      expect(container.textContent).toContain('Parcours arrêté')
      expect(container.textContent).not.toContain('En cours')
    })

    it('laisse le bouton Générer pour un client actif', () => {
      mockUseClientReadOnly.mockReturnValue(false)
      render(<ParcoursStepDetail step={baseStep} totalSteps={5} clientId="client-1" />)
      expect(screen.getByTestId('generate-document-button')).toBeDefined()
    })
  })
})
