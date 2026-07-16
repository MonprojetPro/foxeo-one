'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getDocuments, useShareDocument, DocumentsPageClient, getOperatorId } from '@monprojetpro/module-documents'
import { showSuccess, showError } from '@monprojetpro/ui'
import { Button, Dialog, DialogContent, DialogHeader, DialogTitle } from '@monprojetpro/ui'
import { CockpitPanel, CockpitCallout, RowSkeleton, SectionTitle } from '@monprojetpro/ui'
import { FileText, Lock, Eye, FolderOpen, AlertCircle, FolderPlus } from 'lucide-react'
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
        className="gap-1.5 border-white/10 bg-white/[0.03] text-gray-300 hover:border-cyan-400/30 hover:bg-cyan-400/5 hover:text-cyan-300 transition-colors"
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
              <div className="p-6 space-y-2">
                <RowSkeleton className="h-9" />
                <RowSkeleton className="h-9" />
                <RowSkeleton className="h-9" />
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
    <div className="mt-4 space-y-4">
      {/* En-tête avec action */}
      <SectionTitle action={<DocumentsManagementDialog clientId={clientId} />}>
        Documents client
      </SectionTitle>

      {isPending ? (
        <CockpitPanel title="Documents">
          <div className="space-y-1.5 p-1">
            <RowSkeleton className="h-10" />
            <RowSkeleton className="h-10" />
            <RowSkeleton className="h-10" />
          </div>
        </CockpitPanel>
      ) : error ? (
        <CockpitCallout tone="red" icon={AlertCircle} title="Erreur de chargement">
          Impossible de charger les documents.
        </CockpitCallout>
      ) : !documents || documents.length === 0 ? (
        <CockpitCallout tone="gray" icon={FolderPlus}>
          <span>
            Aucun document pour ce client.{' '}
            <button
              type="button"
              className="text-cyan-300 hover:underline"
              onClick={() => document.querySelector<HTMLButtonElement>('[data-testid="open-documents-management"]')?.click()}
            >
              Importer un document &rarr;
            </button>
          </span>
        </CockpitCallout>
      ) : (
        <CockpitPanel title="Documents" badge={documents.length} badgeTone="cyan">
          <div className="divide-y divide-white/5">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center gap-3 px-3 py-2.5 hover:bg-white/[0.03] transition-colors"
              >
                <FileText className="h-4 w-4 shrink-0 text-gray-500" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-200 truncate">{doc.name}</p>
                  <p className="text-xs text-gray-500">{formatDate(doc.createdAt)}</p>
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
                    'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium shrink-0 transition-opacity hover:opacity-70 disabled:opacity-50 border',
                    doc.visibility === 'shared'
                      ? 'border-emerald-400/25 bg-emerald-400/10 text-emerald-300'
                      : 'border-white/10 bg-white/[0.04] text-gray-400'
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
        </CockpitPanel>
      )}
    </div>
  )
}
