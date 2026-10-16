import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createFakeSupabase, type FakeSupabaseOptions } from '../test-support/fake-supabase'

/**
 * ⚠️ TEST DE VERROUILLAGE. Cette action signait un chemin dans le bucket
 * `transcripts` à partir d'une URL Google Docs, dans un bucket resté vide
 * depuis sa création : elle n'a JAMAIS rendu un lien valide. Les tests
 * d'origine passaient pourtant au vert — ils vérifiaient que le mock de
 * `createSignedUrl` avait été appelé, pas que le chemin voulait dire quelque
 * chose. Un mock trop complaisant certifie du code mort.
 */

const RECORDING_ID = '00000000-0000-0000-0000-000000000001'
const DOCUMENT_ID = '00000000-0000-0000-0000-0000000000d1'
const GOOGLE_URL = 'https://docs.google.com/document/d/trans456/view'

let currentFake: ReturnType<typeof createFakeSupabase>

vi.mock('@monprojetpro/supabase', () => ({
  createServerSupabaseClient: vi.fn(async () => currentFake.client),
}))

function setup(options: FakeSupabaseOptions) {
  currentFake = createFakeSupabase(options)
  return currentFake
}

describe('downloadTranscript', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('refuse un appel sans session', async () => {
    setup({ user: null })
    const { downloadTranscript } = await import('./download-transcript')
    const result = await downloadTranscript({ recordingId: RECORDING_ID })

    expect(result.error?.code).toBe('UNAUTHORIZED')
  })

  it('refuse un identifiant qui n’est pas un UUID', async () => {
    setup({})
    const { downloadTranscript } = await import('./download-transcript')
    const result = await downloadTranscript({ recordingId: 'bad' })

    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })

  it('rend NOT_FOUND quand l’enregistrement n’existe pas', async () => {
    setup({ responses: { 'meeting_recordings.select': { data: null, error: null } } })
    const { downloadTranscript } = await import('./download-transcript')
    const result = await downloadTranscript({ recordingId: RECORDING_ID })

    expect(result.error?.code).toBe('NOT_FOUND')
  })

  it('sert EN PRIORITÉ le document archivé dans le dossier du client', async () => {
    setup({
      responses: {
        'meeting_recordings.select': {
          data: {
            transcript_url: GOOGLE_URL,
            transcription_status: 'completed',
            transcript_document_id: DOCUMENT_ID,
          },
          error: null,
        },
        'documents.select': { data: { file_path: 'op/cli/compte-rendu.pdf' }, error: null },
      },
    })

    const { downloadTranscript } = await import('./download-transcript')
    const result = await downloadTranscript({ recordingId: RECORDING_ID })

    expect(result.error).toBeNull()
    expect(result.data?.source).toBe('archive')
    expect(result.data?.signedUrl).toContain('op/cli/compte-rendu.pdf')
  })

  it('se rabat sur Google quand le fichier archivé a disparu du stockage', async () => {
    setup({
      responses: {
        'meeting_recordings.select': {
          data: {
            transcript_url: GOOGLE_URL,
            transcription_status: 'completed',
            transcript_document_id: DOCUMENT_ID,
          },
          error: null,
        },
        'documents.select': { data: { file_path: 'op/cli/disparu.pdf' }, error: null },
      },
      signedUrl: { data: null, error: { message: 'Object not found' } },
    })

    const { downloadTranscript } = await import('./download-transcript')
    const result = await downloadTranscript({ recordingId: RECORDING_ID })

    expect(result.error).toBeNull()
    expect(result.data?.source).toBe('google')
    expect(result.data?.signedUrl).toBe(GOOGLE_URL)
  })

  it('sert l’URL Google quand rien n’a encore été archivé', async () => {
    setup({
      responses: {
        'meeting_recordings.select': {
          data: {
            transcript_url: GOOGLE_URL,
            transcription_status: 'completed',
            transcript_document_id: null,
          },
          error: null,
        },
      },
    })

    const { downloadTranscript } = await import('./download-transcript')
    const result = await downloadTranscript({ recordingId: RECORDING_ID })

    expect(result.data?.source).toBe('google')
  })

  it('rend NOT_READY quand la transcription n’existe sous aucune forme', async () => {
    setup({
      responses: {
        'meeting_recordings.select': {
          data: { transcript_url: null, transcription_status: 'pending', transcript_document_id: null },
          error: null,
        },
      },
    })

    const { downloadTranscript } = await import('./download-transcript')
    const result = await downloadTranscript({ recordingId: RECORDING_ID })

    expect(result.error?.code).toBe('NOT_READY')
  })
})
