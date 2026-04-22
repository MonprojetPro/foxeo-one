'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { getOrCreateStepConversation } from '../actions/get-or-create-step-conversation'
import { getEffectiveElioConfig } from '../actions/get-effective-elio-config'
import { getMessages, saveElioMessage, sendToElio } from '@monprojetpro/module-elio'
import type { ElioMessagePersisted } from '@monprojetpro/module-elio'
import type { ParcoursStepStatus } from '../types/parcours.types'

interface StepElioChatProps {
  stepId: string
  stepStatus: ParcoursStepStatus | 'pending_review'
  stepNumber: number
  clientId: string
}

type ChatStatus = 'idle' | 'loading' | 'ready' | 'error'

const READONLY_STATUSES: Array<ParcoursStepStatus | 'pending_review'> = [
  'completed',
  'skipped',
  'pending_review',
]

function isReadonly(status: ParcoursStepStatus | 'pending_review'): boolean {
  return READONLY_STATUSES.includes(status)
}

function getDisabledMessage(status: ParcoursStepStatus | 'pending_review'): string | null {
  if (status === 'locked') return "Cette étape n'est pas encore accessible"
  if (status === 'pending_review') return 'Votre soumission est en cours d\'examen par MiKL'
  return null
}

export function StepElioChat({ stepId, stepStatus, stepNumber, clientId }: StepElioChatProps) {
  const [chatStatus, setChatStatus] = useState<ChatStatus>('idle')
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [messages, setMessages] = useState<ElioMessagePersisted[]>([])
  const [personaName, setPersonaName] = useState<string>('Élio')
  const [systemPromptOverride, setSystemPromptOverride] = useState<string | null>(null)
  const [input, setInput] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Désactivé visuellement si locked
  const isDisabled = stepStatus === 'locked'
  // Input désactivé si lecture seule ou envoi en cours
  const isInputDisabled = isReadonly(stepStatus) || stepStatus === 'locked' || isSending

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    if (messages.length > 0) scrollToBottom()
  }, [messages, scrollToBottom])

  // Init : trouver/créer la conversation + charger l'historique + config Élio
  useEffect(() => {
    if (!stepId || !clientId) return

    let cancelled = false
    setChatStatus('loading')

    async function init() {
      const convResult = await getOrCreateStepConversation(stepId)
      if (cancelled) return

      if (convResult.error || !convResult.data) {
        setChatStatus('error')
        return
      }

      const { conversationId: convId } = convResult.data
      setConversationId(convId)

      // Charger l'historique
      const [messagesResult, configResult] = await Promise.all([
        getMessages(convId),
        getEffectiveElioConfig({ stepId, clientId }),
      ])

      if (cancelled) return

      if (messagesResult.data) {
        setMessages(messagesResult.data)
      }

      if (configResult.data) {
        setPersonaName(configResult.data.personaName ?? 'Élio')
        setSystemPromptOverride(configResult.data.systemPromptOverride ?? null)
      }

      setChatStatus('ready')
    }

    init()
    return () => { cancelled = true }
  }, [stepId, clientId])

  const handleSend = useCallback(async () => {
    if (!input.trim() || !conversationId || isSending) return

    const content = input.trim()
    setInput('')
    setIsSending(true)
    setSendError(null)

    // Créer le message user en mémoire immédiatement (optimistic UI)
    const tempId = `tmp-${Date.now()}`
    const tempUserMsg: ElioMessagePersisted = {
      id: tempId,
      conversationId,
      role: 'user',
      content,
      metadata: {},
      createdAt: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, tempUserMsg])

    // Persister le message user — vérifier le résultat avant d'appeler Élio
    const { error: saveUserError } = await saveElioMessage(conversationId, 'user', content)
    if (saveUserError) {
      setSendError('Impossible de sauvegarder votre message')
      setMessages((prev) => prev.filter((m) => m.id !== tempId))
      setInput(content) // restituer le message pour réessai
      setIsSending(false)
      return
    }

    // Appeler Élio
    const { data: reply, error: elioError } = await sendToElio(
      'lab',
      content,
      clientId,
      undefined,
      systemPromptOverride ?? undefined
    )

    if (elioError || !reply) {
      setSendError(elioError?.message ?? 'Erreur de connexion à Élio')
      setIsSending(false)
      return
    }

    // Persister la réponse
    await saveElioMessage(conversationId, 'assistant', reply.content)

    const assistantMsg: ElioMessagePersisted = {
      id: `tmp-a-${Date.now()}`,
      conversationId,
      role: 'assistant',
      content: reply.content,
      metadata: {},
      createdAt: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, assistantMsg])
    setIsSending(false)
  }, [input, conversationId, isSending, clientId, systemPromptOverride])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSend()
      }
    },
    [handleSend]
  )

  const disabledMessage = getDisabledMessage(stepStatus)

  return (
    <section
      className={`mt-6 rounded-xl border border-[#2d2d2d] overflow-hidden transition-opacity ${isDisabled ? 'opacity-50' : ''}`}
      aria-label={`Chat Élio — Étape ${stepNumber}`}
    >
      {/* Header */}
      <div className="bg-[#1a1033] border-b border-[#2d2d2d] px-4 py-2.5 flex items-center gap-2.5">
        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#7c3aed] to-[#a78bfa] flex items-center justify-center text-white font-bold text-[10px] shrink-0">
          E
        </div>
        <span className="text-sm font-semibold text-[#a78bfa]">{personaName}</span>
        {chatStatus === 'ready' && (
          <span className="ml-auto flex items-center gap-1 text-xs text-[#9ca3af]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e] inline-block" aria-hidden="true" />
            En ligne
          </span>
        )}
      </div>

      {/* Messages */}
      <div
        className="h-[420px] overflow-y-auto p-4 flex flex-col gap-3 bg-[#0f0f0f]"
        role="log"
        aria-live="polite"
      >
        {chatStatus === 'loading' && (
          <div className="flex-1 flex items-center justify-center text-sm text-[#6b7280]">
            Chargement de la conversation…
          </div>
        )}

        {chatStatus === 'error' && (
          <div className="flex-1 flex items-center justify-center text-sm text-[#ef4444]">
            Impossible de charger le chat Élio
          </div>
        )}

        {chatStatus === 'ready' && messages.length === 0 && !disabledMessage && (
          <div className="flex gap-2.5 items-start">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#7c3aed] to-[#a78bfa] flex items-center justify-center text-white font-bold text-[10px] shrink-0">
              E
            </div>
            <div className="bg-[#1e1557] border border-[#3d2d6d] rounded-xl rounded-tl-[4px] px-3 py-2.5 text-sm text-[#e5e7eb] leading-relaxed max-w-[85%]">
              Bonjour ! Je suis là pour vous accompagner sur cette étape. Posez-moi vos questions.
            </div>
          </div>
        )}

        {chatStatus === 'ready' && disabledMessage && (
          <div className="flex-1 flex items-center justify-center text-sm text-[#6b7280] text-center px-4">
            {disabledMessage}
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-2.5 items-end ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
          >
            {msg.role === 'assistant' && (
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#7c3aed] to-[#a78bfa] flex items-center justify-center text-white font-bold text-[10px] shrink-0">
                E
              </div>
            )}
            <div
              className={`rounded-xl px-3 py-2.5 text-sm leading-relaxed max-w-[85%] ${
                msg.role === 'user'
                  ? 'bg-[#7c3aed] text-white rounded-br-[4px]'
                  : msg.metadata && (msg.metadata as Record<string, unknown>).injectedByMikl
                    ? 'bg-[#7c2d12] border border-[#ea580c] text-[#fed7aa] rounded-tl-[4px]'
                    : 'bg-[#1e1557] border border-[#3d2d6d] text-[#e5e7eb] rounded-tl-[4px]'
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {isSending && (
          <div className="flex gap-2.5 items-end">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#7c3aed] to-[#a78bfa] flex items-center justify-center text-white font-bold text-[10px] shrink-0">
              E
            </div>
            <div className="bg-[#1e1557] border border-[#3d2d6d] rounded-xl rounded-tl-[4px] px-3 py-2.5">
              <span className="flex gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#a78bfa] animate-bounce [animation-delay:0ms]" />
                <span className="w-1.5 h-1.5 rounded-full bg-[#a78bfa] animate-bounce [animation-delay:150ms]" />
                <span className="w-1.5 h-1.5 rounded-full bg-[#a78bfa] animate-bounce [animation-delay:300ms]" />
              </span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Erreur d'envoi */}
      {sendError && (
        <div className="px-4 py-1.5 bg-[#1f0a0a] border-t border-[#7f1d1d] text-xs text-[#fca5a5]">
          {sendError}
        </div>
      )}

      {/* Input */}
      <div className="border-t border-[#2d2d2d] bg-[#141414] p-3 flex gap-2 items-end">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isInputDisabled && !isSending ? 'Lecture seule' : 'Écrivez votre message…'}
          disabled={isInputDisabled}
          rows={1}
          className="flex-1 resize-none bg-[#1a1a1a] border border-[#2d2d2d] rounded-lg px-3 py-2 text-sm text-[#f9fafb] placeholder-[#6b7280] focus:outline-none focus:border-[#7c3aed] disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ maxHeight: '120px', minHeight: '36px' }}
          aria-label="Message à Élio"
        />
        <button
          onClick={handleSend}
          disabled={isInputDisabled || !input.trim()}
          className="shrink-0 w-8 h-8 rounded-lg bg-[#7c3aed] hover:bg-[#8b4df0] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
          aria-label="Envoyer"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-white">
            <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
          </svg>
        </button>
      </div>
    </section>
  )
}
