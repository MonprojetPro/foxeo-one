import { describe, it, expect, vi, beforeEach } from 'vitest'

const MEETING_ID = '11111111-1111-1111-1111-111111111111'
const CLIENT_ID = '22222222-2222-2222-2222-222222222222'

const mockGetUser = vi.fn()
const mockMaybeSingle = vi.fn()
const mockContactRows = vi.fn<() => { data: { email: string | null }[] | null }>()
const mockUpdateEq = vi.fn()

const mockEq = vi.fn(() => ({
  maybeSingle: mockMaybeSingle,
  then: (resolve: (v: unknown) => unknown) => Promise.resolve(mockContactRows()).then(resolve),
}))
const mockSelect = vi.fn(() => ({ eq: mockEq }))
const mockUpdate = vi.fn(() => ({ eq: mockUpdateEq }))
const mockFrom = vi.fn(() => ({ select: mockSelect, update: mockUpdate }))

vi.mock('@monprojetpro/supabase', () => ({
  createServerSupabaseClient: vi.fn(() => ({ from: mockFrom, auth: { getUser: mockGetUser } })),
}))

const mockSendEmail = vi.fn()
vi.mock('@monprojetpro/modules-email', () => ({
  sendEmail: (input: unknown) => mockSendEmail(input),
}))

const validInput = { meetingId: MEETING_ID, recipientEmail: 'client@exemple.fr' }

function mockMeetingThenClient(meeting: Record<string, unknown> = {}) {
  mockMaybeSingle
    .mockResolvedValueOnce({
      data: {
        id: MEETING_ID,
        title: 'Point d’avancement',
        status: 'scheduled',
        scheduled_at: '2026-10-20T09:00:00.000Z',
        meet_uri: 'https://meet.google.com/abc-defg-hij',
        client_id: CLIENT_ID,
        invite_sent_count: 1,
        ...meeting,
      },
      error: null,
    })
    .mockResolvedValueOnce({
      data: { id: CLIENT_ID, name: 'Client Test', company: null, email: 'client@exemple.fr' },
      error: null,
    })
}

describe('resendMeetLink', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // ⚠️ `clearAllMocks` vide l'historique des appels mais PAS la file des
    // `mockResolvedValueOnce` : sans ce reset, les réponses d'un test fuient
    // dans le suivant et on teste autre chose que ce qu'on croit.
    mockMaybeSingle.mockReset()
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null })
    mockSendEmail.mockResolvedValue({ data: undefined, error: null })
    mockContactRows.mockReturnValue({ data: [] })
    mockUpdateEq.mockResolvedValue({ error: null })
  })

  it('renvoie le lien EXISTANT, sans creer de nouvelle salle', async () => {
    mockMeetingThenClient()

    const { resendMeetLink } = await import('./resend-meet-link')
    const r = await resendMeetLink(validInput)

    expect(r.error).toBeNull()
    const sent = mockSendEmail.mock.calls[0]?.[0]
    expect(sent.body).toContain('https://meet.google.com/abc-defg-hij')
    expect(sent.html).toContain('https://meet.google.com/abc-defg-hij')
  })

  // LA TRACE EST LE CŒUR DE T-056 : sans elle, « renvoyer » se fait à l'aveugle.
  it('incremente le compteur et enregistre QUI a recu, QUAND', async () => {
    mockMeetingThenClient({ invite_sent_count: 2 })

    const { resendMeetLink } = await import('./resend-meet-link')
    const r = await resendMeetLink(validInput)

    expect(r.data?.sentCount).toBe(3)
    const trace = mockUpdate.mock.calls[0]?.[0] as Record<string, unknown>
    expect(trace.invite_sent_count).toBe(3)
    expect(trace.invite_last_sent_to).toBe('client@exemple.fr')
    expect(typeof trace.invite_last_sent_at).toBe('string')
  })

  it('n’ecrit AUCUNE trace si l’email n’est pas parti', async () => {
    mockMeetingThenClient()
    mockSendEmail.mockResolvedValue({ data: null, error: { message: 'Token Gmail invalide' } })

    const { resendMeetLink } = await import('./resend-meet-link')
    const r = await resendMeetLink(validInput)

    expect(r.error?.code).toBe('EMAIL_ERROR')
    expect(r.error?.message).toContain('Token Gmail invalide')
    // Dater un envoi raté ferait croire le client prévenu.
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it('REFUSE de renvoyer le lien d’un rendez-vous ANNULE', async () => {
    mockMeetingThenClient({ status: 'cancelled' })

    const { resendMeetLink } = await import('./resend-meet-link')
    const r = await resendMeetLink(validInput)

    expect(r.error?.code).toBe('MEETING_CANCELLED')
    expect(mockSendEmail).not.toHaveBeenCalled()
  })

  it('refuse un rendez-vous deja tenu', async () => {
    mockMeetingThenClient({ status: 'completed' })

    const { resendMeetLink } = await import('./resend-meet-link')
    expect((await resendMeetLink(validInput)).error?.code).toBe('MEETING_COMPLETED')
  })

  it('refuse un rendez-vous sans lien de visio', async () => {
    mockMeetingThenClient({ meet_uri: null })

    const { resendMeetLink } = await import('./resend-meet-link')
    const r = await resendMeetLink(validInput)

    expect(r.error?.code).toBe('NO_MEET_LINK')
    expect(mockSendEmail).not.toHaveBeenCalled()
  })

  it('REFUSE une adresse etrangere au client (meme garde qu’a l’envoi initial)', async () => {
    mockMeetingThenClient()

    const { resendMeetLink } = await import('./resend-meet-link')
    const r = await resendMeetLink({ ...validInput, recipientEmail: 'inconnu@ailleurs.com' })

    expect(r.error?.code).toBe('RECIPIENT_NOT_ALLOWED')
    expect(mockSendEmail).not.toHaveBeenCalled()
  })

  it('accepte une adresse du carnet de contacts', async () => {
    mockMeetingThenClient()
    mockContactRows.mockReturnValue({ data: [{ email: 'compta@exemple.fr' }] })

    const { resendMeetLink } = await import('./resend-meet-link')
    const r = await resendMeetLink({ ...validInput, recipientEmail: 'compta@exemple.fr' })

    expect(r.error).toBeNull()
  })
})
