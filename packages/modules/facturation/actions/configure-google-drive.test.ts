import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@monprojetpro/supabase', () => ({
  createServerSupabaseClient: vi.fn(),
}))

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { configureGoogleDrive, updateGoogleDriveFolderId, getGoogleDriveStatus, getRecentUploads } from './configure-google-drive'

const mockCreateServerSupabaseClient = vi.mocked(createServerSupabaseClient)

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeSupabase(opts: { isOperator?: boolean } = {}) {
  const upsertMock = vi.fn().mockResolvedValue({ error: null })
  const selectInMock = vi.fn().mockResolvedValue({
    data: [
      { key: 'google_drive_access_token', value: JSON.stringify('token-abc') },
      { key: 'google_drive_refresh_token', value: JSON.stringify('refresh-xyz') },
      { key: 'google_drive_folder_id', value: JSON.stringify('folder-123') },
    ],
    error: null,
  })
  const selectMock = vi.fn(() => ({ in: selectInMock }))

  const uploadsOrder = vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValue({ data: [], error: null }) })
  const uploadsSelect = vi.fn(() => ({ order: uploadsOrder }))

  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'op-1' } },
        error: null,
      }),
    },
    rpc: vi.fn().mockResolvedValue({ data: opts.isOperator ?? true }),
    from: vi.fn((table: string) => {
      if (table === 'system_config') return { upsert: upsertMock, select: selectMock }
      if (table === 'justificatif_uploads') return { select: uploadsSelect }
      return { insert: vi.fn().mockResolvedValue({ error: null }) }
    }),
    _mocks: { upsertMock, selectInMock, uploadsOrder },
  }
}

describe('configureGoogleDrive', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns UNAUTHORIZED when not authenticated', async () => {
    const supabase = makeSupabase()
    supabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: { message: 'No session' } })
    mockCreateServerSupabaseClient.mockResolvedValue(supabase as never)

    const result = await configureGoogleDrive('token', 'refresh', 'folder')
    expect(result.error?.code).toBe('UNAUTHORIZED')
  })

  it('validates required fields', async () => {
    const supabase = makeSupabase()
    mockCreateServerSupabaseClient.mockResolvedValue(supabase as never)

    const result = await configureGoogleDrive('', 'refresh', 'folder')
    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })

  it('upserts all 3 config entries in a single batch call', async () => {
    const supabase = makeSupabase()
    mockCreateServerSupabaseClient.mockResolvedValue(supabase as never)

    const result = await configureGoogleDrive('my-token', 'my-refresh', 'my-folder')
    expect(result.error).toBeNull()
    expect(result.data).toEqual({ configured: true })

    // Single batch upsert call (atomic)
    expect(supabase._mocks.upsertMock).toHaveBeenCalledTimes(1)
    expect(supabase._mocks.upsertMock).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ key: 'google_drive_access_token' }),
        expect.objectContaining({ key: 'google_drive_refresh_token' }),
        expect.objectContaining({ key: 'google_drive_folder_id' }),
      ]),
      { onConflict: 'key' }
    )
  })
})

describe('updateGoogleDriveFolderId', () => {
  beforeEach(() => vi.clearAllMocks())

  it('updates only the folder ID', async () => {
    const supabase = makeSupabase()
    mockCreateServerSupabaseClient.mockResolvedValue(supabase as never)

    const result = await updateGoogleDriveFolderId('new-folder-456')
    expect(result.error).toBeNull()
    expect(result.data).toEqual({ configured: true })

    expect(supabase._mocks.upsertMock).toHaveBeenCalledTimes(1)
    expect(supabase._mocks.upsertMock).toHaveBeenCalledWith(
      expect.objectContaining({ key: 'google_drive_folder_id', value: JSON.stringify('new-folder-456') }),
      { onConflict: 'key' }
    )
  })

  it('validates empty folder ID', async () => {
    const supabase = makeSupabase()
    mockCreateServerSupabaseClient.mockResolvedValue(supabase as never)

    const result = await updateGoogleDriveFolderId('')
    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })
})

describe('getGoogleDriveStatus', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns isConfigured true and folderId when all 3 keys present', async () => {
    const supabase = makeSupabase()
    mockCreateServerSupabaseClient.mockResolvedValue(supabase as never)

    const result = await getGoogleDriveStatus()
    expect(result.error).toBeNull()
    expect(result.data).toEqual({
      isConfigured: true,
      folderId: 'folder-123',
    })
  })

  it('returns isConfigured false when config incomplete', async () => {
    const supabase = makeSupabase()
    supabase._mocks.selectInMock.mockResolvedValue({ data: [{ key: 'google_drive_folder_id', value: '"f"' }], error: null })
    mockCreateServerSupabaseClient.mockResolvedValue(supabase as never)

    const result = await getGoogleDriveStatus()
    expect(result.error).toBeNull()
    expect(result.data?.isConfigured).toBe(false)
  })

  it('never returns tokens to the client', async () => {
    const supabase = makeSupabase()
    mockCreateServerSupabaseClient.mockResolvedValue(supabase as never)

    const result = await getGoogleDriveStatus()
    const data = result.data as Record<string, unknown>
    expect(data).not.toHaveProperty('accessToken')
    expect(data).not.toHaveProperty('refreshToken')
  })
})

describe('getRecentUploads', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns empty array when no uploads', async () => {
    const supabase = makeSupabase()
    mockCreateServerSupabaseClient.mockResolvedValue(supabase as never)

    const result = await getRecentUploads()
    expect(result.error).toBeNull()
    expect(result.data).toEqual([])
  })

  it('returns FORBIDDEN for non-operator', async () => {
    const supabase = makeSupabase({ isOperator: false })
    mockCreateServerSupabaseClient.mockResolvedValue(supabase as never)

    const result = await getRecentUploads()
    expect(result.error?.code).toBe('FORBIDDEN')
  })
})
