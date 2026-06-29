'use client'

import { useState, useRef, type KeyboardEvent } from 'react'
import { Send, Loader2, ExternalLink, Bot, Lock } from 'lucide-react'
import Link from 'next/link'
import { openElioOnePopup } from './use-elio-one-popup'
import { useElioOneSession } from './elio-one-session'

interface OneElioBoxProps {
  /** Consentement au traitement IA (RGPD). Si false, Élio reste en veille. */
  iaConsentGranted: boolean
}

/**
 * Widget Élio en bas de sidebar (One). Saisie rapide branchée sur la SESSION PARTAGÉE
 * (`useElioOneSession`) : ce qu'on échange ici se retrouve dans la pop-up Élio One (« Voir dans
 * Élio »), car c'est la MÊME conversation (refonte 2026-06-29). Volontairement minimal : un seul
 * champ, plus de modes Question/Brouillon/Aide (Élio comprend la demande au naturel).
 */
export function OneElioBox({ iaConsentGranted }: OneElioBoxProps) {
  const session = useElioOneSession()
  const [input, setInput] = useState('')
  const [isFocused, setIsFocused] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Guard consentement IA (RGPD) — Élio en veille tant que le client n'a pas consenti.
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
            <span className="text-[11px] font-medium text-[#9ca3af]">Élio est en veille</span>
          </div>
          <p className="text-[10px] leading-relaxed text-[#6b7280]">
            Aucune donnée n&apos;est traitée. Activez le traitement IA pour discuter avec Élio.
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

  const isLoading = session?.isLoading ?? false
  const errorMsg = session?.error?.message ?? null
  const lastReply = session
    ? [...session.messages].reverse().find((m) => m.role === 'assistant')?.content ?? null
    : null

  const handleSend = async () => {
    const text = input.trim()
    if (!text || !session || isLoading) return
    setInput('')
    await session.sendMessage(text)
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void handleSend()
    }
  }

  return (
    <div className="flex flex-col gap-2 px-2 pb-2">
      {/* Header Élio + ouverture pop-up */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-1.5" style={{ color: 'var(--brand-accent, #4ade80)' }}>
          <Bot className="h-3.5 w-3.5" />
          <span className="text-[11px] font-semibold uppercase tracking-[0.08em]">Élio</span>
        </div>
        <button
          type="button"
          onClick={() => openElioOnePopup()}
          style={{ color: '#6b7280' }}
          className="flex items-center gap-0.5 text-[10px] transition-colors hover:[color:var(--brand-accent,#4ade80)] cursor-pointer"
          title="Ouvrir Élio en grand"
        >
          Ouvrir
          <ExternalLink className="h-2.5 w-2.5" />
        </button>
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

      {/* Dernière réponse (la conversation complète vit dans la pop-up) */}
      {!isLoading && lastReply && (
        <div
          className="rounded-lg px-3 py-2 flex flex-col gap-1.5"
          style={{
            background: 'color-mix(in srgb, var(--brand-accent, #16a34a) 6%, transparent)',
            border: '1px solid color-mix(in srgb, var(--brand-accent, #16a34a) 20%, transparent)',
          }}
        >
          <p className="text-[11px] text-[#e5e7eb] line-clamp-3 leading-relaxed">{lastReply}</p>
          <button
            type="button"
            onClick={() => openElioOnePopup()}
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
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder="Posez votre question à Élio…"
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
              'transition-all duration-200 hover:opacity-90',
              'disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none',
            ].join(' ')}
          >
            {isLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
          </button>
        </div>
      </div>

      <p className="text-center text-[9px] text-[#4b5563] leading-none">
        Entrée pour envoyer · Maj+Entrée nouvelle ligne
      </p>
    </div>
  )
}
