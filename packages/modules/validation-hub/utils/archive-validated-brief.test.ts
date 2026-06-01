import { describe, it, expect, vi, beforeEach } from 'vitest'
import { archiveValidatedBriefAsDocument } from './archive-validated-brief'

const CLIENT_ID = '550e8400-e29b-41d4-a716-446655440002'
const OPERATOR_ID = '550e8400-e29b-41d4-a716-446655440003'

function baseRequest(overrides: Record<string, unknown> = {}) {
  return {
    client_id: CLIENT_ID,
    operator_id: OPERATOR_ID,
    type: 'step_submission',
    title: 'Brief Positionnement',
    content: 'Voici le positionnement du projet.',
    ...overrides,
  }
}

function buildSupabaseMock({
  uploadError = null as unknown,
  insertError = null as unknown,
} = {}) {
  const upload = vi.fn().mockResolvedValue({ data: { path: 'p' }, error: uploadError })
  const remove = vi.fn().mockResolvedValue({ error: null })
  const insert = vi.fn().mockResolvedValue({ error: insertError })
  return {
    mock: {
      storage: { from: vi.fn(() => ({ upload, remove })) },
      from: vi.fn(() => ({ insert })),
    },
    upload,
    remove,
    insert,
  }
}

describe('archiveValidatedBriefAsDocument', () => {
  beforeEach(() => vi.clearAllMocks())

  it('archive un step_submission validé : upload Storage + insert documents (shared/operator)', async () => {
    const { mock, upload, insert } = buildSupabaseMock()

    await archiveValidatedBriefAsDocument(mock as never, baseRequest())

    expect(upload).toHaveBeenCalledTimes(1)
    const [storagePath] = upload.mock.calls[0]
    expect(storagePath).toMatch(new RegExp(`^${OPERATOR_ID}/${CLIENT_ID}/.*\\.md$`))

    expect(insert).toHaveBeenCalledTimes(1)
    const insertArg = insert.mock.calls[0][0]
    expect(insertArg).toMatchObject({
      client_id: CLIENT_ID,
      operator_id: OPERATOR_ID,
      name: 'Brief Positionnement.md',
      file_type: 'md',
      visibility: 'shared',
      uploaded_by: 'operator',
    })
    expect(insertArg.file_size).toBeGreaterThan(0)
  })

  it('archive aussi le type legacy brief_lab', async () => {
    const { mock, insert } = buildSupabaseMock()
    await archiveValidatedBriefAsDocument(mock as never, baseRequest({ type: 'brief_lab' }))
    expect(insert).toHaveBeenCalledTimes(1)
  })

  it('ignore les types non archivables (evolution_one)', async () => {
    const { mock, upload, insert } = buildSupabaseMock()
    await archiveValidatedBriefAsDocument(mock as never, baseRequest({ type: 'evolution_one' }))
    expect(upload).not.toHaveBeenCalled()
    expect(insert).not.toHaveBeenCalled()
  })

  it('ignore un contenu vide', async () => {
    const { mock, upload } = buildSupabaseMock()
    await archiveValidatedBriefAsDocument(mock as never, baseRequest({ content: '   ' }))
    expect(upload).not.toHaveBeenCalled()
  })

  it('n’insère pas en DB si l’upload Storage échoue', async () => {
    const { mock, insert } = buildSupabaseMock({ uploadError: { message: 'storage down' } })
    await archiveValidatedBriefAsDocument(mock as never, baseRequest())
    expect(insert).not.toHaveBeenCalled()
  })

  it('nettoie le fichier orphelin si l’insert DB échoue', async () => {
    const { mock, remove } = buildSupabaseMock({ insertError: { message: 'db down' } })
    await archiveValidatedBriefAsDocument(mock as never, baseRequest())
    expect(remove).toHaveBeenCalledTimes(1)
  })

  it('ne propage jamais d’erreur (best-effort)', async () => {
    const broken = { storage: { from: () => { throw new Error('boom') } } }
    await expect(
      archiveValidatedBriefAsDocument(broken as never, baseRequest())
    ).resolves.toBeUndefined()
  })
})
