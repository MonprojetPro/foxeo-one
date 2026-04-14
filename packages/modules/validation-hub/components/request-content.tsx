'use client'

import Link from 'next/link'
import { FileText, Download } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import {
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
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          Besoin exprimé
        </h2>
      </CardHeader>
      <CardContent className="pt-0 space-y-4">
        {/* Contenu markdown */}
        <div className="prose prose-invert max-w-none text-sm text-foreground/90">
          <ReactMarkdown
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
