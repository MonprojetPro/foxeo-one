import { describe, it, expect } from 'vitest'
import { validationEmailTemplate } from './validation'

describe('validationEmailTemplate', () => {
  it('should render VALIDATED email with green outcome', () => {
    const html = validationEmailTemplate({
      clientName: 'Alice Dupont',
      briefTitle: 'Mon brief identité visuelle',
      outcome: 'validated',
      comment: 'Excellent travail !',
      platformUrl: 'https://lab.monprojet-pro.com',
    })
    expect(html).toContain('Alice Dupont')
    expect(html).toContain('Mon brief identité visuelle')
    expect(html).toContain('validé')
    expect(html).toContain('Excellent travail !')
    expect(html).toContain('https://lab.monprojet-pro.com')
    expect(html).toContain('<!DOCTYPE html>')
  })

  it('should render REFUSED email with refused messaging', () => {
    const html = validationEmailTemplate({
      clientName: 'Bob Martin',
      briefTitle: 'Brief logo',
      outcome: 'refused',
      platformUrl: 'https://lab.monprojet-pro.com',
    })
    expect(html).toContain('refusé')
    expect(html).toContain('Bob Martin')
  })

  it('should work without optional comment', () => {
    const html = validationEmailTemplate({
      clientName: 'Alice',
      briefTitle: 'Brief',
      outcome: 'validated',
      platformUrl: 'https://lab.monprojet-pro.com',
    })
    expect(html).toContain('<!DOCTYPE html>')
  })
})
