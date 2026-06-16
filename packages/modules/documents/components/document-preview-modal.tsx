'use client'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@monprojetpro/ui'
import { useDocumentViewer } from '../hooks/use-document-viewer'
import { DocumentViewer } from './document-viewer'
import { DocumentIcon } from './document-icon'
import { markdownToHtml } from '../utils/markdown-to-html'

interface DocumentPreviewModalProps {
  /** Id du document à lire. `null` = modale fermée. */
  documentId: string | null
  onClose: () => void
}

/**
 * Aperçu de document EN PLACE (overlay), sans quitter la page courante.
 * Réutilise la chaîne de lecture existante (useDocumentViewer + DocumentViewer +
 * markdownToHtml) pour afficher Markdown / PDF / images, avec repli téléchargement.
 *
 * Indispensable dans le dialogue « Gestion des documents » (CRM) où une navigation
 * vers la page viewer fermerait la modale et ferait perdre le contexte client.
 */
export function DocumentPreviewModal({ documentId, onClose }: DocumentPreviewModalProps) {
  const {
    document: doc,
    contentUrl,
    markdownContent,
    isPending,
    error,
  } = useDocumentViewer(documentId ?? '')

  const markdownHtml = markdownContent ? markdownToHtml(markdownContent) : null

  const handleDownload = () => {
    if (!doc) return
    const link = window.document.createElement('a')
    link.href = `/api/documents/download/${doc.id}`
    link.style.display = 'none'
    window.document.body.appendChild(link)
    link.click()
    window.document.body.removeChild(link)
  }

  return (
    <Dialog open={!!documentId} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent
        className="flex max-h-[88vh] flex-col gap-0 p-0 sm:max-w-[760px]"
        data-testid="document-preview-modal"
      >
        <DialogHeader className="flex flex-row items-center gap-3 border-b px-5 py-4">
          {doc && <DocumentIcon fileType={doc.fileType} className="h-5 w-5" />}
          <DialogTitle className="truncate text-sm font-medium">
            {doc?.name ?? 'Chargement…'}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-auto p-5">
          {error ? (
            <p className="py-12 text-center text-sm text-muted-foreground">
              {error.message ?? 'Document introuvable'}
            </p>
          ) : (
            <DocumentViewer
              document={doc}
              contentUrl={contentUrl}
              markdownHtml={markdownHtml}
              isPending={isPending}
              onDownload={handleDownload}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
