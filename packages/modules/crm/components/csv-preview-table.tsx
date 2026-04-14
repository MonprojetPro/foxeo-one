'use client'

import { Badge } from '@monprojetpro/ui'
import type { CsvValidationResult } from '../types/crm.types'

interface CsvPreviewTableProps {
  results: CsvValidationResult[]
  excludedLines: Set<number>
  onToggleExclude: (lineNumber: number) => void
}

export function CsvPreviewTable({
  results,
  excludedLines,
  onToggleExclude,
}: CsvPreviewTableProps) {
  const validCount = results.filter(
    (r) => r.valid && !excludedLines.has(r.row.lineNumber)
  ).length
  const errorCount = results.filter((r) => !r.valid).length
  const excludedCount = excludedLines.size

  return (
    <div className="space-y-3" data-testid="csv-preview-table">
      <div className="flex gap-3 text-sm">
        <span className="text-green-500">{validCount} valides</span>
        {errorCount > 0 && (
          <span className="text-red-500">{errorCount} erreurs</span>
        )}
        {excludedCount > 0 && (
          <span className="text-muted-foreground">{excludedCount} exclus</span>
        )}
      </div>

      <div className="max-h-80 overflow-auto rounded border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 sticky top-0">
            <tr>
              <th className="p-2 text-left w-8">#</th>
              <th className="p-2 text-left">Nom</th>
              <th className="p-2 text-left">Email</th>
              <th className="p-2 text-left">Entreprise</th>
              <th className="p-2 text-left">Type</th>
              <th className="p-2 text-left">Statut</th>
              <th className="p-2 text-left w-8"></th>
            </tr>
          </thead>
          <tbody>
            {results.map((result) => {
              const isExcluded = excludedLines.has(result.row.lineNumber)
              const rowClass = !result.valid
                ? 'bg-red-500/10'
                : isExcluded
                  ? 'bg-muted/30 opacity-50'
                  : 'bg-green-500/5'

              return (
                <tr
                  key={result.row.lineNumber}
                  className={rowClass}
                  data-testid={`csv-row-${result.row.lineNumber}`}
                >
                  <td className="p-2 text-muted-foreground">
                    {result.row.lineNumber}
                  </td>
                  <td className="p-2">{result.row.name}</td>
                  <td className="p-2">{result.row.email}</td>
                  <td className="p-2">{result.row.company}</td>
                  <td className="p-2">{result.row.clientType}</td>
                  <td className="p-2">
                    {result.valid ? (
                      <Badge variant="outline" className="text-green-500 border-green-500/30">
                        Valide
                      </Badge>
                    ) : (
                      <div className="space-y-1">
                        <Badge variant="destructive">Erreur</Badge>
                        {result.errors.map((err, i) => (
                          <p key={i} className="text-xs text-red-400">
                            {err}
                          </p>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="p-2">
                    {result.valid && (
                      <input
                        type="checkbox"
                        checked={!isExcluded}
                        onChange={() => onToggleExclude(result.row.lineNumber)}
                        className="cursor-pointer"
                        aria-label={`Inclure ligne ${result.row.lineNumber}`}
                      />
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

CsvPreviewTable.displayName = 'CsvPreviewTable'
