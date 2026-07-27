import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ClientCockpitTab } from './client-cockpit-tab'

const CLIENT_ID = '550e8400-e29b-41d4-a716-446655440001'
const mockNavigate = vi.fn()
const mockRouterPush = vi.fn()

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: mockRouterPush }) }))

const defaultConfig = () => ({
  dashboardType: 'lab',
  labModeAvailable: true,
  elioLabEnabled: true,
  oneModeAvailable: false,
  activeModules: [] as string[],
  subscriptionTier: 'ponctuel',
})

const clientData = {
  id: CLIENT_ID,
  name: 'Jean Test',
  company: 'Test SARL',
  email: 'jean@test.fr',
  phone: '0600000000',
  sector: 'Tech',
  status: 'active',
  clientType: 'lab',
  createdAt: '2026-01-01T00:00:00.000Z',
  config: defaultConfig(),
}

// État configurable par test
const state: {
  parcours: unknown
  pending: { count: number }
  activity: unknown
  instance: unknown
  toolTracking: unknown
} = {
  parcours: null,
  pending: { count: 0 },
  activity: { firstLoginAt: '2026-01-02T00:00:00Z', lastActivityAt: '2026-06-19T00:00:00Z', daysSinceActivity: 1, isInactive: false },
  instance: null,
  toolTracking: { postCount: 0, clientCommentCount: 0, lastActivityAt: null },
}

vi.mock('../hooks/use-client', () => ({ useClient: () => ({ data: clientData }) }))
vi.mock('../hooks/use-client-parcours', () => ({ useClientParcours: () => ({ data: state.parcours }) }))
vi.mock('../hooks/use-client-pending-validations', () => ({ useClientPendingValidations: () => ({ data: state.pending }) }))
vi.mock('../hooks/use-client-activity-snapshot', () => ({ useClientActivitySnapshot: () => ({ data: state.activity }) }))
vi.mock('../hooks/use-client-instance', () => ({ useClientInstance: () => ({ data: state.instance }) }))
vi.mock('../hooks/use-client-tab-nav', () => ({ useClientTabNav: () => ({ activeTab: 'pilote', navigateToTab: mockNavigate }) }))
vi.mock('../hooks/use-client-cockpit-realtime', () => ({ useClientCockpitRealtime: () => {} }))
vi.mock('../hooks/use-client-tool-tracking-summary', () => ({ useClientToolTrackingSummary: () => ({ data: state.toolTracking, isLoading: false }) }))

// Enfants avec hooks propres → stubs
vi.mock('./access-toggles', () => ({ AccessToggles: () => <div data-testid="access-toggles-stub" /> }))
vi.mock('./one-access-toggle', () => ({ OneAccessToggle: () => <div data-testid="one-access-toggle-stub" /> }))
vi.mock('./parcours-mode-selector', () => ({ ParcoursModeSelector: () => <div data-testid="parcours-mode-selector-stub" /> }))
vi.mock('./graduation-dialog', () => ({ GraduationDialog: () => <div data-testid="graduation-dialog-stub" /> }))
vi.mock('./client-notes-section', () => ({ ClientNotesSection: () => <div data-testid="notes-stub" /> }))

const parcoursEnCours = {
  status: 'en_cours',
  activeStages: [
    { key: 'id-1', label: 'Élio Vision', active: true, status: 'completed' },
    { key: 'id-2', label: 'Élio Cible', active: true, status: 'in_progress' },
  ],
}

describe('ClientCockpitTab', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    clientData.config = defaultConfig()
    clientData.status = 'active'
    state.parcours = null
    state.pending = { count: 0 }
    state.activity = { firstLoginAt: '2026-01-02T00:00:00Z', lastActivityAt: '2026-06-19T00:00:00Z', daysSinceActivity: 1, isInactive: false }
    state.instance = null
    state.toolTracking = { postCount: 0, clientCommentCount: 0, lastActivityAt: null }
  })

  it('montre « Rien à traiter » quand aucune tâche', () => {
    render(<ClientCockpitTab clientId={CLIENT_ID} />)
    expect(screen.getByText(/Rien à traiter/i)).toBeInTheDocument()
  })

  it('liste les validations en attente et navigue au clic', async () => {
    state.pending = { count: 3 }
    const user = userEvent.setup()
    render(<ClientCockpitTab clientId={CLIENT_ID} />)

    const row = screen.getByText(/Validation\(s\) en attente/i)
    expect(row).toBeInTheDocument()
    await user.click(row)
    expect(mockNavigate).toHaveBeenCalledWith('submissions')
  })

  it('compte le support quand fourni par le parent', () => {
    render(<ClientCockpitTab clientId={CLIENT_ID} supportOpenCount={2} />)
    expect(screen.getByText(/Ticket\(s\) support ouvert/i)).toBeInTheDocument()
  })

  it('affiche l\'alerte d\'inactivité au-delà du seuil', () => {
    state.activity = { firstLoginAt: '2026-01-02T00:00:00Z', lastActivityAt: '2026-05-01T00:00:00Z', daysSinceActivity: 20, isInactive: true }
    render(<ClientCockpitTab clientId={CLIENT_ID} />)
    expect(screen.getByText(/Inactif depuis 20 jours/i)).toBeInTheDocument()
  })

  it('affiche la progression du parcours avec le vrai libellé d\'étape', () => {
    state.parcours = parcoursEnCours
    render(<ClientCockpitTab clientId={CLIENT_ID} />)
    expect(screen.getByText(/1 \/ 2 \(50%\)/)).toBeInTheDocument()
    expect(screen.getByText('Élio Cible')).toBeInTheDocument()
  })

  it('propose la graduation pour un client Lab avec parcours', () => {
    state.parcours = parcoursEnCours
    render(<ClientCockpitTab clientId={CLIENT_ID} />)
    expect(screen.getByTestId('cockpit-graduate-button')).toBeInTheDocument()
  })

  it('affiche « Accès One fermé » quand le One n\'est pas ouvert (avec le toggle)', () => {
    render(<ClientCockpitTab clientId={CLIENT_ID} />)
    expect(screen.getByText(/Accès One fermé/i)).toBeInTheDocument()
    expect(screen.getByTestId('one-access-toggle-stub')).toBeInTheDocument()
  })

  it('affiche le statut Ouvert + modules actifs quand le One est ouvert', () => {
    clientData.config = { ...defaultConfig(), oneModeAvailable: true, activeModules: ['core-dashboard', 'documents'] }
    render(<ClientCockpitTab clientId={CLIENT_ID} />)
    expect(screen.getByText('Ouvert')).toBeInTheDocument()
    expect(screen.getByText('Modules actifs')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
  })

  it('ne mentionne l\'instance dédiée que si elle existe (kit de sortie)', () => {
    const { unmount } = render(<ClientCockpitTab clientId={CLIENT_ID} />)
    expect(screen.queryByText(/Instance dédiée/i)).not.toBeInTheDocument()
    unmount()

    state.instance = { status: 'transferred', instanceUrl: 'https://client-sorti.example.com', activeModules: [] }
    render(<ClientCockpitTab clientId={CLIENT_ID} />)
    expect(screen.getByText(/Instance dédiée/i)).toBeInTheDocument()
  })

  it('affiche les notes privées (rapatriées dans le cockpit)', () => {
    render(<ClientCockpitTab clientId={CLIENT_ID} />)
    expect(screen.getByTestId('notes-stub')).toBeInTheDocument()
  })

  describe('client résilié (subscription_cancelled) — non-régression indicateurs figés', () => {
    beforeEach(() => {
      clientData.status = 'subscription_cancelled'
    })

    it('badge Progression = « Arrêté », jamais le statut brut du parcours (en_cours)', () => {
      state.parcours = parcoursEnCours
      render(<ClientCockpitTab clientId={CLIENT_ID} />)
      expect(screen.getByTestId('parcours-frozen-badge').textContent).toBe('Arrêté')
      expect(screen.queryByText('En cours')).not.toBeInTheDocument()
    })

    it('masque « Étape en cours » et garde le chiffre de progression', () => {
      state.parcours = parcoursEnCours
      render(<ClientCockpitTab clientId={CLIENT_ID} />)
      expect(screen.getByText(/1 \/ 2 \(50%\)/)).toBeInTheDocument()
      expect(screen.queryByText(/Etape en cours/i)).not.toBeInTheDocument()
      expect(screen.getByText(/Parcours arrêté — abonnement résilié/)).toBeInTheDocument()
    })

    it('ne propose plus la graduation vers One', () => {
      state.parcours = parcoursEnCours
      render(<ClientCockpitTab clientId={CLIENT_ID} />)
      expect(screen.queryByTestId('cockpit-graduate-button')).not.toBeInTheDocument()
    })

    it('statut Dashboard One = « Figé » (ambre) au lieu de « Ouvert » (vert)', () => {
      clientData.config = { ...defaultConfig(), oneModeAvailable: true, activeModules: ['core-dashboard'] }
      render(<ClientCockpitTab clientId={CLIENT_ID} />)
      expect(screen.getByText('Figé')).toBeInTheDocument()
      expect(screen.queryByText('Ouvert')).not.toBeInTheDocument()
    })
  })
})
