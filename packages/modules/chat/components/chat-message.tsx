'use client'

import { Avatar, AvatarFallback } from '@monprojetpro/ui'
import { cn } from '@monprojetpro/utils'
import { Paperclip, Sparkles } from 'lucide-react'
import type { Message } from '../types/chat.types'

interface ChatMessageProps {
  message: Message
  currentUserType: 'client' | 'operator'
}

function formatTime(isoDate: string): string {
  return new Date(isoDate).toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function ChatMessage({ message, currentUserType }: ChatMessageProps) {
  const isOwn = message.senderType === currentUserType

  return (
    <div
      className={cn('flex items-end gap-2', isOwn ? 'flex-row-reverse' : 'flex-row')}
      data-testid="chat-message"
      data-sender={message.senderType}
    >
      {/* Avatar — cockpit, fond verre */}
      <Avatar className="h-7 w-7 shrink-0 border border-white/10 bg-white/[0.04]">
        <AvatarFallback className="text-xs text-gray-300 bg-transparent">
          {message.senderType === 'operator' ? 'MK' : 'C'}
        </AvatarFallback>
      </Avatar>

      {/* Bulle
          – Opérateur (isOwn) : accent cyan discret (cockpit Hub)
          – Client          : verre neutre bg-white/[0.04]               */}
      <div
        className={cn(
          'max-w-[70%] rounded-2xl px-4 py-2 text-sm',
          isOwn
            ? /* Bulle opérateur — cyan discret */
              'rounded-br-none border border-cyan-400/20 bg-cyan-400/[0.10] text-cyan-50'
            : /* Bulle client — verre neutre */
              'rounded-bl-none border border-white/10 bg-white/[0.04] text-gray-200'
        )}
      >
        {/* Relais Élio One (2026-08-19) : le message a été posté par Élio avec l'accord du
            client, pas tapé par lui. Le badge DÉRIVE de `viaElio` — ne jamais le déduire
            du contenu du message, qui peut dire n'importe quoi. */}
        {message.viaElio && (
          <p
            className="mb-1.5 flex items-center gap-1 text-[11px] font-medium uppercase tracking-wide opacity-70"
            data-testid="relayed-by-elio"
          >
            <Sparkles className="h-3 w-3 shrink-0" aria-hidden="true" />
            Relayé par Élio One
          </p>
        )}

        {message.content && (
          <p className="whitespace-pre-wrap break-words">{message.content}</p>
        )}

        {/* Pièce jointe */}
        {message.attachmentUrl && (
          <div className="mt-2">
            {message.attachmentType?.startsWith('image/') ? (
              <img
                src={message.attachmentUrl}
                alt={message.attachmentName ?? 'Image jointe'}
                className="max-w-[280px] rounded-lg object-cover"
                loading="lazy"
              />
            ) : (
              <a
                href={message.attachmentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs underline underline-offset-2 hover:opacity-80"
                aria-label={`Télécharger ${message.attachmentName ?? 'le fichier'}`}
              >
                <Paperclip className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate max-w-[200px]">{message.attachmentName ?? 'Fichier joint'}</span>
              </a>
            )}
          </div>
        )}

        {/* Horodatage + indicateur de lecture */}
        <div
          className={cn(
            'mt-1 flex items-center gap-1 text-[11px] tabular-nums opacity-50',
            isOwn ? 'justify-end' : 'justify-start'
          )}
        >
          <span>{formatTime(message.createdAt)}</span>
          {isOwn && (
            <span
              className={cn(message.readAt ? 'text-cyan-400 opacity-90' : 'opacity-40')}
              title={message.readAt ? 'Lu' : 'Non lu'}
              aria-label={message.readAt ? 'Lu' : 'Non lu'}
            >
              {message.readAt ? '✓✓' : '✓'}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
