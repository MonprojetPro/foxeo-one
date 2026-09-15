import { describe, expect, it } from 'vitest'
import {
  isImageAttachment,
  formatAttachmentSize,
  isAttachmentUrlExpired,
} from './attachments'
import type { ContactAttachment } from '../types'

function att(over: Partial<ContactAttachment> = {}): ContactAttachment {
  return {
    id: 'att_x',
    file_name: 'capture.png',
    mime_type: 'image/png',
    url: 'https://example.test/signed',
    url_expires_at: '2026-09-15T12:00:00+00:00',
    ...over,
  }
}

describe('isImageAttachment', () => {
  it('reconnait les 6 types image du bucket MenuFacile', () => {
    for (const t of ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/heic', 'image/heif']) {
      expect(isImageAttachment(att({ mime_type: t }))).toBe(true)
    }
  })

  it('exclut le PDF et le type de repli', () => {
    expect(isImageAttachment(att({ mime_type: 'application/pdf' }))).toBe(false)
    // Le guichet retombe sur ce type quand l'extension est inconnue : il ne doit
    // JAMAIS finir en <img>, sans quoi la vignette casserait a coup sur.
    expect(isImageAttachment(att({ mime_type: 'application/octet-stream' }))).toBe(false)
  })
})

describe('formatAttachmentSize', () => {
  it('rend null quand le guichet n a pas releve la taille', () => {
    expect(formatAttachmentSize(undefined)).toBeNull()
    expect(formatAttachmentSize(0)).toBeNull()
  })

  it('choisit l unite selon l ordre de grandeur', () => {
    expect(formatAttachmentSize(512)).toBe('512 o')
    expect(formatAttachmentSize(2048)).toBe('2 Ko')
    expect(formatAttachmentSize(3 * 1024 * 1024)).toBe('3.0 Mo')
  })

  it('couvre la limite de 10 Mo du bucket', () => {
    expect(formatAttachmentSize(10 * 1024 * 1024)).toBe('10.0 Mo')
  })
})

describe('isAttachmentUrlExpired', () => {
  const now = Date.parse('2026-09-15T12:00:00+00:00')

  it('considere expiree une URL dont l echeance est passee', () => {
    expect(isAttachmentUrlExpired(att({ url_expires_at: '2026-09-15T11:59:00+00:00' }), now)).toBe(true)
  })

  it('anticipe l echeance imminente (marge de securite)', () => {
    // Echeance dans 10 s : le temps d ouvrir, le lien serait mort.
    expect(isAttachmentUrlExpired(att({ url_expires_at: '2026-09-15T12:00:10+00:00' }), now)).toBe(true)
  })

  it('laisse passer une URL fraiche', () => {
    expect(isAttachmentUrlExpired(att({ url_expires_at: '2026-09-15T12:59:00+00:00' }), now)).toBe(false)
  })

  it('lit l UTC quelle que soit sa notation', () => {
    // SONDE REELLE du 2026-09-15 : le guichet ecrit « …284Z » (toISOString).
    // Les deux notations doivent etre lues pareil — un parseur qui prendrait
    // l une pour de l heure locale renouvellerait l URL a chaque affichage.
    expect(isAttachmentUrlExpired(att({ url_expires_at: '2026-09-15T13:00:00.284Z' }), now)).toBe(false)
    expect(isAttachmentUrlExpired(att({ url_expires_at: '2026-09-15T13:00:00+00:00' }), now)).toBe(false)
  })

  it('ne renouvelle pas en boucle sur une date illisible', () => {
    expect(isAttachmentUrlExpired(att({ url_expires_at: 'pas-une-date' }), now)).toBe(false)
  })
})
