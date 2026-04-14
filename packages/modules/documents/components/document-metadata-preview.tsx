'use client'

import { formatFileSize } from '@monprojetpro/utils'
import { DocumentIcon } from './document-icon'
import type { Document } from '../types/document.types'

interface DocumentMetadataPreviewProps {
  document: Document
  onDownload: () => void
  isDownloading?: boolean
}

export function DocumentMetadataPreview({
  document,
  onDownload,
  isDownloading = false,
}: DocumentMetadataPreviewProps) {
  const formattedDate = new Date(document.createdAt).toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return (
    <div
      className="flex flex-col items-center justify-center gap-6 rounded-lg border border-border/50 bg-muted/30 p-8"
      data-testid="document-metadata-preview"
    >
      <DocumentIcon fileType={document.fileType} className="h-16 w-16 text-muted-foreground" />

      <div className="flex flex-col items-center gap-2 text-center">
        <h3 className="text-lg font-semibold" data-testid="metadata-name">
          {document.name}
        </h3>
        <div className="flex flex-wrap items-center justify-center gap-3 text-sm text-muted-foreground">
          <span data-testid="metadata-type">{document.fileType.toUpperCase()}</span>
          <span aria-hidden="true">&middot;</span>
          <span data-testid="metadata-size">{formatFileSize(document.fileSize)}</span>
          <span aria-hidden="true">&middot;</span>
          <span data-testid="metadata-date">{formattedDate}</span>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        L&apos;aperçu n&apos;est pas disponible pour ce type de fichier.
      </p>

      <button
        onClick={onDownload}
        disabled={isDownloading}
        className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
        data-testid="metadata-download-button"
      >
        {isDownloading ? 'Téléchargement...' : 'Télécharger'}
      </button>
    </div>
  )
}
