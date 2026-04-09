'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getDocuments, useShareDocument, DocumentsPageClient, getOperatorId } from '@monprojetpro/module-documents'
import { showSuccess, showError } from '@monprojetpro/ui'
import { Button, Dialog, DialogContent, DialogHeader, DialogTitle } from '@monprojetpro/ui'
import { FileText, Lock, Eye, FolderOpen } from 'lucide-react'
import { cn } from '@monprojetpro/utils'

interface ClientDocumentsTabProps {
  clientId: string
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

// ---- Dialog Gestion des documents ----

function DocumentsManagementDialog({ clientId }: { clientId: string }) {
  const [open, setOpen] = useState(false)
  const [operatorId, setOperatorId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleOpen = async () => {
    setOpen(true)
    if (!operatorId) {
      setIsLoading(true)
      const result = await getOperatorId()
      if (result.data) setOperatorId(result.data)
      setIsLoading(false)
    }
  }

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        className="gap-1.5"
        onClick={handleOpen}
        data-testid="open-documents-management"
      >
        <FolderOpen className="h-3.5 w-3.5" />
        Gestion des documents
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="translate-x-0 translate-y-0 rounded-none p-0 gap-0 flex flex-col border-l border-t-0 border-r-0 border-b-0"
          style={{ position: 'fixed', left: '16rem', top: 0, right: 0, bottom: 0, width: 'auto', height: '100vh', maxWidth: 'none' }}
        >
          <DialogHeader className="px-6 py-4 border-b shrink-0">
            <DialogTitle>Gestion des documents</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto min-h-0">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : operatorId ? (
              <DocumentsPageClient
                clientId={clientId}
                operatorId={operatorId}
                uploadedBy="operator"
                initialDocuments={[]}
                showVisibility
                showBatchActions
                isOperator
              />
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

// ---- Composant principal ----

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
      {/* Bouton Gestion des documents */}
      <div className="flex justify-end">
        <DocumentsManagementDialog clientId={clientId} />
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
          Impossible de charger les documents.
        </div>
      ) : !documents || documents.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground text-sm">
          Aucun document pour ce client.{' '}
          <button
            type="button"
            className="text-primary hover:underline"
            onClick={() => document.querySelector<HTMLButtonElement>('[data-testid="open-documents-management"]')?.click()}
          >
            Importer un document →
          </button>
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
