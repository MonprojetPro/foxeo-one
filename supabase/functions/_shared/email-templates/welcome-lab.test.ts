import { describe, it, expect } from 'vitest'
import { welcomeLabEmailTemplate } from './welcome-lab'

describe('welcomeLabEmailTemplate', () => {
  const data = {
    clientName: 'Alice Dupont',
    parcoursName: 'Parcours Complet',
    activationLink: 'https://lab.monprojet-pro.com/activate?client_id=123',
  }

  it('includes client name', () => {
    const html = welcomeLabEmailTemplate(data)
    expect(html).toContain('Alice Dupont')
  })

  it('includes parcours name', () => {
    const html = welcomeLabEmailTemplate(data)
    expect(html).toContain('Parcours Complet')
  })

  it('includes activation link', () => {
    const html = welcomeLabEmailTemplate(data)
    expect(html).toContain('https://lab.monprojet-pro.com/activate?client_id=123')
  })

  it('contains CTA button text', () => {
    const html = welcomeLabEmailTemplate(data)
    expect(html).toContain('Activer mon espace Lab')
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
