'use client'

import { cn } from '@monprojetpro/utils'
import { Mail, MailOpen } from 'lucide-react'
import type { EmailThread } from '../types/email.types'

interface EmailThreadListProps {
  threads: EmailThread[]
  selectedId: string | null
  onSelect: (thread: EmailThread) => void
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const isToday = d.toDateString() === now.toDateString()
  if (isToday) return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
}

function extractName(from: string): string {
  const match = from.match(/^"?([^"<]+)"?\s*</)
  return match ? match[1].trim() : from.replace(/<.*>/, '').trim() || from
}

export function EmailThreadList({ threads, selectedId, onSelect }: EmailThreadListProps) {
  if (threads.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground">
        <MailOpen className="h-8 w-8 opacity-30" />
        <p className="text-sm">Aucun échange email avec ce client</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col divide-y">
      {threads.map((thread) => (
        <button
          key={thread.id}
          type="button"
          onClick={() => onSelect(thread)}
          className={cn(
            'flex flex-col gap-1 px-4 py-3 text-left transition-colors hover:bg-muted/50',
            selectedId === thread.id && 'bg-primary/5 border-l-2 border-primary'
          )}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              {thread.unread
                ? <Mail className="h-3.5 w-3.5 shrink-0 text-primary" />
                : <MailOpen className="h-3.5 w-3.5 shrink-0 text-muted-foreground/40" />
              }
              <span className={cn('text-sm truncate', thread.unread ? 'font-semibold' : 'font-medium')}>
                {thread.subject}
              </span>
            </div>
            <span className="text-[11px] text-muted-foreground shrink-0">
              {formatDate(thread.lastMessageDate)}
            </span>
          </div>
          <div className="flex items-center justify-between gap-2 pl-5">
            <span className="text-xs text-muted-foreground truncate">
              {extractName(thread.from)}
            </span>
            {thread.messageCount > 1 && (
              <span className="text-[10px] text-muted-foreground/60 shrink-0">
                {thread.messageCount} messages
              </span>
            )}
          </div>
          {thread.lastMessagePreview && (
            <p className="text-xs text-muted-foreground/60 truncate pl-5">
              {thread.lastMessagePreview}
            </p>
          )}
        </button>
      ))}
    </div>
  )
}
