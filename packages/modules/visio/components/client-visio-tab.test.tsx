import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ClientVisioTab } from './client-visio-tab'
import type { Meeting } from '../types/meeting.types'

const mockShowSuccess = vi.fn()
const mockShowError = vi.fn()

vi.mock('@monprojetpro/ui', () => ({
  Button: ({ children, ...props }: React.ComponentProps<'button'>) => (
    <button {...props}>{children}</button>
  ),
  CockpitPanel: ({ title, children }: { title: string; children: React.ReactNode }) => (
    <section>
      <h3>{title}</h3>
      {children}
    </section>
  ),
  CockpitCallout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  EmptyRow: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  RowSkeleton: () => <div data-testid="skeleton" />,
  showSuccess: (msg: string) => mockShowSuccess(msg),
  showError: (msg: string) => mockShowError(msg),
}))

const mockGetMeetings = vi.fn()
vi.mock('../actions/get-meetings', () => ({
  getMeetings: (input: unknown) => mockGetMeetings(input),
}))

function meeting(overrides: Partial<Meeting> = {}): Meeting {
  return {
    id: '11111111-1111-1111-1111-111111111111',
    clientId: '22222222-2222-2222-2222-222222222222',
    operatorId: '33333333-3333-3333-3333-333333333333',
    title: 'Point d’avancement',
    description: null,
    scheduledAt: '2026-10-20T09:00:00.000Z',
    startedAt: null,
    endedAt: null,
    durationSeconds: null,
    meetSpaceName: 'spaces/abc',
    meetUri: 'https://meet.google.com/abc-defg-hij',
    status: 'scheduled',
    type: 'standard',
    metadata: {},
    recordingUrl: null,
    transcriptUrl: null,
    createdAt: '2026-10-11T09:00:00.000Z',
    updatedAt: '2026-10-11T09:00:00.000Z',
    ...overrides,
  }
}

function renderTab(props: Partial<React.ComponentProps<typeof ClientVisioTab>> = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const sendMeetLinkAction = props.sendMeetLinkAction ?? vi.fn()

  render(
    <QueryClientProvider client={queryClient}>
      <ClientVisioTab
        clientId="22222222-2222-2222-2222-222222222222"
        clientName="CSE Habitat 77"
        clientEmail="contact@cse77.fr"
        sendMeetLinkAction={sendMeetLinkAction}
        {...props}
      />
    </QueryClientProvider>
  )

  return { sendMeetLinkAction }
}

describe('ClientVisioTab', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetMeetings.mockResolvedValue({ data: [], error: null })
  })

  it('affiche un etat vide explicite quand le client n’a aucune visio passee', async () => {
    renderTab()

    expect(await screen.findByText(/Aucune visio passée avec ce client/i)).toBeDefined()
  })

  it('propose l’email de la fiche client comme destinataire par defaut', async () => {
    renderTab()

    await userEvent.click(await screen.findByRole('button', { name: /Envoyer un lien Google Meet/i }))

    const select = screen.getByLabelText(/Destinataire/i) as HTMLSelectElement
    expect(select.value).toBe('contact@cse77.fr')
  })

  it('propose aussi les contacts du carnet, sans doublonner l’email de la fiche', async () => {
    renderTab({
      contacts: [
        { email: 'compta@cse77.fr', label: 'Sophie (compta@cse77.fr)' },
        { email: 'CONTACT@cse77.fr', label: 'Doublon en majuscules' },
      ],
    })

    await userEvent.click(await screen.findByRole('button', { name: /Envoyer un lien Google Meet/i }))

    const options = screen.getAllByRole('option')
    expect(options).toHaveLength(2)
    expect(options.map((o) => (o as HTMLOptionElement).value)).toEqual([
      'contact@cse77.fr',
      'compta@cse77.fr',
    ])
  })

  it('envoie le lien avec le titre et le destinataire choisis', async () => {
    const sendMeetLinkAction = vi.fn().mockResolvedValue({
      data: { meetUri: 'https://meet.google.com/xyz', recipientEmail: 'contact@cse77.fr' },
      error: null,
    })
    renderTab({ sendMeetLinkAction })

    await userEvent.click(await screen.findByRole('button', { name: /Envoyer un lien Google Meet/i }))
    await userEvent.type(screen.getByLabelText(/Objet de la visio/i), 'Présentation du devis')
    await userEvent.click(screen.getByRole('button', { name: /Créer et envoyer/i }))

    await waitFor(() => {
      expect(sendMeetLinkAction).toHaveBeenCalledWith({
        clientId: '22222222-2222-2222-2222-222222222222',
        title: 'Présentation du devis',
        recipientEmail: 'contact@cse77.fr',
      })
    })
    expect(mockShowSuccess).toHaveBeenCalled()
  })

  it('remonte le message d’erreur de l’action au lieu de le taire', async () => {
    const sendMeetLinkAction = vi.fn().mockResolvedValue({
      data: null,
      error: { message: 'Impossible de créer la salle Google Meet', code: 'GOOGLE_MEET_ERROR' },
    })
    renderTab({ sendMeetLinkAction })

    await userEvent.click(await screen.findByRole('button', { name: /Envoyer un lien Google Meet/i }))
    await userEvent.type(screen.getByLabelText(/Objet de la visio/i), 'Essai')
    await userEvent.click(screen.getByRole('button', { name: /Créer et envoyer/i }))

    await waitFor(() => {
      expect(mockShowError).toHaveBeenCalledWith('Impossible de créer la salle Google Meet')
    })
    expect(mockShowSuccess).not.toHaveBeenCalled()
  })

  // VERROU DU DÉFAUT TROUVÉ EN REVUE : le destinataire était figé au premier
  // rendu. Les contacts du carnet arrivant d'une requête, un client sans email
  // de fiche restait avec un destinataire vide — bouton grisé, sans explication,
  // alors que le menu affichait pourtant une adresse.
  it('prend en compte un contact arrive APRES le premier affichage', async () => {
    const sendMeetLinkAction = vi.fn().mockResolvedValue({
      data: { meetUri: 'https://meet.google.com/xyz', recipientEmail: 'compta@cse77.fr' },
      error: null,
    })
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })

    const { rerender } = render(
      <QueryClientProvider client={queryClient}>
        <ClientVisioTab
          clientId="22222222-2222-2222-2222-222222222222"
          clientName="CSE Habitat 77"
          clientEmail={null}
          contacts={[]}
          contactsLoading
          sendMeetLinkAction={sendMeetLinkAction}
        />
      </QueryClientProvider>
    )

    // Pendant le chargement du carnet, on ne prétend PAS qu'il n'y a aucune adresse.
    expect(screen.queryByText(/aucune adresse email/i)).toBeNull()

    rerender(
      <QueryClientProvider client={queryClient}>
        <ClientVisioTab
          clientId="22222222-2222-2222-2222-222222222222"
          clientName="CSE Habitat 77"
          clientEmail={null}
          contacts={[{ email: 'compta@cse77.fr', label: 'Sophie (compta@cse77.fr)' }]}
          contactsLoading={false}
          sendMeetLinkAction={sendMeetLinkAction}
        />
      </QueryClientProvider>
    )

    await userEvent.click(screen.getByRole('button', { name: /Envoyer un lien Google Meet/i }))
    await userEvent.type(screen.getByLabelText(/Objet de la visio/i), 'Essai')
    await userEvent.click(screen.getByRole('button', { name: /Créer et envoyer/i }))

    await waitFor(() => {
      expect(sendMeetLinkAction).toHaveBeenCalledWith(
        expect.objectContaining({ recipientEmail: 'compta@cse77.fr' })
      )
    })
  })

  it('bloque l’envoi et l’explique quand le client n’a aucune adresse email', async () => {
    renderTab({ clientEmail: null, contacts: [] })

    expect(await screen.findByText(/n'a aucune adresse email|n’a aucune adresse email/i)).toBeDefined()
    expect(
      (screen.getByRole('button', { name: /Envoyer un lien Google Meet/i }) as HTMLButtonElement)
        .disabled
    ).toBe(true)
  })

  it('affiche le lien de la visio, son enregistrement et sa transcription dans l’historique', async () => {
    mockGetMeetings.mockResolvedValue({
      data: [
        meeting({
          status: 'completed',
          endedAt: '2026-10-05T10:30:00.000Z',
          durationSeconds: 2700,
          recordingUrl: 'https://drive.google.com/rec',
          transcriptUrl: 'https://docs.google.com/doc',
        }),
      ],
      error: null,
    })

    renderTab()

    expect(await screen.findByRole('link', { name: /Rejoindre/i })).toBeDefined()
    expect(screen.getByRole('link', { name: /Enregistrement/i })).toBeDefined()
    expect(screen.getByRole('link', { name: /Transcription/i })).toBeDefined()
    expect(screen.getByText(/45 min/)).toBeDefined()
  })
})
