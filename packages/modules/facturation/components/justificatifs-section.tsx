'use client'

import { useState, useRef, useCallback, useTransition } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getRecentUploads } from '../actions/configure-google-drive'
import { uploadJustificatif } from '../actions/upload-justificatif'
import { GoogleDriveConfig } from './google-drive-config'
import { showSuccess, showError } from '@monprojetpro/ui'
import { Upload, FileText, CheckCircle2, XCircle, CloudUpload } from 'lucide-react'

// ── Constants ─────────────────────────────────────────────────────────────────

const ALLOWED_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/png']
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 Mo

// ── Helpers ───────────────────────────────────────────────────────────────────

function validateFile(file: File): string | null {
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return 'Type de fichier non autorisé. Formats acceptés : PDF, JPG, PNG'
  }
  if (file.size > MAX_FILE_SIZE) {
    return 'Le fichier dépasse la taille maximale de 10 Mo'
  }
  return null
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`
}

function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// ── Component ─────────────────────────────────────────────────────────────────

export function JustificatifsSection() {
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, startUpload] = useTransition()

  const { data: uploads = [], isPending } = useQuery({
    queryKey: ['justificatif-uploads'],
    queryFn: async () => {
      const result = await getRecentUploads()
      if (result.error) throw new Error(result.error.message)
      return result.data ?? []
    },
    staleTime: 30 * 1_000,
  })

  const handleUpload = useCallback(
    (file: File) => {
      // Client-side validation before sending to server
      const validationError = validateFile(file)
      if (validationError) {
        showError(validationError)
        return
      }

      startUpload(async () => {
        const formData = new FormData()
        formData.append('file', file)

        const result = await uploadJustificatif(formData)
        if (result.error) {
          showError(result.error.message)
          return
        }

        await queryClient.invalidateQueries({ queryKey: ['justificatif-uploads'] })
        showSuccess('Justificatif envoyé à Google Drive')
      })
    },
    [queryClient]
  )

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleUpload(file)
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(true)
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) handleUpload(file)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Config Google Drive */}
      <GoogleDriveConfig />

      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`relative rounded-lg border-2 border-dashed p-8 flex flex-col items-center gap-3 transition-colors cursor-pointer ${
          isDragging
            ? 'border-primary bg-primary/5'
            : 'border-border hover:border-muted-foreground/50'
        } ${isUploading ? 'pointer-events-none opacity-60' : ''}`}
        onClick={() => fileInputRef.current?.click()}
        data-testid="drop-zone"
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png"
          onChange={handleFileSelect}
          className="hidden"
          data-testid="file-input"
        />

        {isUploading ? (
          <>
            <CloudUpload className="h-8 w-8 text-primary animate-pulse" />
            <p className="text-sm text-muted-foreground">Envoi en cours…</p>
          </>
        ) : (
          <>
            <Upload className="h-8 w-8 text-muted-foreground" />
            <div className="text-center">
              <p className="text-sm font-medium">
                Glissez-déposez un fichier ou <span className="text-primary">parcourez</span>
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                PDF, JPG, PNG — 10 Mo max
              </p>
            </div>
          </>
        )}
      </div>

      {/* Upload history */}
      <div>
        <h3 className="text-sm font-medium mb-3">Uploads récents</h3>

        {isPending ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-10 bg-muted rounded animate-pulse" />
            ))}
          </div>
        ) : uploads.length === 0 ? (
          <p className="text-sm text-muted-foreground" data-testid="empty-uploads">
            Aucun justificatif envoyé pour le moment
          </p>
        ) : (
          <div className="rounded-lg border border-border overflow-hidden">
            <table className="w-full text-sm" data-testid="uploads-table">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-3 py-2 text-xs text-muted-foreground font-medium">Fichier</th>
                  <th className="text-left px-3 py-2 text-xs text-muted-foreground font-medium">Taille</th>
                  <th className="text-left px-3 py-2 text-xs text-muted-foreground font-medium">Date</th>
                  <th className="text-left px-3 py-2 text-xs text-muted-foreground font-medium">Statut</th>
                </tr>
              </thead>
              <tbody>
                {uploads.map((upload) => (
                  <tr key={upload.id} className="border-b border-border last:border-0">
                    <td className="px-3 py-2 flex items-center gap-2">
                      <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="truncate max-w-[200px]" title={upload.file_name}>
                        {upload.file_name}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-muted-foreground tabular-nums">
                      {formatFileSize(upload.file_size)}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground tabular-nums">
                      {formatDate(upload.created_at)}
                    </td>
                    <td className="px-3 py-2">
                      {upload.status === 'sent' ? (
                        <span className="inline-flex items-center gap-1 text-xs text-green-500">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Envoyé
                        </span>
                      ) : (
                        <span
                          className="inline-flex items-center gap-1 text-xs text-red-500"
                          title={upload.error_message ?? ''}
                        >
                          <XCircle className="h-3.5 w-3.5" />
                          Erreur
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
