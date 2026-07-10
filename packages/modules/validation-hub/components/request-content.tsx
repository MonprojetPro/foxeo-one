'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { FileText, Download, Copy, Check } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Button } from '@monprojetpro/ui'
import { formatFileSize } from '@monprojetpro/utils'
import type { DocumentSummary } from '../types/validation.types'

type RequestContentProps = {
  content: string
  documents: DocumentSummary[]
}

export function RequestContent({ content, documents }: RequestContentProps) {
  return (
    /* CockpitPanel apporte l'en-tête titré cockpit ; l'action CopyContent va dans le slot linkText */
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02]">
      {/* En-tête cockpit homogène */}
      <div className="flex items-center justify-between gap-2 border-b border-white/10 px-4 py-3">
        <h2 className="text-[0.8rem] font-semibold uppercase tracking-wider text-gray-300">
          Besoin exprimé
        </h2>
        <CopyContentButton content={content} />
      </div>
      <div className="space-y-4 p-4">
        {/* Contenu markdown */}
        <div className="prose prose-invert max-w-none text-sm text-foreground/90">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              p: ({ children }) => (
                <p className="mb-3 last:mb-0">{children}</p>
              ),
              h1: ({ children }) => (
                <h1 className="text-lg font-bold mb-2">{children}</h1>
              ),
              h2: ({ children }) => (
                <h2 className="text-base font-semibold mb-2">{children}</h2>
              ),
              h3: ({ children }) => (
                <h3 className="text-sm font-semibold mb-1">{children}</h3>
              ),
              ul: ({ children }) => (
                <ul className="list-disc list-inside mb-3 space-y-1">
                  {children}
                </ul>
              ),
              ol: ({ children }) => (
                <ol className="list-decimal list-inside mb-3 space-y-1">
                  {children}
                </ol>
              ),
              strong: ({ children }) => (
                <strong className="font-semibold text-foreground">
                  {children}
                </strong>
              ),
              table: ({ children }) => (
                <div className="overflow-x-auto mb-3">
                  <table className="w-full border-collapse text-xs">{children}</table>
                </div>
              ),
              thead: ({ children }) => (
                <thead className="bg-muted/40">{children}</thead>
              ),
              tbody: ({ children }) => <tbody>{children}</tbody>,
              tr: ({ children }) => (
                <tr className="border-b border-border/40">{children}</tr>
              ),
              th: ({ children }) => (
                <th className="px-3 py-1.5 text-left font-semibold text-foreground/80 border border-border/30">
                  {children}
                </th>
              ),
              td: ({ children }) => (
                <td className="px-3 py-1.5 text-foreground/70 border border-border/30">
                  {children}
                </td>
              ),
            }}
          >
            {content}
          </ReactMarkdown>
        </div>

        {/* Documents joints */}
        {documents.length > 0 && (
          <>
            <div className="border-t border-white/10" />
            <div className="space-y-2">
              <p className="text-[0.7rem] font-semibold uppercase tracking-wider text-gray-500">
                Documents joints ({documents.length})
              </p>
              <div className="space-y-2">
                {documents.map((doc) => (
                  <DocumentItem key={doc.id} document={doc} />
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

/**
 * Bouton « Copier » le contenu brut (markdown) du besoin exprimé dans le presse-papier.
 * Permet à MiKL de coller directement le document dans son Cursor / Claude Code.
 */
function CopyContentButton({ content }: { content: string }) {
  const [copied, setCopied] = useState(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
  }, [])

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(content)
      setCopied(true)
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      timeoutRef.current = setTimeout(() => setCopied(false), 2000)
    } catch {
      // Presse-papier indisponible (contexte non sécurisé / permission refusée) — échec silencieux
    }
  }, [content])

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleCopy}
      className="h-7 shrink-0 gap-1.5 border-white/10 bg-white/[0.02] text-xs text-gray-400 hover:border-white/20 hover:text-gray-200"
      aria-label="Copier le contenu du document"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-emerald-300" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? 'Copié' : 'Copier'}
    </Button>
  )
}

function DocumentItem({ document: doc }: { document: DocumentSummary }) {
  const ext = doc.fileType.split('/').pop()?.toUpperCase() ?? doc.fileType

  return (
    /* Ligne document : style cockpit — fond verre, hover discret */
    <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-2.5 transition-colors hover:bg-white/[0.04]">
      <div className="shrink-0 rounded-lg border border-cyan-400/20 bg-cyan-400/10 p-1.5">
        <FileText className="h-4 w-4 text-cyan-300" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="truncate text-sm font-medium text-white">
          {doc.name}
        </p>
        <p className="text-xs text-gray-500 tabular-nums">
          {ext} · {formatFileSize(doc.fileSize)}
        </p>
      </div>
      <Link
        href={`/modules/documents?path=${encodeURIComponent(doc.filePath)}`}
        className="shrink-0 rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-cyan-400/10 hover:text-cyan-300"
        aria-label={`Télécharger ${doc.name}`}
      >
        <Download className="h-4 w-4" />
      </Link>
    </div>
  )
}
