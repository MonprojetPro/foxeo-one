'use client'

import { FileText, Download, ExternalLink, Image, File, Save, Mail } from 'lucide-react'
import { Button } from '@monprojetpro/ui'
import { useRouter } from 'next/navigation'

export type DocumentType = 'pdf' | 'doc' | 'image' | 'markdown'

interface ElioDocumentProps {
  documentId: string
  documentName: string
  documentType: DocumentType
  isElioGenerated?: boolean
  preview?: string
  /** @deprecated Reserved for future per-dashboard document paths */
  dashboardType?: 'hub' | 'lab' | 'one'
  // Story 8.9b — Actions sur documents générés par Élio One+
  /** URL signée pour téléchargement PDF du document généré */
  pdfUrl?: string
  /** Callback déclenché quand l'utilisateur clique "Enregistrer dans vos documents" */
  onSave?: () => void
  /** Callback déclenché quand l'utilisateur clique "Envoyer par email" */
  onEmail?: () => void
}

const TYPE_ICONS: Record<DocumentType, React.ReactNode> = {
  pdf: <FileText className="w-5 h-5 text-red-500" />,
  doc: <FileText className="w-5 h-5 text-blue-500" />,
  image: <Image className="w-5 h-5 text-purple-500" />,
  markdown: <File className="w-5 h-5 text-green-500" />,
}

export function ElioDocument({
  documentId,
  documentName,
  documentType,
  isElioGenerated,
  preview,
  pdfUrl,
  onSave,
  onEmail,
}: ElioDocumentProps) {
  const router = useRouter()

  const hasGeneratedActions = isElioGenerated && (pdfUrl || onSave || onEmail)

  return (
    <div
      className="border rounded-lg p-4 my-2 bg-card"
      data-testid="elio-document"
      data-document-id={documentId}
    >
      <div className="flex items-start gap-3">
        <div className="shrink-0 mt-0.5">{TYPE_ICONS[documentType] ?? <FileText className="w-5 h-5" />}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="font-medium text-sm truncate">{documentName}</h4>
            {isElioGenerated && (
              <span
                className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary shrink-0"
                data-testid="elio-generated-badge"
              >
                Généré par Élio
              </span>
            )}
          </div>

          {preview && (
            <p className="mt-1.5 text-xs text-muted-foreground line-clamp-3 whitespace-pre-wrap">
              {preview}
            </p>
          )}

          <div className="flex gap-2 mt-3 flex-wrap">
            {/* Boutons standard — voir + télécharger */}
            {!hasGeneratedActions && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => router.push(`/modules/documents/${documentId}`)}
                  data-testid="view-document-btn"
                >
                  <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                  Voir le document complet
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => window.open(`/api/documents/${documentId}/download`, '_blank')}
                  data-testid="download-document-btn"
                >
                  <Download className="w-3.5 h-3.5 mr-1.5" />
                  Télécharger
                </Button>
              </>
            )}

            {/* Boutons actions documents générés par Élio One+ (Story 8.9b — Task 7) */}
            {hasGeneratedActions && (
              <>
                {pdfUrl && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => window.open(pdfUrl, '_blank')}
                    data-testid="download-pdf-btn"
                  >
                    <Download className="w-3.5 h-3.5 mr-1.5" />
                    Télécharger en PDF
                  </Button>
                )}
                {onSave && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={onSave}
                    data-testid="save-document-btn"
                  >
                    <Save className="w-3.5 h-3.5 mr-1.5" />
                    Enregistrer dans vos documents
                  </Button>
                )}
                {onEmail && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={onEmail}
                    data-testid="email-document-btn"
                  >
                    <Mail className="w-3.5 h-3.5 mr-1.5" />
                    Envoyer par email
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
