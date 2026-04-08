'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Button, ScrollArea } from '@monprojetpro/ui'
import { showSuccess, showError } from '@monprojetpro/ui'
import { cn } from '@monprojetpro/utils'
import { Reply, ArrowLeft, Trash2 } from 'lucide-react'
import { getThreadMessages } from '../actions/get-thread-messages'
import { trashEmail } from '../actions/trash-email'
import { EmailComposer } from './email-composer'
import type { EmailThread, EmailMessage } from '../types/email.types'

interface EmailThreadViewProps {
  thread: EmailThread
  clientEmail: string
  clientId: string
  onBack: () => void
}

function formatFullDate(iso: string): string {
  return new Date(iso).toLocaleString('fr-FR', {
    day: '2-digit', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export function EmailThreadView({ thread, clientEmail, clientId, onBack }: EmailThreadViewProps) {
  const [replyTo, setReplyTo] = useState<EmailMessage | null>(null)
  const [isTrashing, setIsTrashing] = useState(false)
  const [confirmTrash, setConfirmTrash] = useState(false)

  async function handleTrash() {
    setIsTrashing(true)
    setConfirmTrash(false)
    const result = await trashEmail(thread.id)
    setIsTrashing(false)
    if (result.error) {
      showError(result.error.message)
      return
    }
    showSuccess('Conversation déplacée dans la corbeille')
    onBack()
  }

  const { data: messages = [], isPending, refetch } = useQuery({
    queryKey: ['email-thread', thread.id],
    queryFn: async () => {
      const result = await getThreadMessages(thread.id)
      return result.data ?? []
    },
  })

  return (
    <>
      <div className="flex flex-col h-full">
        {/* Header thread */}
        <div className="flex items-center gap-3 border-b px-4 py-3 shrink-0">
          <Button variant="ghost" size="icon" onClick={onBack} className="h-8 w-8 shrink-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm truncate">{thread.subject}</p>
            <p className="text-xs text-muted-foreground">{thread.messageCount} message{thread.messageCount > 1 ? 's' : ''}</p>
          </div>
          <Button size="sm" onClick={() => setReplyTo(messages[messages.length - 1] ?? null)} className="gap-1.5 shrink-0">
            <Reply className="h-3.5 w-3.5" />
            Répondre
          </Button>
          {confirmTrash ? (
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-xs text-muted-foreground">Supprimer ?</span>
              <Button
                size="sm"
                variant="destructive"
                onClick={handleTrash}
                disabled={isTrashing}
                className="h-7 px-2 text-xs"
              >
                Oui
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setConfirmTrash(false)}
                className="h-7 px-2 text-xs"
              >
                Non
              </Button>
            </div>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setConfirmTrash(true)}
              disabled={isTrashing}
              className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
              title="Supprimer (corbeille)"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 px-4 py-4">
          {isPending ? (
            <div className="space-y-4">
              {[1, 2].map((i) => (
                <div key={i} className="rounded-lg border p-4 space-y-2">
                  <div className="h-3 bg-muted animate-pulse rounded w-1/3" />
                  <div className="h-3 bg-muted animate-pulse rounded w-full" />
                  <div className="h-3 bg-muted animate-pulse rounded w-4/5" />
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={cn(
                    'rounded-lg border p-4 space-y-2',
                    msg.isOutgoing
                      ? 'bg-primary/5 border-primary/20 ml-8'
                      : 'bg-muted/20 mr-8'
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="text-xs space-y-0.5">
                      <p className="font-medium text-foreground">{msg.from}</p>
                      {msg.to.length > 0 && (
                        <p className="text-muted-foreground">À : {msg.to.join(', ')}</p>
                      )}
                    </div>
                    <span className="text-[11px] text-muted-foreground shrink-0">
                      {formatFullDate(msg.date)}
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground/90">
                    {msg.bodyText}
                  </p>
                  {!msg.isOutgoing && (
                    <button
                      type="button"
                      onClick={() => setReplyTo(msg)}
                      className="text-xs text-primary/70 hover:text-primary flex items-center gap-1 mt-1"
                    >
                      <Reply className="h-3 w-3" />
                      Répondre
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Composer réponse */}
      <EmailComposer
        open={replyTo !== null}
        onClose={() => setReplyTo(null)}
        onSent={() => refetch()}
        clientEmail={clientEmail}
        clientId={clientId}
        replyTo={replyTo ?? undefined}
      />
    </>
  )
}
