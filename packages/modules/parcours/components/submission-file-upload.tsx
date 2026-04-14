'use client'

import { useRef, useState } from 'react'
import { Paperclip, X, FileText, Image } from 'lucide-react'
import { Button } from '@monprojetpro/ui'
import { cn } from '@monprojetpro/utils'

interface SubmissionFileUploadProps {
  onFilesChange: (files: File[]) => void
  maxFiles?: number
}

const ACCEPTED_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/png',
  'image/jpeg',
]

const ACCEPTED_EXTENSIONS = '.pdf,.docx,.png,.jpg,.jpeg'

function getFileIcon(type: string) {
  if (type.startsWith('image/')) return Image
  return FileText
}

export function SubmissionFileUpload({ onFilesChange, maxFiles = 5 }: SubmissionFileUploadProps) {
  const [files, setFiles] = useState<File[]>([])
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null)
    const selected = Array.from(e.target.files ?? [])

    const invalid = selected.filter((f) => !ACCEPTED_TYPES.includes(f.type))
    if (invalid.length > 0) {
      setError('Types acceptés : PDF, DOCX, PNG, JPG')
      return
    }

    const next = [...files, ...selected]
    if (next.length > maxFiles) {
      setError(`Maximum ${maxFiles} fichiers`)
      return
    }

    setFiles(next)
    onFilesChange(next)
    // Reset input so same file can be re-added after removal
    if (inputRef.current) inputRef.current.value = ''
  }

  const removeFile = (index: number) => {
    const next = files.filter((_, i) => i !== index)
    setFiles(next)
    onFilesChange(next)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPTED_EXTENSIONS}
          onChange={handleFileChange}
          className="sr-only"
          id="submission-file-input"
          aria-label="Ajouter des fichiers joints"
        />
        <label htmlFor="submission-file-input">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="cursor-pointer"
            onClick={() => inputRef.current?.click()}
            disabled={files.length >= maxFiles}
          >
            <Paperclip className="w-4 h-4 mr-2" aria-hidden="true" />
            Joindre des fichiers
          </Button>
        </label>
        <span className="text-xs text-muted-foreground">
          {files.length}/{maxFiles} — PDF, DOCX, PNG, JPG
        </span>
      </div>

      {error && (
        <p className="text-sm text-destructive" role="alert">{error}</p>
      )}

      {files.length > 0 && (
        <ul className="space-y-2" aria-label="Fichiers sélectionnés">
          {files.map((file, i) => {
            const Icon = getFileIcon(file.type)
            return (
              <li
                key={`${file.name}-${i}`}
                className={cn(
                  'flex items-center gap-2 rounded-md border border-border bg-muted/30 px-3 py-2 text-sm'
                )}
              >
                <Icon className="w-4 h-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                <span className="flex-1 truncate">{file.name}</span>
                <span className="text-xs text-muted-foreground shrink-0">
                  {(file.size / 1024).toFixed(0)} Ko
                </span>
                <button
                  type="button"
                  onClick={() => removeFile(i)}
                  className="shrink-0 rounded p-0.5 text-muted-foreground hover:text-destructive transition-colors"
                  aria-label={`Supprimer ${file.name}`}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
