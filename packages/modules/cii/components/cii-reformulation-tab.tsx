'use client'

import { useEffect, useState } from 'react'
import { Skeleton } from '@monprojetpro/ui'
import { useCiiImports } from '../hooks/use-cii-imports'
import { CiiImportUpload, type CiiClientProjectOption } from './cii-import-upload'
import { CiiImportDetail } from './cii-import-detail'

// ============================================================
// CiiReformulationTab — T-062
//
// Assistant de reformulation CII : upload d'un fichier de fonctions dev
// (temps fourni directement dedans), reformulation IA au format officiel,
// relecture ligne par ligne, transfert vers devis/facture existants.
// ============================================================

export function CiiReformulationTab({
  clientId,
  clientProjects,
}: {
  clientId: string
  clientProjects?: CiiClientProjectOption[]
}) {
  const { data: imports, isLoading, error } = useCiiImports(clientId)
  const [selectedImportId, setSelectedImportId] = useState<string | null>(null)

  useEffect(() => {
    const firstImportId = imports?.[0]?.id
    if (!selectedImportId && firstImportId) {
      setSelectedImportId(firstImportId)
    }
  }, [imports, selectedImportId])

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm" role="alert">
        Impossible de charger les imports CII : {error.message}
      </div>
    )
  }

  const selectedImport = (imports ?? []).find((i) => i.id === selectedImportId) ?? null

  return (
    <div className="flex flex-col gap-4">
      <CiiImportUpload clientId={clientId} clientProjects={clientProjects} />

      {(imports ?? []).length === 0 ? (
        <div className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
          Aucun import CII pour ce client. Uploade un fichier de fonctions dev pour démarrer.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {(imports ?? []).length > 1 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {(imports ?? []).map((imp) => (
                <button
                  key={imp.id}
                  type="button"
                  onClick={() => setSelectedImportId(imp.id)}
                  className={`shrink-0 rounded-md border px-3 py-1.5 text-xs ${
                    imp.id === selectedImportId
                      ? 'border-indigo-400 text-indigo-400 bg-indigo-400/10'
                      : 'border-border text-muted-foreground hover:bg-accent/50'
                  }`}
                  data-testid="cii-import-tab"
                >
                  {imp.fileName}
                </button>
              ))}
            </div>
          )}

          {selectedImport && <CiiImportDetail clientId={clientId} ciiImport={selectedImport} />}
        </div>
      )}
    </div>
  )
}
