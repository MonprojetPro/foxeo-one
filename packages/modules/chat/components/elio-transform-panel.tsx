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

        {/* En-tête cockpit du panneau Élio */}
        <SheetHeader className="shrink-0 border-b border-white/10 bg-white/[0.02] px-6 py-4">
          <div className="flex items-center gap-2">
            <span className="text-base font-semibold text-white/90">Workflow Élio</span>
            {/* Pastille cockpit cyan */}
            <span className="rounded-full border border-cyan-400/25 bg-cyan-400/10 px-2 py-0.5 text-[11px] font-medium text-cyan-300">
              🤖 Transformation
            </span>
          </div>
          <p className="text-xs text-gray-500">
            Élio reformule ton message en l'adaptant au profil de communication du client.
          </p>
        </SheetHeader>

        {/* Contenu scrollable */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

          {/* ① Message brut */}
          <div className="space-y-1.5">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-600">
              ① Ton message brut
            </p>
            {/* Fond verre cockpit pour le brouillon */}
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm text-gray-400 whitespace-pre-wrap leading-relaxed">
              {rawMessage}
            </div>
          </div>

          {/* Flèche Élio + indicateur de profil */}
          <div className="flex items-center justify-center gap-2 text-xs text-gray-600">
            <span className="font-medium text-cyan-300">↓ Élio reformule</span>
            {profileUsed && (
              <span className="rounded border border-cyan-400/20 bg-cyan-400/10 px-2 py-0.5 text-[10px] font-medium text-cyan-300">
                🤖 Ton adapté
              </span>
            )}
          </div>

          {/* Profil utilisé (ton / longueur / style) */}
          {profileUsed && (
            <div className="grid grid-cols-3 gap-1 rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2 text-xs text-gray-500">
              <span><span className="font-medium text-gray-400">Ton</span> · {profileUsed.tone.split(' ')[0]}</span>
              <span><span className="font-medium text-gray-400">Long.</span> · {profileUsed.length.split(' ')[0]}</span>
              <span><span className="font-medium text-gray-400">Style</span> · {profileUsed.style.split(' ')[0]}</span>
            </div>
          )}

          {/* ② Message formaté (modifiable) */}
          <div className="space-y-1.5">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-600">
              ② Message formaté{' '}
              <span className="normal-case font-normal text-gray-700">(modifiable)</span>
            </p>

            {isLoading ? (
              /* Skeleton cockpit animate-pulse */
              <div className="space-y-2.5 rounded-xl border border-white/10 bg-white/[0.02] p-4">
                <div className="h-3.5 w-3/4 animate-pulse rounded bg-white/5" />
                <div className="h-3.5 w-full animate-pulse rounded bg-white/5" />
                <div className="h-3.5 w-5/6 animate-pulse rounded bg-white/5" />
                <div className="h-3.5 w-2/3 animate-pulse rounded bg-white/5" />
              </div>
            ) : error ? (
              /* Erreur cockpit */
              <div className="rounded-xl border border-red-400/30 bg-red-400/5 p-3 text-sm text-red-300 space-y-1">
                <p className="font-medium">Élio n'a pas pu transformer le message</p>
                <p className="text-xs text-red-400/70">{error}</p>
              </div>
            ) : (
              /* Zone éditable */
              <Textarea
                value={transformedText}
                onChange={(e) => setTransformedText(e.target.value)}
                rows={7}
                className="resize-none text-sm leading-relaxed border-white/10 bg-white/[0.03] text-gray-200 focus-visible:ring-cyan-400/30 focus-visible:border-cyan-400/25"
                placeholder="Message transformé par Élio..."
                aria-label="Message transformé modifiable"
              />
            )}
          </div>

          {/* ⚙️ Mode d'envoi */}
          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-600 flex items-center gap-1">
              <span>⚙️</span> Mode d'envoi
            </p>

            {/* Option Vérification */}
            <button
              type="button"
              onClick={() => onModeChange('verify')}
              className={cn(
                'w-full rounded-xl border p-3 text-left transition-colors',
                currentMode === 'verify'
                  ? 'border-cyan-400/30 bg-cyan-400/[0.07]'
                  : 'border-white/10 bg-white/[0.02] hover:border-white/15'
              )}
            >
              <div className="flex items-center gap-2">
                {/* Radio cockpit */}
                <div className={cn(
                  'flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border-2',
                  currentMode === 'verify' ? 'border-cyan-400' : 'border-white/20'
                )}>
                  {currentMode === 'verify' && (
                    <div className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
                  )}
                </div>
                <span className={cn(
                  'text-sm font-medium',
                  currentMode === 'verify' ? 'text-cyan-300' : 'text-gray-400'
                )}>
                  Vérification systématique{' '}
                  <span className="text-xs font-normal text-gray-600">(défaut)</span>
                </span>
              </div>
              <p className="mt-1 pl-[1.375rem] text-xs text-gray-600">
                Tu valides chaque message avant envoi. Élio te montre sa reformulation et tu choisis d'envoyer ou modifier.
              </p>
            </button>

            {/* Option Confiance */}
            <button
              type="button"
              onClick={() => onModeChange('trust')}
              className={cn(
                'w-full rounded-xl border p-3 text-left transition-colors',
                currentMode === 'trust'
                  ? 'border-amber-400/30 bg-amber-400/[0.07]'
                  : 'border-white/10 bg-white/[0.02] hover:border-white/15'
              )}
            >
              <div className="flex items-center gap-2">
                <div className={cn(
                  'flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border-2',
                  currentMode === 'trust' ? 'border-amber-400' : 'border-white/20'
                )}>
                  {currentMode === 'trust' && (
                    <div className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                  )}
                </div>
                <span className={cn(
                  'text-sm font-medium',
                  currentMode === 'trust' ? 'text-amber-300' : 'text-gray-400'
                )}>
                  Mode Confiance
                </span>
              </div>
              <p className="mt-1 pl-[1.375rem] text-xs text-gray-600">
                Élio envoie directement après reformulation. Historique consultable si besoin de vérifier.
              </p>
            </button>
          </div>

        </div>

        {/* Actions fixes en bas — cockpit */}
        <div className="shrink-0 border-t border-white/10 bg-white/[0.02] px-6 py-4 space-y-2">
          <div className="flex gap-2">
            {/* Envoyer transformé — accent cyan */}
            <Button
              onClick={handleSendTransformed}
              disabled={isLoading || !transformedText.trim()}
              className="flex-1 bg-cyan-500/80 hover:bg-cyan-500 text-white shadow-[0_0_16px_-4px_theme(colors.cyan.400/40)]"
              aria-label="Envoyer le message transformé"
            >
              ✓ Envoyer
            </Button>
            <Button
              variant="outline"
              onClick={onCancel}
              className="border-white/10 bg-white/[0.03] text-gray-300 hover:bg-white/[0.07]"
              aria-label="Annuler"
            >
              Annuler
            </Button>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onSendRaw}
            className="w-full text-gray-600 hover:text-gray-300 text-xs"
            aria-label="Envoyer sans transformer"
          >
            Envoyer sans transformer
          </Button>
        </div>

      </SheetContent>
    </Sheet>
  )
}
