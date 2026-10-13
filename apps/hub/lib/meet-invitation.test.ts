import { describe, it, expect } from 'vitest'
import { buildMeetInvitationBody } from './meet-invitation'

const base = {
  clientName: 'CSE Habitat 77',
  title: 'Point d’avancement',
  meetUri: 'https://meet.google.com/abc-defg-hij',
}

describe('buildMeetInvitationBody', () => {
  it('porte TOUJOURS le lien de la visio', () => {
    expect(buildMeetInvitationBody(base)).toContain('https://meet.google.com/abc-defg-hij')
  })

  it('nomme le client et signe l’envoi', () => {
    const body = buildMeetInvitationBody(base)
    expect(body).toContain('Bonjour CSE Habitat 77,')
    expect(body).toContain('MiKL — MonprojetPro')
  })

  it('annonce la date quand elle est fournie, en heure de Paris', () => {
    const body = buildMeetInvitationBody({ ...base, scheduledAt: '2026-10-20T07:00:00.000Z' })
    // 07:00 UTC = 09:00 à Paris (heure d'été)
    expect(body).toMatch(/09:00/)
    expect(body).toContain('20 octobre 2026')
  })

  it('se passe de date sans laisser de trou dans la phrase', () => {
    const body = buildMeetInvitationBody(base)
    expect(body).toContain('Voici le lien pour notre visioconférence « Point d’avancement »')
    expect(body).not.toMatch(/undefined|Invalid Date|NaN/)
  })

  it('insere le mot d’accompagnement avant le lien', () => {
    const body = buildMeetInvitationBody({ ...base, message: 'Je te montre la maquette.' })
    expect(body.indexOf('Je te montre la maquette.')).toBeLessThan(body.indexOf(base.meetUri))
  })

  it('ignore un mot d’accompagnement vide ou fait d’espaces', () => {
    const body = buildMeetInvitationBody({ ...base, message: '   ' })
    expect(body).not.toMatch(/\n\n\n\n/)
  })
})
