import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, fireEvent, waitFor } from '@testing-library/react'
import { createElement } from 'react'
import { ClientBrandingForm } from './client-branding-form'

// ─────────────────────────────────────────────────────────────────────────────
// ClientBrandingForm tests — v3 (sans upload de logo)
//
// Depuis 2026-06-21 : l'upload de logo est abandonné. Le composant gère
// uniquement le nom d'entreprise (displayName) et la couleur d'accent.
// La preview montre le symbole MPP + nom.
//
// Les actions sont injectées en props — isolation totale et agnostique du
// contexte (Hub ou client One).
// ─────────────────────────────────────────────────────────────────────────────

const mockUpdateBranding = vi.fn()

vi.mock('@monprojetpro/ui', async (importOriginal) => {
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

/** Props par défaut — injecte le mock onUpdateBranding */
function defaultProps(overrides: Record<string, unknown> = {}) {
  return {
    clientId: 'c-1',
    onUpdateBranding: mockUpdateBranding,
    ...overrides,
  }
}

describe('ClientBrandingForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUpdateBranding.mockResolvedValue({
      data: { logoUrl: null, displayName: null, accentColor: null, updatedAt: '2026-01-01' },
      error: null,
    })
  })

  it('renders with default accent color when no initial branding', () => {
    const { container } = render(
      createElement(ClientBrandingForm, defaultProps({ clientCompanyName: 'Acme' })),
    )
    const colorInput = container.querySelector('input[type="color"]')
    expect(colorInput).toBeTruthy()
    expect((colorInput as HTMLInputElement)?.value).toBe('#16a34a')
  })

  it('renders with initial branding values', () => {
    const { container } = render(
      createElement(ClientBrandingForm, defaultProps({
        initialBranding: { logoUrl: null, displayName: 'ACME Corp', accentColor: '#FF5733', updatedAt: '2026-01-01' },
      })),
    )
    const textInputs = container.querySelectorAll('input[type="text"], input[data-testid]')
    const nameInput = Array.from(textInputs).find((el) => (el as HTMLInputElement).value === 'ACME Corp')
    expect(nameInput).toBeTruthy()
  })

  it('shows company name in preview', () => {
    const { container } = render(
      createElement(ClientBrandingForm, defaultProps({ clientCompanyName: 'Acme' })),
    )
    expect(container.textContent).toContain('Acme')
  })

  it('does not render file upload input', () => {
    const { container } = render(
      createElement(ClientBrandingForm, defaultProps()),
    )
    const fileInput = container.querySelector('input[type="file"]')
    expect(fileInput).toBeNull()
  })

  it('calls onUpdateBranding with displayName and accentColor on save', async () => {
    const { container } = render(
      createElement(ClientBrandingForm, defaultProps({ clientCompanyName: 'Acme' })),
    )
    const saveBtn = container.querySelector('[data-testid="btn-sauvegarder"]')
    expect(saveBtn).toBeTruthy()
    fireEvent.click(saveBtn!)
    await waitFor(() => {
      expect(mockUpdateBranding).toHaveBeenCalledWith('c-1', expect.objectContaining({
        displayName: null,
        accentColor: '#16a34a',
      }))
    })
    // Ne doit PAS inclure logoUrl dans le payload (plus de gestion logo)
    const callArg = mockUpdateBranding.mock.calls[0][1]
    expect(callArg).not.toHaveProperty('logoUrl')
  })

  it('calls onUpdateBranding with null values on reset (after confirmation)', async () => {
    const { container } = render(
      createElement(ClientBrandingForm, defaultProps({
        initialBranding: { logoUrl: null, displayName: 'ACME', accentColor: '#FF5733', updatedAt: '2026-01-01' },
      })),
    )
    const resetBtn = container.querySelector('[data-testid="btn-rinitialiser"]')
    expect(resetBtn).toBeTruthy()
    fireEvent.click(resetBtn!)

    await waitFor(() => {
      expect(container.textContent).toContain('Confirmer')
    })

    const confirmBtn = Array.from(container.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === 'Confirmer'
    )
    expect(confirmBtn).toBeTruthy()
    fireEvent.click(confirmBtn!)

    await waitFor(() => {
      expect(mockUpdateBranding).toHaveBeenCalledWith('c-1', {
        displayName: null,
        accentColor: null,
      })
    })
  })

  it('renders preview section with symbol placeholder and displayName', () => {
    const { container } = render(
      createElement(ClientBrandingForm, defaultProps({
        initialBranding: { logoUrl: null, displayName: 'Test Co', accentColor: '#FF0000', updatedAt: '2026-01-01' },
      })),
    )
    expect(container.textContent).toContain('Aperçu')
    expect(container.textContent).toContain('Test Co')
  })

  it('shows placeholder text in preview when no displayName', () => {
    const { container } = render(
      createElement(ClientBrandingForm, defaultProps()),
    )
    expect(container.textContent).toContain('Votre nom ici')
  })

  it('disables buttons while saving', async () => {
    mockUpdateBranding.mockImplementation(() => new Promise(() => {}))

    const { container } = render(
      createElement(ClientBrandingForm, defaultProps()),
    )
    const saveBtn = container.querySelector('[data-testid="btn-sauvegarder"]')
    fireEvent.click(saveBtn!)

    await waitFor(() => {
      expect(saveBtn?.getAttribute('disabled')).toBe('')
    })
  })

  it('shows error when accent color is invalid hex on save', async () => {
    const { container } = render(
      createElement(ClientBrandingForm, defaultProps({
        initialBranding: { logoUrl: null, displayName: null, accentColor: 'red', updatedAt: '2026-01-01' },
      })),
    )
    const saveBtn = container.querySelector('[data-testid="btn-sauvegarder"]')
    fireEvent.click(saveBtn!)

    const { showError } = await import('@monprojetpro/ui')
    expect(showError).toHaveBeenCalledWith("Couleur d'accent invalide. Format attendu : #RRGGBB (ex: #16a34a)")
    expect(mockUpdateBranding).not.toHaveBeenCalled()
  })

  it('uses custom successMessage when provided', async () => {
    const { container } = render(
      createElement(ClientBrandingForm, defaultProps({
        successMessage: 'Votre apparence a été mise à jour !',
      })),
    )
    const saveBtn = container.querySelector('[data-testid="btn-sauvegarder"]')
    fireEvent.click(saveBtn!)

    const { showSuccess } = await import('@monprojetpro/ui')
    await waitFor(() => {
      expect(showSuccess).toHaveBeenCalledWith('Votre apparence a été mise à jour !')
    })
  })

  it('syncs state when initialBranding prop changes', async () => {
    // Premier rendu sans branding
    const { container, rerender } = render(
      createElement(ClientBrandingForm, defaultProps()),
    )
    let colorInput = container.querySelector('input[type="color"]')
    expect((colorInput as HTMLInputElement)?.value).toBe('#16a34a')

    // Mise à jour des props (ex: Hub charge les données en async)
    rerender(
      createElement(ClientBrandingForm, defaultProps({
        initialBranding: { logoUrl: null, displayName: 'Loaded Co', accentColor: '#3b82f6', updatedAt: '2026-01-01' },
      })),
    )
    colorInput = container.querySelector('input[type="color"]')
    expect((colorInput as HTMLInputElement)?.value).toBe('#3b82f6')
  })
})
