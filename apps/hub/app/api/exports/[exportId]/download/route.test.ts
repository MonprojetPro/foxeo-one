import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const validExportId = '550e8400-e29b-41d4-a716-446655440010'
const validClientId = '550e8400-e29b-41d4-a716-446655440001'
const validAuthUuid = '550e8400-e29b-41d4-a716-446655440099'

// Mock chains
const mockExportSingle = vi.fn()
const mockClientSingle = vi.fn()
const mockOperatorSingle = vi.fn()
const mockOwnedClientSingle = vi.fn()
const mockLogInsert = vi.fn().mockResolvedValue({ error: null })
const mockCreateSignedUrl = vi.fn()

const mockFrom = vi.fn((table: string) => {
  if (table === 'data_exports') {
    return {
      select: vi.fn(() => ({
        eq: vi.fn(() => ({ maybeSingle: mockExportSingle })),
      })),
    }
  }
  if (table === 'clients') {
    return {
      select: vi.fn(() => ({
        eq: vi.fn(() => ({ eq: vi.fn(() => ({ maybeSingle: mockClientSingle })) })),
      })),
    }
  }
  if (table === 'operators') {
    return {
      select: vi.fn(() => ({
        eq: vi.fn(() => ({ maybeSingle: mockOperatorSingle })),
      })),
    }
  }
  if (table === 'activity_logs') {
    return { insert: mockLogInsert }
  }
  return {}
})

const mockGetUser = vi.fn()

vi.mock('@foxeo/supabase', () => ({
  createServerSupabaseClient: vi.fn(() => ({
    from: mockFrom,
    auth: { getUser: mockGetUser },
    storage: {
      from: vi.fn(() => ({
        createSignedUrl: mockCreateSignedUrl,
      })),
    },
  })),
}))

function makeRequest(exportId: string) {
  return new NextRequest(`http://localhost/api/exports/${exportId}/download`)
}

describe('GET /api/exports/[exportId]/download', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockLogInsert.mockResolvedValue({ error: null })
  })

  it('should return 400 for invalid exportId format', async () => {
    const { GET } = await import('./route')
    const res = await GET(makeRequest('not-a-uuid'), {
      params: Promise.resolve({ exportId: 'not-a-uuid' }),
    })

    expect(res.status).toBe(400)
  })

  it('should return 401 when not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'Not auth' } })

    const { GET } = await import('./route')
    const res = await GET(makeRequest(validExportId), {
      params: Promise.resolve({ exportId: validExportId }),
    })

    expect(res.status).toBe(401)
  })

  it('should return 404 when export not found', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: validAuthUuid } }, error: null })
    mockExportSingle.mockResolvedValue({ data: null, error: null })

    const { GET } = await import('./route')
    const res = await GET(makeRequest(validExportId), {
      params: Promise.resolve({ exportId: validExportId }),
    })

    expect(res.status).toBe(404)
  })

  it('should return 410 for expired export', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: validAuthUuid } }, error: null })
    mockExportSingle.mockResolvedValue({
      data: {
        id: validExportId,
        client_id: validClientId,
        requested_by: 'client',
        requester_id: validAuthUuid,
        status: 'completed',
        file_path: `${validClientId}/${validExportId}.zip`,
        expires_at: new Date(Date.now() - 86400000).toISOString(), // yesterday
      },
      error: null,
    })

    const { GET } = await import('./route')
    const res = await GET(makeRequest(validExportId), {
      params: Promise.resolve({ exportId: validExportId }),
    })

    expect(res.status).toBe(410)
  })

  it('should return 409 when export not yet completed', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: validAuthUuid } }, error: null })
    mockExportSingle.mockResolvedValue({
      data: {
        id: validExportId,
        client_id: validClientId,
        requested_by: 'client',
        requester_id: validAuthUuid,
        status: 'pending',
        file_path: null,
        expires_at: new Date(Date.now() + 86400000).toISOString(),
      },
      error: null,
    })

    const { GET } = await import('./route')
    const res = await GET(makeRequest(validExportId), {
      params: Promise.resolve({ exportId: validExportId }),
    })

    expect(res.status).toBe(409)
  })

  it('should return 403 when user is not authorized to download', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: validAuthUuid } }, error: null })
    mockExportSingle.mockResolvedValue({
      data: {
        id: validExportId,
        client_id: validClientId,
        requested_by: 'client',
        requester_id: '999e8400-e29b-41d4-a716-446655440099',
        status: 'completed',
        file_path: `${validClientId}/${validExportId}.zip`,
        expires_at: new Date(Date.now() + 86400000).toISOString(),
      },
      error: null,
    })
    // User is not the client
    mockClientSingle.mockResolvedValue({ data: null, error: null })
    // User is not an operator
    mockOperatorSingle.mockResolvedValue({ data: null, error: null })

    const { GET } = await import('./route')
    const res = await GET(makeRequest(validExportId), {
      params: Promise.resolve({ exportId: validExportId }),
    })

    expect(res.status).toBe(403)
  })

  it('should redirect to signed URL for authorized client', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: validAuthUuid } }, error: null })
    mockExportSingle.mockResolvedValue({
      data: {
        id: validExportId,
        client_id: validClientId,
        requested_by: 'client',
        requester_id: validAuthUuid,
        status: 'completed',
        file_path: `${validClientId}/${validExportId}.zip`,
        expires_at: new Date(Date.now() + 86400000).toISOString(),
      },
      error: null,
    })
    mockClientSingle.mockResolvedValue({ data: { id: validClientId }, error: null })
    mockCreateSignedUrl.mockResolvedValue({
      data: { signedUrl: 'https://storage.supabase.co/exports/signed-url' },
      error: null,
    })

    const { GET } = await import('./route')
    const res = await GET(makeRequest(validExportId), {
      params: Promise.resolve({ exportId: validExportId }),
    })

    expect(res.status).toBe(307) // NextResponse.redirect
    expect(res.headers.get('location')).toBe('https://storage.supabase.co/exports/signed-url')
  })
})
