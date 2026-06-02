'use client'

import { useState, useRef, useEffect } from 'react'
import { Download, ChevronDown, FileText, FileType2, Printer } from 'lucide-react'
import { toast } from '@monprojetpro/ui'
import type { Document } from '../types/document.types'

const MARKDOWN_TYPES = ['md', 'markdown']

interface DocumentExportButtonProps {
  document: Document
  /** HTML rendu du markdown (fourni par la page viewer). Null pour les fichiers non-markdown. */
  markdownHtml: string | null
}

/**
 * Menu d'export d'un document — 100% client, gratuit, sans dépendance ni serveur :
 * - Markdown (.md) : fichier brut via le proxy API.
 * - Word (.doc)    : HTML compatible Word (ouvert/éditable par Word, Google Docs, LibreOffice).
 * - PDF            : vue propre + « Enregistrer en PDF » natif du navigateur (qualité parfaite).
 *
 * Word/PDF ne sont proposés que pour les documents markdown (les seuls dont on a le HTML rendu).
 * Pour les autres types, on retombe sur un simple bouton « Télécharger ».
 */
export function DocumentExportButton({ document, markdownHtml }: DocumentExportButtonProps) {
  const isMarkdown = MARKDOWN_TYPES.includes(document.fileType.toLowerCase())
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    window.document.addEventListener('mousedown', onClickOutside)
    return () => window.document.removeEventListener('mousedown', onClickOutside)
  }, [open])

  const baseName = document.name.replace(/\.(md|markdown)$/i, '')

  const downloadMarkdown = () => {
    triggerUrlDownload(`/api/documents/download/${document.id}`)
    toast.success('Téléchargement lancé')
    setOpen(false)
  }

  const downloadWord = () => {
    const html = buildExportHtml(baseName, markdownHtml ?? '')
    // Le BOM ﻿ aide Word à interpréter l'UTF-8 ; type msword → ouvert comme document Word.
    const blob = new Blob(['﻿', html], { type: 'application/msword' })
    triggerBlobDownload(blob, `${baseName}.doc`)
    toast.success('Document Word téléchargé')
    setOpen(false)
  }

  const downloadPdf = () => {
    // Vue HTML autonome (avec impression auto au chargement) servie via une URL Blob :
    // pas de document.write, et la fenêtre déclenche elle-même « Enregistrer en PDF ».
    const html = buildExportHtml(baseName, markdownHtml ?? '', { forPrint: true })
    const url = URL.createObjectURL(new Blob([html], { type: 'text/html' }))
    const win = window.open(url, '_blank', 'noopener,noreferrer')
    if (!win) {
      toast.error('Autorise les pop-ups pour générer le PDF')
      URL.revokeObjectURL(url)
      return
    }
    setTimeout(() => URL.revokeObjectURL(url), 60_000)
    setOpen(false)
  }

  // Documents non-markdown : simple téléchargement du fichier réel.
  if (!isMarkdown) {
    return (
      <button
        onClick={downloadMarkdown}
        className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        data-testid="export-download"
      >
        <Download className="h-4 w-4" />
        Télécharger
      </button>
    )
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        data-testid="export-menu-trigger"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <Download className="h-4 w-4" />
        Télécharger
        <ChevronDown className="h-4 w-4" />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-1 min-w-[200px] rounded-md border bg-popover p-1 shadow-md"
        >
          <button role="menuitem" onClick={downloadMarkdown} className="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm hover:bg-muted transition-colors" data-testid="export-md">
            <FileText className="h-4 w-4 text-muted-foreground" />
            Markdown (.md)
          </button>
          <button role="menuitem" onClick={downloadWord} className="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm hover:bg-muted transition-colors" data-testid="export-word">
            <FileType2 className="h-4 w-4 text-muted-foreground" />
            Word (.doc)
          </button>
          <button role="menuitem" onClick={downloadPdf} className="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm hover:bg-muted transition-colors" data-testid="export-pdf">
            <Printer className="h-4 w-4 text-muted-foreground" />
            PDF (via le navigateur)
          </button>
        </div>
      )}
    </div>
  )
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

/** Document HTML autonome et stylé, réutilisé pour l'export Word et l'aperçu PDF. */
function buildExportHtml(title: string, bodyHtml: string, opts: { forPrint?: boolean } = {}): string {
  // Pour le PDF : la fenêtre déclenche elle-même l'impression au chargement (script DE CONFIANCE,
  // pas du contenu utilisateur — bodyHtml est déjà assaini par markdownToHtml côté serveur).
  const printScript = opts.forPrint
    ? '<script>window.addEventListener("load",function(){setTimeout(function(){window.print()},300)})</script>'
    : ''
  return `<!DOCTYPE html>
<html lang="fr"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title>
<style>
  body { font-family: Arial, Helvetica, sans-serif; max-width: 800px; margin: 24px auto; padding: 0 24px; color: #1a1a1a; line-height: 1.6; }
  h1 { font-size: 24px; border-bottom: 2px solid #333; padding-bottom: 8px; }
  h2 { font-size: 20px; } h3 { font-size: 17px; }
  table { border-collapse: collapse; width: 100%; margin: 12px 0; }
  th, td { border: 1px solid #ccc; padding: 6px 10px; text-align: left; }
  th { background: #f3f3f3; }
  hr { border: none; border-top: 1px solid #e5e7eb; margin: 24px 0; }
  ${opts.forPrint ? '@media print { body { margin: 12mm; max-width: none; } }' : ''}
</style></head>
<body>${bodyHtml}${printScript}</body></html>`
}

function triggerUrlDownload(url: string) {
  const a = window.document.createElement('a')
  a.href = url
  a.style.display = 'none'
  window.document.body.appendChild(a)
  a.click()
  window.document.body.removeChild(a)
}

function triggerBlobDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = window.document.createElement('a')
  a.href = url
  a.download = filename
  a.style.display = 'none'
  window.document.body.appendChild(a)
  a.click()
  window.document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
