'use client'

import { useState, useRef, type KeyboardEvent } from 'react'
import { Button, Textarea } from '@monprojetpro/ui'
import { Send, Paperclip, X } from 'lucide-react'

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf']
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB

export type TransformMode = 'verify' | 'trust'

export interface ChatSendPayload {
  content: string
  file?: File
}

interface ChatInputProps {
  onSend: (payload: ChatSendPayload) => void
  isSending?: boolean
  disabled?: boolean
  placeholder?: string
  showAttachment?: boolean
}

export function ChatInput({
  onSend,
  isSending = false,
  disabled = false,
  placeholder = 'Écrivez votre message...',
  showAttachment = false,
}: ChatInputProps) {
  const [content, setContent] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const canSend = (content.trim().length > 0 || selectedFile !== null) && !isSending && !disabled

  function handleSend() {
    if (!canSend) return
    onSend({ content: content.trim(), file: selectedFile ?? undefined })
    setContent('')
    setSelectedFile(null)
    setFileError(null)
    textareaRef.current?.focus()
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null
    setFileError(null)
    if (!file) return
    if (!ALLOWED_TYPES.includes(file.type)) {
      setFileError('Format non autorisé. Acceptés : JPG, PNG, GIF, WEBP, PDF')
      return
    }
    if (file.size > MAX_FILE_SIZE) {
      setFileError('Fichier trop volumineux (max 10 Mo)')
      return
    }
    setSelectedFile(file)
    e.target.value = ''
  }

  function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} o`
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`
    return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`
  }

  return (
    <div className="border-t shrink-0" data-testid="chat-input">
      {/* Preview fichier sélectionné */}
      {selectedFile && (
        <div className="flex items-center gap-2 px-6 pt-3 text-sm">
          <Paperclip className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <span className="truncate text-muted-foreground flex-1 text-xs">
            {selectedFile.name} <span className="opacity-60">({formatFileSize(selectedFile.size)})</span>
          </span>
          <button
            type="button"
            onClick={() => { setSelectedFile(null); setFileError(null) }}
            className="text-muted-foreground hover:text-foreground"
            aria-label="Retirer le fichier"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
      {fileError && (
        <p className="px-6 pt-1 text-xs text-destructive">{fileError}</p>
      )}

      <div className="flex items-end gap-2 px-6 py-4">
        {showAttachment && (
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp,application/pdf"
              className="hidden"
              onChange={handleFileSelect}
              aria-label="Choisir un fichier à joindre"
              data-testid="file-input"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled || isSending}
              aria-label="Joindre un fichier"
              data-testid="attach-button"
              className="shrink-0 h-9 w-9 text-muted-foreground hover:text-foreground"
            >
              <Paperclip className="h-4 w-4" />
            </Button>
          </>
        )}

        <Textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled || isSending}
          rows={1}
          className="min-h-[40px] max-h-[120px] resize-none"
          aria-label="Message"
          data-testid="message-input"
        />

        <Button
          type="button"
          size="icon"
          onClick={handleSend}
          disabled={!canSend}
          aria-label="Envoyer le message"
          data-testid="send-button"
          className="shrink-0 h-9 w-9"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
