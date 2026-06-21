import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ClientCockpitTab } from './client-cockpit-tab'

const CLIENT_ID = '550e8400-e29b-41d4-a716-446655440001'
const mockNavigate = vi.fn()

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
  config: { dashboardType: 'lab', labModeAvailable: true, elioLabEnabled: true, oneModeAvailable: false, subscriptionTier: 'base' },
}

// État configurable par test
const state: {
  parcours: unknown
  pending: { count: number }
  activity: unknown
  instance: unknown
} = {
  parcours: null,
  pending: { count: 0 },
  activity: { firstLoginAt: '2026-01-02T00:00:00Z', lastActivityAt: '2026-06-19T00:00:00Z', daysSinceActivity: 1, isInactive: false },
  instance: null,
}

vi.mock('../hooks/use-client', () => ({ useClient: () => ({ data: clientData }) }))
vi.mock('../hooks/use-client-parcours', () => ({ useClientParcours: () => ({ data: state.parcours }) }))
vi.mock('../hooks/use-client-pending-validations', () => ({ useClientPendingValidations: () => ({ data: state.pending }) }))
vi.mock('../hooks/use-client-activity-snapshot', () => ({ useClientActivitySnapshot: () => ({ data: state.activity }) }))
vi.mock('../hooks/use-client-instance', () => ({ useClientInstance: () => ({ data: state.instance }) }))
vi.mock('../hooks/use-client-tab-nav', () => ({ useClientTabNav: () => ({ activeTab: 'pilote', navigateToTab: mockNavigate }) }))
vi.mock('../hooks/use-client-cockpit-realtime', () => ({ useClientCockpitRealtime: () => {} }))

// Enfants avec hooks propres → stubs
vi.mock('./access-toggles', () => ({ AccessToggles: () => <div data-testid="access-toggles-stub" /> }))
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
    state.parcours = null
    state.pending = { count: 0 }
    state.activity = { firstLoginAt: '2026-01-02T00:00:00Z', lastActivityAt: '2026-06-19T00:00:00Z', daysSinceActivity: 1, isInactive: false }
    state.instance = null
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

  it('affiche « pas encore d\'instance One » sans instance', () => {
    render(<ClientCockpitTab clientId={CLIENT_ID} />)
    expect(screen.getByText(/Pas encore d'instance One/i)).toBeInTheDocument()
  })

  it('affiche les notes privées (rapatriées dans le cockpit)', () => {
    render(<ClientCockpitTab clientId={CLIENT_ID} />)
    expect(screen.getByTestId('notes-stub')).toBeInTheDocument()
  })
})
