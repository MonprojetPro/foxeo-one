'use client'

// ============================================================
// Sélection des pièces jointes (jusqu'à 3) — pattern GuardVeto
// ============================================================
// Ce composant ne fait QUE gérer la sélection locale (File[]) et sa
// validation (nombre, poids, format) — il n'uploade rien. L'upload effectif
// (compression + dépôt direct chez Supabase) se fait au moment de l'envoi du
// formulaire, dans ReportIssueDialog : ça évite un état intermédiaire
// « certains fichiers uploadés, d'autres non » pendant la saisie.

import { useRef } from 'react'
import { Button } from '@monprojetpro/ui'
import { Paperclip, X } from 'lucide-react'
import {
  ACCEPT_HTML,
  MAX_ATTACHMENTS,
  readableSize,
  rejectFile,
} from '../lib/attachment-constraints'

interface AttachmentsPickerProps {
  files: File[]
  onChange: (files: File[]) => void
  onRejected: (message: string) => void
  disabled?: boolean
}

export function AttachmentsPicker({ files, onChange, onRejected, disabled }: AttachmentsPickerProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  const addFiles = (list: FileList | null) => {
    if (!list || list.length === 0) return
    const candidates = Array.from(list)

    const room = MAX_ATTACHMENTS - files.length
    if (candidates.length > room) {
      onRejected(
        room === 0
          ? `Tu as déjà ${MAX_ATTACHMENTS} pièces jointes. Retire-en une pour en ajouter une autre.`
          : `Il ne reste de la place que pour ${room} fichier${room > 1 ? 's' : ''} — ${MAX_ATTACHMENTS} au maximum.`
      )
      if (inputRef.current) inputRef.current.value = ''
      return
    }

    for (const file of candidates) {
      const rejection = rejectFile(file)
      if (rejection) {
        onRejected(rejection)
        if (inputRef.current) inputRef.current.value = ''
        return
      }
    }

    onChange([...files, ...candidates])
    // Sans ça, re-choisir le même fichier après l'avoir retiré ne déclenche
    // aucun événement onChange.
    if (inputRef.current) inputRef.current.value = ''
  }

  const removeFile = (index: number) => {
    onChange(files.filter((_, i) => i !== index))
  }

  const full = files.length >= MAX_ATTACHMENTS

  return (
    <div>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => inputRef.current?.click()}
          disabled={disabled || full}
        >
          <Paperclip className="mr-2 h-4 w-4" />
          {full ? `${MAX_ATTACHMENTS} pièces jointes, c'est le maximum` : 'Ajouter une capture ou un PDF'}
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT_HTML}
          multiple
          className="hidden"
          onChange={(e) => addFiles(e.target.files)}
          disabled={disabled || full}
        />
      </div>

      {files.length > 0 && (
        <ul className="mt-2 space-y-1">
          {files.map((file, i) => (
            <li
              key={`${file.name}-${i}`}
              className="flex items-center gap-2 rounded-md border border-border p-2 text-sm"
            >
              <span className="min-w-0 flex-1 truncate">{file.name}</span>
              <span className="shrink-0 text-xs text-muted-foreground">{readableSize(file.size)}</span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0"
                onClick={() => removeFile(i)}
                disabled={disabled}
                aria-label={`Retirer ${file.name}`}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
