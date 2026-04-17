import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockGetRecentUploads = vi.fn()
const mockGetGoogleDriveStatus = vi.fn()

vi.mock('../actions/configure-google-drive', () => ({
  getRecentUploads: (...args: unknown[]) => mockGetRecentUploads(...args),
  getGoogleDriveStatus: (...args: unknown[]) => mockGetGoogleDriveStatus(...args),
  configureGoogleDrive: vi.fn(),
  updateGoogleDriveFolderId: vi.fn(),
}))

vi.mock('../actions/upload-justificatif', () => ({
  uploadJustificatif: vi.fn(),
}))

vi.mock('@monprojetpro/ui', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>()
  return { ...actual, showSuccess: vi.fn(), showError: vi.fn() }
})

import { JustificatifsSection } from './justificatifs-section'

// ── Helpers ───────────────────────────────────────────────────────────────────

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('JustificatifsSection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetGoogleDriveStatus.mockResolvedValue({ data: { isConfigured: false, folderId: null }, error: null })
  })

  it('affiche la zone de drop quand aucun upload', async () => {
    mockGetRecentUploads.mockResolvedValue({ data: [], error: null })
    render(<JustificatifsSection />, { wrapper })

    expect(await screen.findByTestId('drop-zone')).toBeInTheDocument()
    expect(screen.getByText(/Glissez-déposez/)).toBeInTheDocument()
  })

  it('affiche le message vide quand pas d\'uploads', async () => {
    mockGetRecentUploads.mockResolvedValue({ data: [], error: null })
    render(<JustificatifsSection />, { wrapper })

    expect(await screen.findByTestId('empty-uploads')).toBeInTheDocument()
  })

  it('affiche la table des uploads récents', async () => {
    mockGetRecentUploads.mockResolvedValue({
      data: [
        {
          id: 'u1',
          file_name: 'facture-janvier.pdf',
          file_size: 245000,
          mime_type: 'application/pdf',
          drive_file_id: 'drv-1',
          status: 'sent',
          error_message: null,
          created_at: '2026-04-17T10:00:00Z',
        },
        {
          id: 'u2',
          file_name: 'recu-fevrier.png',
          file_size: 120000,
          mime_type: 'image/png',
          drive_file_id: null,
          status: 'error',
          error_message: 'Token expiré',
          created_at: '2026-04-16T09:30:00Z',
        },
      ],
      error: null,
    })
    render(<JustificatifsSection />, { wrapper })

    expect(await screen.findByTestId('uploads-table')).toBeInTheDocument()
    expect(screen.getByText('facture-janvier.pdf')).toBeInTheDocument()
    expect(screen.getByText('recu-fevrier.png')).toBeInTheDocument()
    expect(screen.getByText('Envoyé')).toBeInTheDocument()
    expect(screen.getByText('Erreur')).toBeInTheDocument()
  })

  it('affiche les formats acceptés', async () => {
    mockGetRecentUploads.mockResolvedValue({ data: [], error: null })
    render(<JustificatifsSection />, { wrapper })

    expect(await screen.findByText(/PDF, JPG, PNG/)).toBeInTheDocument()
  })

  it('contient le composant GoogleDriveConfig', async () => {
    mockGetRecentUploads.mockResolvedValue({ data: [], error: null })
    render(<JustificatifsSection />, { wrapper })

    expect(await screen.findByText('Connecter Google Drive')).toBeInTheDocument()
  })
})
