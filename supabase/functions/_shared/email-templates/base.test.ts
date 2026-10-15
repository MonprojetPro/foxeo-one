import { describe, it, expect } from 'vitest'
import { baseTemplate, escapeHtml } from './base'

describe('baseTemplate', () => {
  it('should render title in h2', () => {
    const html = baseTemplate({ title: 'Mon Titre', body: '<p>Corps</p>' })
    expect(html).toContain('Mon Titre')
    expect(html).toContain('<h2')
  })

  it('should render body content', () => {
    const html = baseTemplate({ title: 'T', body: '<p>Corps important</p>' })
    expect(html).toContain('<p>Corps important</p>')
  })

  it('should render CTA button when ctaUrl provided', () => {
    const html = baseTemplate({
      title: 'T',
      body: 'B',
      ctaUrl: 'https://monprojet-pro.com/dashboard',
      ctaText: 'Voir le tableau de bord',
    })
    expect(html).toContain('https://monprojet-pro.com/dashboard')
    expect(html).toContain('Voir le tableau de bord')
    expect(html).toContain('<a href=')
  })

  it('should NOT render CTA button when ctaUrl is absent', () => {
    const html = baseTemplate({ title: 'T', body: 'B' })
    // CTA button has inline-block style — unsubscribe link is always present
    expect(html).not.toContain('inline-block')
    expect(html).not.toContain('display:inline-block')
  })

  it('should include unsubscribe link placeholder', () => {
    const html = baseTemplate({ title: 'T', body: 'B' })
    expect(html).toContain('Se désabonner')
  })

  // T-057 — ce test exigeait auparavant `monprojetpro.biz/logo.png`, un domaine
  // qui n'existe plus. Il VERROUILLAIT donc le bug : il serait resté vert
  // pendant que tous les emails clients affichaient une image brisée. Un test
  // qui fige une valeur sans vérifier qu'elle marche protège l'erreur.
  it('porte la marque MonprojetPro sans dependre d’une image distante', () => {
    const html = baseTemplate({ title: 'T', body: 'B' })
    expect(html).toContain('MonprojetPro')
  })

  it('n’affiche AUCUNE image tant qu’aucune URL publique n’est configuree', () => {
    const html = baseTemplate({ title: 'T', body: 'B' })
    expect(html).not.toContain('<img')
  })

  it('ne reference plus le domaine mort du rebrand', () => {
    const html = baseTemplate({ title: 'T', body: 'B' })
    expect(html).not.toContain('monprojetpro.biz')
  })

  it('should escape HTML in title to prevent XSS', () => {
    const html = baseTemplate({ title: '<script>alert("xss")</script>', body: 'B' })
    expect(html).not.toContain('<script>')
    expect(html).toContain('&lt;script&gt;')
  })

  it('should be valid HTML with doctype', () => {
    const html = baseTemplate({ title: 'T', body: 'B' })
    expect(html).toContain('<!DOCTYPE html>')
    expect(html).toContain('<html')
    expect(html).toContain('</html>')
  })
})
