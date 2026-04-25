'use client'

import { useState, useRef, type KeyboardEvent } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Send, Loader2, ExternalLink, Bot, MessageCircle, PenLine, HelpCircle } from 'lucide-react'
import { newConversation, sendToElio, saveElioMessage } from '@monprojetpro/module-elio'
import Link from 'next/link'

type OneMode = 'question' | 'brouillon' | 'aide'

const MODES: {
  id: OneMode
  label: string
  description: string
  placeholder: string
  prefix: string
  Icon: React.ElementType
}[] = [
  {
    id: 'question',
    label: 'Question',
    description: 'Poser une question à Élio',
    placeholder: 'Posez votre question à Élio…',
    prefix: '',
    Icon: MessageCircle,
  },
  {
    id: 'brouillon',
    label: 'Brouillon',
    description: 'Générer un texte ou document',
    placeholder: 'Décrivez le document à rédiger…',
    prefix: '[BROUILLON] ',
    Icon: PenLine,
  },
  {
    id: 'aide',
    label: 'Aide',
    description: 'Aide sur le dashboard',
    placeholder: 'Comment puis-je vous aider ?',
    prefix: '[AIDE] ',
    Icon: HelpCircle,
  },
]

const MODE_ACTIVE: Record<OneMode, string> = {
  'question': 'bg-[rgba(22,163,74,0.18)] border-[rgba(22,163,74,0.5)] text-[#4ade80]',
  'brouillon': 'bg-[rgba(74,222,128,0.15)] border-[rgba(74,222,128,0.4)] text-[#86efac]',
  'aide': 'bg-[rgba(22,163,74,0.12)] border-[rgba(22,163,74,0.35)] text-[#4ade80]',
}

interface OneElioBoxProps {
  userId: string
}

export function OneElioBox({ userId }: OneElioBoxProps) {
  const queryClient = useQueryClient()
  const [input, setInput] = useState('')
  const [mode, setMode] = useState<OneMode>('question')
  const [isFocused, setIsFocused] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [lastReply, setLastReply] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [lastConvId, setLastConvId] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const activeMode = MODES.find((m) => m.id === mode)!

  const handleSend = async () => {
    const text = input.trim()
    if (!text || isLoading) return
    setInput('')
    setLastReply(null)
    setErrorMsg(null)
    setIsLoading(true)

    const { data: conv } = await newConversation('one')
    if (!conv) {
      setErrorMsg('Impossible de démarrer une conversation')
      setIsLoading(false)
      return
    }

    setLastConvId(conv.id)

    const fullMessage = activeMode.prefix + text
    await saveElioMessage(conv.id, 'user', fullMessage)

    const { data: reply, error } = await sendToElio('one', fullMessage)
    setIsLoading(false)

    if (error) {
      setErrorMsg(error.message)
      return
    }

    if (reply) {
      await saveElioMessage(conv.id, 'assistant', reply.content)
      setLastReply(reply.content)
      // Invalider le cache conversations pour que la page Élio reflète la nouvelle conversation
      void queryClient.invalidateQueries({
        queryKey: ['elio-conversations', userId, 'one'],
      })
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void handleSend()
    }
  }

  return (
    <div className="flex flex-col gap-2 px-2 pb-2">
      {/* Header Élio + lien page complète */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-1.5">
          <Bot className="h-3.5 w-3.5 text-[#4ade80]" />
          <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#4ade80]">
            Élio
          </span>
        </div>
        <Link
          href={lastConvId ? `/modules/elio?conv=${lastConvId}` : '/modules/elio'}
          className="flex items-center gap-0.5 text-[10px] text-[#6b7280] hover:text-[#4ade80] transition-colors"
          title="Ouvrir la conversation complète"
        >
          Ouvrir
          <ExternalLink className="h-2.5 w-2.5" />
        </Link>
      </div>

      {/* Mode buttons */}
      <div className="flex items-center gap-1.5 px-0.5">
        {MODES.map((m) => (
          <div key={m.id} className="relative group/tip">
            <button
              type="button"
              onClick={() => {
                setMode(m.id)
                textareaRef.current?.focus()
              }}
              className={[
                'h-7 w-7 rounded-full border flex items-center justify-center transition-all duration-150 cursor-pointer',
                mode === m.id
                  ? MODE_ACTIVE[m.id]
                  : 'bg-transparent border-[#2d2d2d] text-[#6b7280] hover:border-[#4d4d4d] hover:text-[#9ca3af]',
              ].join(' ')}
              aria-label={m.label}
            >
              <m.Icon className="h-3 w-3" />
            </button>
            <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 z-50 opacity-0 group-hover/tip:opacity-100 transition-opacity duration-150">
              <div className="bg-[#1a1a1a] border border-[#2d2d2d] rounded-md px-2 py-1 shadow-md whitespace-nowrap">
                <p className="text-[10px] font-semibold text-[#f9fafb] leading-none mb-0.5">{m.label}</p>
                <p className="text-[9px] text-[#6b7280] leading-none">{m.description}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Chargement */}
      {isLoading && (
        <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[rgba(22,163,74,0.05)] border border-[rgba(22,163,74,0.2)]">
          <Loader2 className="h-3 w-3 text-[#4ade80] animate-spin shrink-0" />
          <span className="text-[11px] text-[#6b7280] italic">Élio réfléchit…</span>
        </div>
      )}

      {/* Erreur */}
      {!isLoading && errorMsg && (
        <div className="rounded-lg bg-red-950/20 border border-red-800/30 px-3 py-2">
          <p className="text-[11px] text-red-400/80 line-clamp-2 leading-relaxed">{errorMsg}</p>
        </div>
      )}

      {/* Dernière réponse */}
      {!isLoading && lastReply && (
        <div className="rounded-lg bg-[rgba(22,163,74,0.06)] border border-[rgba(22,163,74,0.2)] px-3 py-2 flex flex-col gap-1.5">
          <p className="text-[11px] text-[#e5e7eb] line-clamp-3 leading-relaxed">
            {lastReply}
          </p>
          <Link
            href={lastConvId ? `/modules/elio?conv=${lastConvId}` : '/modules/elio'}
            className="self-end text-[10px] text-[#4ade80] hover:underline flex items-center gap-0.5"
          >
            Voir dans Élio
            <ExternalLink className="h-2.5 w-2.5" />
          </Link>
        </div>
      )}

      {/* Zone de saisie */}
      <div
        className={[
          'relative rounded-2xl border transition-all duration-200',
          isFocused
            ? 'border-[rgba(22,163,74,0.5)] shadow-[0_0_0_1px_rgba(22,163,74,0.15),0_0_16px_rgba(22,163,74,0.1)]'
            : 'border-[#2d2d2d]',
          'bg-[#111]',
        ].join(' ')}
      >
        {/* Glow line bas */}
        <div
          className={[
            'absolute inset-x-3 bottom-0 h-px rounded-full transition-opacity duration-200',
            'bg-gradient-to-r from-transparent via-[rgba(22,163,74,0.6)] to-transparent',
            isFocused ? 'opacity-100' : 'opacity-0',
          ].join(' ')}
        />

        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={activeMode.placeholder}
          rows={2}
          disabled={isLoading}
          aria-label="Message rapide à Élio"
          className={[
            'w-full bg-transparent px-3 pt-2.5 pb-1',
            'text-[12px] text-[#e5e7eb] placeholder:text-[#4b5563]',
            'resize-none focus:outline-none leading-relaxed',
            'disabled:opacity-60',
          ].join(' ')}
        />

        <div className="flex items-center justify-end px-2 pb-2">
          <button
            type="button"
            onClick={() => void handleSend()}
            disabled={!input.trim() || isLoading}
            aria-label="Envoyer"
            className={[
              'h-6 w-6 rounded-full flex items-center justify-center cursor-pointer',
              'transition-all duration-200',
              'bg-[#16a34a] text-white',
              'hover:bg-[#15b866] hover:shadow-[0_0_8px_rgba(22,163,74,0.4)]',
              'disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none',
            ].join(' ')}
          >
            {isLoading ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Send className="h-3 w-3" />
            )}
          </button>
        </div>
      </div>

      <p className="text-center text-[9px] text-[#4b5563] leading-none">
        Entrée pour envoyer · Maj+Entrée nouvelle ligne
      </p>
    </div>
  )
}
