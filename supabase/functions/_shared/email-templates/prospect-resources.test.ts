import { describe, it, expect } from 'vitest'
import { prospectResourcesEmailTemplate } from './prospect-resources'

describe('prospectResourcesEmailTemplate', () => {
  const data = {
    links: [
      { name: 'Guide démarrage.pdf', url: 'https://storage.example.com/signed/guide.pdf' },
      { name: 'Présentation MonprojetPro.pdf', url: 'https://storage.example.com/signed/preso.pdf' },
    ],
  }

  it('includes all link names', () => {
    const html = prospectResourcesEmailTemplate(data)
    expect(html).toContain('Guide démarrage.pdf')
    expect(html).toContain('Présentation MonprojetPro.pdf')
  })

  it('includes all link URLs', () => {
    const html = prospectResourcesEmailTemplate(data)
    expect(html).toContain('https://storage.example.com/signed/guide.pdf')
    expect(html).toContain('https://storage.example.com/signed/preso.pdf')
  })

  it('mentions 7 day validity', () => {
    const html = prospectResourcesEmailTemplate(data)
    expect(html).toContain('7 jours')
  })

  it('handles empty links array gracefully', () => {
    const html = prospectResourcesEmailTemplate({ links: [] })
    expect(html).toContain('<!DOCTYPE html>')
    expect(html).not.toContain('<li')
  })

  it('escapes HTML in link names to prevent XSS', () => {
    const maliciousData = {
      links: [{ name: '<script>alert("xss")</script>', url: 'https://safe.example.com' }],
    }
    const html = prospectResourcesEmailTemplate(maliciousData)
    expect(html).not.toContain('<script>alert')
    expect(html).toContain('&lt;script&gt;')
  })

  it('returns valid HTML document', () => {
    const html = prospectResourcesEmailTemplate(data)
    expect(html).toContain('<!DOCTYPE html>')
    expect(html).toContain('</html>')
  })

  it('escapes double quotes in URLs to prevent HTML injection', () => {
    const maliciousData = {
      links: [{ name: 'Safe.pdf', url: 'https://example.com/file?a="onmouseover="alert(1)' }],
    }
    const html = prospectResourcesEmailTemplate(maliciousData)
    expect(html).not.toContain('href="https://example.com/file?a="onmouseover')
    expect(html).toContain('&quot;')
  })
})
