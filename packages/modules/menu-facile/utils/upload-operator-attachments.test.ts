import { describe, expect, it, vi } from 'vitest'
import { uploadOperatorAttachments, canSendReply, type UploadDeps } from './upload-operator-attachments'

function file(name = 'capture.png', type = 'image/png', size = 1000): File {
  const f = new File(['x'], name, { type })
  // `size` d'un File est en lecture seule : on le force pour les cas de poids.
  Object.defineProperty(f, 'size', { value: size })
  return f
}

function deps(over: Partial<UploadDeps> = {}): UploadDeps {
  return {
    compress: async (f) => f,
    createUploadUrl: async () => ({
      data: { attachment_id: 'att_1', upload_url: 'https://storage.test/signed' },
      error: null,
    }),
    put: async () => ({ ok: true, status: 200 }),
    ...over,
  }
}

describe('uploadOperatorAttachments', () => {
  it('ne fait aucun appel quand il n y a pas de fichier', async () => {
    const createUploadUrl = vi.fn()
    const res = await uploadOperatorAttachments('t1', [], deps({ createUploadUrl }))
    expect(res).toEqual({ ok: true, attachmentIds: [] })
    expect(createUploadUrl).not.toHaveBeenCalled()
  })

  it('rend les identifiants dans l ordre des fichiers', async () => {
    let n = 0
    const res = await uploadOperatorAttachments(
      't1',
      [file('a.png'), file('b.png')],
      deps({
        createUploadUrl: async () => ({
          data: { attachment_id: `att_${++n}`, upload_url: 'https://storage.test/x' },
          error: null,
        }),
      }),
    )
    expect(res).toEqual({ ok: true, attachmentIds: ['att_1', 'att_2'] })
  })

  it('compresse AVANT de demander l URL', async () => {
    // Le guichet impose l extension d apres le mime_type declare : declarer le
    // fichier d origine puis envoyer le compresse produirait une vignette cassee.
    const declared: Array<{ mimeType: string; sizeBytes: number }> = []
    await uploadOperatorAttachments(
      't1',
      [file('photo.png', 'image/png', 900_000)],
      deps({
        compress: async () => file('photo.webp', 'image/webp', 90_000),
        createUploadUrl: async (input) => {
          declared.push({ mimeType: input.mimeType, sizeBytes: input.sizeBytes })
          return { data: { attachment_id: 'att_1', upload_url: 'https://x' }, error: null }
        },
      }),
    )
    expect(declared).toEqual([{ mimeType: 'image/webp', sizeBytes: 90_000 }])
  })

  it('refuse au-dela de 3 pieces sans appeler le guichet', async () => {
    const createUploadUrl = vi.fn()
    const res = await uploadOperatorAttachments(
      't1',
      [file('a.png'), file('b.png'), file('c.png'), file('d.png')],
      deps({ createUploadUrl }),
    )
    expect(res.ok).toBe(false)
    expect(createUploadUrl).not.toHaveBeenCalled()
  })

  it('refuse un type non accepte avec un message lisible, pas un code HTTP', async () => {
    const res = await uploadOperatorAttachments(
      't1',
      [file('virus.exe', 'application/x-msdownload')],
      deps(),
    )
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.message).toContain('virus.exe')
  })

  it('s arrete au premier echec et signale ce qui etait deja parti', async () => {
    // Tout ou rien : une reponse annoncant 2 captures et n en portant qu une
    // est pire que pas de reponse du tout.
    let n = 0
    const res = await uploadOperatorAttachments(
      't1',
      [file('a.png'), file('b.png')],
      deps({
        createUploadUrl: async () => {
          n += 1
          if (n === 2) return { data: null, error: { message: 'Fil sans destinataire.' } }
          return { data: { attachment_id: 'att_1', upload_url: 'https://x' }, error: null }
        },
      }),
    )
    expect(res.ok).toBe(false)
    if (!res.ok) {
      expect(res.message).toBe('Fil sans destinataire.')
      expect(res.uploadedBeforeFailure).toEqual(['att_1'])
    }
  })

  it('remonte un echec de depot reseau avec son code', async () => {
    const res = await uploadOperatorAttachments(
      't1',
      [file('a.png')],
      deps({ put: async () => ({ ok: false, status: 403 }) }),
    )
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.message).toContain('403')
  })

  it('n envoie rien quand le guichet refuse : aucun PUT apres un refus', async () => {
    const put = vi.fn(async () => ({ ok: true, status: 200 }))
    await uploadOperatorAttachments(
      't1',
      [file('a.png')],
      deps({
        createUploadUrl: async () => ({ data: null, error: { message: 'Type refusé' } }),
        put,
      }),
    )
    expect(put).not.toHaveBeenCalled()
  })
})

describe('canSendReply', () => {
  it('accepte un texte seul', () => {
    expect(canSendReply('Bonjour', 0)).toBe(true)
  })

  it('accepte une capture seule (usage normal, autorise par le guichet v16)', () => {
    expect(canSendReply('', 1)).toBe(true)
    expect(canSendReply('   ', 1)).toBe(true)
  })

  it('refuse le vide integral', () => {
    expect(canSendReply('', 0)).toBe(false)
    expect(canSendReply('   \n ', 0)).toBe(false)
  })
})
