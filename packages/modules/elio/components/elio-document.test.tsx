import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ElioDocument } from './elio-document'

const mockPush = vi.fn()
const mockOpen = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}))

// Mock window.open
Object.defineProperty(window, 'open', { value: mockOpen, writable: true })

vi.mock('@foxeo/ui', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>()
  return {
    ...actual,
    Button: ({ children, onClick, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { children: React.ReactNode }) => (
      <button onClick={onClick} {...props}>{children}</button>
    ),
  }
})

describe('ElioDocument', () => {
  it('affiche le nom du document', () => {
    render(
      <ElioDocument
        documentId="doc-1"
        documentName="Brief marketing"
        documentType="pdf"
      />
    )
    expect(screen.getByText('Brief marketing')).toBeDefined()
  })

  it('affiche le badge "Brief généré par Élio" si isElioGenerated', () => {
    render(
      <ElioDocument
        documentId="doc-1"
        documentName="Brief auto"
        documentType="markdown"
        isElioGenerated
      />
    )
    expect(screen.getByTestId('elio-generated-badge')).toBeDefined()
  })

  it('n\'affiche pas le badge si isElioGenerated est false', () => {
    render(
      <ElioDocument
        documentId="doc-1"
        documentName="Fichier normal"
        documentType="pdf"
        isElioGenerated={false}
      />
    )
    expect(screen.queryByTestId('elio-generated-badge')).toBeNull()
  })

  it('affiche l\'aperçu si preview fourni', () => {
    render(
      <ElioDocument
        documentId="doc-1"
        documentName="Doc"
        documentType="pdf"
        preview="Voici le contenu du document"
      />
    )
    expect(screen.getByText('Voici le contenu du document')).toBeDefined()
  })

  it('navigue vers le module documents au clic "Voir le document complet"', () => {
    render(
      <ElioDocument
        documentId="doc-abc"
        documentName="Mon doc"
        documentType="doc"
      />
    )
    fireEvent.click(screen.getByTestId('view-document-btn'))
    expect(mockPush).toHaveBeenCalledWith('/modules/documents/doc-abc')
  })

  it('ouvre le lien de téléchargement dans un nouvel onglet', () => {
    render(
      <ElioDocument
        documentId="doc-abc"
        documentName="Mon doc"
        documentType="pdf"
      />
    )
    fireEvent.click(screen.getByTestId('download-document-btn'))
    expect(mockOpen).toHaveBeenCalledWith('/api/documents/doc-abc/download', '_blank')
  })

  it('rend pour chaque type de document', () => {
    const types = ['pdf', 'doc', 'image', 'markdown'] as const
    types.forEach((type) => {
      const { unmount } = render(
        <ElioDocument documentId={`doc-${type}`} documentName={`Doc ${type}`} documentType={type} />
      )
      expect(screen.getByTestId('elio-document')).toBeDefined()
      unmount()
    })
  })
})

describe('ElioDocument — Story 8.9b — Actions documents générés', () => {
  it('Task 7.2 — affiche le bouton "Télécharger en PDF" si pdfUrl et isElioGenerated', () => {
    render(
      <ElioDocument
        documentId="doc-1"
        documentName="Attestation"
        documentType="markdown"
        isElioGenerated
        pdfUrl="https://storage.example.com/signed-url"
      />
    )
    expect(screen.getByTestId('download-pdf-btn')).toBeDefined()
  })

  it('Task 7.2 — affiche le bouton "Enregistrer" si onSave et isElioGenerated', () => {
    const onSave = vi.fn()
    render(
      <ElioDocument
        documentId="doc-1"
        documentName="Attestation"
        documentType="markdown"
        isElioGenerated
        onSave={onSave}
      />
    )
    expect(screen.getByTestId('save-document-btn')).toBeDefined()
  })

  it('Task 7.2 — affiche le bouton "Envoyer par email" si onEmail et isElioGenerated', () => {
    const onEmail = vi.fn()
    render(
      <ElioDocument
        documentId="doc-1"
        documentName="Attestation"
        documentType="markdown"
        isElioGenerated
        onEmail={onEmail}
      />
    )
    expect(screen.getByTestId('email-document-btn')).toBeDefined()
  })

  it('Task 7.3 — déclenche onSave au clic', () => {
    const onSave = vi.fn()
    render(
      <ElioDocument
        documentId="doc-1"
        documentName="Attestation"
        documentType="markdown"
        isElioGenerated
        onSave={onSave}
      />
    )
    fireEvent.click(screen.getByTestId('save-document-btn'))
    expect(onSave).toHaveBeenCalledOnce()
  })

  it('Task 7.3 — déclenche onEmail au clic', () => {
    const onEmail = vi.fn()
    render(
      <ElioDocument
        documentId="doc-1"
        documentName="Attestation"
        documentType="markdown"
        isElioGenerated
        onEmail={onEmail}
      />
    )
    fireEvent.click(screen.getByTestId('email-document-btn'))
    expect(onEmail).toHaveBeenCalledOnce()
  })

  it('Task 7.3 — ouvre pdfUrl dans un nouvel onglet au clic "Télécharger en PDF"', () => {
    render(
      <ElioDocument
        documentId="doc-1"
        documentName="Attestation"
        documentType="markdown"
        isElioGenerated
        pdfUrl="https://storage.example.com/signed-url"
      />
    )
    fireEvent.click(screen.getByTestId('download-pdf-btn'))
    expect(mockOpen).toHaveBeenCalledWith('https://storage.example.com/signed-url', '_blank')
  })

  it('n\'affiche PAS les boutons actions si isElioGenerated=false même avec pdfUrl', () => {
    render(
      <ElioDocument
        documentId="doc-1"
        documentName="Document normal"
        documentType="pdf"
        isElioGenerated={false}
        pdfUrl="https://storage.example.com/signed-url"
      />
    )
    expect(screen.queryByTestId('download-pdf-btn')).toBeNull()
    // Affiche les boutons standards à la place
    expect(screen.getByTestId('view-document-btn')).toBeDefined()
  })
})
