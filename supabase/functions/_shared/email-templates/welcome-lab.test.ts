import { describe, it, expect } from 'vitest'
import { welcomeLabEmailTemplate } from './welcome-lab'

describe('welcomeLabEmailTemplate', () => {
  const data = {
    clientName: 'Alice Dupont',
    firstStepLabel: 'Identité de marque',
    activationLink: 'https://app.monprojet-pro.com/api/auth/callback?next=/reset-password&code=abc',
  }

  it('includes client name', () => {
    const html = welcomeLabEmailTemplate(data)
    expect(html).toContain('Alice Dupont')
  })

  it('includes the first step label', () => {
    const html = welcomeLabEmailTemplate(data)
    expect(html).toContain('Identité de marque')
  })

  it('includes the activation (password-setup) link', () => {
    const html = welcomeLabEmailTemplate(data)
    expect(html).toContain('https://app.monprojet-pro.com/api/auth/callback?next=/reset-password&amp;code=abc')
  })

  it('contains the password-setup CTA button text', () => {
    const html = welcomeLabEmailTemplate(data)
    expect(html).toContain('Définir mon mot de passe')
  })

  it('never embeds a plaintext temporary password', () => {
    const html = welcomeLabEmailTemplate(data)
    expect(html.toLowerCase()).not.toContain('mot de passe temporaire')
  })

  it('escapes HTML in client name to prevent XSS', () => {
    const maliciousData = { ...data, clientName: '<script>alert("xss")</script>' }
    const html = welcomeLabEmailTemplate(maliciousData)
    expect(html).not.toContain('<script>')
    expect(html).toContain('&lt;script&gt;')
  })

  it('returns valid HTML document', () => {
    const html = welcomeLabEmailTemplate(data)
    expect(html).toContain('<!DOCTYPE html>')
    expect(html).toContain('</html>')
  })
})
