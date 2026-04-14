'use client'

import { Button } from '@monprojetpro/ui'
import { generateCsvTemplate } from '../utils/csv-parser'

export function CsvTemplateDownload() {
  const handleDownload = () => {
    const content = generateCsvTemplate()
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'template-import-clients.csv'
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Button variant="link" size="sm" onClick={handleDownload} data-testid="csv-template-download">
      Télécharger le template CSV
    </Button>
  )
}

CsvTemplateDownload.displayName = 'CsvTemplateDownload'
