'use client'

import { useRef, useEffect, useState, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useElioChat } from '../hooks/use-elio-chat'
import { useElioConversations } from '../hooks/use-elio-conversations'
import { useElioMessages } from '../hooks/use-elio-messages'
import { ElioThinking } from './elio-thinking'
import { ElioErrorMessage } from './elio-error-message'
import { ElioMessageItem } from './elio-message'
import { ConversationList } from './conversation-list'
import { newConversation } from '../actions/new-conversation'
import { generateWelcomeMessage } from '../actions/generate-welcome-message'
import { generateConversationTitle } from '../actions/generate-conversation-title'
import { saveElioMessage } from '../actions/save-elio-message'
import { updateConversationTitle } from '../actions/update-conversation-title'
import { sendToElio } from '../actions/send-to-elio'
import type { DashboardType, ElioMessage, ElioError } from '../types/elio.types'

interface ElioChatProps {
  dashboardType: DashboardType
  clientId?: string
  userId?: string
  tutoiement?: boolean
  placeholder?: string
}

const PALETTE_CLASSES: Record<DashboardType, string> = {
  hub: 'elio-palette-hub',
  lab: 'elio-palette-lab',
  one: 'elio-palette-one',
}

const PALETTE_FOCUS_RING: Record<DashboardType, string> = {
  hub: 'focus-visible:ring-[oklch(0.7_0.15_190)]',
  lab: 'focus-visible:ring-[oklch(0.6_0.2_280)]',
  one: 'focus-visible:ring-[oklch(0.7_0.2_50)]',
}

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

  return (
    <div
      className={`flex flex-col h-full bg-background text-foreground ${paletteClass}`}
      data-dashboard-type={dashboardType}
    >
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
}: Required<Pick<ElioChatProps, 'dashboardType' | 'userId'>> &
  Pick<ElioChatProps, 'clientId' | 'tutoiement' | 'placeholder'>) {
  const queryClient = useQueryClient()

  const [inputValue, setInputValue] = useState('')
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null)
  const [isCreatingConversation, setIsCreatingConversation] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<ElioError | null>(null)
  const [localMessages, setLocalMessages] = useState<ElioMessage[]>([])
  const [userMessageCount, setUserMessageCount] = useState(0)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const paletteClass = PALETTE_CLASSES[dashboardType]
  const focusRing = PALETTE_FOCUS_RING[dashboardType]

  const { conversations, isLoading: conversationsLoading } = useElioConversations({
    userId,
    dashboardType,
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

    await generateWelcomeMessage(conv.id, dashboardType, tutoiement)
    await invalidateConversations()
    await invalidateMessages(conv.id)

    setActiveConversationId(conv.id)
    setIsCreatingConversation(false)
  }, [dashboardType, tutoiement, isCreatingConversation, invalidateConversations, invalidateMessages])

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const content = inputValue.trim()
    if (!content || isLoading) return
    setInputValue('')
    setError(null)

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
    })),
    ...localMessages,
  ]

  return (
    <div
      className={`flex h-full bg-background text-foreground ${paletteClass}`}
      data-dashboard-type={dashboardType}
    >
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

          {displayMessages.map((msg) => (
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
  placeholder = 'Écrivez un message à Élio...',
}: ElioChatProps) {
  if (userId) {
    return (
      <ElioChatPersisted
        dashboardType={dashboardType}
        clientId={clientId}
        userId={userId}
        tutoiement={tutoiement}
        placeholder={placeholder}
      />
    )
  }

  return (
    <ElioChatSimple
      dashboardType={dashboardType}
      clientId={clientId}
      placeholder={placeholder}
    />
  )
}
