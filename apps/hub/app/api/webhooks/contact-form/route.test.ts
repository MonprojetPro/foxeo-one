import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const OPERATOR_ID = '550e8400-e29b-41d4-a716-446655440001'
const CLIENT_ID = '550e8400-e29b-41d4-a716-446655440010'

// Supabase service role mock
const mockInsertLog = vi.fn().mockResolvedValue({ error: null })
const mockInsertConfig = vi.fn().mockResolvedValue({ error: null })
const mockInsertClient = vi.fn()
const mockUpdateClients = vi.fn()
const mockMaybeSingle = vi.fn()
const mockOperatorSingle = vi.fn()

const mockFrom = vi.fn((table: string) => {
  if (table === 'operators') {
    return {
      select: vi.fn(() => ({
        limit: vi.fn(() => ({ single: mockOperatorSingle })),
      })),
    }
  }
  if (table === 'clients') {
    return {
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({ maybeSingle: mockMaybeSingle })),
        })),
      })),
      insert: mockInsertClient,
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          is: mockUpdateClients,
        })),
      })),
    }
  }
  if (table === 'activity_logs') return { insert: mockInsertLog }
  if (table === 'client_configs') return { insert: mockInsertConfig }
  return {}
})

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({ from: mockFrom })),
}))

// Disable HMAC verification in tests (no secret configured)
vi.stubEnv('CONTACT_FORM_WEBHOOK_SECRET', '')
vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'http://localhost:54321')
vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key')

function makeRequest(body: object, headers: Record<string, string> = {}) {
  const raw = JSON.stringify(body)
  return new NextRequest('http://localhost/api/webhooks/contact-form', {
    method: 'POST',
    body: raw,
    headers: { 'content-type': 'application/json', ...headers },
  })
}

describe('contact-form webhook', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockOperatorSingle.mockResolvedValue({ data: { id: OPERATOR_ID }, error: null })
    mockMaybeSingle.mockResolvedValue({ data: null, error: null })
    mockInsertClient.mockResolvedValue({
      data: { id: CLIENT_ID },
      error: null,
      select: vi.fn(() => ({
        single: vi.fn(() => Promise.resolve({ data: { id: CLIENT_ID }, error: null })),
      })),
    })
  })

  it('returns 400 when name is missing', async () => {
    const { POST } = await import('./route')
    const req = makeRequest({ email: 'test@example.com' })
    const res = await POST(req)

    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toMatch(/name/)
  })

  it('returns 400 when email is missing', async () => {
    const { POST } = await import('./route')
    const req = makeRequest({ name: 'Jean Dupont' })
    const res = await POST(req)

    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toMatch(/email/)
  })

  it('returns 500 when no operator found', async () => {
    mockOperatorSingle.mockResolvedValue({ data: null, error: null })

    const { POST } = await import('./route')
    const req = makeRequest({ name: 'Jean Dupont', email: 'jean@example.com' })
    const res = await POST(req)

    expect(res.status).toBe(500)
  })

  it('returns { received: true } and creates prospect on valid payload', async () => {
    mockInsertClient.mockReturnValue({
      select: vi.fn(() => ({
        single: vi.fn(() => Promise.resolve({ data: { id: CLIENT_ID }, error: null })),
      })),
    })

    const { POST } = await import('./route')
    const req = makeRequest({
      name: 'Marie Curie',
      email: 'marie@example.com',
      company: 'Curie Labs',
      project_type: 'coaching',
      message: 'Bonjour je voudrais en savoir plus',
    })
    const res = await POST(req)

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.received).toBe(true)
    expect(mockFrom).toHaveBeenCalledWith('clients')
  })

  it('maps project_type labels to DB values', async () => {
    mockInsertClient.mockReturnValue({
      select: vi.fn(() => ({
        single: vi.fn(() => Promise.resolve({ data: { id: CLIENT_ID }, error: null })),
      })),
    })

    const { POST } = await import('./route')
    const req = makeRequest({
      name: 'Paul Martin',
      email: 'paul@example.com',
      project_type: 'Coaching de projet', // label textuel → mapping
    })
    const res = await POST(req)

    expect(res.status).toBe(200)
  })

  it('updates existing prospect lead_message if already in DB', async () => {
    mockMaybeSingle.mockResolvedValue({ data: { id: CLIENT_ID }, error: null })

    const { POST } = await import('./route')
    const req = makeRequest({
      name: 'Existing User',
      email: 'existing@example.com',
      message: 'Nouveau message',
    })
    const res = await POST(req)

    expect(res.status).toBe(200)
    expect(mockFrom).toHaveBeenCalledWith('clients')
  })
})
