import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

const { mockToast } = vi.hoisted(() => ({
  mockToast: { success: vi.fn(), error: vi.fn() },
}))

vi.mock('@monprojetpro/ui', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@monprojetpro/ui')>()
  return { ...actual, toast: mockToast }
})

vi.mock('../actions/export-documents-csv', () => ({
  exportDocumentsCSV: vi.fn(),
}))

vi.mock('../actions/export-documents-json', () => ({
  exportDocumentsJSON: vi.fn(),
}))

import { exportDocumentsCSV } from '../actions/export-documents-csv'
import { exportDocumentsJSON } from '../actions/export-documents-json'
import { useExportDocuments } from './use-export-documents'

const CLIENT_ID = '00000000-0000-0000-0000-000000000001'

describe('useExportDocuments', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    globalThis.URL.createObjectURL = vi.fn(() => 'blob:mock-url')
    globalThis.URL.revokeObjectURL = vi.fn()
  })

  it('exportCSV succès — déclenche le téléchargement et affiche un toast success', async () => {
    vi.mocked(exportDocumentsCSV).mockResolvedValue({
      data: { csvContent: '\uFEFFNom,Type\n', fileName: 'documents-00000000-2026-02-19.csv', count: 1 },
      error: null,
    })

    const { result } = renderHook(() => useExportDocuments(CLIENT_ID))

    await act(async () => {
      result.current.exportCSV()
    })

    expect(exportDocumentsCSV).toHaveBeenCalledWith(CLIENT_ID, undefined)
    expect(globalThis.URL.createObjectURL).toHaveBeenCalled()
    expect(mockToast.success).toHaveBeenCalled()
  })

  it('exportJSON succès — déclenche le téléchargement et affiche un toast success', async () => {
    vi.mocked(exportDocumentsJSON).mockResolvedValue({
      data: { jsonContent: '{"totalCount":2}', fileName: 'documents-00000000-2026-02-19.json', count: 2 },
      error: null,
    })

    const { result } = renderHook(() => useExportDocuments(CLIENT_ID))

    await act(async () => {
      result.current.exportJSON()
    })

    expect(exportDocumentsJSON).toHaveBeenCalledWith(CLIENT_ID, undefined)
    expect(globalThis.URL.createObjectURL).toHaveBeenCalled()
    expect(mockToast.success).toHaveBeenCalled()
  })

  it('erreur exportCSV — affiche un toast error sans déclencher le téléchargement', async () => {
    vi.mocked(exportDocumentsCSV).mockResolvedValue({
      data: null,
      error: { message: 'Erreur serveur', code: 'INTERNAL_ERROR' },
    })

    const { result } = renderHook(() => useExportDocuments(CLIENT_ID))

    await act(async () => {
      result.current.exportCSV()
    })

    expect(mockToast.error).toHaveBeenCalledWith('Erreur serveur')
    expect(globalThis.URL.createObjectURL).not.toHaveBeenCalled()
  })

  it('expose isPending false au départ', () => {
    const { result } = renderHook(() => useExportDocuments(CLIENT_ID))
    expect(result.current.isPending).toBe(false)
  })
})
