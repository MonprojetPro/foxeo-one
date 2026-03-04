'use client'

import { useRef, useEffect, useState, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useElioChat } from '../hooks/use-elio-chat'
import { useElioConversations } from '../hooks/use-elio-conversations'
import { useElioMessages } from '../hooks/use-elio-messages'
import { ElioThinking } from './elio-thinking'
import { ElioErrorMessage } from './elio-error-message'
import { ElioMessageItem } from './elio-message'
import { ElioFeedback } from './elio-feedback'
import { ElioDocument } from './elio-document'
import { ConversationList } from './conversation-list'
import { newConversation } from '../actions/new-conversation'
import { generateWelcomeMessage } from '../actions/generate-welcome-message'
import { generateConversationTitle } from '../actions/generate-conversation-title'
import { saveElioMessage } from '../actions/save-elio-message'
import { updateConversationTitle } from '../actions/update-conversation-title'
import { sendToElio } from '../actions/send-to-elio'
import { escalateToMiKL } from '../actions/escalate-to-mikl'
import type { DashboardType, ElioMessage, ElioError } from '../types/elio.types'

interface ElioChatProps {
  dashboardType: DashboardType
  clientId?: string
  userId?: string
  tutoiement?: boolean
  placeholder?: string
  // Story 8.7: greeting custom depuis config Orpheus (Story 6.6)
  customGreeting?: string
}

export const PALETTE_CLASSES: Record<DashboardType, string> = {
  hub: 'elio-palette-hub',
  lab: 'elio-palette-lab',
  one: 'elio-palette-one',
}

export const PALETTE_FOCUS_RING: Record<DashboardType, string> = {
  hub: 'focus-visible:ring-[oklch(0.7_0.15_190)]',
  lab: 'focus-visible:ring-[oklch(0.6_0.2_280)]',
  one: 'focus-visible:ring-[oklch(0.7_0.2_50)]',
}

export const HEADER_LABELS: Record<DashboardType, string> = {
  hub: 'Élio Hub — Votre assistant',
  lab: 'Élio Lab — Votre accompagnateur',
  one: 'Élio — Votre assistant',
}

export const HUB_PLACEHOLDER_DEFAULT = "Demande-moi n'importe quoi sur Foxeo..."
// Story 8.7 — Task 1.3 : placeholder adapté au profil (tutoiement/vouvoiement)
export const ONE_PLACEHOLDER_VOUVOIEMENT = 'Comment puis-je vous aider aujourd\'hui ?'
export const ONE_PLACEHOLDER_TUTOIEMENT = 'Comment je peux t\'aider aujourd\'hui ?'

// ── Mode sans userId : chat éphémère (comportement 8.1) ──────────────────────

function ElioChatSimple({
  dashboardType,
  clientId,
  placeholder,
}: Pick<ElioChatProps, 'dashboardType' | 'clientId' | 'placeholder'>) {
  const { messages, isLoading, error, sendMessage, retrySend } = useElioChat({
    dashboardType,
    clientId,
  })

  const [inputValue, setInputValue] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const paletteClass = PALETTE_CLASSES[dashboardType]
  const focusRing = PALETTE_FOCUS_RING[dashboardType]

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const content = inputValue.trim()
    if (!content || isLoading) return
    setInputValue('')
    await sendMessage(content)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void handleSubmit(e as unknown as React.FormEvent)
    }
    if (e.key === 'Escape') inputRef.current?.blur()
  }

  const headerLabel = HEADER_LABELS[dashboardType]

  return (
    <div
      className={`flex flex-col h-full bg-background text-foreground ${paletteClass}`}
      data-dashboard-type={dashboardType}
    >
      <header className="border-b border-border px-4 py-3 shrink-0">
        <h2 className="text-sm font-semibold text-foreground">{headerLabel}</h2>
      </header>
      <div
        className="flex-1 overflow-y-auto px-4 py-4 space-y-4"
        role="log"
        aria-live="polite"
        aria-label="Conversation avec Élio"
      >
        {messages.map((msg) => (
          <ElioMessageItem key={msg.id} message={msg} dashboardType={dashboardType} />
        ))}
        {isLoading && <ElioThinking dashboardType={dashboardType} />}
        {error && !isLoading && <ElioErrorMessage error={error} onRetry={retrySend} />}
        <div ref={messagesEndRef} aria-hidden="true" />
      </div>
      <ChatInput
        inputRef={inputRef}
        value={inputValue}
        onChange={setInputValue}
        onSubmit={handleSubmit}
        onKeyDown={handleKeyDown}
        isLoading={isLoading}
        focusRing={focusRing}
        placeholder={placeholder}
      />
    </div>
  )
}

// ── Mode avec userId : chat persistant + panneau conversations ────────────────

function makeId(): string {
  return `local-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function ElioChatPersisted({
  dashboardType,
  clientId,
  userId,
  tutoiement = false,
  placeholder,
  customGreeting,
}: Required<Pick<ElioChatProps, 'dashboardType' | 'userId'>> &
  Pick<ElioChatProps, 'clientId' | 'tutoiement' | 'placeholder' | 'customGreeting'>) {
  const queryClient = useQueryClient()

  const [inputValue, setInputValue] = useState('')
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null)
  const [isCreatingConversation, setIsCreatingConversation] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<ElioError | null>(null)
  const [localMessages, setLocalMessages] = useState<ElioMessage[]>([])
  const [userMessageCount, setUserMessageCount] = useState(0)
  // Story 8.7 — Task 9/10 : escalade en attente de confirmation
  const [pendingEscalation, setPendingEscalation] = useState<string | null>(null)
  const [escalationConfirmed, setEscalationConfirmed] = useState(false)
  // CR fix HIGH-1: capturer les messages au moment de la détection (avant setLocalMessages([]))
  const [escalationMessages, setEscalationMessages] = useState<string[]>([])

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const paletteClass = PALETTE_CLASSES[dashboardType]
  const focusRing = PALETTE_FOCUS_RING[dashboardType]

  const { conversations, isLoading: conversationsLoading } = useElioConversations({
    userId,
    dashboardType,
  })

  // Story 8.7 — Task 6.2 : conversations Lab accessibles depuis One
  const { conversations: labConversations } = useElioConversations({
    userId,
    dashboardType: 'lab',
    enabled: dashboardType === 'one',
  })

  const { messages: persistedMessages, hasNextPage, fetchNextPage, isFetchingNextPage } =
    useElioMessages(activeConversationId)

  // Sélectionner la conversation la plus récente à l'ouverture (AC1)
  useEffect(() => {
    if (conversations.length > 0 && !activeConversationId) {
      setActiveConversationId(conversations[0]?.id ?? null)
    }
  }, [conversations, activeConversationId])

  // Vider messages locaux en transit lors d'un changement de conversation
  useEffect(() => {
    setLocalMessages([])
    setUserMessageCount(0)
    setError(null)
  }, [activeConversationId])

  // Auto-scroll (AC4)
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [persistedMessages, localMessages, isLoading])

  const invalidateConversations = useCallback(() => {
    return queryClient.invalidateQueries({
      queryKey: ['elio-conversations', userId, dashboardType],
    })
  }, [queryClient, userId, dashboardType])

  const invalidateMessages = useCallback(
    (convId: string) => {
      return queryClient.invalidateQueries({ queryKey: ['elio-messages', convId] })
    },
    [queryClient]
  )

  const handleNewConversation = useCallback(async () => {
    if (isCreatingConversation) return
    setIsCreatingConversation(true)

    const { data: conv, error: convError } = await newConversation(dashboardType)
    if (convError || !conv) {
      setIsCreatingConversation(false)
      return
    }

    await generateWelcomeMessage(conv.id, dashboardType, tutoiement, customGreeting)
    await invalidateConversations()
    await invalidateMessages(conv.id)

    setActiveConversationId(conv.id)
    setIsCreatingConversation(false)
  }, [dashboardType, tutoiement, customGreeting, isCreatingConversation, invalidateConversations, invalidateMessages])

  const handleSelectConversation = useCallback((id: string) => {
    setActiveConversationId(id)
  }, [])

  const handleRenameTitle = useCallback(
    async (id: string, title: string) => {
      await updateConversationTitle(id, title)
      await invalidateConversations()
    },
    [invalidateConversations]
  )

  // Story 8.7 — Task 9 : escalade vers MiKL
  // CR fix HIGH-1: utiliser escalationMessages (capturés avant clear) au lieu de localMessages
  // CR fix HIGH-2: vérifier le résultat de escalateToMiKL
  const handleEscalate = useCallback(
    async (question: string) => {
      if (!clientId || escalationConfirmed) return
      const { error: escError } = await escalateToMiKL(clientId, question, escalationMessages)
      if (escError) {
        console.error('[ELIO:ESCALATE] Failed:', escError)
        return
      }
      setEscalationConfirmed(true)
      setPendingEscalation(null)
    },
    [clientId, escalationMessages, escalationConfirmed]
  )

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const content = inputValue.trim()
    if (!content || isLoading) return
    setInputValue('')
    setError(null)
    setPendingEscalation(null)
    setEscalationConfirmed(false)

    // Auto-créer une conversation si besoin
    let convId = activeConversationId
    if (!convId) {
      const { data: conv } = await newConversation(dashboardType)
      if (!conv) return
      convId = conv.id
      setActiveConversationId(conv.id)
      await invalidateConversations()
    }

    // Optimistic update : afficher le message utilisateur localement
    const userMsg: ElioMessage = {
      id: makeId(),
      role: 'user',
      content,
      createdAt: new Date().toISOString(),
      dashboardType,
    }
    setLocalMessages((prev) => [...prev, userMsg])
    setIsLoading(true)

    // Persister le message utilisateur
    await saveElioMessage(convId, 'user', content)

    // Envoyer à Élio
    const { data: elioMsg, error: sendError } = await sendToElio(dashboardType, content, clientId)
    setIsLoading(false)

    if (sendError) {
      setError(sendError as ElioError)
      return
    }

    if (elioMsg) {
      // Persister la réponse
      await saveElioMessage(convId, 'assistant', elioMsg.content)

      // Ajouter localement pour affichage immédiat
      setLocalMessages((prev) => [
        ...prev,
        { ...elioMsg, id: makeId() },
      ])

      // Story 8.7 — Task 10 : proposer escalade si confiance basse
      // CR fix HIGH-1: capturer les messages AVANT le clear pour l'escalade
      if (elioMsg.metadata?.needsEscalation && dashboardType === 'one') {
        const recentMsgs = [...localMessages, userMsg, { ...elioMsg, id: makeId() }]
          .slice(-4)
          .map((m) => `${m.role === 'user' ? 'Vous' : 'Élio'}: ${m.content}`)
        setEscalationMessages(recentMsgs)
        setPendingEscalation(content)
      }
    }

    const newCount = userMessageCount + 1
    setUserMessageCount(newCount)

    // Auto-génération du titre après 3 messages utilisateur (AC5)
    // Combiner les messages persistés ET locaux pour couvrir la session courante
    if (newCount === 3) {
      const persistedUserMsgs = persistedMessages
        .filter((m) => m.role === 'user')
        .map((m) => m.content)
      const localUserMsgs = localMessages
        .filter((m) => m.role === 'user')
        .map((m) => m.content)
      // Inclure le message actuel qui vient d'être envoyé
      const allUserMsgs = [...persistedUserMsgs, ...localUserMsgs, content].slice(0, 3)

      if (allUserMsgs.length >= 1) {
        void generateConversationTitle(convId, allUserMsgs).then(() => {
          void invalidateConversations()
        })
      }
    }

    // Recharger les messages persistés
    await invalidateMessages(convId)
    // Vider les messages locaux : ils seront repris par useElioMessages
    setLocalMessages([])
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void handleSubmit(e as unknown as React.FormEvent)
    }
    if (e.key === 'Escape') inputRef.current?.blur()
  }

  const retrySend = () => {
    // Pas de retry dans le mode persisté pour simplifier
    setError(null)
  }

  // Messages à afficher : persistés + locaux optimistic
  const displayMessages: ElioMessage[] = [
    ...persistedMessages.map((pm) => ({
      id: pm.id,
      role: pm.role,
      content: pm.content,
      createdAt: pm.createdAt,
      dashboardType,
      conversationId: pm.conversationId,
      metadata: pm.metadata,
    })),
    ...localMessages,
  ]

  const headerLabel = HEADER_LABELS[dashboardType]

  return (
    <div
      className={`flex flex-col h-full bg-background text-foreground ${paletteClass}`}
      data-dashboard-type={dashboardType}
    >
      <header className="border-b border-border px-4 py-3 shrink-0">
        <h2 className="text-sm font-semibold text-foreground">{headerLabel}</h2>
      </header>
      <div className="flex flex-1 min-h-0">
        {/* Panneau conversations (AC2) */}
        {!conversationsLoading && (
          <ConversationList
            conversations={conversations}
            activeConversationId={activeConversationId}
            dashboardType={dashboardType}
            onSelectConversation={handleSelectConversation}
            onNewConversation={handleNewConversation}
            onRenameTitle={handleRenameTitle}
            isCreating={isCreatingConversation}
            labConversations={dashboardType === 'one' ? labConversations : undefined}
          />
        )}

        {/* Zone chat — transition CSS < 500ms (NFR-P2 / AC4) */}
        <div
          className="flex-1 min-w-0 flex flex-col transition-opacity duration-300"
          key={activeConversationId ?? 'no-conv'}
        >
          <div
            className="flex-1 overflow-y-auto px-4 py-4 space-y-4"
            role="log"
            aria-live="polite"
            aria-label="Conversation avec Élio"
          >
            {/* Charger les messages précédents (AC4) */}
            {hasNextPage && (
              <div className="flex justify-center py-2">
                <button
                  onClick={() => fetchNextPage()}
                  disabled={isFetchingNextPage}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                >
                  {isFetchingNextPage ? 'Chargement…' : 'Charger les messages précédents'}
                </button>
              </div>
            )}

            {displayMessages.map((msg) => {
              const feedbackSlot =
                msg.role === 'assistant' && msg.id && !msg.id.startsWith('local-') ? (
                  <ElioFeedback
                    messageId={msg.id}
                    currentFeedback={msg.metadata?.feedback?.rating}
                  />
                ) : undefined

              const documentSlot =
                msg.metadata?.documentId ? (
                  <ElioDocument
                    documentId={msg.metadata.documentId}
                    documentName={msg.metadata.documentName ?? 'Document'}
                    documentType={msg.metadata.documentType ?? 'pdf'}
                    isElioGenerated={msg.metadata.isElioGenerated}
                    preview={msg.metadata.documentPreview}
                    dashboardType={dashboardType}
                  />
                ) : undefined

              return (
                <ElioMessageItem
                  key={msg.id}
                  message={msg}
                  dashboardType={dashboardType}
                  feedbackSlot={feedbackSlot}
                  documentSlot={documentSlot}
                />
              )
            })}
            {isLoading && <ElioThinking dashboardType={dashboardType} />}
            {error && !isLoading && <ElioErrorMessage error={error} onRetry={retrySend} />}
            <div ref={messagesEndRef} aria-hidden="true" />
          </div>

          {/* Story 8.7 — Task 9/10 : banner escalade MiKL */}
          {pendingEscalation && !escalationConfirmed && (
            <div
              className="mx-4 mb-2 p-3 rounded-lg border border-border bg-muted text-sm"
              role="status"
              aria-live="polite"
            >
              <p className="text-foreground mb-2">
                Je ne suis pas certain de pouvoir vous aider là-dessus. Voulez-vous que je transmette votre question à MiKL ?
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => handleEscalate(pendingEscalation)}
                  className={[
                    'px-3 py-1 text-xs font-medium rounded-md',
                    'bg-primary text-primary-foreground hover:bg-primary/90',
                    'focus-visible:outline-none focus-visible:ring-2',
                    focusRing,
                  ].join(' ')}
                  aria-label="Transmettre la question à MiKL"
                >
                  Oui, transmettre à MiKL
                </button>
                <button
                  onClick={() => setPendingEscalation(null)}
                  className="px-3 py-1 text-xs font-medium rounded-md border border-border hover:bg-muted transition-colors"
                  aria-label="Annuler l'escalade"
                >
                  Non merci
                </button>
              </div>
            </div>
          )}
          {escalationConfirmed && (
            <p
              className="mx-4 mb-2 text-sm text-muted-foreground"
              role="status"
              aria-live="polite"
            >
              ✓ Question transmise à MiKL
            </p>
          )}

          <ChatInput
            inputRef={inputRef}
            value={inputValue}
            onChange={setInputValue}
            onSubmit={handleSubmit}
            onKeyDown={handleKeyDown}
            isLoading={isLoading}
            focusRing={focusRing}
            placeholder={placeholder}
          />
        </div>
      </div>
    </div>
  )
}

// ── Composant input partagé ───────────────────────────────────────────────────

interface ChatInputProps {
  inputRef: React.RefObject<HTMLTextAreaElement | null>
  value: string
  onChange: (v: string) => void
  onSubmit: (e: React.FormEvent) => void
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void
  isLoading: boolean
  focusRing: string
  placeholder?: string
}

function ChatInput({
  inputRef,
  value,
  onChange,
  onSubmit,
  onKeyDown,
  isLoading,
  focusRing,
  placeholder = 'Écrivez un message à Élio...',
}: ChatInputProps) {
  return (
    <form onSubmit={onSubmit} className="border-t border-border px-4 py-3">
      <div className="flex items-end gap-2">
        <textarea
          ref={inputRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          disabled={isLoading}
          rows={1}
          aria-label="Message à envoyer à Élio"
          className={[
            'flex-1 resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm',
            'placeholder:text-muted-foreground',
            'disabled:cursor-not-allowed disabled:opacity-50',
            'focus-visible:outline-none focus-visible:ring-2',
            focusRing,
          ].join(' ')}
        />
        <button
          type="submit"
          disabled={isLoading || !value.trim()}
          aria-label="Envoyer le message"
          className={[
            'rounded-lg px-3 py-2 text-sm font-medium',
            'bg-primary text-primary-foreground',
            'hover:bg-primary/90',
            'disabled:cursor-not-allowed disabled:opacity-50',
            'focus-visible:outline-none focus-visible:ring-2',
            focusRing,
          ].join(' ')}
        >
          Envoyer
        </button>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Entrée pour envoyer · Maj+Entrée pour nouvelle ligne
      </p>
    </form>
  )
}

// ── Export principal ──────────────────────────────────────────────────────────

export function ElioChat({
  dashboardType,
  clientId,
  userId,
  tutoiement = false,
  placeholder,
  customGreeting,
}: ElioChatProps) {
  // Task 1.3 — Placeholder adapté au profil pour One
  const defaultPlaceholder =
    dashboardType === 'hub'
      ? HUB_PLACEHOLDER_DEFAULT
      : dashboardType === 'one'
        ? tutoiement
          ? ONE_PLACEHOLDER_TUTOIEMENT
          : ONE_PLACEHOLDER_VOUVOIEMENT
        : 'Écrivez un message à Élio...'

  const resolvedPlaceholder = placeholder ?? defaultPlaceholder

  if (userId) {
    return (
      <ElioChatPersisted
        dashboardType={dashboardType}
        clientId={clientId}
        userId={userId}
        tutoiement={tutoiement}
        placeholder={resolvedPlaceholder}
        customGreeting={customGreeting}
      />
    )
  }

  return (
    <ElioChatSimple
      dashboardType={dashboardType}
      clientId={clientId}
      placeholder={resolvedPlaceholder}
    />
  )
}
