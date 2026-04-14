'use client'

import { useRef, useEffect, useState, useCallback } from 'react'
import { Zap, MessageCircle, SlidersHorizontal, PenLine, Mic, Paperclip, Send, Loader2, FileText } from 'lucide-react'
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
import { deleteConversation } from '../actions/delete-conversation'
import { sendToElio } from '../actions/send-to-elio'
import { escalateToMiKL } from '../actions/escalate-to-mikl'
import { submitEvolutionRequest } from '../actions/submit-evolution-request'
import { getNextQuestion, processResponse, isCancel, type EvolutionCollectionData } from '../utils/evolution-collection'
import { generateEvolutionBrief } from '../actions/generate-evolution-brief'
import { DEFAULT_COMMUNICATION_PROFILE_FR66 } from '../types/elio.types'
import { readFileContent } from '@monprojetpro/utils'
import type { DashboardType, ElioMessage, ElioError } from '../types/elio.types'

// ── Mode Hub ──────────────────────────────────────────────────────────────────

type ElioMode = 'ordre' | 'avis' | 'maj-elio' | 'brouillon'

const HUB_MODES: {
  id: ElioMode
  label: string
  description: string
  placeholder: string
  prefix: string
  Icon: React.ElementType
}[] = [
  { id: 'ordre',    label: 'Ordre',    description: 'Exécuter une action Hub',      placeholder: 'Dis à Élio ce que tu veux faire…',                            prefix: '[ORDRE] ',     Icon: Zap },
  { id: 'avis',     label: 'Avis',     description: "Demander l'avis d'Élio",       placeholder: "Demande l'avis d'Élio…",                                      prefix: '[AVIS] ',      Icon: MessageCircle },
  { id: 'maj-elio', label: 'Màj Élio', description: 'Mettre à jour ses directives', placeholder: 'Ex: À partir de maintenant, toujours tutoyer les clients…',    prefix: '[DIRECTIVE] ', Icon: SlidersHorizontal },
  { id: 'brouillon',label: 'Brouillon',description: 'Générer un texte ou message',  placeholder: 'Décris le texte ou message à rédiger…',                       prefix: '[BROUILLON] ', Icon: PenLine },
]

const MODE_ACTIVE_HUB: Record<ElioMode, string> = {
  'ordre':    'bg-[oklch(0.7_0.15_190/0.18)] border-[oklch(0.7_0.15_190/0.5)] text-[oklch(0.7_0.15_190)]',
  'avis':     'bg-[oklch(0.65_0.12_220/0.18)] border-[oklch(0.65_0.12_220/0.5)] text-[oklch(0.65_0.12_220)]',
  'maj-elio': 'bg-[oklch(0.7_0.2_50/0.18)] border-[oklch(0.7_0.2_50/0.5)] text-[oklch(0.7_0.2_50)]',
  'brouillon':'bg-[oklch(0.65_0.15_160/0.18)] border-[oklch(0.65_0.15_160/0.5)] text-[oklch(0.65_0.15_160)]',
}

const MODE_GLOW_HUB: Record<ElioMode, string> = {
  'ordre':    'border-[oklch(0.7_0.15_190/0.4)] shadow-[0_0_0_1px_oklch(0.7_0.15_190/0.12),0_0_20px_oklch(0.7_0.15_190/0.1)]',
  'avis':     'border-[oklch(0.65_0.12_220/0.4)] shadow-[0_0_0_1px_oklch(0.65_0.12_220/0.12),0_0_20px_oklch(0.65_0.12_220/0.1)]',
  'maj-elio': 'border-[oklch(0.7_0.2_50/0.4)] shadow-[0_0_0_1px_oklch(0.7_0.2_50/0.12),0_0_20px_oklch(0.7_0.2_50/0.1)]',
  'brouillon':'border-[oklch(0.65_0.15_160/0.4)] shadow-[0_0_0_1px_oklch(0.65_0.15_160/0.12),0_0_20px_oklch(0.65_0.15_160/0.1)]',
}

const MODE_GLOW_LINE_HUB: Record<ElioMode, string> = {
  'ordre':    'via-[oklch(0.7_0.15_190/0.6)]',
  'avis':     'via-[oklch(0.65_0.12_220/0.6)]',
  'maj-elio': 'via-[oklch(0.7_0.2_50/0.6)]',
  'brouillon':'via-[oklch(0.65_0.15_160/0.6)]',
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface ElioChatProps {
  dashboardType: DashboardType
  clientId?: string
  userId?: string
  tutoiement?: boolean
  placeholder?: string
  // Story 8.7: greeting custom depuis config Orpheus (Story 6.6)
  customGreeting?: string
  // Story 9.3: désactiver Élio Lab si parcours abandonné
  parcoursAbandoned?: boolean
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

export const HUB_PLACEHOLDER_DEFAULT = "Demande-moi n'importe quoi sur MonprojetPro..."
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
  const [mode, setMode] = useState<ElioMode>('ordre')
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
  // Story 8.8 — collecte d'évolution
  const [evolutionData, setEvolutionData] = useState<EvolutionCollectionData | null>(null)
  const [evolutionBriefPending, setEvolutionBriefPending] = useState<{
    title: string
    content: string
    displayText: string
  } | null>(null)
  // CR fix HIGH-2: profil de communication basé sur la prop tutoiement (AC2)
  const evolutionProfile = { ...DEFAULT_COMMUNICATION_PROFILE_FR66, tutoiement }

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

  const handleDeleteConversation = useCallback(
    async (id: string) => {
      await deleteConversation(id)
      if (activeConversationId === id) setActiveConversationId(null)
      await invalidateConversations()
    },
    [activeConversationId, invalidateConversations]
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

  // Story 8.8 — Confirmer le brief d'évolution
  const handleConfirmEvolution = useCallback(async () => {
    if (!evolutionBriefPending || !clientId) return
    const { error: submitError } = await submitEvolutionRequest(
      clientId,
      evolutionBriefPending.title,
      evolutionBriefPending.content
    )
    if (submitError) {
      console.error('[ELIO:EVOLUTION] Submit failed:', submitError)
      return
    }
    // CR fix HIGH-3: invalider le cache validation-requests (AC4)
    void queryClient.invalidateQueries({ queryKey: ['validation-requests'] })
    // Confirmation au client (AC4 — Task 4.6)
    const confirmMsg: ElioMessage = {
      id: makeId(),
      role: 'assistant',
      content: "C'est envoyé ! MiKL va examiner votre demande et vous tiendra informé.",
      createdAt: new Date().toISOString(),
      dashboardType,
      metadata: { evolutionBrief: true },
    }
    setLocalMessages((prev) => [...prev, confirmMsg])
    if (activeConversationId) {
      await saveElioMessage(activeConversationId, 'assistant', confirmMsg.content, { evolution_brief: true })
    }
    setEvolutionBriefPending(null)
    setEvolutionData(null)
  }, [evolutionBriefPending, clientId, dashboardType, activeConversationId, queryClient])

  // Story 8.8 — Annuler le brief d'évolution
  const handleCancelEvolution = useCallback(async () => {
    const cancelMsg: ElioMessage = {
      id: makeId(),
      role: 'assistant',
      content: "Pas de souci ! N'hésitez pas si vous changez d'avis.",
      createdAt: new Date().toISOString(),
      dashboardType,
    }
    setLocalMessages((prev) => [...prev, cancelMsg])
    if (activeConversationId) {
      await saveElioMessage(activeConversationId, 'assistant', cancelMsg.content)
    }
    setEvolutionBriefPending(null)
    setEvolutionData(null)
  }, [dashboardType, activeConversationId])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const raw = inputValue.trim()
    if (!raw || isLoading) return
    const content = dashboardType === 'hub'
      ? (HUB_MODES.find((m) => m.id === mode)?.prefix ?? '') + raw
      : raw
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

    // Persister le message utilisateur
    await saveElioMessage(convId, 'user', content)

    // Story 8.8 — Mode collecte d'évolution actif
    if (evolutionData && dashboardType === 'one') {
      // Task 5 — Annulation
      if (isCancel(content)) {
        handleCancelEvolution()
        return
      }

      // Avancer la state machine
      const updated = processResponse(evolutionData, content)
      setEvolutionData(updated)

      if (updated.state === 'summary') {
        // Collecter terminée → générer le mini-brief (Task 3)
        const brief = generateEvolutionBrief(updated)
        setEvolutionBriefPending(brief)
        const briefMsg: ElioMessage = {
          id: makeId(),
          role: 'assistant',
          content: brief.displayText,
          createdAt: new Date().toISOString(),
          dashboardType,
        }
        setLocalMessages((prev) => [...prev, briefMsg])
        await saveElioMessage(convId, 'assistant', brief.displayText)
      } else {
        // Poser la question suivante
        const nextQ = getNextQuestion(updated.state, evolutionProfile)
        if (nextQ) {
          const qMsg: ElioMessage = {
            id: makeId(),
            role: 'assistant',
            content: nextQ,
            createdAt: new Date().toISOString(),
            dashboardType,
          }
          setLocalMessages((prev) => [...prev, qMsg])
          await saveElioMessage(convId, 'assistant', nextQ)
        }
      }
      return
    }

    // Confirmation brief en attente — "Oui envoie"
    if (evolutionBriefPending && dashboardType === 'one') {
      const lowerContent = content.toLowerCase()
      if (lowerContent.includes('oui') || lowerContent.includes('envoie') || lowerContent.includes('valide')) {
        await handleConfirmEvolution()
        return
      }
      if (lowerContent.includes('non') || lowerContent.includes('annul') || isCancel(content)) {
        handleCancelEvolution()
        return
      }
      // CR fix MEDIUM-4: modification du brief — informer et garder en attente
      const modifyMsg: ElioMessage = {
        id: makeId(),
        role: 'assistant',
        content: 'Je ne peux pas modifier le brief automatiquement pour le moment. Vous pouvez valider tel quel ou annuler et reformuler votre demande.',
        createdAt: new Date().toISOString(),
        dashboardType,
      }
      setLocalMessages((prev) => [...prev, modifyMsg])
      return
    }

    setIsLoading(true)

    // Envoyer à Élio
    const { data: elioMsg, error: sendError } = await sendToElio(dashboardType, content, clientId)
    setIsLoading(false)

    if (sendError) {
      setError(sendError as ElioError)
      return
    }

    if (elioMsg) {
      // Story 8.8 — Évolution détectée → lancer la collecte
      if (elioMsg.metadata?.evolutionDetected && dashboardType === 'one') {
        const initialRequest = elioMsg.metadata.evolutionInitialRequest ?? content
        const newData: EvolutionCollectionData = { state: 'initial', initialRequest }
        setEvolutionData(newData)

        // Poser la première question
        const firstQ = getNextQuestion('initial', evolutionProfile)
        const qMsg: ElioMessage = {
          id: makeId(),
          role: 'assistant',
          content: firstQ,
          createdAt: new Date().toISOString(),
          dashboardType,
        }
        setLocalMessages((prev) => [...prev, qMsg])
        await saveElioMessage(convId, 'assistant', firstQ)
        return
      }

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

    // Auto-génération du titre après le 1er message utilisateur
    if (newCount === 1) {
      const allUserMsgs = [content]

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
            onDeleteConversation={handleDeleteConversation}
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

          {/* Story 8.8 — Brief évolution en attente de validation (AC3) */}
          {evolutionBriefPending && (
            <div
              className="mx-4 mb-2 p-3 rounded-lg border border-border bg-muted text-sm"
              role="status"
              aria-live="polite"
            >
              <div className="flex gap-2">
                <button
                  onClick={handleConfirmEvolution}
                  className={[
                    'px-3 py-1 text-xs font-medium rounded-md',
                    'bg-primary text-primary-foreground hover:bg-primary/90',
                    'focus-visible:outline-none focus-visible:ring-2',
                    focusRing,
                  ].join(' ')}
                  aria-label="Valider et envoyer à MiKL"
                >
                  Oui, envoyer à MiKL
                </button>
                <button
                  onClick={handleCancelEvolution}
                  className="px-3 py-1 text-xs font-medium rounded-md border border-border hover:bg-muted transition-colors"
                  aria-label="Annuler la demande d'évolution"
                >
                  Annuler
                </button>
              </div>
            </div>
          )}

          <ChatInput
            inputRef={inputRef}
            value={inputValue}
            onChange={setInputValue}
            onSubmit={handleSubmit}
            onKeyDown={handleKeyDown}
            isLoading={isLoading}
            focusRing={focusRing}
            placeholder={
              dashboardType === 'hub'
                ? (HUB_MODES.find((m) => m.id === mode)?.placeholder ?? placeholder)
                : placeholder
            }
            mode={dashboardType === 'hub' ? mode : undefined}
            onModeChange={dashboardType === 'hub' ? setMode : undefined}
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
  mode?: ElioMode
  onModeChange?: (m: ElioMode) => void
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
  mode,
  onModeChange,
}: ChatInputProps) {
  const [isFocused, setIsFocused] = useState(false)
  const [attachedFile, setAttachedFile] = useState<string | null>(null)
  const hasMode = mode !== undefined && onModeChange !== undefined

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''

    const { text, error: fileError } = await readFileContent(file)
    if (fileError || !text) {
      // Afficher l'erreur inline plutôt qu'un alert() natif
      onChange(`[Fichier non lisible: ${file.name} — ${fileError ?? 'format non supporté'}]`)
      return
    }

    setAttachedFile(file.name)
    const current = inputRef.current?.value ?? ''
    const prefix = current.trim() ? current + '\n\n' : ''
    onChange(`${prefix}[Fichier: ${file.name}]\n${text.slice(0, 8000)}`)
    inputRef.current?.focus()
  }

  if (hasMode) {
    const glowClass = isFocused ? MODE_GLOW_HUB[mode] : 'border-border/60'
    const glowLine = MODE_GLOW_LINE_HUB[mode]

    return (
      <form onSubmit={(e) => { setAttachedFile(null); onSubmit(e) }} className="border-t border-border px-4 py-4">
        {/* Input fichier caché */}

        {/* Indicateur fichier attaché */}
        {attachedFile && (
          <div className="flex items-center gap-1.5 mb-2 px-2 py-1 rounded-md bg-primary/8 border border-primary/20">
            <FileText className="h-3.5 w-3.5 text-primary shrink-0" />
            <span className="text-xs text-primary truncate flex-1">{attachedFile}</span>
            <button type="button" onClick={() => { setAttachedFile(null); onChange('') }}
              className="text-primary/60 hover:text-primary transition-colors cursor-pointer text-xs">✕</button>
          </div>
        )}

        <div
          className={[
            'relative rounded-2xl border transition-all duration-200',
            'bg-gradient-to-b from-card/80 to-muted/20',
            glowClass,
          ].join(' ')}
        >
          {/* Glow line bas */}
          <div
            className={[
              'absolute inset-x-4 bottom-0 h-px rounded-full transition-opacity duration-200',
              `bg-gradient-to-r from-transparent ${glowLine} to-transparent`,
              isFocused ? 'opacity-100' : 'opacity-0',
            ].join(' ')}
          />

          {/* Mode buttons */}
          <div className="flex items-center gap-1.5 px-3 pt-2.5">
            {HUB_MODES.map((m) => (
              <div key={m.id} className="relative group/tip">
                <button
                  type="button"
                  onClick={() => { onModeChange(m.id); inputRef.current?.focus() }}
                  className={[
                    'h-7 w-7 rounded-full border flex items-center justify-center transition-all duration-150 cursor-pointer',
                    mode === m.id
                      ? MODE_ACTIVE_HUB[m.id]
                      : 'bg-transparent border-border/40 text-muted-foreground hover:border-border hover:text-foreground',
                  ].join(' ')}
                  aria-label={m.label}
                >
                  <m.Icon className="h-3.5 w-3.5" />
                </button>
                {/* Tooltip */}
                <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 opacity-0 group-hover/tip:opacity-100 transition-opacity duration-150">
                  <div className="bg-popover border border-border rounded-md px-2.5 py-1.5 shadow-md whitespace-nowrap">
                    <p className="text-[11px] font-semibold text-foreground leading-none mb-0.5">{m.label}</p>
                    <p className="text-[10px] text-muted-foreground leading-none">{m.description}</p>
                  </div>
                  <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-border" />
                </div>
              </div>
            ))}
          </div>

          {/* Textarea */}
          <textarea
            ref={inputRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={onKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={placeholder}
            disabled={isLoading}
            rows={2}
            aria-label="Message à envoyer à Élio"
            className="w-full bg-transparent px-3 pt-2 pb-1 text-sm text-foreground placeholder:text-muted-foreground/50 resize-none focus:outline-none disabled:opacity-60"
          />

          {/* Bottom row */}
          <div className="flex items-center justify-between px-2 pb-2">
            <div className="flex items-center gap-0.5">
              <button type="button" title="Microphone (bientôt disponible)"
                className="h-7 w-7 rounded-full flex items-center justify-center text-muted-foreground/40 hover:text-muted-foreground/70 transition-colors cursor-pointer">
                <Mic className="h-3.5 w-3.5" />
              </button>
              <label title="Joindre un fichier texte"
                className="h-7 w-7 rounded-full flex items-center justify-center text-muted-foreground/40 hover:text-muted-foreground/70 transition-colors cursor-pointer">
                <Paperclip className="h-3.5 w-3.5" />
                <input type="file" className="sr-only" accept=".txt,.md,.csv,.json,.xml,.html,.js,.ts,.py,.yaml,.yml,.pdf,.docx,text/*" onChange={handleFileChange} />
              </label>
            </div>
            <button
              type="submit"
              disabled={isLoading || !value.trim()}
              aria-label="Envoyer le message"
              className="h-7 w-7 rounded-full flex items-center justify-center bg-primary text-primary-foreground hover:bg-primary/85 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 cursor-pointer"
            >
              {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>
        <p className="mt-1.5 text-center text-[10px] text-muted-foreground/50">
          Entrée pour envoyer · Maj+Entrée pour nouvelle ligne
        </p>
      </form>
    )
  }

  // Mode standard (Lab / One)
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
  parcoursAbandoned = false,
}: ElioChatProps) {
  // Story 9.3 — Désactiver Élio Lab si parcours abandonné
  if (parcoursAbandoned && dashboardType === 'lab') {
    return (
      <div
        className={`flex flex-col h-full bg-background text-foreground ${PALETTE_CLASSES[dashboardType]}`}
        data-dashboard-type={dashboardType}
      >
        <header className="border-b border-border px-4 py-3 shrink-0">
          <h2 className="text-sm font-semibold text-foreground">{HEADER_LABELS[dashboardType]}</h2>
        </header>
        <div className="flex-1 flex items-center justify-center px-6">
          <div className="text-center space-y-2">
            <p className="text-sm text-muted-foreground">
              Votre parcours est en pause. Contactez MiKL si vous souhaitez reprendre.
            </p>
          </div>
        </div>
      </div>
    )
  }

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
