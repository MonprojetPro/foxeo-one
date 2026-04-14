'use client'

import { useTransition } from 'react'
import { toast } from '@monprojetpro/ui'
import { exportDocumentsCSV } from '../actions/export-documents-csv'
import { exportDocumentsJSON } from '../actions/export-documents-json'
import type { DocumentFilters } from '../types/document.types'

function triggerDownload(content: string, fileName: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function useExportDocuments(clientId: string) {
  const [isPending, startTransition] = useTransition()

  const exportCSV = (filters?: DocumentFilters) => {
    startTransition(async () => {
      const result = await exportDocumentsCSV(clientId, filters)
      if (result.error) {
        toast.error(result.error.message)
        return
      }
      const { csvContent, fileName, count } = result.data!
      triggerDownload(csvContent, fileName, 'text/csv;charset=utf-8;')
      toast.success(`Export CSV téléchargé (${count} document${count > 1 ? 's' : ''})`)
      console.info(`[DOCUMENTS:EXPORT_CSV] ${count} documents exportés`)
    })
  }

  const exportJSON = (filters?: DocumentFilters) => {
    startTransition(async () => {
      const result = await exportDocumentsJSON(clientId, filters)
      if (result.error) {
        toast.error(result.error.message)
        return
      }
      const { jsonContent, fileName, count } = result.data!
      triggerDownload(jsonContent, fileName, 'application/json;charset=utf-8;')
      toast.success(`Export JSON téléchargé (${count} document${count > 1 ? 's' : ''})`)
      console.info(`[DOCUMENTS:EXPORT_JSON] ${count} documents exportés`)
    })
  }

  return { exportCSV, exportJSON, isPending }
}
