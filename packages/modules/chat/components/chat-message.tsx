'use client'

import { Avatar, AvatarFallback } from '@monprojetpro/ui'
import { cn } from '@monprojetpro/utils'
import { Paperclip } from 'lucide-react'
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
      {/* Avatar */}
      <Avatar className="h-7 w-7 shrink-0">
        <AvatarFallback className="text-xs">
          {message.senderType === 'operator' ? 'MK' : 'C'}
        </AvatarFallback>
      </Avatar>

      {/* Bubble */}
      <div
        className={cn(
          'max-w-[70%] rounded-2xl px-4 py-2 text-sm',
          isOwn
            ? 'rounded-br-none bg-primary text-primary-foreground'
            : 'rounded-bl-none bg-muted text-foreground'
        )}
      >
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

        {/* Time + read indicator */}
        <div
          className={cn(
            'mt-1 flex items-center gap-1 text-xs opacity-60',
            isOwn ? 'justify-end' : 'justify-start'
          )}
        >
          <span>{formatTime(message.createdAt)}</span>
          {isOwn && (
            <span
              className={cn(message.readAt ? 'text-blue-400' : 'opacity-50')}
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
