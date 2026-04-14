import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { DocumentUpload } from './document-upload'

// Mock @monprojetpro/utils
vi.mock('@monprojetpro/utils', () => ({
  validateFile: vi.fn((file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase()
    if (ext === 'exe') return { valid: false, error: 'Type de fichier non autorisé' }
    if (file.size > 10 * 1024 * 1024) return { valid: false, error: 'Fichier trop volumineux (max 10 Mo)' }
    if (file.size === 0) return { valid: false, error: 'Le fichier est vide' }
    return { valid: true }
  }),
  formatFileSize: vi.fn((bytes: number) => `${(bytes / 1024).toFixed(1)} Ko`),
  ALLOWED_FILE_TYPES: ['pdf', 'docx', 'xlsx', 'png', 'jpg', 'jpeg', 'svg', 'md', 'txt', 'csv'],
}))

// Mock @monprojetpro/ui
vi.mock('@monprojetpro/ui', () => ({
  Button: ({ children, ...props }: React.ComponentProps<'button'>) => (
    <button {...props}>{children}</button>
  ),
}))

describe('DocumentUpload', () => {
  it('renders the drop zone', () => {
    render(<DocumentUpload onUpload={vi.fn()} />)
    expect(screen.getByTestId('document-upload')).toBeDefined()
    expect(screen.getByText(/Glissez un fichier/i)).toBeDefined()
  })

  it('calls onUpload with valid file', () => {
    const onUpload = vi.fn()
    render(<DocumentUpload onUpload={onUpload} />)

    const input = screen.getByTestId('document-upload-input') as HTMLInputElement
    const file = new File(['test'], 'doc.pdf', { type: 'application/pdf' })

    fireEvent.change(input, { target: { files: [file] } })

    expect(onUpload).toHaveBeenCalledWith(file)
  })

  it('shows error for invalid file type', () => {
    const onUpload = vi.fn()
    render(<DocumentUpload onUpload={onUpload} />)

    const input = screen.getByTestId('document-upload-input') as HTMLInputElement
    const file = new File(['test'], 'bad.exe', { type: 'application/x-msdownload' })

    fireEvent.change(input, { target: { files: [file] } })

    expect(onUpload).not.toHaveBeenCalled()
    expect(screen.getByTestId('upload-error')).toBeDefined()
    expect(screen.getByText(/non autorisé/i)).toBeDefined()
  })

  it('shows uploading state', () => {
    render(<DocumentUpload onUpload={vi.fn()} isUploading />)
    expect(screen.getByText(/Upload en cours/i)).toBeDefined()
  })

  it('disables input when disabled', () => {
    render(<DocumentUpload onUpload={vi.fn()} disabled />)
    const input = screen.getByTestId('document-upload-input') as HTMLInputElement
    expect(input.disabled).toBe(true)
  })
})
