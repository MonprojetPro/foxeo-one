'use client'

import { useState, useRef } from 'react'
import { Button, Input } from '@monprojetpro/ui'
import { Upload, X } from 'lucide-react'
import { uploadScreenshot } from '../actions/upload-screenshot'

interface ScreenshotUploadProps {
  onUploaded: (url: string) => void
  onRemove: () => void
  currentUrl?: string | null
}

export function ScreenshotUpload({ onUploaded, onRemove, currentUrl }: ScreenshotUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    setError(null)

    const formData = new FormData()
    formData.append('screenshot', file)

    const result = await uploadScreenshot(formData)

    if (result.error) {
      setError(result.error.message)
      setUploading(false)
      return
    }

    if (result.data) {
      onUploaded(result.data)
    }
    setUploading(false)
  }

  if (currentUrl) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-border p-2">
        <img
          src={currentUrl}
          alt="Capture d'écran"
          className="h-16 w-16 rounded object-cover"
        />
        <span className="flex-1 truncate text-sm text-muted-foreground">
          Capture jointe
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => {
            onRemove()
            if (inputRef.current) inputRef.current.value = ''
          }}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
        >
          <Upload className="mr-2 h-4 w-4" />
          {uploading ? 'Upload...' : 'Capture d\'écran'}
        </Button>
        <Input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  )
}
