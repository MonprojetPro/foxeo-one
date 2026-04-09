'use client'

import { useQuery } from '@tanstack/react-query'
import { getDocuments, useShareDocument } from '@monprojetpro/module-documents'
import { showSuccess, showError } from '@monprojetpro/ui'
import { ExternalLink, FileText, Lock, Eye } from 'lucide-react'
import { cn } from '@monprojetpro/utils'

interface ClientDocumentsTabProps {
  clientId: string
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function ClientDocumentsTab({ clientId }: ClientDocumentsTabProps) {
  const { share, unshare, isSharing, isUnsharing } = useShareDocument(clientId)

  const { data: documents, isPending, error } = useQuery({
    queryKey: ['documents', clientId],
    queryFn: async () => {
      const result = await getDocuments({ clientId })
      if (result.error) throw new Error(result.error.message)
      return result.data ?? []
    },
    enabled: !!clientId,
  })

  return (
    <div className="mt-4 space-y-3">
      {/* Lien vers le module complet */}
      <div className="flex justify-end">
        <a
          href={`/modules/documents/${clientId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
        >
          <ExternalLink className="h-3 w-3" />
          Ouvrir dans le module Documents
        </a>
      </div>

      {isPending ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-lg border p-3 space-y-1.5">
              <div className="h-3 bg-muted animate-pulse rounded w-1/2" />
              <div className="h-2.5 bg-muted animate-pulse rounded w-1/4" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
          Impossible de charger les documents.{' '}
          <a href={`/modules/documents/${clientId}`} className="underline">
            Ouvrir dans le module Documents
          </a>
        </div>
      ) : !documents || documents.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground text-sm">
          Aucun document pour ce client.{' '}
          <a href={`/modules/documents/${clientId}`} className="text-primary hover:underline">
            Importer un document →
          </a>
        </div>
      ) : (
        <div className="divide-y rounded-lg border overflow-hidden">
          {documents.map((doc) => (
            <div key={doc.id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/20 transition-colors">
              <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{doc.name}</p>
                <p className="text-xs text-muted-foreground">{formatDate(doc.createdAt)}</p>
              </div>
              <button
                type="button"
                title={doc.visibility === 'shared' ? 'Retirer le partage' : 'Partager avec le client'}
                disabled={isSharing || isUnsharing}
                onClick={() => {
                  if (doc.visibility === 'shared') {
                    unshare(doc.id, {
                      onSuccess: () => showSuccess('Partage retiré'),
                      onError: () => showError('Erreur lors de la modification'),
                    })
                  } else {
                    share(doc.id, {
                      onSuccess: () => showSuccess('Document partagé'),
                      onError: () => showError('Erreur lors de la modification'),
                    })
                  }
                }}
                className={cn(
                  'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium shrink-0 transition-opacity hover:opacity-70 disabled:opacity-50',
                  doc.visibility === 'shared'
                    ? 'bg-green-500/15 text-green-600 dark:text-green-400'
                    : 'bg-muted text-muted-foreground'
                )}
              >
                {doc.visibility === 'shared'
                  ? <><Eye className="h-2.5 w-2.5" /> Partagé</>
                  : <><Lock className="h-2.5 w-2.5" /> Privé</>
                }
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
