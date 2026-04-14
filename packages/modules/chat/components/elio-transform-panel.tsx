'use client'

import { useState, useEffect } from 'react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  Button,
  Textarea,
} from '@monprojetpro/ui'
import { cn } from '@monprojetpro/utils'
import { transformMessageForClient } from '@monprojetpro/module-elio'
import type { TransformMode } from './chat-input'

interface ElioTransformPanelProps {
  rawMessage: string
  clientId: string
  onSend: (content: string) => void
  onSendRaw: () => void
  onCancel: () => void
  open: boolean
  currentMode: TransformMode
  onModeChange: (mode: TransformMode) => void
}

export function ElioTransformPanel({
  rawMessage,
  clientId,
  onSend,
  onSendRaw,
  onCancel,
  open,
  currentMode,
  onModeChange,
}: ElioTransformPanelProps) {
  const [transformedText, setTransformedText] = useState('')
  const [profileUsed, setProfileUsed] = useState<{ tone: string; length: string; style: string } | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open || !rawMessage.trim()) return
    setIsLoading(true)
    setError(null)
    setTransformedText('')
    setProfileUsed(null)

    transformMessageForClient({ clientId, rawMessage })
      .then((result) => {
        if (result.error) {
          setError(result.error.message)
        } else if (result.data) {
          setTransformedText(result.data.transformedText)
          setProfileUsed(result.data.profileUsed)
        } else {
          setError('Élio n\'a pas pu transformer le message (réponse vide)')
        }
      })
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : 'Erreur inattendue lors de la connexion à Élio'
        setError(message)
      })
      .finally(() => setIsLoading(false))
  }, [open, rawMessage, clientId])

  function handleSendTransformed() {
    if (transformedText.trim()) onSend(transformedText.trim())
  }

  return (
    <Sheet open={open} onOpenChange={(isOpen) => { if (!isOpen) onCancel() }}>
      <SheetContent side="right" className="w-[500px] sm:w-[540px] flex flex-col p-0 gap-0">

        {/* Header */}
        <SheetHeader className="px-6 py-4 border-b shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-base font-semibold">Workflow Élio</span>
            <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-medium text-primary">
              🤖 Transformation
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            Élio reformule ton message en l'adaptant au profil de communication du client.
          </p>
        </SheetHeader>

        {/* Contenu scrollable */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

          {/* ① Message brut */}
          <div className="space-y-1.5">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">
              ① Ton message brut
            </p>
            <div className="rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
              {rawMessage}
            </div>
          </div>

          {/* Flèche Élio */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground justify-center">
            <span className="text-primary font-medium">↓ Élio reformule</span>
            {profileUsed && (
              <span className="rounded border border-primary/20 bg-primary/10 px-2 py-0.5 text-[10px] text-primary font-medium">
                🤖 Ton adapté
              </span>
            )}
          </div>

          {/* Profil utilisé */}
          {profileUsed && (
            <div className="rounded-lg border bg-muted/20 px-3 py-2 text-xs text-muted-foreground grid grid-cols-3 gap-1">
              <span><span className="font-medium text-foreground/60">Ton</span> · {profileUsed.tone.split(' ')[0]}</span>
              <span><span className="font-medium text-foreground/60">Long.</span> · {profileUsed.length.split(' ')[0]}</span>
              <span><span className="font-medium text-foreground/60">Style</span> · {profileUsed.style.split(' ')[0]}</span>
            </div>
          )}

          {/* ② Message transformé */}
          <div className="space-y-1.5">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">
              ② Message formaté <span className="normal-case font-normal">(modifiable)</span>
            </p>

            {isLoading ? (
              <div className="rounded-lg border p-4 space-y-2.5">
                <div className="h-4 bg-muted animate-pulse rounded-md w-3/4" />
                <div className="h-4 bg-muted animate-pulse rounded-md w-full" />
                <div className="h-4 bg-muted animate-pulse rounded-md w-5/6" />
                <div className="h-4 bg-muted animate-pulse rounded-md w-2/3" />
              </div>
            ) : error ? (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive space-y-1">
                <p className="font-medium">Élio n'a pas pu transformer le message</p>
                <p className="text-xs opacity-80">{error}</p>
              </div>
            ) : (
              <Textarea
                value={transformedText}
                onChange={(e) => setTransformedText(e.target.value)}
                rows={7}
                className="resize-none text-sm leading-relaxed border-primary/20 focus-visible:ring-primary/30"
                placeholder="Message transformé par Élio..."
                aria-label="Message transformé modifiable"
              />
            )}
          </div>

          {/* ⚙️ Mode d'envoi */}
          <div className="space-y-2">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest flex items-center gap-1">
              <span>⚙️</span> Mode d'envoi
            </p>
            <button
              type="button"
              onClick={() => onModeChange('verify')}
              className={cn(
                'w-full rounded-lg border p-3 text-left transition-colors',
                currentMode === 'verify'
                  ? 'border-primary/40 bg-primary/10'
                  : 'border-border hover:border-muted-foreground/30'
              )}
            >
              <div className="flex items-center gap-2">
                <div className={cn(
                  'h-3.5 w-3.5 rounded-full border-2 flex items-center justify-center shrink-0',
                  currentMode === 'verify' ? 'border-primary' : 'border-muted-foreground/40'
                )}>
                  {currentMode === 'verify' && <div className="h-1.5 w-1.5 rounded-full bg-primary" />}
                </div>
                <span className={cn('text-sm font-medium', currentMode === 'verify' ? 'text-primary' : 'text-foreground/70')}>
                  Vérification systématique <span className="text-xs font-normal opacity-60">(défaut)</span>
                </span>
              </div>
              <p className="mt-1 pl-5.5 text-xs text-muted-foreground">
                Tu valides chaque message avant envoi. Élio te montre sa reformulation et tu choisis d'envoyer ou modifier.
              </p>
            </button>

            <button
              type="button"
              onClick={() => onModeChange('trust')}
              className={cn(
                'w-full rounded-lg border p-3 text-left transition-colors',
                currentMode === 'trust'
                  ? 'border-amber-500/40 bg-amber-500/10'
                  : 'border-border hover:border-muted-foreground/30'
              )}
            >
              <div className="flex items-center gap-2">
                <div className={cn(
                  'h-3.5 w-3.5 rounded-full border-2 flex items-center justify-center shrink-0',
                  currentMode === 'trust' ? 'border-amber-500' : 'border-muted-foreground/40'
                )}>
                  {currentMode === 'trust' && <div className="h-1.5 w-1.5 rounded-full bg-amber-500" />}
                </div>
                <span className={cn('text-sm font-medium', currentMode === 'trust' ? 'text-amber-400' : 'text-foreground/70')}>
                  Mode Confiance
                </span>
              </div>
              <p className="mt-1 pl-5.5 text-xs text-muted-foreground">
                Élio envoie directement après reformulation. Historique consultable si besoin de vérifier.
              </p>
            </button>
          </div>

        </div>

        {/* Actions fixes en bas */}
        <div className="border-t px-6 py-4 space-y-2 shrink-0">
          <div className="flex gap-2">
            <Button
              onClick={handleSendTransformed}
              disabled={isLoading || !transformedText.trim()}
              className="flex-1"
              aria-label="Envoyer le message transformé"
            >
              ✓ Envoyer
            </Button>
            <Button variant="outline" onClick={onCancel} aria-label="Annuler">
              Annuler
            </Button>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onSendRaw}
            className="w-full text-muted-foreground text-xs"
            aria-label="Envoyer sans transformer"
          >
            Envoyer sans transformer
          </Button>
        </div>

      </SheetContent>
    </Sheet>
  )
}
