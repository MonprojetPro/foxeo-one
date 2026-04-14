'use client'

import { useState, useRef, type KeyboardEvent } from 'react'
import { Mic, Paperclip, Send, Loader2, ExternalLink, Bot, Zap, MessageCircle, SlidersHorizontal, PenLine, FileText } from 'lucide-react'
import { newConversation, sendToElio, saveElioMessage } from '@monprojetpro/module-elio'
import { readFileContent } from '@monprojetpro/utils'
import Link from 'next/link'

type ElioMode = 'ordre' | 'avis' | 'maj-elio' | 'brouillon'

const MODES: {
  id: ElioMode
  label: string
  description: string
  placeholder: string
  prefix: string
  Icon: React.ElementType
}[] = [
  {
    id: 'ordre',
    label: 'Ordre',
    description: 'Exécuter une action Hub',
    placeholder: 'Dis à Élio ce que tu veux faire…',
    prefix: '[ORDRE] ',
    Icon: Zap,
  },
  {
    id: 'avis',
    label: 'Avis',
    description: "Demander l'avis d'Élio",
    placeholder: "Demande l'avis d'Élio…",
    prefix: '[AVIS] ',
    Icon: MessageCircle,
  },
  {
    id: 'maj-elio',
    label: 'Màj Élio',
    description: 'Mettre à jour ses directives',
    placeholder: 'Ex: À partir de maintenant, toujours tutoyer les clients…',
    prefix: '[DIRECTIVE] ',
    Icon: SlidersHorizontal,
  },
  {
    id: 'brouillon',
    label: 'Brouillon',
    description: 'Générer un texte ou message',
    placeholder: 'Décris le texte ou message à rédiger…',
    prefix: '[BROUILLON] ',
    Icon: PenLine,
  },
]

const MODE_ACTIVE: Record<ElioMode, string> = {
  'ordre':    'bg-[oklch(0.7_0.15_190/0.18)] border-[oklch(0.7_0.15_190/0.5)] text-[oklch(0.7_0.15_190)]',
  'avis':     'bg-[oklch(0.65_0.12_220/0.18)] border-[oklch(0.65_0.12_220/0.5)] text-[oklch(0.65_0.12_220)]',
  'maj-elio': 'bg-[oklch(0.7_0.2_50/0.18)] border-[oklch(0.7_0.2_50/0.5)] text-[oklch(0.7_0.2_50)]',
  'brouillon':'bg-[oklch(0.65_0.15_160/0.18)] border-[oklch(0.65_0.15_160/0.5)] text-[oklch(0.65_0.15_160)]',
}

const GLOW_ACTIVE: Record<ElioMode, string> = {
  'ordre':    'shadow-[0_0_0_1px_oklch(0.7_0.15_190/0.15),0_0_16px_oklch(0.7_0.15_190/0.12)] border-[oklch(0.7_0.15_190/0.5)]',
  'avis':     'shadow-[0_0_0_1px_oklch(0.65_0.12_220/0.15),0_0_16px_oklch(0.65_0.12_220/0.12)] border-[oklch(0.65_0.12_220/0.5)]',
  'maj-elio': 'shadow-[0_0_0_1px_oklch(0.7_0.2_50/0.15),0_0_16px_oklch(0.7_0.2_50/0.12)] border-[oklch(0.7_0.2_50/0.5)]',
  'brouillon':'shadow-[0_0_0_1px_oklch(0.65_0.15_160/0.15),0_0_16px_oklch(0.65_0.15_160/0.12)] border-[oklch(0.65_0.15_160/0.5)]',
}

const GLOW_LINE: Record<ElioMode, string> = {
  'ordre':    'via-[oklch(0.7_0.15_190/0.6)]',
  'avis':     'via-[oklch(0.65_0.12_220/0.6)]',
  'maj-elio': 'via-[oklch(0.7_0.2_50/0.6)]',
  'brouillon':'via-[oklch(0.65_0.15_160/0.6)]',
}

interface ElioQueryBoxProps {
  userId: string
  label?: string
}

export function ElioQueryBox({ userId, label = 'Élio Hub' }: ElioQueryBoxProps) {
  const [input, setInput] = useState('')
  const [mode, setMode] = useState<ElioMode>('ordre')
  const [isFocused, setIsFocused] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [lastReply, setLastReply] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [attachedFile, setAttachedFile] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''

    const { text, error } = await readFileContent(file)
    if (error || !text) {
      setErrorMsg(error ?? 'Impossible de lire ce fichier')
      return
    }

    setAttachedFile(file.name)
    setInput((prev) => {
      const prefix = prev.trim() ? prev + '\n\n' : ''
      return `${prefix}[Fichier: ${file.name}]\n${text.slice(0, 8000)}`
    })
    textareaRef.current?.focus()
  }

  const activeMode = MODES.find((m) => m.id === mode)!

  const handleSend = async () => {
    const text = input.trim()
    if (!text || isLoading) return
    setInput('')
    setLastReply(null)
    setErrorMsg(null)
    setIsLoading(true)

    const { data: conv } = await newConversation('hub')
    if (!conv) {
      setErrorMsg('Impossible de créer la conversation')
      setIsLoading(false)
      return
    }

    setAttachedFile(null)
    const fullMessage = activeMode.prefix + text
    await saveElioMessage(conv.id, 'user', fullMessage)

    const { data: reply, error } = await sendToElio('hub', fullMessage)
    setIsLoading(false)

    if (error) {
      setErrorMsg(error.message)
      return
    }

    if (reply) {
      await saveElioMessage(conv.id, 'assistant', reply.content)
      setLastReply(reply.content)
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
      {/* Input fichier caché */}
      {/* Label Élio + lien vers page complète */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-1.5">
          <Bot className="h-3.5 w-3.5 text-primary" />
          <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-primary">
            {label}
          </span>
        </div>
        <Link
          href="/modules/elio"
          className="flex items-center gap-0.5 text-[10px] text-muted-foreground hover:text-primary transition-colors"
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
                  : 'bg-transparent border-border/40 text-muted-foreground hover:border-border hover:text-foreground',
              ].join(' ')}
              aria-label={m.label}
            >
              <m.Icon className="h-3 w-3" />
            </button>
            {/* Tooltip */}
            <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 z-50 opacity-0 group-hover/tip:opacity-100 transition-opacity duration-150">
              <div className="bg-popover border border-border rounded-md px-2 py-1 shadow-md whitespace-nowrap">
                <p className="text-[10px] font-semibold text-foreground leading-none mb-0.5">{m.label}</p>
                <p className="text-[9px] text-muted-foreground leading-none">{m.description}</p>
              </div>
              <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-border" />
            </div>
          </div>
        ))}
      </div>

      {/* Indicateur de chargement */}
      {isLoading && (
        <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary/5 border border-primary/20">
          <Loader2 className="h-3 w-3 text-primary animate-spin shrink-0" />
          <span className="text-[11px] text-muted-foreground italic">Élio réfléchit…</span>
        </div>
      )}

      {/* Fichier attaché */}
      {attachedFile && (
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-primary/8 border border-primary/20">
          <FileText className="h-3 w-3 text-primary shrink-0" />
          <span className="text-[10px] text-primary truncate flex-1">{attachedFile}</span>
          <button
            type="button"
            onClick={() => { setAttachedFile(null); setInput('') }}
            className="text-primary/60 hover:text-primary transition-colors cursor-pointer text-[10px] leading-none"
          >✕</button>
        </div>
      )}

      {/* Erreur */}
      {!isLoading && errorMsg && (
        <div className="rounded-lg bg-destructive/5 border border-destructive/20 px-3 py-2">
          <p className="text-[11px] text-destructive/80 line-clamp-2 leading-relaxed">{errorMsg}</p>
        </div>
      )}

      {/* Dernière réponse d'Élio */}
      {!isLoading && lastReply && (
        <div className="rounded-lg bg-primary/5 border border-primary/20 px-3 py-2 flex flex-col gap-1.5">
          <p className="text-[11px] text-foreground/80 line-clamp-3 leading-relaxed">
            {lastReply}
          </p>
          <Link
            href="/modules/elio"
            className="self-end text-[10px] text-primary hover:underline flex items-center gap-0.5"
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
            ? GLOW_ACTIVE[mode]
            : 'border-border/60 shadow-none',
          'bg-gradient-to-b from-card/80 to-muted/20',
        ].join(' ')}
      >
        {/* Glow line bas — couleur du mode actif */}
        <div
          className={[
            'absolute inset-x-3 bottom-0 h-px rounded-full transition-opacity duration-200',
            `bg-gradient-to-r from-transparent ${GLOW_LINE[mode]} to-transparent`,
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
            'text-[12px] text-foreground placeholder:text-muted-foreground/50',
            'resize-none focus:outline-none leading-relaxed',
            'disabled:opacity-60',
          ].join(' ')}
        />

        {/* Boutons action */}
        <div className="flex items-center justify-between px-2 pb-2">
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              title="Microphone (bientôt disponible)"
              className="h-6 w-6 rounded-full flex items-center justify-center text-muted-foreground/40 hover:text-muted-foreground/70 transition-colors cursor-pointer"
            >
              <Mic className="h-3 w-3" />
            </button>
            <label
              title="Joindre un fichier texte"
              className="h-6 w-6 rounded-full flex items-center justify-center text-muted-foreground/40 hover:text-muted-foreground/70 transition-colors cursor-pointer"
            >
              <Paperclip className="h-3 w-3" />
              <input type="file" className="sr-only" accept=".txt,.md,.csv,.json,.xml,.html,.js,.ts,.py,.yaml,.yml,.pdf,.docx,text/*" onChange={handleFileChange} />
            </label>
          </div>

          <button
            type="button"
            onClick={() => void handleSend()}
            disabled={!input.trim() || isLoading}
            aria-label="Envoyer le message"
            className={[
              'h-6 w-6 rounded-full flex items-center justify-center cursor-pointer',
              'transition-all duration-200',
              'bg-primary text-primary-foreground',
              'hover:bg-primary/85 hover:shadow-[0_0_8px_oklch(0.7_0.15_190/0.4)]',
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

      <p className="text-center text-[9px] text-muted-foreground/50 leading-none">
        Entrée pour envoyer · Maj+Entrée nouvelle ligne
      </p>
    </div>
  )
}
