import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { syncMeetingResultsCore } from './meeting-results-sync'
import { createFakeSupabase } from '../test-support/fake-supabase'

/**
 * Les appels réseau sont routés PAR URL, jamais par ordre d'appel. Un mock
 * ordonné se met à mentir dès qu'on insère un appel au milieu : il rend la
 * réponse du voisin, et le test passe au vert pour une mauvaise raison.
 */

const MEETING_ID = '00000000-0000-0000-0000-000000000001'
const CLIENT_ID = '00000000-0000-0000-0000-0000000000c1'
const OPERATOR_ID = '00000000-0000-0000-0000-0000000000a1'
const RECORDING_ID = '00000000-0000-0000-0000-000000000099'
const DOCUMENT_ID = '00000000-0000-0000-0000-0000000000d1'

const DRIVE_URL = 'https://docs.google.com/file/d/rec123/view'
const DOCS_URL = 'https://docs.google.com/document/d/trans456/view'

const MEETING = {
  id: MEETING_ID,
  client_id: CLIENT_ID,
  operator_id: OPERATOR_ID,
  title: 'Point mensuel',
  status: 'scheduled',
  scheduled_at: '2026-10-15T09:00:00.000Z',
  started_at: null,
  ended_at: '2026-10-15T10:00:00.000Z',
  meet_space_name: 'spaces/abc123',
  metadata: {},
}

interface RouteOptions {
  conferenceRecords?: unknown[]
  recordings?: unknown[]
  transcripts?: unknown[]
  tokenOk?: boolean
  docsOk?: boolean
  driveExportOk?: boolean
  /** Export texte brut via Drive — le repli quand l'API Docs est refusée. */
  driveTextOk?: boolean
}

function routeFetch(options: RouteOptions = {}) {
  const {
    conferenceRecords = [
      {
        name: 'conferenceRecords/conf-xyz',
        startTime: '2026-10-15T09:02:00.000Z',
        endTime: '2026-10-15T09:48:00.000Z',
      },
    ],
    recordings = [{ driveDestination: { exportUri: DRIVE_URL } }],
    transcripts = [{ docsDestination: { exportUri: DOCS_URL }, state: 'FILE_GENERATED' }],
    tokenOk = true,
    docsOk = true,
    driveExportOk = true,
    driveTextOk = true,
  } = options

  const fetchMock = vi.fn(async (url: string) => {
    if (url.includes('oauth2.googleapis.com/token')) {
      return tokenOk
        ? { ok: true, json: async () => ({ access_token: 'tok' }) }
        : { ok: false, status: 401, json: async () => ({ error: 'invalid_grant' }) }
    }
    if (url.includes('/v2/conferenceRecords?')) {
      return { ok: true, json: async () => ({ conferenceRecords }) }
    }
    if (url.includes('/recordings')) {
      return { ok: true, json: async () => ({ recordings }) }
    }
    if (url.includes('/transcripts')) {
      return { ok: true, json: async () => ({ transcripts }) }
    }
    if (url.includes('docs.googleapis.com/v1/documents/')) {
      return docsOk
        ? {
            ok: true,
            json: async () => ({
              body: {
                content: [
                  { paragraph: { elements: [{ textRun: { content: 'MiKL : on attaque.\n' } }] } },
                ],
              },
            }),
          }
        : { ok: false, status: 403 }
    }
    if (url.includes('/drive/v3/files/')) {
      // Deux exports distincts sur la même route : le PDF archivé et le texte
      // brut. Les confondre ferait passer un test pour une mauvaise raison.
      if (url.includes('mimeType=text')) {
        return driveTextOk
          ? { ok: true, text: async () => 'MiKL : on attaque.' }
          : { ok: false, status: 403 }
      }
      return driveExportOk
        ? { ok: true, arrayBuffer: async () => new TextEncoder().encode('%PDF-1.4 fake').buffer }
        : { ok: false, status: 403 }
    }
    throw new Error(`URL non routée dans le test : ${url}`)
  })

  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

/** Jeu de réponses d'une synchro complète réussie, sans archivage préalable. */
function happyResponses(overrides: Record<string, unknown> = {}) {
  return {
    'meetings.select': { data: MEETING, error: null },
    'meetings.update': { data: null, error: null },
    'meeting_recordings.select': { data: null, error: null },
    'meeting_recordings.insert': { data: { id: RECORDING_ID }, error: null },
    // Le lien d'archivage est posé par un UPDATE conditionnel qui renvoie les
    // lignes touchées : une ligne = ce passage a gagné la course.
    'meeting_recordings.update': { data: [{ id: RECORDING_ID }], error: null },
    'document_folders.select': { data: null, error: null },
    'document_folders.insert': { data: { id: 'folder-1' }, error: null },
    'documents.insert': { data: { id: DOCUMENT_ID }, error: null },
    'activity_logs.insert': { data: null, error: null },
    ...overrides,
  }
}

beforeEach(() => {
  process.env.GOOGLE_MEET_REFRESH_TOKEN = 'refresh'
  process.env.GOOGLE_CLIENT_ID = 'id'
  process.env.GOOGLE_CLIENT_SECRET = 'secret'
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('syncMeetingResultsCore — garde-fous', () => {
  it('rend not_found quand la visio n’existe pas', async () => {
    const fake = createFakeSupabase({ responses: { 'meetings.select': { data: null, error: null } } })
    const result = await syncMeetingResultsCore(fake.client as never, MEETING_ID)
    expect(result.reason).toBe('not_found')
  })

  it('rend no_space quand la visio n’a pas de salle Google Meet', async () => {
    const fake = createFakeSupabase({
      responses: { 'meetings.select': { data: { ...MEETING, meet_space_name: null }, error: null } },
    })
    const result = await syncMeetingResultsCore(fake.client as never, MEETING_ID)
    expect(result.reason).toBe('no_space')
  })

  it('rend config_missing quand le refresh token Google est absent', async () => {
    delete process.env.GOOGLE_MEET_REFRESH_TOKEN
    const fake = createFakeSupabase({ responses: happyResponses() })
    const result = await syncMeetingResultsCore(fake.client as never, MEETING_ID)
    expect(result.reason).toBe('config_missing')
  })

  it('rend auth_error quand Google refuse le rafraîchissement du jeton', async () => {
    routeFetch({ tokenOk: false })
    const fake = createFakeSupabase({ responses: happyResponses() })
    const result = await syncMeetingResultsCore(fake.client as never, MEETING_ID)
    expect(result.reason).toBe('auth_error')
  })
})

describe('syncMeetingResultsCore — rattrapage', () => {
  it('rend not_ready et TRACE la tentative quand Google n’a encore rien publié', async () => {
    routeFetch({ conferenceRecords: [] })
    const fake = createFakeSupabase({ responses: happyResponses() })

    const result = await syncMeetingResultsCore(fake.client as never, MEETING_ID)

    expect(result.reason).toBe('not_ready')
    expect(result.synced).toBe(false)

    // Sans cette trace, le cron ne saurait jamais combien de fois il a essayé
    // ni pourquoi il a échoué — et l'écran ne pourrait rien en dire.
    const trace = fake.lastWrite('meetings', 'update')?.payload as {
      metadata: { transcript_sync: { attempts: number; lastReason: string } }
    }
    expect(trace.metadata.transcript_sync.attempts).toBe(1)
    expect(trace.metadata.transcript_sync.lastReason).toBe('not_ready')
  })

  it('incrémente le compteur de tentatives au lieu de l’écraser', async () => {
    routeFetch({ conferenceRecords: [] })
    const fake = createFakeSupabase({
      responses: happyResponses({
        'meetings.select': {
          data: { ...MEETING, metadata: { transcript_sync: { attempts: 4 } } },
          error: null,
        },
      }),
    })

    await syncMeetingResultsCore(fake.client as never, MEETING_ID)

    const trace = fake.lastWrite('meetings', 'update')?.payload as {
      metadata: { transcript_sync: { attempts: number } }
    }
    expect(trace.metadata.transcript_sync.attempts).toBe(5)
  })

  it('préserve les autres clés de metadata (la trace d’envoi du lien, par exemple)', async () => {
    routeFetch({ conferenceRecords: [] })
    const fake = createFakeSupabase({
      responses: happyResponses({
        'meetings.select': {
          data: { ...MEETING, metadata: { reminder_sent_at: '2026-10-14T08:00:00.000Z' } },
          error: null,
        },
      }),
    })

    await syncMeetingResultsCore(fake.client as never, MEETING_ID)

    const trace = fake.lastWrite('meetings', 'update')?.payload as {
      metadata: Record<string, unknown>
    }
    expect(trace.metadata.reminder_sent_at).toBe('2026-10-14T08:00:00.000Z')
  })
})

describe('syncMeetingResultsCore — écriture des résultats', () => {
  it('crée la ligne meeting_recordings quand il n’y en a pas', async () => {
    routeFetch()
    const fake = createFakeSupabase({ responses: happyResponses() })

    const result = await syncMeetingResultsCore(fake.client as never, MEETING_ID)

    expect(result.synced).toBe(true)
    expect(fake.lastWrite('meeting_recordings', 'insert')?.payload).toMatchObject({
      meeting_id: MEETING_ID,
      recording_url: DRIVE_URL,
      transcript_url: DOCS_URL,
      transcription_status: 'completed',
      transcript_text: 'MiKL : on attaque.',
    })
  })

  it('met à jour la ligne existante au lieu d’en créer une seconde', async () => {
    routeFetch()
    const fake = createFakeSupabase({
      responses: happyResponses({
        'meeting_recordings.select': {
          data: { id: RECORDING_ID, recording_url: DRIVE_URL, transcript_document_id: null },
          error: null,
        },
      }),
    })

    await syncMeetingResultsCore(fake.client as never, MEETING_ID)

    expect(fake.operations.some((o) => o.table === 'meeting_recordings' && o.op === 'insert')).toBe(
      false
    )
    // La ligne reçoit DEUX mises à jour : le résultat Google, puis le lien
    // vers le document déposé. On vise explicitement la première.
    const resultUpdate = fake.operations.find(
      (o) =>
        o.table === 'meeting_recordings' &&
        o.op === 'update' &&
        (o.payload as Record<string, unknown>).transcription_status !== undefined
    )
    expect(resultUpdate?.payload).toMatchObject({
      transcript_url: DOCS_URL,
      transcription_status: 'completed',
    })
  })

  it('RECOPIE les URL dans meetings — les 3 écrans lisent ces colonnes, pas meeting_recordings', async () => {
    routeFetch()
    const fake = createFakeSupabase({ responses: happyResponses() })

    await syncMeetingResultsCore(fake.client as never, MEETING_ID)

    const mirror = fake.operations.find(
      (o) =>
        o.table === 'meetings' &&
        o.op === 'update' &&
        (o.payload as Record<string, unknown>).transcript_url !== undefined
    )
    expect(mirror?.payload).toMatchObject({
      recording_url: DRIVE_URL,
      transcript_url: DOCS_URL,
    })
  })

  /**
   * ⚠️ DEFAUT REEL DU 16-10 : le PDF est arrive, le texte non. Les deux
   * viennent du meme document Google, mais par deux API differentes — et le
   * jeton ne portait que l'autorisation Drive. Elio se retrouvait avec un
   * compte rendu dans le dossier client et RIEN a en dire.
   */
  it('recupere le texte par Drive quand l’API Google Docs est refusee', async () => {
    routeFetch({ docsOk: false, driveTextOk: true })
    const fake = createFakeSupabase({ responses: happyResponses() })

    await syncMeetingResultsCore(fake.client as never, MEETING_ID)

    expect(fake.lastWrite('meeting_recordings', 'insert')?.payload).toMatchObject({
      transcript_text: 'MiKL : on attaque.',
    })
  })

  it('garde seulement l’URL quand AUCUNE des deux voies ne repond', async () => {
    routeFetch({ docsOk: false, driveTextOk: false })
    const fake = createFakeSupabase({ responses: happyResponses() })

    await syncMeetingResultsCore(fake.client as never, MEETING_ID)

    const payload = fake.lastWrite('meeting_recordings', 'insert')?.payload as Record<string, unknown>
    expect(payload.transcript_url).toBe(DOCS_URL)
    expect(payload.transcript_text).toBeUndefined()
  })

  it('n’interroge pas Drive pour rien quand l’API Docs a deja rendu le texte', async () => {
    const fetchMock = routeFetch()
    const fake = createFakeSupabase({ responses: happyResponses() })

    await syncMeetingResultsCore(fake.client as never, MEETING_ID)

    const textExports = fetchMock.mock.calls.filter(([url]) =>
      String(url).includes('mimeType=text')
    )
    expect(textExports).toHaveLength(0)
  })

  it('traduit l’état FAILED de Google en statut failed', async () => {
    routeFetch({
      transcripts: [{ docsDestination: { exportUri: DOCS_URL }, state: 'FAILED' }],
    })
    const fake = createFakeSupabase({ responses: happyResponses() })

    await syncMeetingResultsCore(fake.client as never, MEETING_ID)

    expect(fake.lastWrite('meeting_recordings', 'insert')?.payload).toMatchObject({
      transcription_status: 'failed',
    })
  })
})

describe('syncMeetingResultsCore — dépôt dans le dossier du client', () => {
  it('dépose le compte rendu et renvoie l’identifiant du document', async () => {
    routeFetch()
    const fake = createFakeSupabase({ responses: happyResponses() })

    const result = await syncMeetingResultsCore(fake.client as never, MEETING_ID)

    expect(result.archived).toBe(true)
    expect(result.documentId).toBe(DOCUMENT_ID)
    expect(fake.lastWrite('documents', 'insert')?.payload).toMatchObject({
      client_id: CLIENT_ID,
      operator_id: OPERATOR_ID,
      file_type: 'pdf',
      visibility: 'private',
    })
  })

  it('ne dépose PAS une seconde fois un compte rendu déjà archivé', async () => {
    routeFetch()
    const fake = createFakeSupabase({
      responses: happyResponses({
        'meeting_recordings.select': {
          data: { id: RECORDING_ID, recording_url: DRIVE_URL, transcript_document_id: DOCUMENT_ID },
          error: null,
        },
      }),
    })

    const result = await syncMeetingResultsCore(fake.client as never, MEETING_ID)

    expect(result.archived).toBe(false)
    expect(fake.operations.some((o) => o.table === 'documents' && o.op === 'insert')).toBe(false)
  })

  it('ne dépose rien quand la transcription n’est pas terminée', async () => {
    routeFetch({
      transcripts: [{ docsDestination: { exportUri: DOCS_URL }, state: 'STARTED' }],
    })
    const fake = createFakeSupabase({ responses: happyResponses() })

    const result = await syncMeetingResultsCore(fake.client as never, MEETING_ID)

    expect(result.transcriptReady).toBe(false)
    expect(result.archived).toBe(false)
    expect(fake.operations.some((o) => o.table === 'documents' && o.op === 'insert')).toBe(false)
  })

  it('DIT pourquoi rien n’est déposé quand la visio n’est rattachée à aucun client', async () => {
    routeFetch()
    const fake = createFakeSupabase({
      responses: happyResponses({
        'meetings.select': { data: { ...MEETING, client_id: null }, error: null },
      }),
    })

    const result = await syncMeetingResultsCore(fake.client as never, MEETING_ID)

    expect(result.archived).toBe(false)
    const trace = fake.lastWrite('meetings', 'update')?.payload as {
      metadata: { transcript_sync: { archiveSkipped: string } }
    }
    expect(trace.metadata.transcript_sync.archiveSkipped).toBe('no_client')
  })

  it('dépose un .txt quand Drive refuse l’export PDF (scope drive.readonly absent)', async () => {
    routeFetch({ driveExportOk: false })
    const fake = createFakeSupabase({ responses: happyResponses() })

    const result = await syncMeetingResultsCore(fake.client as never, MEETING_ID)

    expect(result.archived).toBe(true)
    expect(fake.lastWrite('documents', 'insert')?.payload).toMatchObject({ file_type: 'txt' })
  })

  it('MARQUE la visio terminée avec les horaires de Google, sans attendre un clic', async () => {
    // Defaut du 16-10 : MiKL a raccroche, le rendez-vous est reste
    // « Planifie » pour toujours — rien n'ecrivait ce statut. Google, lui,
    // sait quand l'appel s'est termine.
    routeFetch()
    const fake = createFakeSupabase({ responses: happyResponses() })

    await syncMeetingResultsCore(fake.client as never, MEETING_ID)

    expect(fake.lastWrite('meetings', 'update')?.payload).toMatchObject({
      status: 'completed',
      started_at: '2026-10-15T09:02:00.000Z',
      ended_at: '2026-10-15T09:48:00.000Z',
      duration_seconds: 2760,
    })
  })

  it('ne retouche pas le statut d’un rendez-vous annulé', async () => {
    routeFetch()
    const fake = createFakeSupabase({
      responses: happyResponses({
        'meetings.select': { data: { ...MEETING, status: 'cancelled' }, error: null },
      }),
    })

    await syncMeetingResultsCore(fake.client as never, MEETING_ID)

    const payload = fake.lastWrite('meetings', 'update')?.payload as Record<string, unknown>
    expect(payload.status).toBeUndefined()
  })

  it('retire son propre doublon quand un autre passage a archivé en premier', async () => {
    routeFetch()
    const fake = createFakeSupabase({
      responses: happyResponses({
        // 0 ligne touchée = le verrou `is('transcript_document_id', null)` a
        // déjà été posé par le cron pendant que le bouton travaillait.
        'meeting_recordings.update': { data: [], error: null },
      }),
    })

    const result = await syncMeetingResultsCore(fake.client as never, MEETING_ID)

    expect(result.archived).toBe(false)
    expect(fake.operations.some((o) => o.table === 'documents' && o.op === 'delete')).toBe(true)
    expect(fake.removed.length).toBe(1)
    // Rien de plus à tenter : le compte rendu EST déposé, par l'autre passage.
    const trace = fake.lastWrite('meetings', 'update')?.payload as {
      metadata: { transcript_sync: { done: boolean } }
    }
    expect(trace.metadata.transcript_sync.done).toBe(true)
  })

  it('la synchro reste un succès même si le dépôt échoue — la transcription est sauvée', async () => {
    routeFetch()
    const fake = createFakeSupabase({
      responses: happyResponses({
        'documents.insert': { data: null, error: { message: 'contrainte violée' } },
      }),
    })

    const result = await syncMeetingResultsCore(fake.client as never, MEETING_ID)

    expect(result.synced).toBe(true)
    expect(result.archived).toBe(false)
    // Le fichier orphelin est retiré du stockage, sinon il reste invisible et indestructible.
    expect(fake.removed.length).toBe(1)
  })
})
