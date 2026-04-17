'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ScrollArea, Avatar, AvatarFallback, Button } from '@monprojetpro/ui'
import { showSuccess, showError } from '@monprojetpro/ui'
import { cn } from '@monprojetpro/utils'
import { ExternalLink, Settings2 } from 'lucide-react'
import { ChatMessage } from './chat-message'
import { ChatInput, type ChatSendPayload, type TransformMode } from './chat-input'
import { ChatSkeleton } from './chat-skeleton'
import { PresenceIndicator } from './presence-indicator'
import { ElioTransformPanel } from './elio-transform-panel'
import { useChatMessages } from '../hooks/use-chat-messages'
import { useChatRealtime } from '../hooks/use-chat-realtime'
import { usePresenceStatus } from '../hooks/use-presence-status'
import { uploadMessageAttachment } from '../actions/upload-message-attachment'
import { transformMessageForClient } from '@monprojetpro/module-elio'
import type { SenderType } from '../types/chat.types'

const TRANSFORM_MODE_KEY = 'elio_transform_mode'

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

interface ChatWindowProps {
  clientId: string
  operatorId: string
  currentUserType: SenderType
  clientName?: string
  dashboardType?: 'lab' | 'one'
  onMarkRead?: (clientId: string) => void
}

export function ChatWindow({
  clientId,
  operatorId,
  currentUserType,
  clientName,
  dashboardType,
  onMarkRead,
}: ChatWindowProps) {
  const { messages, isPending, isSending, sendMessage } = useChatMessages(clientId)
  const bottomRef = useRef<HTMLDivElement>(null)
  const [transformPanelOpen, setTransformPanelOpen] = useState(false)
  const [pendingPayload, setPendingPayload] = useState<ChatSendPayload | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [transformMode, setTransformMode] = useState<TransformMode>('verify')

  const operatorStatus = usePresenceStatus(operatorId)

  useChatRealtime(clientId)

  // Charger le mode depuis localStorage
  useEffect(() => {
    if (currentUserType !== 'operator') return
    const stored = localStorage.getItem(TRANSFORM_MODE_KEY)
    if (stored === 'trust' || stored === 'verify') setTransformMode(stored)
  }, [currentUserType])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const markReadTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const stableMarkRead = useCallback(() => {
    if (onMarkRead) onMarkRead(clientId)
  }, [clientId, onMarkRead])

  useEffect(() => {
    if (!onMarkRead || messages.length === 0) return
    if (markReadTimer.current) clearTimeout(markReadTimer.current)
    markReadTimer.current = setTimeout(stableMarkRead, 500)
    return () => {
      if (markReadTimer.current) clearTimeout(markReadTimer.current)
    }
  }, [clientId, stableMarkRead, messages.length, onMarkRead])

  async function handleFileUpload(file: File): Promise<{ url: string; name: string; type: string } | null> {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('clientId', clientId)
    formData.append('operatorId', operatorId)
    setIsUploading(true)
    const result = await uploadMessageAttachment(formData)
    setIsUploading(false)
    if (result.error) { showError(result.error.message); return null }
    return result.data!
  }

  async function doSend(content: string, file?: File) {
    let attachmentUrl: string | undefined
    let attachmentName: string | undefined
    let attachmentType: string | undefined
    if (file) {
      const uploaded = await handleFileUpload(file)
      if (!uploaded) return
      attachmentUrl = uploaded.url
      attachmentName = uploaded.name
      attachmentType = uploaded.type
    }
    sendMessage({ clientId, operatorId, senderType: currentUserType, content, attachmentUrl, attachmentName, attachmentType })
  }

  async function handleSend(payload: ChatSendPayload) {
    if (!payload.content.trim() && !payload.file) return
    if (currentUserType === 'client') { await doSend(payload.content, payload.file); return }

    if (transformMode === 'trust') {
      const result = await transformMessageForClient({ clientId, rawMessage: payload.content })
      const finalContent = result.data?.transformedText ?? payload.content
      if (result.data?.transformedText) showSuccess('Message transformé par Élio et envoyé')
      await doSend(finalContent, payload.file)
    } else {
      setPendingPayload(payload)
      setTransformPanelOpen(true)
    }
  }

  async function handlePanelSend(transformedContent: string) {
    setTransformPanelOpen(false)
    if (pendingPayload) { await doSend(transformedContent, pendingPayload.file); setPendingPayload(null) }
  }

  async function handlePanelSendRaw() {
    setTransformPanelOpen(false)
    if (pendingPayload) { await doSend(pendingPayload.content, pendingPayload.file); setPendingPayload(null) }
  }

  function toggleMode() {
    const next: TransformMode = transformMode === 'verify' ? 'trust' : 'verify'
    setTransformMode(next)
    localStorage.setItem(TRANSFORM_MODE_KEY, next)
  }

  if (isPending) return <ChatSkeleton />

  return (
    <div className="flex h-full flex-col" data-testid="chat-window">

      {/* ── Header de conversation ── */}
      {currentUserType === 'operator' && clientName ? (
        <div className="flex items-center gap-3 border-b px-4 py-3 shrink-0">
          <div className="relative">
            <Avatar className="h-9 w-9">
              <AvatarFallback className="text-sm font-semibold">
                {getInitials(clientName)}
              </AvatarFallback>
            </Avatar>
            <PresenceIndicator
              status="offline"
              className="absolute -bottom-0.5 -right-0.5 ring-2 ring-background"
            />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm truncate">{clientName}</span>
              {dashboardType && (
                <span className={cn(
                  'rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
                  dashboardType === 'lab'
                    ? 'bg-violet-500/20 text-violet-400'
                    : 'bg-emerald-500/20 text-emerald-400'
                )}>
                  {dashboardType === 'lab' ? 'Lab' : 'One'}
                </span>
              )}
            </div>
          </div>

          {/* Mode Élio toggle */}
          <button
            type="button"
            onClick={toggleMode}
            title={`Mode Élio : ${transformMode === 'verify' ? 'Vérification (cliquer pour passer en Confiance)' : 'Confiance (cliquer pour revenir en Vérification)'}`}
            className={cn(
              'flex items-center gap-1.5 rounded-md px-2 py-1 text-xs transition-colors border',
              transformMode === 'trust'
                ? 'border-amber-500/30 bg-amber-500/10 text-amber-400'
                : 'border-primary/30 bg-primary/10 text-primary'
            )}
          >
            <Settings2 className="h-3 w-3" />
            <span>{transformMode === 'verify' ? 'Vérification' : 'Confiance'}</span>
          </button>

          {/* Voir fiche */}
          <Button variant="ghost" size="sm" asChild className="shrink-0 gap-1.5 text-xs text-muted-foreground hover:text-foreground">
            <Link href={`/modules/crm/clients/${clientId}`}>
              Voir fiche <ExternalLink className="h-3 w-3" />
            </Link>
          </Button>
        </div>
      ) : currentUserType === 'client' ? (
        <div className="flex items-center gap-2 border-b px-4 py-2 text-sm text-muted-foreground shrink-0" data-testid="operator-presence-header">
          <PresenceIndicator status={operatorStatus} />
          {operatorStatus === 'online'
            ? <span>Votre conseiller est en ligne</span>
            : <span>Votre conseiller vous répondra dès que possible</span>}
        </div>
      ) : null}

      {/* ── Messages ── */}
      <ScrollArea className="flex-1 p-6">
        <div className="flex flex-col gap-3">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 gap-3 text-muted-foreground">
              <div className="text-4xl opacity-30">💬</div>
              <p className="text-sm">Aucun message pour le moment.</p>
              <p className="text-xs opacity-70">Démarrez la conversation !</p>
            </div>
          ) : (
            messages.map((message) => (
              <ChatMessage key={message.id} message={message} currentUserType={currentUserType} />
            ))
          )}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      {/* ── Input ── */}
      <ChatInput
        onSend={handleSend}
        isSending={isSending || isUploading}
        showAttachment={currentUserType === 'operator'}
      />

      {/* ── Panneau Transformation Élio ── */}
      {currentUserType === 'operator' && pendingPayload && (
        <ElioTransformPanel
          open={transformPanelOpen}
          rawMessage={pendingPayload.content}
          clientId={clientId}
          currentMode={transformMode}
          onModeChange={(mode) => {
            setTransformMode(mode)
            localStorage.setItem(TRANSFORM_MODE_KEY, mode)
          }}
          onSend={handlePanelSend}
          onSendRaw={handlePanelSendRaw}
          onCancel={() => { setTransformPanelOpen(false); setPendingPayload(null) }}
        />
      )}
    </div>
  )
}
