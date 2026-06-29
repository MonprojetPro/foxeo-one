'use client'

import { useState, useRef, type KeyboardEvent, type CSSProperties } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Send, Loader2, ExternalLink, Bot, MessageCircle, PenLine, HelpCircle, Lock } from 'lucide-react'
import { newConversation, sendToElio, saveElioMessage, ELIO_MODEL_MICRO } from '@monprojetpro/module-elio'
import Link from 'next/link'
import { openElioOnePopup } from './use-elio-one-popup'

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

// Les classes Tailwind avec couleurs fixes sont remplacées par des styles inline
// pour permettre à var(--brand-accent) de prendre le dessus.
// MODE_ACTIVE n'est plus utilisé comme classes Tailwind mais comme styles CSS.
const MODE_ACTIVE_STYLE: Record<OneMode, CSSProperties> = {
  'question': {
    background: 'color-mix(in srgb, var(--brand-accent, #16a34a) 18%, transparent)',
    border: '1px solid color-mix(in srgb, var(--brand-accent, #16a34a) 50%, transparent)',
    color: 'var(--brand-accent, #4ade80)',
  },
  'brouillon': {
    background: 'color-mix(in srgb, var(--brand-accent, #4ade80) 15%, transparent)',
    border: '1px solid color-mix(in srgb, var(--brand-accent, #4ade80) 40%, transparent)',
    color: 'color-mix(in srgb, var(--brand-accent, #86efac) 80%, white)',
  },
  'aide': {
    background: 'color-mix(in srgb, var(--brand-accent, #16a34a) 12%, transparent)',
    border: '1px solid color-mix(in srgb, var(--brand-accent, #16a34a) 35%, transparent)',
    color: 'var(--brand-accent, #4ade80)',
  },
}

interface OneElioBoxProps {
  userId: string
  /**
   * ID du client (clients.id) — INDISPENSABLE pour qu'Élio ait son contexte One (posture
   * coach, modules actifs, briefs Lab, état de l'outil, escalade). Sans lui, le widget
   * discutait « à froid » (Élio One v2). Optionnel par sécurité, mais toujours fourni en One.
   */
  clientId?: string
  /** Consentement au traitement IA (RGPD). Si false, Élio reste en veille. */
  iaConsentGranted: boolean
}

export function OneElioBox({ userId, clientId, iaConsentGranted }: OneElioBoxProps) {
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

  // Guard consentement IA (RGPD) — Élio en veille tant que le client n'a pas consenti.
  // Les hooks ci-dessus sont déclarés inconditionnellement (règle React) ; ce return
  // n'intervient qu'après, et iaConsentGranted est une prop SSR stable.
  if (!iaConsentGranted) {
    return (
      <div className="flex flex-col gap-2 px-2 pb-2">
        <div className="flex items-center gap-1.5 px-1">
          <Bot className="h-3.5 w-3.5 text-[#6b7280]" />
          <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6b7280]">
            Élio
          </span>
        </div>
        <div className="flex flex-col gap-1.5 rounded-lg border border-[#2d2d2d] bg-[#111] px-3 py-2.5">
          <div className="flex items-center gap-1.5">
            <Lock className="h-3 w-3 shrink-0 text-[#6b7280]" />
            <span className="text-[11px] font-medium text-[#9ca3af]">
              Élio est en veille
            </span>
          </div>
          <p className="text-[10px] leading-relaxed text-[#6b7280]">
            Aucune donnée n&apos;est traitée. Activez le traitement IA pour discuter
            avec Élio.
          </p>
          <Link
            href="/settings/consents"
            style={{ color: 'var(--brand-accent, #4ade80)' }}
            className="self-start text-[10px] hover:underline"
          >
            Activer Élio →
          </Link>
        </div>
      </div>
    )
  }

  const handleSend = async () => {
    const text = input.trim()
    if (!text || isLoading) return
    setInput('')
    setLastReply(null)
    setErrorMsg(null)
    setIsLoading(true)

    // Mémoire : on RÉUTILISE la même conversation sur toute la session du widget (au lieu
    // d'en créer une neuve à chaque envoi). Élio se souvient ainsi des échanges précédents.
    let convId = lastConvId
    if (!convId) {
      const { data: conv } = await newConversation('one')
      if (!conv) {
        setErrorMsg('Impossible de démarrer une conversation')
        setIsLoading(false)
        return
      }
      convId = conv.id
      setLastConvId(conv.id)
    }

    const fullMessage = activeMode.prefix + text
    await saveElioMessage(convId, 'user', fullMessage)

    // clientId → Élio reçoit tout son contexte One (posture, modules, briefs, état outil).
    // conversationId → mémoire (historique chargé côté serveur, dédupliqué par l'Edge Function).
    // model micro (Haiku) → question rapide depuis la sidebar = micro-tâche.
    const { data: reply, error } = await sendToElio(
      'one',
      fullMessage,
      clientId,
      undefined,
      undefined,
      { conversationId: convId, model: ELIO_MODEL_MICRO },
    )
    setIsLoading(false)

    if (error) {
      setErrorMsg(error.message)
      return
    }

    if (reply) {
      // Cas demande d'évolution : la collecte est un flux multi-tours qui vit dans le chat
      // plein écran → ici le contenu revient vide. On guide le client vers Élio complet.
      const replyText = reply.content?.trim()
        ? reply.content
        : "C'est une demande qui mérite qu'on en discute : ouvre Élio en plein écran et je m'en occupe avec toi."

      await saveElioMessage(convId, 'assistant', replyText)
      setLastReply(replyText)
      // Invalider le cache conversations pour que la page Élio reflète la conversation
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
        <div className="flex items-center gap-1.5" style={{ color: 'var(--brand-accent, #4ade80)' }}>
          <Bot className="h-3.5 w-3.5" />
          <span className="text-[11px] font-semibold uppercase tracking-[0.08em]">
            Élio
          </span>
        </div>
        <button
          type="button"
          onClick={openElioOnePopup}
          style={{ color: '#6b7280' }}
          className="flex items-center gap-0.5 text-[10px] transition-colors hover:[color:var(--brand-accent,#4ade80)] cursor-pointer"
          title="Ouvrir Élio en grand"
        >
          Ouvrir
          <ExternalLink className="h-2.5 w-2.5" />
        </button>
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
              style={mode === m.id ? MODE_ACTIVE_STYLE[m.id] : undefined}
              className={[
                'h-7 w-7 rounded-full border flex items-center justify-center transition-all duration-150 cursor-pointer',
                mode === m.id
                  ? ''
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
        <div
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg"
          style={{
            background: 'color-mix(in srgb, var(--brand-accent, #16a34a) 5%, transparent)',
            border: '1px solid color-mix(in srgb, var(--brand-accent, #16a34a) 20%, transparent)',
          }}
        >
          <Loader2 className="h-3 w-3 animate-spin shrink-0" style={{ color: 'var(--brand-accent, #4ade80)' }} />
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
        <div
          className="rounded-lg px-3 py-2 flex flex-col gap-1.5"
          style={{
            background: 'color-mix(in srgb, var(--brand-accent, #16a34a) 6%, transparent)',
            border: '1px solid color-mix(in srgb, var(--brand-accent, #16a34a) 20%, transparent)',
          }}
        >
          <p className="text-[11px] text-[#e5e7eb] line-clamp-3 leading-relaxed">
            {lastReply}
          </p>
          <button
            type="button"
            onClick={openElioOnePopup}
            style={{ color: 'var(--brand-accent, #4ade80)' }}
            className="self-end text-[10px] hover:underline flex items-center gap-0.5 cursor-pointer"
          >
            Voir dans Élio
            <ExternalLink className="h-2.5 w-2.5" />
          </button>
        </div>
      )}

      {/* Zone de saisie */}
      <div
        className="relative rounded-2xl transition-all duration-200 bg-[#111]"
        style={{
          border: isFocused
            ? '1px solid color-mix(in srgb, var(--brand-accent, #16a34a) 50%, transparent)'
            : '1px solid #2d2d2d',
          boxShadow: isFocused
            ? '0 0 0 1px color-mix(in srgb, var(--brand-accent, #16a34a) 15%, transparent), 0 0 16px color-mix(in srgb, var(--brand-accent, #16a34a) 10%, transparent)'
            : 'none',
        }}
      >
        {/* Glow line bas */}
        <div
          className={[
            'absolute inset-x-3 bottom-0 h-px rounded-full transition-opacity duration-200',
            isFocused ? 'opacity-100' : 'opacity-0',
          ].join(' ')}
          style={{ background: 'linear-gradient(to right, transparent, color-mix(in srgb, var(--brand-accent, #16a34a) 60%, transparent), transparent)' }}
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
            style={{
              backgroundColor: 'var(--brand-accent, #16a34a)',
              color: 'var(--brand-accent-fg, #ffffff)',
            }}
            className={[
              'h-6 w-6 rounded-full flex items-center justify-center cursor-pointer',
              'transition-all duration-200',
              'hover:opacity-90',
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
