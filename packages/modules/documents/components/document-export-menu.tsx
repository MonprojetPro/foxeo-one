'use client'

import { useRef, useState, useEffect, useTransition } from 'react'
import { Button, toast } from '@monprojetpro/ui'
import { ChevronDown, Download, Loader2 } from 'lucide-react'
import { useExportDocuments } from '../hooks/use-export-documents'
import { generatePdf } from '../actions/generate-pdf'
import { getDocumentUrl } from '../actions/get-document-url'
import type { Document } from '../types/document.types'

const MARKDOWN_EXTENSIONS = ['md', 'markdown']

interface DocumentExportMenuProps {
  clientId: string
  selectedDocument?: Document
}

export function DocumentExportMenu({ clientId, selectedDocument }: DocumentExportMenuProps) {
  const { exportCSV, exportJSON, isPending } = useExportDocuments(clientId)
  const [isPdfPending, startPdfTransition] = useTransition()
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [isOpen])

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false)
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen])

  const handleDownloadPdf = () => {
    if (!selectedDocument) return
    setIsOpen(false)

    startPdfTransition(async () => {
      const isMarkdown = MARKDOWN_EXTENSIONS.includes(selectedDocument.fileType.toLowerCase())

      if (isMarkdown) {
        const result = await generatePdf({ documentId: selectedDocument.id })
        if (result.error) {
          toast.error(result.error.message)
          return
        }
        const { htmlContent, fileName } = result.data!
        const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = fileName
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        setTimeout(() => URL.revokeObjectURL(url), 1000)
        toast.success(`PDF téléchargé : ${fileName}`)
        console.info(`[DOCUMENTS:EXPORT_PDF] ${fileName}`)
      } else {
        const result = await getDocumentUrl({ documentId: selectedDocument.id })
        if (result.error) {
          toast.error(result.error.message)
          return
        }
        const a = document.createElement('a')
        a.href = result.data!.url
        a.download = selectedDocument.name
        a.target = '_blank'
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        console.info(`[DOCUMENTS:EXPORT_PDF] ${selectedDocument.name}`)
      }
    })
  }

  const handleExportCSV = () => {
    setIsOpen(false)
    exportCSV()
  }

  const handleExportJSON = () => {
    setIsOpen(false)
    exportJSON()
  }

  const isLoading = isPending || isPdfPending

  return (
    <div ref={menuRef} className="relative" data-testid="export-menu-container">
      <Button
        variant="outline"
        size="sm"
        disabled={isLoading}
        onClick={() => setIsOpen((prev) => !prev)}
        data-testid="export-menu-trigger"
        aria-haspopup="menu"
        aria-expanded={isOpen}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" aria-hidden="true" />
        ) : (
          <Download className="h-4 w-4 mr-2" aria-hidden="true" />
        )}
        {isLoading ? 'Export en cours...' : 'Exporter'}
        {!isLoading && <ChevronDown className="h-4 w-4 ml-1" aria-hidden="true" />}
      </Button>

      {isOpen && (
        <div
          role="menu"
          className="absolute right-0 mt-1 w-52 rounded-md border border-border bg-popover shadow-md z-50 py-1"
          data-testid="export-menu-content"
        >
          {selectedDocument && (
            <button
              role="menuitem"
              className="w-full text-left px-3 py-2 text-sm hover:bg-accent cursor-pointer"
              onClick={handleDownloadPdf}
              disabled={isLoading}
              data-testid="export-pdf-item"
            >
              Télécharger en PDF
            </button>
          )}
          <button
            role="menuitem"
            className="w-full text-left px-3 py-2 text-sm hover:bg-accent cursor-pointer"
            onClick={handleExportCSV}
            disabled={isLoading}
            data-testid="export-csv-item"
          >
            Exporter la liste en CSV
          </button>
          <button
            role="menuitem"
            className="w-full text-left px-3 py-2 text-sm hover:bg-accent cursor-pointer"
            onClick={handleExportJSON}
            disabled={isLoading}
            data-testid="export-json-item"
          >
            Exporter la liste en JSON
          </button>
        </div>
      )}
    </div>
  )
}
