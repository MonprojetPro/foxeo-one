import { describe, it, expect } from 'vitest'
import { buildMimeMessage, encodeMimeHeader } from './mime'

const base = {
  from: 'contact@monprojet-pro.com',
  to: 'client@exemple.fr',
  subject: 'Sujet simple',
  text: 'Bonjour,\nVoici le lien.',
}

function decodeBase64Body(raw: string): string {
  const body = raw.split('\r\n\r\n').slice(1).join('\r\n\r\n')
  return Buffer.from(body.replace(/\r\n/g, ''), 'base64').toString('utf-8')
}

describe('encodeMimeHeader', () => {
  // LE BUG EXACT VU PAR MiKL : « Visio MonprojetPro Ã¢Â€Â" … »
  it('encode un objet contenant un tiret cadratin (le bug du 15-10)', () => {
    const encoded = encodeMimeHeader('Visio MonprojetPro — test visio')

    expect(encoded).toMatch(/^=\?UTF-8\?B\?.+\?=$/)
    const payload = encoded.slice('=?UTF-8?B?'.length, -2)
    expect(Buffer.from(payload, 'base64').toString('utf-8')).toBe(
      'Visio MonprojetPro — test visio'
    )
  })

  it('encode les accents et les apostrophes typographiques', () => {
    for (const v of ['Réunion prévue', 'Rendez-vous d’équipe', 'Élio']) {
      const encoded = encodeMimeHeader(v)
      const payload = encoded.slice('=?UTF-8?B?'.length, -2)
      expect(Buffer.from(payload, 'base64').toString('utf-8')).toBe(v)
    }
  })

  it('laisse un objet ASCII lisible, sans encoder par principe', () => {
    expect(encodeMimeHeader('Invitation visio')).toBe('Invitation visio')
  })

  it('ne laisse JAMAIS passer un caractere non-ASCII en clair', () => {
    const encoded = encodeMimeHeader('Café — thé')
    // eslint-disable-next-line no-control-regex
    expect(/[^\x20-\x7E]/.test(encoded)).toBe(false)
  })
})

describe('buildMimeMessage', () => {
  it('declare l’encodage qu’il applique REELLEMENT (base64, pas quoted-printable)', () => {
    const raw = buildMimeMessage(base)

    expect(raw).toContain('Content-Transfer-Encoding: base64')
    expect(raw).not.toContain('quoted-printable')
  })

  it('transporte le texte sans le deformer', () => {
    const text = 'Ligne avec = et é\nhttps://meet.google.com/abc-defg-hij'
    const raw = buildMimeMessage({ ...base, text })

    expect(decodeBase64Body(raw)).toBe(text)
  })

  it('survit a une ligne tres longue (le cas qui cassait le quoted-printable)', () => {
    const text = `Lien : https://meet.google.com/${'x'.repeat(1500)}`
    const raw = buildMimeMessage({ ...base, text })

    expect(decodeBase64Body(raw)).toBe(text)
    // Aucune ligne encodée ne doit dépasser la limite MIME de 998 caractères.
    for (const line of raw.split('\r\n')) {
      expect(line.length).toBeLessThanOrEqual(998)
    }
  })

  it('porte les en-tetes d’identite et de fil de discussion', () => {
    const raw = buildMimeMessage({ ...base, inReplyTo: '<a@b>', references: '<a@b>' })

    expect(raw).toContain('From: contact@monprojet-pro.com')
    expect(raw).toContain('To: client@exemple.fr')
    expect(raw).toContain('In-Reply-To: <a@b>')
    expect(raw).toContain('References: <a@b>')
  })

  it('en HTML, garde TOUJOURS une version texte lisible', () => {
    const raw = buildMimeMessage({ ...base, html: '<p>Bonjour</p>' })

    expect(raw).toContain('multipart/alternative')
    expect(raw).toContain('Content-Type: text/plain; charset=UTF-8')
    expect(raw).toContain('Content-Type: text/html; charset=UTF-8')
    // Les deux corps sont présents et décodables.
    expect(raw).toContain(Buffer.from('<p>Bonjour</p>', 'utf-8').toString('base64'))
    expect(raw).toContain(Buffer.from(base.text, 'utf-8').toString('base64'))
  })

  it('ferme correctement le message multipart', () => {
    const raw = buildMimeMessage({ ...base, html: '<p>x</p>' })
    const boundary = /boundary="([^"]+)"/.exec(raw)?.[1]

    expect(boundary).toBeDefined()
    expect(raw.trimEnd().endsWith(`--${boundary}--`)).toBe(true)
    expect(raw.split(`--${boundary}`).length - 1).toBe(3) // 2 parties + clôture
  })

  it('reste en texte simple quand aucun HTML n’est fourni', () => {
    expect(buildMimeMessage(base)).not.toContain('multipart')
  })
})
