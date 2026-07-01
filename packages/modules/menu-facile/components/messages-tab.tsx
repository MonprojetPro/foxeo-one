'use client'

import { useMemo, useState } from 'react'
import { Badge, Button, Textarea, toast } from '@monprojetpro/ui'
import { useContactMessages, useContactActions } from '../hooks/use-contact-messages'
import { adjustContactReply } from '../actions/adjust-reply'
import type { ContactMessage, ContactStatus, ContactTopic } from '../types'

const STATUS_FILTERS: { key: ContactStatus | 'all'; label: string }[] = [
  { key: 'new', label: 'Nouveaux' },
  { key: 'read', label: 'Lus' },
  { key: 'resolved', label: 'Résolus' },
  { key: 'all', label: 'Tous' },
]

const TOPIC_FILTERS: { key: ContactTopic | 'all'; label: string }[] = [
  { key: 'all', label: 'Tous sujets' },
  { key: 'bug', label: 'Bug' },
  { key: 'improvement', label: 'Amélioration' },
  { key: 'other', label: 'Autre' },
]

const TOPIC_LABEL: Record<ContactTopic, string> = {
  bug: 'Bug',
  improvement: 'Amélioration',
  other: 'Autre',
}
const TOPIC_BADGE: Record<ContactTopic, string> = {
  bug: 'bg-red-400/15 text-red-300 border-red-400/30',
  improvement: 'bg-sky-400/15 text-sky-300 border-sky-400/30',
  other: 'bg-white/5 text-gray-300 border-white/10',
}
const STATUS_BADGE: Record<ContactStatus, string> = {
  new: 'bg-amber-400/15 text-amber-300 border-amber-400/30',
  read: 'bg-sky-400/15 text-sky-300 border-sky-400/30',
  resolved: 'bg-emerald-400/15 text-emerald-300 border-emerald-400/30',
}
const STATUS_LABEL: Record<ContactStatus, string> = {
  new: 'Nouveau',
  read: 'Lu',
  resolved: 'Résolu',
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleString('fr-FR')
}

// ---------------------------------------------------------------------------
// Zone de réponse in-app (avec ajustement IA via le cerveau Élio)
// ---------------------------------------------------------------------------

function ReplyBox({ message, onClose }: { message: ContactMessage; onClose: () => void }) {
  const { reply } = useContactActions()
  const [draft, setDraft] = useState('')
  const [aiLoading, setAiLoading] = useState(false)

  const adjust = async () => {
    if (!draft.trim()) {
      toast.error('Écris d\'abord un brouillon à ajuster')
      return
    }
    setAiLoading(true)
    try {
      const res = await adjustContactReply({
        draft,
        userMessage: message.message,
        topic: message.topic,
      })
      if (res.error || !res.data) {
        toast.error(res.error?.message ?? 'Ajustement IA impossible')
      } else {
        setDraft(res.data)
        toast.success('Réponse ajustée par l\'IA')
      }
    } finally {
      setAiLoading(false)
    }
  }

  const send = () => {
    if (!draft.trim()) {
      toast.error('La réponse est vide')
      return
    }
    reply.mutate(
      { id: message.id, reply: draft.trim() },
      {
        onSuccess: () => {
          toast.success('Réponse envoyée au client')
          onClose()
        },
        onError: (e) => toast.error((e as Error).message),
      },
    )
  }

  return (
    <div className="mt-2 space-y-2 rounded-md border border-white/10 bg-white/[0.02] p-3">
      <Textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        rows={4}
        placeholder="Écris ta réponse au client (in-app)…"
      />
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" onClick={send} disabled={reply.isPending || aiLoading}>
          {reply.isPending ? 'Envoi…' : 'Envoyer la réponse'}
        </Button>
        <Button variant="outline" size="sm" onClick={adjust} disabled={aiLoading || reply.isPending}>
          {aiLoading ? 'Ajustement…' : '✨ Ajuster avec l\'IA'}
        </Button>
        <Button variant="ghost" size="sm" onClick={onClose} disabled={reply.isPending || aiLoading}>
          Fermer
        </Button>
      </div>
      <p className="text-[0.65rem] text-gray-600">
        La réponse arrive directement dans l&apos;app du client (nécessite l&apos;endpoint
        MenuFacile). Sinon, utilise « Répondre par email ».
      </p>
    </div>
  )
}

export function MessagesTab() {
  const [status, setStatus] = useState<ContactStatus | 'all'>('new')
  const [topic, setTopic] = useState<ContactTopic | 'all'>('all')
  const [replyOpenId, setReplyOpenId] = useState<string | null>(null)

  const { data, isLoading, error, refetch, isFetching } = useContactMessages(
    status === 'all' ? undefined : status,
  )
  const { setStatus: setMsgStatus } = useContactActions()

  // Le filtre sujet est côté client (le guichet ne filtre que par status).
  const messages = useMemo(
    () => (topic === 'all' ? data ?? [] : (data ?? []).filter((m) => m.topic === topic)),
    [data, topic],
  )

  const mark = (id: string, newStatus: ContactStatus, label: string) => {
    setMsgStatus.mutate(
      { id, status: newStatus },
      {
        onSuccess: () => toast.success(label),
        onError: (e) => toast.error((e as Error).message),
      },
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setStatus(f.key)}
              className={`rounded-md px-3 py-1.5 text-xs transition-colors ${
                status === f.key
                  ? 'bg-cyan-400/15 text-cyan-300'
                  : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <Button variant="ghost" size="sm" disabled={isFetching} onClick={() => refetch()}>
          {isFetching ? 'Actualisation…' : 'Actualiser'}
        </Button>
      </div>

      {/* Filtre sujet */}
      <div className="flex flex-wrap gap-1">
        {TOPIC_FILTERS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTopic(t.key)}
            className={`rounded-md border px-2.5 py-1 text-[0.7rem] transition-colors ${
              topic === t.key
                ? 'border-cyan-400/40 bg-cyan-400/10 text-cyan-200'
                : 'border-white/10 text-gray-400 hover:bg-white/5'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error ? (
        <div className="rounded-lg border border-red-400/30 bg-red-400/5 p-6 text-center">
          <p className="text-sm text-red-400">Impossible de charger les messages</p>
          <p className="text-xs text-gray-500 mt-1">{(error as Error).message}</p>
        </div>
      ) : isLoading ? (
        <div className="space-y-3">
          <div className="h-24 rounded-lg bg-white/5 animate-pulse" />
          <div className="h-24 rounded-lg bg-white/5 animate-pulse" />
        </div>
      ) : !messages.length ? (
        <div className="rounded-lg border border-dashed border-white/10 bg-white/[0.02] p-10 text-center text-xs text-gray-500">
          Aucun message{status !== 'all' ? ' dans ce statut' : ''}
          {topic !== 'all' ? ` (sujet : ${TOPIC_LABEL[topic]})` : ''}.
        </div>
      ) : (
        <div className="space-y-3">
          {messages.map((m) => (
            <div key={m.id} className="rounded-lg border border-white/10 bg-white/[0.03] p-4 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className={TOPIC_BADGE[m.topic]}>{TOPIC_LABEL[m.topic]}</Badge>
                  <Badge variant="outline" className={STATUS_BADGE[m.status]}>{STATUS_LABEL[m.status]}</Badge>
                  <span className="text-sm text-white">{m.household_name ?? 'Foyer inconnu'}</span>
                  {m.user_email && <span className="text-xs text-gray-500">· {m.user_email}</span>}
                </div>
                <span className="text-xs text-gray-500 whitespace-nowrap">{fmtDate(m.created_at)}</span>
              </div>

              <p className="text-sm text-gray-200 whitespace-pre-wrap">{m.message}</p>

              {m.user_agent && (
                <p className="text-[0.65rem] text-gray-600 truncate" title={m.user_agent}>
                  Appareil : {m.user_agent}
                </p>
              )}

              <div className="flex flex-wrap gap-2 pt-1">
                <Button
                  size="sm"
                  disabled={setMsgStatus.isPending}
                  onClick={() => setReplyOpenId((id) => (id === m.id ? null : m.id))}
                >
                  {replyOpenId === m.id ? 'Fermer la réponse' : 'Répondre dans l\'app'}
                </Button>
                {m.user_email && (
                  <a
                    href={`mailto:${m.user_email}?subject=${encodeURIComponent('Votre message à MenuFacile')}`}
                    className="rounded-md border border-white/10 px-3 py-1.5 text-xs text-cyan-300 hover:bg-white/5"
                  >
                    Répondre par email
                  </a>
                )}
                {m.status === 'new' && (
                  <Button variant="outline" size="sm" disabled={setMsgStatus.isPending} onClick={() => mark(m.id, 'read', 'Marqué comme lu')}>
                    Marquer lu
                  </Button>
                )}
                {m.status !== 'resolved' && (
                  <Button variant="outline" size="sm" disabled={setMsgStatus.isPending} onClick={() => mark(m.id, 'resolved', 'Marqué comme résolu')}>
                    Marquer résolu
                  </Button>
                )}
                {m.status === 'resolved' && (
                  <Button variant="ghost" size="sm" disabled={setMsgStatus.isPending} onClick={() => mark(m.id, 'new', 'Message rouvert')}>
                    Rouvrir
                  </Button>
                )}
              </div>

              {replyOpenId === m.id && <ReplyBox message={m} onClose={() => setReplyOpenId(null)} />}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
