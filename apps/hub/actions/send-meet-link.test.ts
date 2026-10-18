import { describe, it, expect, vi, beforeEach } from 'vitest'

const testAuthUserId = '550e8400-e29b-41d4-a716-446655440000'
const testOperatorId = '550e8400-e29b-41d4-a716-446655440099'
const testClientId = '550e8400-e29b-41d4-a716-446655440011'

const mockGetUser = vi.fn()
const mockMaybeSingle = vi.fn()
/**
 * `.eq()` doit servir DEUX usages : terminé par `.maybeSingle()` (opérateur,
 * client) et attendu directement (liste des contacts). On rend donc un objet à
 * la fois « thenable » et porteur de `maybeSingle`.
 */
const mockContactRows = vi.fn<() => { data: { email: string | null }[] | null }>()
const mockEq = vi.fn(() => ({
  maybeSingle: mockMaybeSingle,
  then: (resolve: (v: unknown) => unknown) => Promise.resolve(mockContactRows()).then(resolve),
}))
const mockSelect = vi.fn(() => ({ eq: mockEq }))
// La trace du premier envoi (T-056) écrit dans `meetings` : sans `update` dans
// le mock, l'action partait en « erreur inattendue » et les tests de succès
// échouaient — pour une raison qui n'avait rien à voir avec ce qu'ils testent.
const mockUpdateEq = vi.fn(() => Promise.resolve({ error: null }))
const mockUpdate = vi.fn(() => ({ eq: mockUpdateEq }))
const mockFrom = vi.fn(() => ({ select: mockSelect, update: mockUpdate }))

vi.mock('@monprojetpro/supabase', () => ({
  createServerSupabaseClient: vi.fn(() => ({
    from: mockFrom,
    auth: { getUser: mockGetUser },
  })),
}))

const mockCreateMeeting = vi.fn()
vi.mock('@monprojetpro/module-visio', () => ({
  createMeeting: (input: unknown) => mockCreateMeeting(input),
}))

const mockSendEmail = vi.fn()
vi.mock('@monprojetpro/modules-email', () => ({
  sendEmail: (input: unknown) => mockSendEmail(input),
}))

// Le mapping spaceRes.data -> { meetSpaceName, meetUri } est teste directement
// dans google-meet-client.test.ts (brique partagee, T-049). Ici on ne mocke
// que le resultat de `createGoogleMeetSpace`, pour tester sendMeetLink seul.
const mockCreateGoogleMeetSpace = vi.fn()
vi.mock('../lib/google-meet-client', () => ({
  createGoogleMeetSpace: () => mockCreateGoogleMeetSpace(),
}))

const validInput = {
  clientId: testClientId,
  title: 'Point d’avancement',
  recipientEmail: 'contact@cse77.fr',
}

/** Opérateur trouvé, puis client trouvé — l'ordre des deux `maybeSingle`. */
function mockOperatorThenClient() {
  mockMaybeSingle
    .mockResolvedValueOnce({ data: { id: testOperatorId }, error: null })
    .mockResolvedValueOnce({
      data: {
        id: testClientId,
        name: 'CSE Habitat 77',
        company: 'CSE Habitat 77',
        email: 'contact@cse77.fr',
      },
      error: null,
    })
}

describe('sendMeetLink Server Action', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({ data: { user: { id: testAuthUserId } }, error: null })
    mockCreateGoogleMeetSpace.mockResolvedValue({
      meetSpaceName: 'spaces/abc',
      meetUri: 'https://meet.google.com/abc-defg-hij',
    })
    mockCreateMeeting.mockResolvedValue({
      data: { id: 'meeting-1', title: 'Point d’avancement' },
      error: null,
    })
    mockSendEmail.mockResolvedValue({ data: undefined, error: null })
    mockContactRows.mockReturnValue({ data: [] })
  })

  it('refuse un utilisateur non authentifié', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'no session' } })

    const { sendMeetLink } = await import('./send-meet-link')
    const result = await sendMeetLink(validInput)

    expect(result.error?.code).toBe('UNAUTHORIZED')
  })

  it('refuse un compte qui n’est pas opérateur', async () => {
    mockMaybeSingle.mockResolvedValueOnce({ data: null, error: null })

    const { sendMeetLink } = await import('./send-meet-link')
    const result = await sendMeetLink(validInput)

    expect(result.error?.code).toBe('FORBIDDEN')
  })

  it('cree la salle, le rendez-vous, puis envoie l’email au destinataire', async () => {
    mockOperatorThenClient()

    const { sendMeetLink } = await import('./send-meet-link')
    const result = await sendMeetLink(validInput)

    expect(result.error).toBeNull()
    expect(result.data?.meetUri).toBe('https://meet.google.com/abc-defg-hij')
    expect(mockCreateMeeting).toHaveBeenCalledWith(
      expect.objectContaining({
        clientId: testClientId,
        operatorId: testOperatorId,
        meetUri: 'https://meet.google.com/abc-defg-hij',
        meetSpaceName: 'spaces/abc',
      })
    )
    expect(mockSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'contact@cse77.fr' })
    )
    // Le lien doit figurer dans le corps : un email d'invitation sans lien
    // serait une coquille vide.
    expect(mockSendEmail.mock.calls[0]?.[0].body).toContain('https://meet.google.com/abc-defg-hij')
  })

  // T-056 : si le PREMIER envoi ne laissait pas de trace, l'écran dirait
  // « jamais envoyé » sur un lien déjà parti, et le compteur démarrerait faux.
  it('enregistre la trace du PREMIER envoi', async () => {
    mockOperatorThenClient()

    const { sendMeetLink } = await import('./send-meet-link')
    await sendMeetLink(validInput)

    const trace = mockUpdate.mock.calls[0]?.[0] as Record<string, unknown>
    expect(trace.invite_sent_count).toBe(1)
    expect(trace.invite_last_sent_to).toBe('contact@cse77.fr')
    expect(typeof trace.invite_last_sent_at).toBe('string')
  })

  it('envoie une version HTML en plus du texte', async () => {
    mockOperatorThenClient()

    const { sendMeetLink } = await import('./send-meet-link')
    await sendMeetLink(validInput)

    const sent = mockSendEmail.mock.calls[0]?.[0]
    expect(sent.html).toContain('https://meet.google.com/abc-defg-hij')
    // Le texte reste présent : on n'envoie jamais de l'HTML seul.
    expect(sent.body).toBeTruthy()
  })

  it('ARRETE TOUT si Google Meet echoue — aucun rendez-vous, aucun email', async () => {
    mockOperatorThenClient()
    mockCreateGoogleMeetSpace.mockRejectedValue(new Error('invalid_grant'))

    const { sendMeetLink } = await import('./send-meet-link')
    const result = await sendMeetLink(validInput)

    expect(result.error?.code).toBe('GOOGLE_MEET_ERROR')
    expect(mockCreateMeeting).not.toHaveBeenCalled()
    expect(mockSendEmail).not.toHaveBeenCalled()
  })

  it('ARRETE TOUT si Google repond sans lien de visio', async () => {
    mockOperatorThenClient()
    mockCreateGoogleMeetSpace.mockResolvedValue({ meetSpaceName: 'spaces/abc' })

    const { sendMeetLink } = await import('./send-meet-link')
    const result = await sendMeetLink(validInput)

    expect(result.error?.code).toBe('GOOGLE_MEET_ERROR')
    expect(mockCreateMeeting).not.toHaveBeenCalled()
    expect(mockSendEmail).not.toHaveBeenCalled()
  })

  it('dit clairement que l’email n’est pas parti, sans pretendre a un succes', async () => {
    mockOperatorThenClient()
    mockSendEmail.mockResolvedValue({
      data: null,
      error: { message: 'Gmail non connecté', code: 'AUTH_ERROR' },
    })

    const { sendMeetLink } = await import('./send-meet-link')
    const result = await sendMeetLink(validInput)

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('EMAIL_ERROR')
    expect(result.error?.message).toContain('Gmail non connecté')
    // Le rendez-vous, lui, a bien été créé : on ne le détruit pas.
    expect(mockCreateMeeting).toHaveBeenCalled()
  })

  // 🐕‍🦺 GARDE CERBÈRE : sans elle, le Hub serait un relais capable d'envoyer un
  // email à n'importe quelle adresse depuis la boîte Gmail de MonprojetPro.
  it('REFUSE une adresse qui n’appartient pas au client', async () => {
    mockOperatorThenClient()

    const { sendMeetLink } = await import('./send-meet-link')
    const result = await sendMeetLink({ ...validInput, recipientEmail: 'inconnu@ailleurs.com' })

    expect(result.error?.code).toBe('RECIPIENT_NOT_ALLOWED')
    expect(mockCreateMeeting).not.toHaveBeenCalled()
    expect(mockSendEmail).not.toHaveBeenCalled()
  })

  it('accepte une adresse du carnet de contacts du client', async () => {
    mockOperatorThenClient()
    mockContactRows.mockReturnValue({ data: [{ email: 'compta@cse77.fr' }] })

    const { sendMeetLink } = await import('./send-meet-link')
    const result = await sendMeetLink({ ...validInput, recipientEmail: 'COMPTA@cse77.fr' })

    expect(result.error).toBeNull()
    expect(mockSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'COMPTA@cse77.fr' })
    )
  })

  it('refuse une adresse email invalide avant tout appel externe', async () => {
    const { sendMeetLink } = await import('./send-meet-link')
    const result = await sendMeetLink({ ...validInput, recipientEmail: 'pas-une-adresse' })

    expect(result.error?.code).toBe('VALIDATION_ERROR')
    expect(mockCreateGoogleMeetSpace).not.toHaveBeenCalled()
  })

  it('transmet la date du rendez-vous quand elle est fournie', async () => {
    mockOperatorThenClient()

    const { sendMeetLink } = await import('./send-meet-link')
    const result = await sendMeetLink({ ...validInput, scheduledAt: '2026-10-20T09:00:00.000Z' })

    expect(result.error).toBeNull()
    expect(mockCreateMeeting).toHaveBeenCalledWith(
      expect.objectContaining({ scheduledAt: '2026-10-20T09:00:00.000Z' })
    )
  })
})
