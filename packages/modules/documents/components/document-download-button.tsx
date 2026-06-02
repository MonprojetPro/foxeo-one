'use client'

import { Download } from 'lucide-react'
import { toast } from '@monprojetpro/ui'
import type { Document } from '../types/document.types'

interface DocumentDownloadButtonProps {
  document: Document
  contentUrl?: string | null
  variant?: 'default' | 'icon'
}

export function DocumentDownloadButton({
  document,
  variant = 'default',
}: DocumentDownloadButtonProps) {
  // Télécharge le fichier RÉEL tel que stocké (ex : .md), via le proxy API
  // (évite le blocage cross-origin du navigateur). Plus de fausse conversion HTML.
  const handleDownload = () => {
    try {
      triggerDownload(`/api/documents/download/${document.id}`)
      toast.success('Téléchargement lancé')
    } catch {
      toast.error('Erreur lors du téléchargement')
    }
  }

  const label = 'Télécharger'

  if (variant === 'icon') {
    return (
      <button
        onClick={handleDownload}
        className="inline-flex items-center justify-center rounded-lg border border-border/50 p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
        title={label}
        data-testid="download-button-icon"
      >
        <Download className="h-4 w-4" />
      </button>
    )
  }

  return (
    <button
      onClick={handleDownload}
      className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
      data-testid="download-button"
    >
      <Download className="h-4 w-4" />
      {label}
    </button>
  )
}

function triggerDownload(url: string) {
  const link = window.document.createElement('a')
  link.href = url
  link.style.display = 'none'
  window.document.body.appendChild(link)
  link.click()
  window.document.body.removeChild(link)
}
