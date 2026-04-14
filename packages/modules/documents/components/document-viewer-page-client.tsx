'use client'

import { useDocumentViewer } from '../hooks/use-document-viewer'
import { DocumentViewer } from './document-viewer'
import { DocumentDownloadButton } from './document-download-button'
import { DocumentVisibilityBadge } from './document-visibility-badge'
import { DocumentIcon } from './document-icon'
import { DocumentViewerSkeleton } from './document-viewer-skeleton'
import { markdownToHtml } from '../utils/markdown-to-html'
import { ArrowLeft } from 'lucide-react'

interface DocumentViewerPageClientProps {
  documentId: string
  backHref: string
  showVisibility?: boolean
}

export function DocumentViewerPageClient({
  documentId,
  backHref,
  showVisibility = false,
}: DocumentViewerPageClientProps) {
  const {
    document,
    contentUrl,
    markdownContent,
    isPending,
    error,
  } = useDocumentViewer(documentId)

  if (isPending) {
    return <DocumentViewerSkeleton />
  }

  if (error || !document) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 p-8 text-center">
        <p className="text-muted-foreground">
          {error?.message ?? 'Document introuvable'}
        </p>
        <a
          href={backHref}
          className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour aux documents
        </a>
      </div>
    )
  }

  const markdownHtml = markdownContent ? markdownToHtml(markdownContent) : null

  return (
    <div className="flex flex-col gap-4 p-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <a
            href={backHref}
            className="inline-flex items-center justify-center rounded-lg border border-border/50 p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            title="Retour aux documents"
          >
            <ArrowLeft className="h-4 w-4" />
          </a>
          <DocumentIcon fileType={document.fileType} className="h-5 w-5" />
          <h1 className="text-lg font-semibold">{document.name}</h1>
          {showVisibility && (
            <DocumentVisibilityBadge visibility={document.visibility} />
          )}
        </div>
        <DocumentDownloadButton
          document={document}
          contentUrl={contentUrl}
        />
      </div>

      {/* Viewer */}
      <DocumentViewer
        document={document}
        contentUrl={contentUrl}
        markdownHtml={markdownHtml}
        isPending={false}
        onDownload={() => {
          const link = window.document.createElement('a')
          link.href = `/api/documents/download/${document.id}`
          link.style.display = 'none'
          window.document.body.appendChild(link)
          link.click()
          window.document.body.removeChild(link)
        }}
      />
    </div>
  )
}
