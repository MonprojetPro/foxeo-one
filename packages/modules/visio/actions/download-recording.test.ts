import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createFakeSupabase, type FakeSupabaseOptions } from '../test-support/fake-supabase'

/**
 * ⚠️ TEST DE VERROUILLAGE — même défaut d'origine que `downloadTranscript` :
 * l'action signait une URL Google Drive comme un chemin du bucket
 * `recordings`, vide depuis sa création.
 */

const RECORDING_ID = '00000000-0000-0000-0000-000000000001'
const DRIVE_URL = 'https://drive.google.com/file/d/rec123/view'

let currentFake: ReturnType<typeof createFakeSupabase>

vi.mock('@monprojetpro/supabase', () => ({
  createServerSupabaseClient: vi.fn(async () => currentFake.client),
}))

function setup(options: FakeSupabaseOptions) {
  currentFake = createFakeSupabase(options)
  return currentFake
}

describe('downloadRecording', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('refuse un appel sans session', async () => {
    setup({ user: null })
    const { downloadRecording } = await import('./download-recording')
    const result = await downloadRecording({ recordingId: RECORDING_ID })

    expect(result.error?.code).toBe('UNAUTHORIZED')
  })

  it('refuse un identifiant qui n’est pas un UUID', async () => {
    setup({})
    const { downloadRecording } = await import('./download-recording')
    const result = await downloadRecording({ recordingId: 'bad' })

    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })

  it('rend NOT_FOUND quand l’enregistrement n’existe pas', async () => {
    setup({ responses: { 'meeting_recordings.select': { data: null, error: null } } })
    const { downloadRecording } = await import('./download-recording')
    const result = await downloadRecording({ recordingId: RECORDING_ID })

    expect(result.error?.code).toBe('NOT_FOUND')
  })

  it('rend le lien Google Drive — la vidéo n’est pas rapatriée', async () => {
    setup({
      responses: { 'meeting_recordings.select': { data: { recording_url: DRIVE_URL }, error: null } },
    })

    const { downloadRecording } = await import('./download-recording')
    const result = await downloadRecording({ recordingId: RECORDING_ID })

    expect(result.error).toBeNull()
    expect(result.data).toEqual({ signedUrl: DRIVE_URL, source: 'google' })
  })

  it('rend NOT_READY sur une URL vide — la synchro en écrit une quand Google n’a pas filmé', async () => {
    setup({
      responses: { 'meeting_recordings.select': { data: { recording_url: '' }, error: null } },
    })

    const { downloadRecording } = await import('./download-recording')
    const result = await downloadRecording({ recordingId: RECORDING_ID })

    expect(result.error?.code).toBe('NOT_READY')
  })
})
