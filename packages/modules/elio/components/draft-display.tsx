'use client'

import { useState } from 'react'
import { Copy, Edit, Send } from 'lucide-react'
import { Button, showSuccess, showError } from '@foxeo/ui'

interface DraftDisplayProps {
  draft: string
  draftType: 'email' | 'validation_hub' | 'chat'
  version?: number
  onModify?: (instruction: string) => void
  onSend?: () => void
}

const DRAFT_TYPE_LABELS: Record<DraftDisplayProps['draftType'], string> = {
  email: 'Email',
  validation_hub: 'Validation Hub',
  chat: 'Message Chat',
}

export function DraftDisplay({ draft, draftType, version, onModify, onSend }: DraftDisplayProps) {
  const [modifyMode, setModifyMode] = useState(false)
  const [adjustInput, setAdjustInput] = useState('')

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(draft)
      showSuccess('Copié dans le presse-papier')
    } catch {
      showError('Impossible de copier dans le presse-papier')
    }
  }

  const handleAdjustKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && adjustInput.trim() && onModify) {
      onModify(adjustInput.trim())
      setAdjustInput('')
      setModifyMode(false)
    }
  }

  return (
    <div
      className="border-2 border-primary/20 rounded-lg p-4 my-4 bg-primary/5"
      data-testid="draft-display"
    >
      <div className="mb-2 flex items-center gap-2 text-sm font-medium text-primary">
        <span>Brouillon généré — {DRAFT_TYPE_LABELS[draftType]}</span>
        {version && version > 1 && (
          <span className="text-xs text-muted-foreground">Version {version}</span>
        )}
      </div>

      <div
        className="bg-card rounded p-4 mb-3 whitespace-pre-wrap text-sm"
        data-testid="draft-content"
      >
        {draft}
      </div>

      {modifyMode ? (
        <div className="space-y-2">
          <input
            type="text"
            data-testid="draft-adjust-input"
            placeholder="Que veux-tu modifier ? (ex: Plus court, Ajoute la date de livraison)"
            className="w-full px-3 py-2 border rounded text-sm bg-background"
            value={adjustInput}
            onChange={(e) => setAdjustInput(e.target.value)}
            onKeyDown={handleAdjustKeyDown}
            autoFocus
          />
          <button
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => {
              setModifyMode(false)
              setAdjustInput('')
            }}
          >
            Annuler
          </button>
        </div>
      ) : (
        <div className="flex gap-2 flex-wrap">
          <Button
            size="sm"
            variant="outline"
            onClick={handleCopy}
            data-testid="draft-copy-btn"
          >
            <Copy className="w-4 h-4 mr-2" />
            Copier
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setModifyMode(true)}
            data-testid="draft-modify-btn"
          >
            <Edit className="w-4 h-4 mr-2" />
            Modifier
          </Button>
          {draftType === 'chat' && onSend && (
            <Button
              size="sm"
              onClick={onSend}
              data-testid="draft-send-btn"
            >
              <Send className="w-4 h-4 mr-2" />
              Envoyer
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
