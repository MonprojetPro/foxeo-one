'use client'

import { useState } from 'react'
import { Download } from 'lucide-react'
import { toast } from '@monprojetpro/ui'
import { generatePdf } from '../actions/generate-pdf'
import type { Document } from '../types/document.types'

const MARKDOWN_TYPES = ['md', 'markdown']

interface DocumentDownloadButtonProps {
  document: Document
  contentUrl: string | null
  variant?: 'default' | 'icon'
}

export function DocumentDownloadButton({
  document,
  contentUrl,
  variant = 'default',
}: DocumentDownloadButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const fileType = document.fileType.toLowerCase()
  const isMarkdown = MARKDOWN_TYPES.includes(fileType)

  const handleDownload = async () => {
    try {
      if (isMarkdown) {
        // Generate PDF from Markdown
        setIsGenerating(true)
        const result = await generatePdf({ documentId: document.id })

        if (result.error) {
          toast.error(result.error.message)
          return
        }

        if (result.data) {
          // Create PDF-like download from branded HTML
          const blob = new Blob([result.data.htmlContent], { type: 'text/html' })
          const url = URL.createObjectURL(blob)
          triggerDownload(url, result.data.fileName.replace(/\.md$/, '.html'))
          setTimeout(() => URL.revokeObjectURL(url), 1000)
          toast.success('Document téléchargé')
        }
      } else {
        // Download via route API proxy (évite le blocage cross-origin du navigateur)
        triggerDownload(`/api/documents/download/${document.id}`)
        toast.success('Téléchargement lancé')
      }
    } catch {
      toast.error('Erreur lors du téléchargement')
    } finally {
      setIsGenerating(false)
    }
  }

  const label = isMarkdown ? 'Télécharger en HTML' : 'Télécharger'

  if (variant === 'icon') {
    return (
      <button
        onClick={handleDownload}
        disabled={isGenerating}
        className="inline-flex items-center justify-center rounded-lg border border-border/50 p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground disabled:opacity-50"
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
      disabled={isGenerating}
      className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
      data-testid="download-button"
    >
      <Download className="h-4 w-4" />
      {isGenerating ? 'Génération...' : label}
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
