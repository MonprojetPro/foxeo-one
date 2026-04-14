import { describe, it, expect, vi, beforeEach } from 'vitest'
import { interpolateTemplate } from './send-email'

const mockSingle = vi.fn()
const mockFrom = vi.fn()
const mockInvoke = vi.fn()

vi.mock('@monprojetpro/supabase', () => ({
  createServerSupabaseClient: vi.fn(async () => ({
    auth: {
      getUser: vi.fn(async () => ({ data: { user: { id: 'op-id' } }, error: null })),
    },
    from: mockFrom,
    functions: { invoke: mockInvoke },
  })),
}))

const CLIENT_STUB = {
  id: 'client-uuid',
  name: 'Jean Dupont',
  company_name: 'JD Consulting',
  created_at: '2026-01-15T10:00:00Z',
  graduated_at: '2026-03-01T10:00:00Z',
  client_configs: [{ dashboard_type: 'one', active_modules: ['core-dashboard'] }],
  client_instances: [{ instance_url: 'https://jean.monprojet-pro.com', active_modules: ['core-dashboard', 'chat'], tier: 'essentiel' }],
  step_submissions: [{ id: 'sub-1' }, { id: 'sub-2' }, { id: 'sub-3' }],
}

describe('interpolateTemplate', () => {
  it('remplace les variables {{key}} par leurs valeurs', () => {
    const template = 'Bonjour {{clientName}}, bienvenue dans {{product}} !'
    const result = interpolateTemplate(template, { clientName: 'Marie', product: 'MonprojetPro One' })
    expect(result).toBe('Bonjour Marie, bienvenue dans MonprojetPro One !')
  })

  it('préserve {{key}} si la variable est absente', () => {
    const template = 'Bonjour {{name}} !'
    const result = interpolateTemplate(template, {})
    expect(result).toBe('Bonjour {{name}} !')
  })

  it('remplace toutes les occurrences', () => {
    const template = '{{x}} + {{x}} = double {{x}}'
    const result = interpolateTemplate(template, { x: '2' })
    expect(result).toBe('2 + 2 = double 2')
  })
})

describe('sendGraduationEmail', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()

    mockFrom.mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({ single: mockSingle })),
      })),
    })
    mockSingle.mockResolvedValue({ data: CLIENT_STUB, error: null })
    mockInvoke.mockResolvedValue({ data: { sent: true }, error: null })
  })

  it('retourne sent: true quand la Edge Function réussit', async () => {
    const { sendGraduationEmail } = await import('./send-email')
    const result = await sendGraduationEmail({ clientId: 'client-uuid' })
    expect(result.error).toBeNull()
    expect(result.data?.sent).toBe(true)
  })

  it('appelle la Edge Function send-graduation-email sans clientEmail', async () => {
    const { sendGraduationEmail } = await import('./send-email')
    await sendGraduationEmail({ clientId: 'client-uuid' })
    expect(mockInvoke).toHaveBeenCalledWith(
      'send-graduation-email',
      expect.objectContaining({
        body: expect.objectContaining({ clientId: 'client-uuid' }),
      })
    )
    // Vérifie que clientEmail n'est PAS envoyé (l'email est géré par auth.users côté Edge Function)
    const invokeBody = mockInvoke.mock.calls[0][1].body
    expect(invokeBody).not.toHaveProperty('clientEmail')
  })

  it('envoie labDuration et labStepsCompleted calculés (pas hardcodés)', async () => {
    const { sendGraduationEmail } = await import('./send-email')
    await sendGraduationEmail({ clientId: 'client-uuid' })
    const variables = mockInvoke.mock.calls[0][1].body.variables
    // created_at: 2026-01-15, graduated_at: 2026-03-01 = ~45 jours
    expect(variables.labDuration).toContain('jour')
    expect(variables.labDuration).not.toBe('—')
    expect(variables.labStepsCompleted).toBe('3') // 3 step_submissions in stub
  })

  it('retourne sent: false si la Edge Function échoue (non-bloquant)', async () => {
    mockInvoke.mockResolvedValueOnce({ data: null, error: new Error('Resend error') })
    const { sendGraduationEmail } = await import('./send-email')
    const result = await sendGraduationEmail({ clientId: 'client-uuid' })
    // Non-bloquant : error=null, sent=false
    expect(result.error).toBeNull()
    expect(result.data?.sent).toBe(false)
  })

  it('retourne VALIDATION_ERROR si clientId vide', async () => {
    const { sendGraduationEmail } = await import('./send-email')
    const result = await sendGraduationEmail({ clientId: '' })
    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })

  it('retourne NOT_FOUND si client introuvable', async () => {
    mockSingle.mockResolvedValueOnce({ data: null, error: new Error('not found') })
    const { sendGraduationEmail } = await import('./send-email')
    const result = await sendGraduationEmail({ clientId: 'bad-id' })
    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('NOT_FOUND')
  })
})
