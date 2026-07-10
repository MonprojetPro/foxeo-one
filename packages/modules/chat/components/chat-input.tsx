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
    /* Barre de saisie cockpit — fond verre, bordure haut discrète */
    <div
      className="shrink-0 border-t border-white/10 bg-white/[0.02]"
      data-testid="chat-input"
    >
      {/* Preview fichier sélectionné */}
      {selectedFile && (
        <div className="flex items-center gap-2 px-5 pt-3 text-sm">
          <Paperclip className="h-3.5 w-3.5 text-gray-500 shrink-0" />
          <span className="truncate text-gray-400 flex-1 text-xs">
            {selectedFile.name}{' '}
            <span className="text-gray-600">({formatFileSize(selectedFile.size)})</span>
          </span>
          <button
            type="button"
            onClick={() => { setSelectedFile(null); setFileError(null) }}
            className="text-gray-600 hover:text-gray-300 transition-colors"
            aria-label="Retirer le fichier"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
      {/* Erreur de validation fichier */}
      {fileError && (
        <p className="px-5 pt-1 text-xs text-red-400">{fileError}</p>
      )}

      <div className="flex items-end gap-2 px-5 py-3">
        {/* Bouton pièce jointe */}
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
              className="shrink-0 h-9 w-9 text-gray-500 hover:text-gray-200 hover:bg-white/[0.05]"
            >
              <Paperclip className="h-4 w-4" />
            </Button>
          </>
        )}

        {/* Champ de saisie — verre cockpit */}
        <Textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled || isSending}
          rows={1}
          className="min-h-[40px] max-h-[120px] resize-none border-white/10 bg-white/[0.03] text-gray-100 placeholder:text-gray-600 focus-visible:ring-cyan-400/30 focus-visible:border-cyan-400/25"
          aria-label="Message"
          data-testid="message-input"
        />

        {/* Bouton Envoyer — accent cyan */}
        <Button
          type="button"
          size="icon"
          onClick={handleSend}
          disabled={!canSend}
          aria-label="Envoyer le message"
          data-testid="send-button"
          className="shrink-0 h-9 w-9 bg-cyan-500/80 hover:bg-cyan-500 text-white shadow-[0_0_16px_-4px_theme(colors.cyan.400/40)] transition-colors"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
