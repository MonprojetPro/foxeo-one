import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * Le comportement Google + base est testé dans `lib/meeting-results-sync.test.ts`.
 * Ici on ne vérifie que ce dont la Server Action est responsable : la session,
 * la validation d'entrée, et la TRADUCTION des motifs en messages distincts.
 *
 * Pourquoi ce dernier point mérite des tests : « Google n'a encore rien
 * produit » et « la connexion Google est morte » appellent deux réactions
 * opposées de MiKL — attendre, ou reconnecter. Les confondre envoie déboguer
 * au mauvais endroit (c'est exactement ce qu'a coûté le badge Gmail, T-054).
 */

const mockGetUser = vi.fn()
const mockSyncCore = vi.fn()

vi.mock('@monprojetpro/supabase', () => ({
  createServerSupabaseClient: vi.fn(async () => ({ auth: { getUser: mockGetUser } })),
}))

vi.mock('../lib/meeting-results-sync', () => ({
  syncMeetingResultsCore: mockSyncCore,
}))

const MEETING_ID = '00000000-0000-0000-0000-000000000001'

function outcome(reason: string, extra: Record<string, unknown> = {}) {
  return { synced: false, transcriptReady: false, archived: false, documentId: null, reason, ...extra }
}

describe('syncMeetingResults', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({ data: { user: { id: 'op-1' } }, error: null })
  })

  it('refuse un meetingId qui n’est pas un UUID', async () => {
    const { syncMeetingResults } = await import('./sync-meeting-results')
    const result = await syncMeetingResults({ meetingId: 'pas-un-uuid' })

    expect(result.error?.code).toBe('VALIDATION_ERROR')
    expect(mockSyncCore).not.toHaveBeenCalled()
  })

  it('refuse un appel sans session — la RLS ne doit jamais être le seul rempart', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null })

    const { syncMeetingResults } = await import('./sync-meeting-results')
    const result = await syncMeetingResults({ meetingId: MEETING_ID })

    expect(result.error?.code).toBe('UNAUTHORIZED')
    expect(mockSyncCore).not.toHaveBeenCalled()
  })

  it.each([
    ['not_found', 'NOT_FOUND'],
    ['no_space', 'NO_SPACE'],
    ['config_missing', 'CONFIG_ERROR'],
    ['auth_error', 'AUTH_ERROR'],
    ['api_error', 'API_ERROR'],
    ['db_error', 'DB_ERROR'],
  ])('traduit le motif %s en code %s', async (reason, code) => {
    mockSyncCore.mockResolvedValue(outcome(reason))

    const { syncMeetingResults } = await import('./sync-meeting-results')
    const result = await syncMeetingResults({ meetingId: MEETING_ID })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe(code)
  })

  it('rend un SUCCÈS quand Google n’a encore rien publié — ce n’est pas une erreur', async () => {
    mockSyncCore.mockResolvedValue(outcome('not_ready'))

    const { syncMeetingResults } = await import('./sync-meeting-results')
    const result = await syncMeetingResults({ meetingId: MEETING_ID })

    expect(result.error).toBeNull()
    expect(result.data?.synced).toBe(false)
    expect(result.data?.reason).toBe('not_ready')
  })

  it('rend le résultat complet quand le compte rendu a été déposé', async () => {
    mockSyncCore.mockResolvedValue(
      outcome('ok', { synced: true, transcriptReady: true, archived: true, documentId: 'doc-1' })
    )

    const { syncMeetingResults } = await import('./sync-meeting-results')
    const result = await syncMeetingResults({ meetingId: MEETING_ID })

    expect(result.error).toBeNull()
    expect(result.data).toMatchObject({ archived: true, documentId: 'doc-1' })
  })
})
