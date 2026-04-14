'use client'

import { useState, useRef, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogFooter,
  Button,
  showSuccess,
  showError,
} from '@monprojetpro/ui'
import { parseCsv } from '../utils/csv-parser'
import { validateCsvRows } from '../utils/csv-validator'
import { useImportCsv } from '../hooks/use-notifications'
import { CsvPreviewTable } from './csv-preview-table'
import { CsvTemplateDownload } from './csv-template-download'
import type { CsvValidationResult } from '../types/crm.types'

type Step = 'upload' | 'preview' | 'result'

export function ImportCsvDialog() {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<Step>('upload')
  const [results, setResults] = useState<CsvValidationResult[]>([])
  const [excludedLines, setExcludedLines] = useState<Set<number>>(new Set())
  const [importResult, setImportResult] = useState<{
    imported: number
    ignored: number
  } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const importCsv = useImportCsv()

  const reset = useCallback(() => {
    setStep('upload')
    setResults([])
    setExcludedLines(new Set())
    setImportResult(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [])

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen)
    if (!isOpen) reset()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.name.endsWith('.csv')) {
      showError('Veuillez sélectionner un fichier CSV')
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      const content = event.target?.result as string
      if (!content) {
        showError('Impossible de lire le fichier')
        return
      }

      const rows = parseCsv(content)
      if (rows.length === 0) {
        showError('Le fichier CSV est vide ou mal formaté')
        return
      }

      const validated = validateCsvRows(rows)
      setResults(validated)
      setStep('preview')
    }
    reader.readAsText(file, 'UTF-8')
  }

  const handleToggleExclude = (lineNumber: number) => {
    setExcludedLines((prev) => {
      const next = new Set(prev)
      if (next.has(lineNumber)) {
        next.delete(lineNumber)
      } else {
        next.add(lineNumber)
      }
      return next
    })
  }

  const handleImport = () => {
    const rowsToImport = results
      .filter((r) => r.valid && !excludedLines.has(r.row.lineNumber))
      .map((r) => r.row)

    if (rowsToImport.length === 0) {
      showError('Aucune ligne valide à importer')
      return
    }

    importCsv.mutate(rowsToImport, {
      onSuccess: (data) => {
        setImportResult({ imported: data.imported, ignored: data.ignored })
        setStep('result')
        showSuccess(`${data.imported} clients importés avec succès`)
      },
      onError: (error) => {
        showError(error.message)
      },
    })
  }

  const validToImport = results.filter(
    (r) => r.valid && !excludedLines.has(r.row.lineNumber)
  ).length

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" data-testid="import-csv-button">
          Import CSV
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            {step === 'upload' && 'Importer des clients via CSV'}
            {step === 'preview' && 'Aperçu de l\'import'}
            {step === 'result' && 'Résultat de l\'import'}
          </DialogTitle>
          <DialogDescription>
            {step === 'upload' &&
              'Sélectionnez un fichier CSV avec les colonnes : nom, email, entreprise, telephone, secteur, type_client.'}
            {step === 'preview' &&
              'Vérifiez les données avant de confirmer l\'import.'}
            {step === 'result' && 'L\'import est terminé.'}
          </DialogDescription>
        </DialogHeader>

        {step === 'upload' && (
          <div className="space-y-4">
            <div className="flex flex-col items-center gap-4 rounded-lg border border-dashed p-8">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="cursor-pointer"
                data-testid="csv-file-input"
              />
            </div>
            <CsvTemplateDownload />
          </div>
        )}

        {step === 'preview' && (
          <div className="space-y-4">
            <CsvPreviewTable
              results={results}
              excludedLines={excludedLines}
              onToggleExclude={handleToggleExclude}
            />
            <DialogFooter>
              <Button variant="ghost" onClick={reset}>
                Annuler
              </Button>
              <Button
                onClick={handleImport}
                disabled={validToImport === 0 || importCsv.isPending}
                data-testid="confirm-import-button"
              >
                {importCsv.isPending
                  ? 'Import en cours...'
                  : `Importer ${validToImport} client${validToImport > 1 ? 's' : ''}`}
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === 'result' && importResult && (
          <div className="space-y-4">
            <div className="rounded-lg bg-green-500/10 p-4 text-center">
              <p className="text-lg font-medium">
                {importResult.imported} client{importResult.imported > 1 ? 's' : ''} importé{importResult.imported > 1 ? 's' : ''} avec succès
              </p>
              {importResult.ignored > 0 && (
                <p className="text-sm text-muted-foreground">
                  {importResult.ignored} ligne{importResult.ignored > 1 ? 's' : ''} ignorée{importResult.ignored > 1 ? 's' : ''}
                </p>
              )}
            </div>
            <DialogFooter>
              <Button onClick={() => handleOpenChange(false)}>
                Fermer
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

ImportCsvDialog.displayName = 'ImportCsvDialog'
