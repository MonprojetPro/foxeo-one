'use client'

import { useCallback, useRef, useState } from 'react'
import { Button } from '@monprojetpro/ui'
import { Upload, X, AlertCircle } from 'lucide-react'
import { validateFile, formatFileSize, ALLOWED_FILE_TYPES } from '@monprojetpro/utils'

interface DocumentUploadProps {
  onUpload: (file: File) => void
  isUploading?: boolean
  disabled?: boolean
}

export function DocumentUpload({ onUpload, isUploading = false, disabled = false }: DocumentUploadProps) {
  const [dragActive, setDragActive] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback(
    (file: File) => {
      setError(null)
      const validation = validateFile(file)
      if (!validation.valid) {
        setError(validation.error ?? 'Fichier invalide')
        setSelectedFile(null)
        return
      }
      setSelectedFile(file)
      onUpload(file)
    },
    [onUpload]
  )

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setDragActive(false)

      const file = e.dataTransfer.files[0]
      if (file) {
        handleFile(file)
      }
    },
    [handleFile]
  )

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) {
        handleFile(file)
      }
      // Reset input to allow re-uploading same file
      if (inputRef.current) {
        inputRef.current.value = ''
      }
    },
    [handleFile]
  )

  const clearSelection = useCallback(() => {
    setSelectedFile(null)
    setError(null)
  }, [])

  return (
    <div className="flex flex-col gap-2" data-testid="document-upload">
      <div
        className={`relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition-colors ${
          dragActive
            ? 'border-primary bg-primary/5'
            : 'border-border hover:border-primary/50'
        } ${disabled || isUploading ? 'pointer-events-none opacity-50' : 'cursor-pointer'}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            inputRef.current?.click()
          }
        }}
        aria-label="Zone de dépôt de fichier"
      >
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept={ALLOWED_FILE_TYPES.map((t) => `.${t}`).join(',')}
          onChange={handleChange}
          disabled={disabled || isUploading}
          data-testid="document-upload-input"
        />

        <Upload className="mb-2 h-8 w-8 text-muted-foreground" />

        {isUploading ? (
          <p className="text-sm text-muted-foreground">Upload en cours...</p>
        ) : (
          <>
            <p className="text-sm font-medium">
              Glissez un fichier ici ou{' '}
              <span className="text-primary underline">parcourir</span>
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {ALLOWED_FILE_TYPES.map((t) => t.toUpperCase()).join(', ')} — Max 10 Mo
            </p>
          </>
        )}
      </div>

      {selectedFile && !error && (
        <div className="flex items-center gap-2 rounded-md bg-muted/50 px-3 py-2 text-sm">
          <span className="truncate">{selectedFile.name}</span>
          <span className="text-muted-foreground">({formatFileSize(selectedFile.size)})</span>
          <Button
            variant="ghost"
            size="icon"
            className="ml-auto h-6 w-6"
            onClick={(e) => {
              e.stopPropagation()
              clearSelection()
            }}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive" data-testid="upload-error">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  )
}
