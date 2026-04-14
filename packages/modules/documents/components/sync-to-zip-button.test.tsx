import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement } from 'react'
import { SyncToZipButton } from './sync-to-zip-button'

const { mockToast, mockSyncDocumentsToZip } = vi.hoisted(() => ({
  mockToast: { success: vi.fn(), error: vi.fn() },
  mockSyncDocumentsToZip: vi.fn(),
}))

vi.mock('@monprojetpro/ui', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@monprojetpro/ui')>()
  return { ...actual, toast: mockToast }
})

vi.mock('../actions/sync-documents-to-zip', () => ({
  syncDocumentsToZip: (...args: unknown[]) => mockSyncDocumentsToZip(...args),
}))

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  })
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children)
}

// ZIP vide valide (EOCD 22 bytes)
const EMPTY_ZIP_BASE64 = Buffer.from([
  0x50, 0x4b, 0x05, 0x06,
  0x00, 0x00, 0x00, 0x00,
  0x00, 0x00, 0x00, 0x00,
  0x00, 0x00, 0x00, 0x00,
  0x00, 0x00, 0x00, 0x00,
  0x00, 0x00,
]).toString('base64')

const CLIENT_ID = '00000000-0000-0000-0000-000000000001'

describe('SyncToZipButton', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Seuls les APIs non disponibles en JSDOM doivent être mockées
    globalThis.URL.createObjectURL = vi.fn(() => 'blob:fake-url')
    globalThis.URL.revokeObjectURL = vi.fn()
  })

  it('affiche le bouton avec le nombre de docs partagés', () => {
    render(<SyncToZipButton clientId={CLIENT_ID} documentCount={5} />, { wrapper: createWrapper() })
    expect(screen.getByTestId('sync-to-zip-button')).toHaveTextContent('5 docs partagés')
  })

  it('est désactivé quand documentCount est 0', () => {
    render(<SyncToZipButton clientId={CLIENT_ID} documentCount={0} />, { wrapper: createWrapper() })
    expect(screen.getByTestId('sync-to-zip-button')).toBeDisabled()
  })

  it('appelle syncDocumentsToZip au clic', async () => {
    mockSyncDocumentsToZip.mockResolvedValue({
      data: { zipBase64: EMPTY_ZIP_BASE64, count: 1 },
      error: null,
    })

    render(<SyncToZipButton clientId={CLIENT_ID} documentCount={1} />, { wrapper: createWrapper() })
    fireEvent.click(screen.getByTestId('sync-to-zip-button'))

    await waitFor(() => {
      expect(mockSyncDocumentsToZip).toHaveBeenCalledWith(CLIENT_ID)
    })
  })

  it('affiche un toast succès et déclenche le téléchargement après succès', async () => {
    mockSyncDocumentsToZip.mockResolvedValue({
      data: { zipBase64: EMPTY_ZIP_BASE64, count: 3 },
      error: null,
    })

    render(<SyncToZipButton clientId={CLIENT_ID} documentCount={3} />, { wrapper: createWrapper() })
    fireEvent.click(screen.getByTestId('sync-to-zip-button'))

    await waitFor(() => {
      expect(mockToast.success).toHaveBeenCalledWith('Archive ZIP prête (3 documents)')
      expect(globalThis.URL.createObjectURL).toHaveBeenCalled()
    })
  })

  it('affiche un toast erreur si l\'action échoue', async () => {
    mockSyncDocumentsToZip.mockResolvedValue({
      data: null,
      error: { message: 'Erreur de génération', code: 'INTERNAL_ERROR' },
    })

    render(<SyncToZipButton clientId={CLIENT_ID} documentCount={2} />, { wrapper: createWrapper() })
    fireEvent.click(screen.getByTestId('sync-to-zip-button'))

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith('Erreur de génération')
    })
  })
})
