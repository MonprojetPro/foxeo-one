'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { FileText, Download, Copy, Check } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  Separator,
} from '@monprojetpro/ui'
import { formatFileSize } from '@monprojetpro/utils'
import type { DocumentSummary } from '../types/validation.types'

type RequestContentProps = {
  content: string
  documents: DocumentSummary[]
}

export function RequestContent({ content, documents }: RequestContentProps) {
  return (
    <Card className="bg-card/50 border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Besoin exprimé
          </h2>
          <CopyContentButton content={content} />
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-4">
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
            <Separator className="bg-border/50" />
            <div className="space-y-2">
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Documents joints ({documents.length})
              </h3>
              <div className="space-y-2">
                {documents.map((doc) => (
                  <DocumentItem key={doc.id} document={doc} />
                ))}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
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
      className="h-7 shrink-0 gap-1.5 text-xs"
      aria-label="Copier le contenu du document"
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? 'Copié' : 'Copier'}
    </Button>
  )
}

function DocumentItem({ document: doc }: { document: DocumentSummary }) {
  const ext = doc.fileType.split('/').pop()?.toUpperCase() ?? doc.fileType

  return (
    <div className="flex items-center gap-3 p-2.5 rounded-md bg-muted/30 hover:bg-muted/50 transition-colors">
      <div className="p-1.5 rounded bg-primary/10 shrink-0">
        <FileText className="h-4 w-4 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">
          {doc.name}
        </p>
        <p className="text-xs text-muted-foreground">
          {ext} · {formatFileSize(doc.fileSize)}
        </p>
      </div>
      <Link
        href={`/modules/documents?path=${encodeURIComponent(doc.filePath)}`}
        className="shrink-0 p-1.5 rounded hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
        aria-label={`Télécharger ${doc.name}`}
      >
        <Download className="h-4 w-4" />
      </Link>
    </div>
  )
}
