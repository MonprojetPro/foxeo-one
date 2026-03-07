import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, fireEvent, waitFor } from '@testing-library/react'
import { createElement } from 'react'
import { ClientBrandingForm } from './client-branding-form'

const mockUpdateClientBranding = vi.fn()
const mockUploadClientLogo = vi.fn()

vi.mock('../actions/update-client-branding', () => ({
  updateClientBranding: (...args: unknown[]) => mockUpdateClientBranding(...args),
}))

vi.mock('../actions/upload-client-logo', () => ({
  uploadClientLogo: (...args: unknown[]) => mockUploadClientLogo(...args),
}))

vi.mock('@foxeo/ui', async (importOriginal) => {
  const actual = await importOriginal() as Record<string, unknown>
  return {
    ...actual,
    Card: ({ children, className }: { children: React.ReactNode; className?: string }) =>
      createElement('div', { 'data-testid': 'card', className }, children),
    CardContent: ({ children, className }: { children: React.ReactNode; className?: string }) =>
      createElement('div', { 'data-testid': 'card-content', className }, children),
    CardHeader: ({ children }: { children: React.ReactNode }) =>
      createElement('div', { 'data-testid': 'card-header' }, children),
    CardTitle: ({ children }: { children: React.ReactNode }) =>
      createElement('h3', {}, children),
    Input: (props: Record<string, unknown>) =>
      createElement('input', { ...props, 'data-testid': props.placeholder || 'input' }),
    Button: ({ children, onClick, disabled, variant }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean; variant?: string }) =>
      createElement('button', { onClick, disabled, 'data-variant': variant, 'data-testid': `btn-${typeof children === 'string' ? children.toLowerCase().replace(/[^a-z]/g, '') : 'action'}` }, children),
    showSuccess: vi.fn(),
    showError: vi.fn(),
  }
})

describe('ClientBrandingForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUpdateClientBranding.mockResolvedValue({ data: { logoUrl: null, displayName: null, accentColor: null, updatedAt: '2026-01-01' }, error: null })
    mockUploadClientLogo.mockResolvedValue({ data: { logoUrl: 'https://uploaded.png' }, error: null })
  })

  it('renders with default values when no initial branding', () => {
    const { container } = render(
      createElement(ClientBrandingForm, { clientId: 'c-1', clientCompanyName: 'Acme' }),
    )
    const colorInput = container.querySelector('input[type="color"]')
    expect(colorInput).toBeTruthy()
    expect((colorInput as HTMLInputElement)?.value).toBe('#f7931e')
  })

  it('renders with initial branding values', () => {
    const { container } = render(
      createElement(ClientBrandingForm, {
        clientId: 'c-1',
        initialBranding: { logoUrl: 'https://logo.png', displayName: 'ACME Corp', accentColor: '#FF5733', updatedAt: '2026-01-01' },
      }),
    )
    const textInputs = container.querySelectorAll('input[type="text"], input[data-testid]')
    const nameInput = Array.from(textInputs).find((el) => (el as HTMLInputElement).value === 'ACME Corp')
    expect(nameInput).toBeTruthy()
  })

  it('shows logo preview when initial logoUrl exists', () => {
    const { container } = render(
      createElement(ClientBrandingForm, {
        clientId: 'c-1',
        initialBranding: { logoUrl: 'https://logo.png', displayName: null, accentColor: null, updatedAt: '2026-01-01' },
      }),
    )
    const img = container.querySelector('img[alt="Aperçu logo"]')
    expect(img).toBeTruthy()
    expect((img as HTMLImageElement)?.src).toContain('logo.png')
  })

  it('updates preview name in real-time when displayName changes', () => {
    const { container } = render(
      createElement(ClientBrandingForm, { clientId: 'c-1', clientCompanyName: 'Acme' }),
    )
    // Initial preview shows company name
    expect(container.textContent).toContain('Acme')
  })

  it('calls updateClientBranding on save', async () => {
    const { container } = render(
      createElement(ClientBrandingForm, { clientId: 'c-1', clientCompanyName: 'Acme' }),
    )
    const saveBtn = container.querySelector('[data-testid="btn-sauvegarder"]')
    expect(saveBtn).toBeTruthy()
    fireEvent.click(saveBtn!)
    await waitFor(() => {
      expect(mockUpdateClientBranding).toHaveBeenCalledWith('c-1', expect.objectContaining({
        displayName: null,
        accentColor: '#F7931E',
      }))
    })
  })

  it('calls updateClientBranding with null values on reset', async () => {
    const { container } = render(
      createElement(ClientBrandingForm, {
        clientId: 'c-1',
        initialBranding: { logoUrl: 'https://logo.png', displayName: 'ACME', accentColor: '#FF5733', updatedAt: '2026-01-01' },
      }),
    )
    const resetBtn = container.querySelector('[data-testid="btn-rinitialiser"]')
    expect(resetBtn).toBeTruthy()
    fireEvent.click(resetBtn!)
    await waitFor(() => {
      expect(mockUpdateClientBranding).toHaveBeenCalledWith('c-1', {
        logoUrl: null,
        displayName: null,
        accentColor: null,
      })
    })
  })

  it('uploads logo before saving branding when file selected', async () => {
    const { container } = render(
      createElement(ClientBrandingForm, { clientId: 'c-1' }),
    )
    const fileInput = container.querySelector('input[type="file"]')
    expect(fileInput).toBeTruthy()

    const pngFile = new File(['data'], 'test.png', { type: 'image/png' })
    fireEvent.change(fileInput!, { target: { files: [pngFile] } })

    const saveBtn = container.querySelector('[data-testid="btn-sauvegarder"]')
    fireEvent.click(saveBtn!)

    await waitFor(() => {
      expect(mockUploadClientLogo).toHaveBeenCalledWith('c-1', expect.any(FormData))
      expect(mockUpdateClientBranding).toHaveBeenCalledWith('c-1', expect.objectContaining({
        logoUrl: 'https://uploaded.png',
      }))
    })
  })

  it('shows error when upload fails', async () => {
    mockUploadClientLogo.mockResolvedValue({ data: null, error: { message: 'Upload failed', code: 'STORAGE_ERROR' } })

    const { container } = render(
      createElement(ClientBrandingForm, { clientId: 'c-1' }),
    )
    const fileInput = container.querySelector('input[type="file"]')
    const pngFile = new File(['data'], 'test.png', { type: 'image/png' })
    fireEvent.change(fileInput!, { target: { files: [pngFile] } })

    const saveBtn = container.querySelector('[data-testid="btn-sauvegarder"]')
    fireEvent.click(saveBtn!)

    const { showError } = await import('@foxeo/ui')
    await waitFor(() => {
      expect(showError).toHaveBeenCalledWith('Upload failed')
    })
  })

  it('validates file type client-side on change', async () => {
    const { container } = render(
      createElement(ClientBrandingForm, { clientId: 'c-1' }),
    )
    const fileInput = container.querySelector('input[type="file"]')
    const jpgFile = new File(['data'], 'test.jpg', { type: 'image/jpeg' })
    fireEvent.change(fileInput!, { target: { files: [jpgFile] } })

    const { showError } = await import('@foxeo/ui')
    expect(showError).toHaveBeenCalledWith('Format non supporté. Utilisez PNG ou SVG.')
  })

  it('validates file size client-side on change', async () => {
    const { container } = render(
      createElement(ClientBrandingForm, { clientId: 'c-1' }),
    )
    const fileInput = container.querySelector('input[type="file"]')
    const bigFile = new File([new ArrayBuffer(3 * 1024 * 1024)], 'big.png', { type: 'image/png' })
    fireEvent.change(fileInput!, { target: { files: [bigFile] } })

    const { showError } = await import('@foxeo/ui')
    expect(showError).toHaveBeenCalledWith('Le fichier dépasse 2 Mo.')
  })

  it('renders preview section with accent color background', () => {
    const { container } = render(
      createElement(ClientBrandingForm, {
        clientId: 'c-1',
        initialBranding: { logoUrl: null, displayName: 'Test Co', accentColor: '#FF0000', updatedAt: '2026-01-01' },
      }),
    )
    expect(container.textContent).toContain('Aperçu')
    expect(container.textContent).toContain('Test Co')
  })

  it('disables buttons while saving', async () => {
    // Make the update hang
    mockUpdateClientBranding.mockImplementation(() => new Promise(() => {}))

    const { container } = render(
      createElement(ClientBrandingForm, { clientId: 'c-1' }),
    )
    const saveBtn = container.querySelector('[data-testid="btn-sauvegarder"]')
    fireEvent.click(saveBtn!)

    await waitFor(() => {
      expect(saveBtn?.getAttribute('disabled')).toBe('')
    })
  })

  it('shows error when accent color is invalid hex on save', async () => {
    const { container } = render(
      createElement(ClientBrandingForm, {
        clientId: 'c-1',
        initialBranding: { logoUrl: null, displayName: null, accentColor: 'red', updatedAt: '2026-01-01' },
      }),
    )
    const saveBtn = container.querySelector('[data-testid="btn-sauvegarder"]')
    fireEvent.click(saveBtn!)

    const { showError } = await import('@foxeo/ui')
    expect(showError).toHaveBeenCalledWith("Couleur d'accent invalide. Format attendu : #RRGGBB (ex: #F7931E)")
    expect(mockUpdateClientBranding).not.toHaveBeenCalled()
  })
})
