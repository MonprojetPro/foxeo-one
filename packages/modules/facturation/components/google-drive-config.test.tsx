import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockGetGoogleDriveStatus = vi.fn()
const mockConfigureGoogleDrive = vi.fn()
const mockUpdateGoogleDriveFolderId = vi.fn()

vi.mock('../actions/configure-google-drive', () => ({
  getGoogleDriveStatus: (...args: unknown[]) => mockGetGoogleDriveStatus(...args),
  configureGoogleDrive: (...args: unknown[]) => mockConfigureGoogleDrive(...args),
  updateGoogleDriveFolderId: (...args: unknown[]) => mockUpdateGoogleDriveFolderId(...args),
}))

vi.mock('@monprojetpro/ui', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>()
  return { ...actual, showSuccess: vi.fn(), showError: vi.fn() }
})

import { GoogleDriveConfig } from './google-drive-config'

// ── Helpers ───────────────────────────────────────────────────────────────────

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('GoogleDriveConfig', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('affiche le formulaire quand Drive non configuré', async () => {
    mockGetGoogleDriveStatus.mockResolvedValue({ data: { isConfigured: false, folderId: null }, error: null })
    render(<GoogleDriveConfig />, { wrapper })

    expect(await screen.findByTestId('drive-config-form')).toBeInTheDocument()
    expect(screen.getByText('Connecter Google Drive')).toBeInTheDocument()
    expect(screen.getByTestId('drive-folder-id')).toBeInTheDocument()
    expect(screen.getByTestId('drive-access-token')).toBeInTheDocument()
    expect(screen.getByTestId('drive-refresh-token')).toBeInTheDocument()
  })

  it('affiche le statut connecté quand Drive configuré', async () => {
    mockGetGoogleDriveStatus.mockResolvedValue({
      data: { isConfigured: true, folderId: 'folder-abc' },
      error: null,
    })
    render(<GoogleDriveConfig />, { wrapper })

    expect(await screen.findByTestId('drive-config-connected')).toBeInTheDocument()
    expect(screen.getByText('Google Drive connecté')).toBeInTheDocument()
    expect(screen.getByText(/folder-abc/)).toBeInTheDocument()
  })

  it('affiche le bouton Modifier quand connecté', async () => {
    mockGetGoogleDriveStatus.mockResolvedValue({
      data: { isConfigured: true, folderId: 'folder-abc' },
      error: null,
    })
    render(<GoogleDriveConfig />, { wrapper })

    expect(await screen.findByText('Modifier')).toBeInTheDocument()
  })

  it('ne retourne jamais de tokens dans les données affichées', async () => {
    mockGetGoogleDriveStatus.mockResolvedValue({
      data: { isConfigured: true, folderId: 'folder-abc' },
      error: null,
    })
    render(<GoogleDriveConfig />, { wrapper })

    await screen.findByTestId('drive-config-connected')
    // No token fields visible in connected state
    expect(screen.queryByTestId('drive-access-token')).not.toBeInTheDocument()
    expect(screen.queryByTestId('drive-refresh-token')).not.toBeInTheDocument()
  })
})
