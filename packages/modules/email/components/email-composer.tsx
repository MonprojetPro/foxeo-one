'use client'

import { useState, useEffect } from 'react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  Button, Textarea, Input, Label,
} from '@monprojetpro/ui'
import { showSuccess, showError } from '@monprojetpro/ui'
import { Send, Sparkles } from 'lucide-react'
import { cn } from '@monprojetpro/utils'
import { transformMessageForClient } from '@monprojetpro/module-elio'
import { sendEmail } from '../actions/send-email'
import type { EmailMessage } from '../types/email.types'

interface EmailComposerProps {
  open: boolean
  onClose: () => void
  onSent?: () => void
  clientEmail: string
  clientId: string
  // Pour une réponse
  replyTo?: EmailMessage
}

export function EmailComposer({ open, onClose, onSent, clientEmail, clientId, replyTo }: EmailComposerProps) {
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')

  // Sync subject when replyTo changes (component is always mounted, open/close via Dialog prop)
  useEffect(() => {
    if (replyTo) {
      setSubject(replyTo.subject.startsWith('Re:') ? replyTo.subject : `Re: ${replyTo.subject}`)
    } else {
      setSubject('')
    }
  }, [replyTo])
  const [transformedBody, setTransformedBody] = useState('')
  const [isTransforming, setIsTransforming] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [showTransformed, setShowTransformed] = useState(false)

  async function handleTransform() {
    if (!body.trim()) return
    setIsTransforming(true)
    setShowTransformed(false)
    const result = await transformMessageForClient({ clientId, rawMessage: body })
    setIsTransforming(false)
    if (result.error) {
      showError(result.error.message)
      return
    }
    setTransformedBody(result.data?.transformedText ?? body)
    setShowTransformed(true)
  }

  async function handleSend() {
    const finalBody = showTransformed ? transformedBody : body
    if (!subject.trim() || !finalBody.trim()) return

    setIsSending(true)
    const result = await sendEmail({
      to: clientEmail,
      subject,
      body: finalBody,
      threadId: replyTo?.threadId,
      inReplyTo: replyTo?.messageIdHeader,
    })
    setIsSending(false)

    if (result.error) {
      showError(result.error.message)
      return
    }
    showSuccess('Email envoyé')
    onSent?.()
    onClose()
  }

  function handleClose() {
    setBody('')
    setTransformedBody('')
    setShowTransformed(false)
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose() }}>
      <DialogContent className="sm:max-w-[600px] flex flex-col gap-0 p-0">
        <DialogHeader className="px-6 py-4 border-b shrink-0">
          <DialogTitle className="text-base">
            {replyTo ? 'Répondre' : 'Nouvel email'}
          </DialogTitle>
          <p className="text-xs text-muted-foreground">À : {clientEmail}</p>
        </DialogHeader>

        <div className="flex flex-col gap-4 px-6 py-5 flex-1">
          {/* Sujet */}
          <div className="space-y-1.5">
            <Label htmlFor="email-subject" className="text-xs font-medium text-muted-foreground uppercase tracking-widest">
              Sujet
            </Label>
            <Input
              id="email-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Objet du message..."
              disabled={!!replyTo}
            />
          </div>

          {/* Corps brut */}
          <div className="space-y-1.5">
            <Label htmlFor="email-body" className="text-xs font-medium text-muted-foreground uppercase tracking-widest">
              {showTransformed ? '① Message brut' : 'Message'}
            </Label>
            <Textarea
              id="email-body"
              value={body}
              onChange={(e) => { setBody(e.target.value); setShowTransformed(false) }}
              placeholder="Écris ton message brut..."
              rows={5}
              className="resize-none text-sm"
            />
          </div>

          {/* Corps transformé par Élio */}
          {showTransformed && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-widest">
                  ② Message reformulé par Élio
                </Label>
                <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-medium text-primary">
                  modifiable
                </span>
              </div>
              <Textarea
                value={transformedBody}
                onChange={(e) => setTransformedBody(e.target.value)}
                rows={5}
                className="resize-none text-sm border-primary/20 focus-visible:ring-primary/30"
              />
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="border-t px-6 py-4 flex gap-2 shrink-0">
          <Button
            onClick={handleSend}
            disabled={isSending || !subject.trim() || !(showTransformed ? transformedBody : body).trim()}
            className="flex-1 gap-2"
          >
            <Send className="h-4 w-4" />
            {showTransformed ? 'Envoyer le message reformulé' : 'Envoyer'}
          </Button>
          <Button
            variant="outline"
            onClick={handleTransform}
            disabled={isTransforming || !body.trim()}
            className={cn('gap-2', showTransformed && 'border-primary/30 text-primary')}
          >
            <Sparkles className="h-4 w-4" />
            {isTransforming ? 'Élio reformule...' : showTransformed ? 'Ré-transformer' : 'Transformer avec Élio'}
          </Button>
          <Button variant="ghost" onClick={handleClose}>
            Annuler
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
