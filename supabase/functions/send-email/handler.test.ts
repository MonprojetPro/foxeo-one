import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock email-client
const mockSend = vi.fn()
const mockSendWithRetry = vi.fn()
vi.mock('../_shared/email-client', () => ({
  createEmailClient: vi.fn(() => ({
    send: mockSend,
    sendWithRetry: mockSendWithRetry,
  })),
}))

// Mock Supabase client
const mockFrom = vi.fn()
const mockInsert = vi.fn()
const mockSelect = vi.fn()
const mockEq = vi.fn()
const mockSingle = vi.fn()
const mockUpdate = vi.fn()

vi.mock('https://esm.sh/@supabase/supabase-js@2', () => ({
  createClient: vi.fn(() => ({
    from: mockFrom,
  })),
}))

// Le handler tourne sous Deno en production (`Deno.env.get` dans buildPlatformUrl), mais
// les tests s'exécutent sous Node : sans ce stub, buildPlatformUrl lève « Deno is not
// defined » et l'envoi est compté en échec. Le test le plus important du fichier — celui
// qui vérifie qu'un email part réellement — échouait donc silencieusement pour une raison
// d'environnement, pas de logique. On stubbe l'env vide : les défauts du code s'appliquent.
;(globalThis as { Deno?: unknown }).Deno = { env: { get: () => undefined } }

describe('handleSendEmail', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  it('should send email for "message" notification type — client recipient', async () => {
    // Mock notification fetch
    mockSingle.mockResolvedValueOnce({
      data: {
        id: 'n-1',
        recipient_type: 'client',
        recipient_id: 'client-uuid-1',
        type: 'message',
        title: 'Nouveau message de MiKL',
        body: 'Bonjour, voici les retours.',
        link: '/chat',
      },
      error: null,
    })
    // Mock client email fetch
    mockSingle.mockResolvedValueOnce({
      data: { email: 'alice@example.com', name: 'Alice', email_notifications_enabled: true },
      error: null,
    })
    // Mock log insert
    mockInsert.mockResolvedValue({ error: null })

    mockFrom.mockImplementation((table: string) => {
      if (table === 'notifications') {
        return { select: vi.fn(() => ({ eq: vi.fn(() => ({ single: mockSingle })) })) }
      }
      if (table === 'clients') {
        return { select: vi.fn(() => ({ eq: vi.fn(() => ({ single: mockSingle })) })) }
      }
      if (table === 'activity_logs') {
        return { insert: mockInsert }
      }
      return { select: vi.fn() }
    })

    mockSendWithRetry.mockResolvedValue(undefined)

    const { handleSendEmail } = await import('./handler')
    const result = await handleSendEmail(
      { notificationId: 'n-1' },
      { supabaseUrl: 'https://test.supabase.co', serviceRoleKey: 'test-key', resendApiKey: 'resend-key', emailFrom: 'noreply@monprojet-pro.com' }
    )

    expect(result.success).toBe(true)
  })

  // `clients.name` est le NOM DE FAMILLE (le formulaire dit « Nom de famille »), le prénom
  // vit dans `first_name`. Les emails écrivaient « Bonjour Vasseur, 🎉 Bienvenue » — sur le
  // tout premier email reçu par un nouveau client. Invisible tant que le seul client de
  // test s'appelait « Dev Test » (nom complet dans `name`).
  it('s\'adresse au client par son PRÉNOM, pas par son nom de famille', async () => {
    mockSingle.mockResolvedValueOnce({
      data: {
        id: 'n-9',
        recipient_type: 'client',
        recipient_id: 'client-uuid-9',
        type: 'graduation',
        title: 'Votre espace One est prêt',
        body: null,
        link: '/',
      },
      error: null,
    })
    mockSingle.mockResolvedValueOnce({
      data: {
        email: 'lea@example.com',
        name: 'Vasseur',
        first_name: 'Léa',
        email_notifications_enabled: true,
      },
      error: null,
    })
    mockInsert.mockResolvedValue({ error: null })
    mockFrom.mockImplementation((table: string) => {
      if (table === 'activity_logs') return { insert: mockInsert }
      return { select: vi.fn(() => ({ eq: vi.fn(() => ({ single: mockSingle })) })) }
    })
    mockSendWithRetry.mockResolvedValue(undefined)

    const { handleSendEmail } = await import('./handler')
    await handleSendEmail(
      { notificationId: 'n-9' },
      { supabaseUrl: 'https://test.supabase.co', serviceRoleKey: 'test-key', resendApiKey: 'resend-key', emailFrom: 'noreply@monprojet-pro.com' }
    )

    const html = mockSendWithRetry.mock.calls[0]?.[0]?.html ?? ''
    expect(html).toContain('Bonjour <strong>Léa</strong>')
    expect(html).not.toContain('Bonjour <strong>Vasseur</strong>')
  })

  // Les opérateurs n'ont pas de colonne `first_name` : le fallback sur `name` doit tenir.
  it('retombe sur `name` quand il n\'y a pas de prénom (opérateur)', async () => {
    mockSingle.mockResolvedValueOnce({
      data: {
        id: 'n-10',
        recipient_type: 'operator',
        recipient_id: 'op-uuid-1',
        type: 'message',
        title: 'Nouveau message de Léa Vasseur',
        body: 'Une question',
        link: '/chat',
      },
      error: null,
    })
    mockSingle.mockResolvedValueOnce({
      data: { email: 'contact@monprojet-pro.com', name: 'MiKL', email_notifications_enabled: true },
      error: null,
    })
    mockInsert.mockResolvedValue({ error: null })
    mockFrom.mockImplementation((table: string) => {
      if (table === 'activity_logs') return { insert: mockInsert }
      return { select: vi.fn(() => ({ eq: vi.fn(() => ({ single: mockSingle })) })) }
    })
    mockSendWithRetry.mockResolvedValue(undefined)

    const { handleSendEmail } = await import('./handler')
    await handleSendEmail(
      { notificationId: 'n-10' },
      { supabaseUrl: 'https://test.supabase.co', serviceRoleKey: 'test-key', resendApiKey: 'resend-key', emailFrom: 'noreply@monprojet-pro.com' }
    )

    const html = mockSendWithRetry.mock.calls[0]?.[0]?.html ?? ''
    expect(html).toContain('Bonjour <strong>MiKL</strong>')
  })

  it('should skip email when email_notifications_enabled is false', async () => {
    mockSingle.mockResolvedValueOnce({
      data: {
        id: 'n-2',
        recipient_type: 'client',
        recipient_id: 'client-uuid-2',
        type: 'message',
        title: 'Test',
        body: null,
        link: null,
      },
      error: null,
    })
    mockSingle.mockResolvedValueOnce({
      data: { email: 'alice@example.com', name: 'Alice', email_notifications_enabled: false },
      error: null,
    })
    mockInsert.mockResolvedValue({ error: null })

    mockFrom.mockImplementation((table: string) => {
      if (table === 'notifications') {
        return { select: vi.fn(() => ({ eq: vi.fn(() => ({ single: mockSingle })) })) }
      }
      if (table === 'clients') {
        return { select: vi.fn(() => ({ eq: vi.fn(() => ({ single: mockSingle })) })) }
      }
      if (table === 'activity_logs') {
        return { insert: mockInsert }
      }
      return { select: vi.fn() }
    })

    const { handleSendEmail } = await import('./handler')
    const result = await handleSendEmail(
      { notificationId: 'n-2' },
      { supabaseUrl: 'https://test.supabase.co', serviceRoleKey: 'test-key', resendApiKey: 'resend-key', emailFrom: 'noreply@monprojet-pro.com' }
    )

    expect(result.success).toBe(true)
    expect(result.skipped).toBe(true)
    expect(mockSendWithRetry).not.toHaveBeenCalled()
  })

  it('should return error when notification not found', async () => {
    mockSingle.mockResolvedValueOnce({
      data: null,
      error: { message: 'Not found' },
    })

    mockFrom.mockImplementation(() => ({
      select: vi.fn(() => ({ eq: vi.fn(() => ({ single: mockSingle })) })),
    }))

    const { handleSendEmail } = await import('./handler')
    const result = await handleSendEmail(
      { notificationId: 'bad-id' },
      { supabaseUrl: 'https://test.supabase.co', serviceRoleKey: 'test-key', resendApiKey: 'resend-key', emailFrom: 'noreply@monprojet-pro.com' }
    )

    expect(result.success).toBe(false)
    expect(result.error).toBeDefined()
  })

  it('should log failure in activity_logs when email send fails', async () => {
    mockSingle.mockResolvedValueOnce({
      data: {
        id: 'n-3',
        recipient_type: 'client',
        recipient_id: 'client-uuid-3',
        type: 'message',
        title: 'Test',
        body: null,
        link: null,
      },
      error: null,
    })
    mockSingle.mockResolvedValueOnce({
      data: { email: 'alice@example.com', name: 'Alice', email_notifications_enabled: true },
      error: null,
    })
    mockInsert.mockResolvedValue({ error: null })

    mockFrom.mockImplementation((table: string) => {
      if (table === 'notifications') {
        return { select: vi.fn(() => ({ eq: vi.fn(() => ({ single: mockSingle })) })) }
      }
      if (table === 'clients') {
        return { select: vi.fn(() => ({ eq: vi.fn(() => ({ single: mockSingle })) })) }
      }
      if (table === 'activity_logs') {
        return { insert: mockInsert }
      }
      return { select: vi.fn() }
    })

    mockSendWithRetry.mockRejectedValue(new Error('Email service down'))

    const { handleSendEmail } = await import('./handler')
    const result = await handleSendEmail(
      { notificationId: 'n-3' },
      { supabaseUrl: 'https://test.supabase.co', serviceRoleKey: 'test-key', resendApiKey: 'resend-key', emailFrom: 'noreply@monprojet-pro.com' }
    )

    // Should succeed with degraded mode (in-app OK, email failed)
    expect(result.success).toBe(false)
    expect(result.emailFailed).toBe(true)
    // Failure should be logged
    expect(mockInsert).toHaveBeenCalled()
  })
})

describe('handleDirectEmail', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  const config = {
    supabaseUrl: 'https://test.supabase.co',
    serviceRoleKey: 'test-key',
    resendApiKey: 'resend-key',
    emailFrom: 'noreply@monprojet-pro.com',
  }

  it('sends welcome-lab email successfully', async () => {
    mockSendWithRetry.mockResolvedValue(undefined)
    const { handleDirectEmail } = await import('./handler')
    const result = await handleDirectEmail(
      {
        to: 'prospect@example.com',
        template: 'welcome-lab',
        data: { clientName: 'Alice', firstStepLabel: 'Identité de marque', activationLink: 'https://app.monprojet-pro.com/auth/callback?next=/reset-password' },
      },
      config
    )
    expect(result.success).toBe(true)
    expect(mockSendWithRetry).toHaveBeenCalledOnce()
  })

  it('sends prospect-resources email successfully', async () => {
    mockSendWithRetry.mockResolvedValue(undefined)
    const { handleDirectEmail } = await import('./handler')
    const result = await handleDirectEmail(
      {
        to: 'prospect@example.com',
        template: 'prospect-resources',
        data: { links: [{ name: 'Guide.pdf', url: 'https://storage.example.com/guide.pdf' }] },
      },
      config
    )
    expect(result.success).toBe(true)
    expect(mockSendWithRetry).toHaveBeenCalledOnce()
  })

  it('returns error for unknown template', async () => {
    const { handleDirectEmail } = await import('./handler')
    const result = await handleDirectEmail(
      { to: 'test@example.com', template: 'unknown-template' as 'welcome-lab', data: {} },
      config
    )
    expect(result.success).toBe(false)
    expect(result.error).toContain('Unknown direct template')
  })

  it('returns error when email client throws', async () => {
    mockSendWithRetry.mockRejectedValue(new Error('SMTP connection failed'))
    const { handleDirectEmail } = await import('./handler')
    const result = await handleDirectEmail(
      {
        to: 'prospect@example.com',
        template: 'welcome-lab',
        data: { clientName: 'Bob', firstStepLabel: 'Étape 1', activationLink: 'https://link' },
      },
      config
    )
    expect(result.success).toBe(false)
    expect(result.error).toContain('SMTP connection failed')
  })
})
