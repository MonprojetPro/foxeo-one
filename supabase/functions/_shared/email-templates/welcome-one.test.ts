import { describe, it, expect } from 'vitest'
import { welcomeOneEmailTemplate } from './welcome-one'

describe('welcomeOneEmailTemplate', () => {
  const activationLink = 'https://app.monprojet-pro.com/api/auth/callback?next=/reset-password&code=abc'

  it('includes client name and the CTA link', () => {
    const html = welcomeOneEmailTemplate({
      clientName: 'Alice Dupont',
      activationLink,
      temporaryPassword: null,
    })
    expect(html).toContain('Alice Dupont')
    expect(html).toContain('https://app.monprojet-pro.com/api/auth/callback?next=/reset-password&amp;code=abc')
  })

  it('shows the plaintext temporary password when provided (chemin paiement existant)', () => {
    const html = welcomeOneEmailTemplate({
      clientName: 'Alice Dupont',
      activationLink,
      temporaryPassword: 'Tmp-Pass-01',
    })
    expect(html).toContain('Tmp-Pass-01')
    expect(html).toContain('devrez le changer lors de votre première connexion')
  })

  // T-067 — nouveau compte via lien recovery (one direct, sans Lab), jamais de mot de
  // passe en clair : le texte doit inviter à EN DÉFINIR un, pas prétendre qu'il existe déjà.
  it('invites to set a password when needsPasswordSetup is true and no plaintext password', () => {
    const html = welcomeOneEmailTemplate({
      clientName: 'Alice Dupont',
      activationLink,
      temporaryPassword: null,
      needsPasswordSetup: true,
    })
    expect(html).toContain('définir votre mot de passe')
    expect(html).not.toContain('mot de passe que vous avez déjà définis')
  })

  it('assumes an already-defined password when neither a temp password nor needsPasswordSetup is given (compte réactivé)', () => {
    const html = welcomeOneEmailTemplate({
      clientName: 'Alice Dupont',
      activationLink,
      temporaryPassword: null,
    })
    expect(html).toContain('mot de passe que vous avez déjà définis')
  })

  it('never embeds a plaintext password when none is provided', () => {
    const html = welcomeOneEmailTemplate({
      clientName: 'Alice Dupont',
      activationLink,
      temporaryPassword: null,
      needsPasswordSetup: true,
    })
    expect(html.toLowerCase()).not.toContain('mot de passe temporaire')
  })

  it('escapes HTML in client name to prevent XSS', () => {
    const html = welcomeOneEmailTemplate({
      clientName: '<script>alert("xss")</script>',
      activationLink,
      temporaryPassword: null,
    })
    expect(html).not.toContain('<script>')
    expect(html).toContain('&lt;script&gt;')
  })

  it('returns valid HTML document', () => {
    const html = welcomeOneEmailTemplate({ clientName: 'Alice', activationLink, temporaryPassword: null })
    expect(html).toContain('<!DOCTYPE html>')
    expect(html).toContain('</html>')
  })
})
