import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PdfDownloadButton } from './pdf-download-button'

describe('PdfDownloadButton', () => {
  it('affiche un lien cliquable quand fileUrl est fourni', () => {
    render(<PdfDownloadButton fileUrl="https://pennylane.com/doc.pdf" />)
    const link = screen.getByRole('link', { name: 'Télécharger PDF' })
    expect(link).toBeDefined()
    expect(link.getAttribute('href')).toBe('https://pennylane.com/doc.pdf')
    expect(link.getAttribute('target')).toBe('_blank')
  })

  it('affiche un bouton désactivé quand fileUrl est null', () => {
    render(<PdfDownloadButton fileUrl={null} />)
    expect(screen.queryByRole('link')).toBeNull()
    const disabled = screen.getByTitle('PDF en cours de génération')
    expect(disabled).toBeDefined()
  })

  it('affiche un bouton désactivé quand fileUrl est undefined', () => {
    render(<PdfDownloadButton fileUrl={undefined} />)
    const disabled = screen.getByTitle('PDF en cours de génération')
    expect(disabled).toBeDefined()
  })
})
