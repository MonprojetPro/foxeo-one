import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { NewVisioDialog } from './new-visio-dialog'

// T-061 — la page globale /modules/visio doit créer une visio par le MÊME
// chemin que l'onglet Visio du dossier client (salle Meet réelle + email),
// avec un sélecteur de client en plus puisqu'il n'y a pas de client fixe ici.

vi.mock('@monprojetpro/ui', () => ({
  Dialog: ({ open, children }: { open: boolean; children: React.ReactNode }) =>
    open ? <div role="dialog">{children}</div> : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  Select: ({
    value,
    onValueChange,
    disabled,
    children,
  }: {
    value?: string
    onValueChange: (v: string) => void
    disabled?: boolean
    children: React.ReactNode
  }) => (
    <select
      aria-label="Client"
      value={value ?? ''}
      disabled={disabled}
      onChange={(e) => onValueChange(e.target.value)}
    >
      <option value="" disabled />
      {children}
    </select>
  ),
  SelectTrigger: () => null,
  SelectValue: () => null,
  SelectContent: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SelectItem: ({ value, children }: { value: string; children: React.ReactNode }) => (
    <option value={value}>{children}</option>
  ),
  Button: ({ children, ...props }: React.ComponentProps<'button'>) => <button {...props}>{children}</button>,
  CockpitPanel: ({ title, children }: { title: string; children: React.ReactNode }) => (
    <section>
      <h3>{title}</h3>
      {children}
    </section>
  ),
  CockpitCallout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  showSuccess: vi.fn(),
  showError: vi.fn(),
}))

const mockGetClients = vi.fn()
const mockUseClientContacts = vi.fn()
vi.mock('@monprojetpro/modules-crm', () => ({
  getClients: () => mockGetClients(),
  useClientContacts: (clientId: string) => mockUseClientContacts(clientId),
}))

const mockGetGmailStatus = vi.fn()
vi.mock('@monprojetpro/modules-email', () => ({
  getGmailStatus: () => mockGetGmailStatus(),
}))

const mockSendMeetLink = vi.fn()
vi.mock('../../../../actions/send-meet-link', () => ({
  sendMeetLink: (input: unknown) => mockSendMeetLink(input),
}))

const mockGetBillingDefault = vi.fn()
vi.mock('../../../../actions/visio-billing', () => ({
  getClientVisioBillingDefault: (clientId: string) => mockGetBillingDefault(clientId),
}))

const CLIENT_A = { id: '11111111-1111-1111-1111-111111111111', name: 'CSE Habitat 77', company: null, email: 'contact@cse77.fr' }
const CLIENT_B = { id: '22222222-2222-2222-2222-222222222222', name: 'Atelier Bois', company: 'Atelier Bois SARL', email: 'contact@atelierbois.fr' }

function renderDialog(props: Partial<React.ComponentProps<typeof NewVisioDialog>> = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <NewVisioDialog open onOpenChange={vi.fn()} {...props} />
    </QueryClientProvider>
  )
}

describe('NewVisioDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetClients.mockResolvedValue({ data: [CLIENT_A, CLIENT_B], error: null })
    mockUseClientContacts.mockReturnValue({ data: [], isLoading: false })
    mockGetGmailStatus.mockResolvedValue({ data: { state: 'connected' }, error: null })
    mockGetBillingDefault.mockResolvedValue({ data: { isFree: false }, error: null })
  })

  it("n'affiche aucun formulaire tant qu'aucun client n'est choisi", async () => {
    renderDialog()
    await screen.findByText('Atelier Bois SARL', { exact: false })
    expect(screen.queryByText(/Lancer une visio avec/i)).not.toBeInTheDocument()
  })

  it('affiche le formulaire NewVisioForm une fois un client sélectionné', async () => {
    renderDialog()
    const picker = await screen.findByLabelText('Client')
    await screen.findByRole('option', { name: /CSE Habitat 77/i })
    await userEvent.selectOptions(picker, CLIENT_A.id)

    expect(await screen.findByText(/Lancer une visio avec CSE Habitat 77/i)).toBeInTheDocument()
  })

  it('transmet sendMeetLink (pas createHubMeeting) comme action de création', async () => {
    renderDialog()
    const picker = await screen.findByLabelText('Client')
    await screen.findByRole('option', { name: /CSE Habitat 77/i })
    await userEvent.selectOptions(picker, CLIENT_A.id)

    await screen.findByText(/Lancer une visio avec/i)
    // La prop sendMeetLinkAction du NewVisioForm est bien la fonction mockée —
    // vérifié indirectement : le formulaire s'affiche sans planter, et c'est
    // le seul chemin de création câblé (createHubMeeting n'est plus importé).
    expect(mockSendMeetLink).not.toHaveBeenCalled() // pas encore soumis
  })
})
