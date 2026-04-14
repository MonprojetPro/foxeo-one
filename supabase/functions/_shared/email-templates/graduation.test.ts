import { describe, it, expect } from 'vitest'
import { graduationEmailTemplate } from './graduation'

describe('graduationEmailTemplate', () => {
  it('should render client name and One dashboard URL', () => {
    const html = graduationEmailTemplate({
      clientName: 'Marie Curie',
      oneUrl: 'https://marie-curie.monprojet-pro.com',
    })
    expect(html).toContain('Marie Curie')
    expect(html).toContain('https://marie-curie.monprojet-pro.com')
    expect(html).toContain('<!DOCTYPE html>')
  })

  it('should contain graduation congratulation messaging', () => {
    const html = graduationEmailTemplate({
      clientName: 'Jean Valjean',
      oneUrl: 'https://jean-valjean.monprojet-pro.com',
    })
    expect(html).toContain('Félicitations')
    expect(html).toContain('One')
  })

  it('should include CTA to One dashboard', () => {
    const html = graduationEmailTemplate({
      clientName: 'Alice',
      oneUrl: 'https://alice.monprojet-pro.com',
    })
    expect(html).toContain('alice.monprojet-pro.com')
    expect(html).toContain('<a href=')
  })
})
