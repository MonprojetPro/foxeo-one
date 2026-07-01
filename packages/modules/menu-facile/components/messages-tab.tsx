'use client'

import { useMemo, useState } from 'react'
import {
  RefreshCw,
  Inbox,
  MessagesSquare,
  Check,
  RotateCcw,
  Sparkles,
  Send,
} from 'lucide-react'
import {
  Badge,
  Button,
  Textarea,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  toast,
} from '@monprojetpro/ui'
import {
  useContactMessages,
  useContactActions,
  useContactThread,
} from '../hooks/use-contact-messages'
import { adjustContactReply } from '../actions/adjust-reply'
import type { ContactStatus, ContactTopic } from '../types'

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
/** Accent latéral de carte par statut. */
const STATUS_ACCENT: Record<ContactStatus, string> = {
  new: 'border-l-amber-400/60',
  read: 'border-l-sky-400/60',
  resolved: 'border-l-emerald-400/50',
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleString('fr-FR')
}

// ---------------------------------------------------------------------------
// Fil de discussion (messagerie à deux sens) + réponse ajustée par l'IA
// ---------------------------------------------------------------------------

function ThreadDialog({ messageId, onClose }: { messageId: string | null; onClose: () => void }) {
  const { data: thread, isLoading, error } = useContactThread(messageId)
  const { reply, setStatus } = useContactActions()
  const [draft, setDraft] = useState('')
  const [aiLoading, setAiLoading] = useState(false)

  const lastUserMessage =
    thread?.messages?.filter((m) => m.sender === 'user').at(-1)?.body ??
    thread?.messages?.[0]?.body

  const adjust = async () => {
    if (!draft.trim()) {
      toast.error('Écris d\'abord un brouillon à ajuster')
      return
    }
    setAiLoading(true)
    try {
      const res = await adjustContactReply({
        draft,
        userMessage: lastUserMessage,
        topic: thread?.topic,
      })
      if (res.error || !res.data) toast.error(res.error?.message ?? 'Ajustement IA impossible')
      else {
        setDraft(res.data)
        toast.success('Réponse ajustée par l\'IA')
      }
    } finally {
      setAiLoading(false)
    }
  }

  const send = () => {
    if (!messageId || !draft.trim()) {
      toast.error('La réponse est vide')
      return
    }
    reply.mutate(
      { id: messageId, body: draft.trim() },
      {
        onSuccess: () => {
          toast.success('Réponse envoyée — le client la reçoit en temps réel')
          setDraft('')
        },
        onError: (e) => toast.error((e as Error).message),
      },
    )
  }

  const markResolved = () => {
    if (!messageId) return
    setStatus.mutate(
      { id: messageId, status: 'resolved' },
      {
        onSuccess: () => toast.success('Fil marqué comme résolu'),
        onError: (e) => toast.error((e as Error).message),
      },
    )
  }

  return (
    <Dialog open={!!messageId} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] p-0 gap-0 flex flex-col overflow-hidden">
        <DialogHeader className="px-5 pt-5 pb-3 shrink-0 border-b border-white/10">
          <DialogTitle className="flex flex-wrap items-center gap-2">
            <span>{thread?.household_name ?? 'Fil de discussion'}</span>
            {thread && (
              <Badge variant="outline" className={TOPIC_BADGE[thread.topic]}>
                {TOPIC_LABEL[thread.topic]}
              </Badge>
            )}
            {thread && (
              <Badge variant="outline" className={STATUS_BADGE[thread.status]}>
                {STATUS_LABEL[thread.status]}
              </Badge>
            )}
          </DialogTitle>
          {thread?.user_email && (
            <p className="text-xs text-gray-500">{thread.user_email}</p>
          )}
        </DialogHeader>

        {/* Bulles */}
        <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4 space-y-3">
          {isLoading ? (
            <>
              <div className="h-12 w-2/3 rounded-lg bg-white/5 animate-pulse" />
              <div className="h-12 w-2/3 ml-auto rounded-lg bg-white/5 animate-pulse" />
            </>
          ) : error ? (
            <div className="rounded-md border border-red-400/30 bg-red-400/5 p-3 text-xs text-red-400">
              Impossible de charger le fil : {(error as Error).message}
            </div>
          ) : (
            thread?.messages?.map((m, i) => {
              const isAdmin = m.sender === 'admin'
              return (
                <div key={i} className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                      isAdmin
                        ? 'bg-cyan-500/15 text-cyan-50 border border-cyan-400/20'
                        : 'bg-white/5 text-gray-200 border border-white/10'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{m.body}</p>
                    <p className="mt-1 text-[0.6rem] text-gray-500">
                      {isAdmin ? 'Toi' : thread?.household_name ?? 'Client'} ·{' '}
                      {new Date(m.created_at).toLocaleString('fr-FR')}
                    </p>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Zone de réponse */}
        <div className="shrink-0 border-t border-white/10 px-5 py-4 space-y-2">
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={3}
            placeholder="Écris ta réponse… (elle arrive en temps réel dans l'app du client)"
          />
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" onClick={send} disabled={reply.isPending || aiLoading}>
              <Send className="mr-1.5 h-3.5 w-3.5" />
              {reply.isPending ? 'Envoi…' : 'Envoyer'}
            </Button>
            <Button variant="outline" size="sm" onClick={adjust} disabled={aiLoading || reply.isPending}>
              <Sparkles className="mr-1.5 h-3.5 w-3.5" />
              {aiLoading ? 'Ajustement…' : 'Ajuster avec l\'IA'}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="ml-auto"
              onClick={markResolved}
              disabled={setStatus.isPending || thread?.status === 'resolved'}
            >
              Marquer résolu
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function MessagesTab() {
  const [status, setStatus] = useState<ContactStatus | 'all'>('new')
  const [topic, setTopic] = useState<ContactTopic | 'all'>('all')
  const [openThreadId, setOpenThreadId] = useState<string | null>(null)

  const { data, isLoading, error, refetch, isFetching } = useContactMessages(
    status === 'all' ? undefined : status,
  )
  const { setStatus: setMsgStatus, remove } = useContactActions()
  const [toDelete, setToDelete] = useState<{ id: string; name: string } | null>(null)

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
      {/* Barre de filtres regroupée */}
      <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.02] p-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-1.5">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setStatus(f.key)}
              className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                status === f.key
                  ? 'border-cyan-400/40 bg-cyan-400/10 text-cyan-200'
                  : 'border-white/10 text-gray-400 hover:bg-white/5 hover:text-gray-200'
              }`}
            >
              {f.label}
            </button>
          ))}
          <span className="mx-1 hidden h-5 w-px bg-white/10 sm:block" />
          {TOPIC_FILTERS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTopic(t.key)}
              className={`rounded-lg border px-2.5 py-1 text-[0.7rem] transition-colors ${
                topic === t.key
                  ? 'border-cyan-400/40 bg-cyan-400/10 text-cyan-200'
                  : 'border-white/10 text-gray-500 hover:bg-white/5 hover:text-gray-300'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <Button variant="ghost" size="sm" disabled={isFetching} onClick={() => refetch()}>
          <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
          {isFetching ? 'Actualisation…' : 'Actualiser'}
        </Button>
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
        <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-6 py-14 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-cyan-400/20 bg-cyan-400/10 text-cyan-300">
            <Inbox className="h-6 w-6" />
          </div>
          <p className="text-sm text-gray-300">
            Aucun message{status !== 'all' ? ' dans ce statut' : ''}
            {topic !== 'all' ? ` (sujet : ${TOPIC_LABEL[topic]})` : ''}.
          </p>
          <p className="mt-1 text-xs text-gray-500">Les messages des utilisateurs MenuFacile apparaîtront ici.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`rounded-xl border border-l-2 border-white/10 bg-white/[0.03] p-4 space-y-2 transition-colors hover:bg-white/[0.05] ${STATUS_ACCENT[m.status]}`}
            >
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
                <Button size="sm" onClick={() => setOpenThreadId(m.id)}>
                  <MessagesSquare className="mr-1.5 h-3.5 w-3.5" />
                  Ouvrir le fil
                </Button>
                {m.status === 'new' && (
                  <Button variant="outline" size="sm" disabled={setMsgStatus.isPending} onClick={() => mark(m.id, 'read', 'Marqué comme lu')}>
                    <Check className="mr-1.5 h-3.5 w-3.5" />
                    Marquer lu
                  </Button>
                )}
                {m.status !== 'resolved' && (
                  <Button variant="outline" size="sm" disabled={setMsgStatus.isPending} onClick={() => mark(m.id, 'resolved', 'Marqué comme résolu')}>
                    <Check className="mr-1.5 h-3.5 w-3.5" />
                    Marquer résolu
                  </Button>
                )}
                {m.status === 'resolved' && (
                  <Button variant="ghost" size="sm" disabled={setMsgStatus.isPending} onClick={() => mark(m.id, 'new', 'Message rouvert')}>
                    <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                    Rouvrir
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-auto text-gray-500 hover:text-red-300"
                  onClick={() => setToDelete({ id: m.id, name: m.household_name ?? 'ce message' })}
                >
                  Retirer de ma boîte
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ThreadDialog messageId={openThreadId} onClose={() => setOpenThreadId(null)} />

      {/* Confirmation retrait boîte Hub */}
      <Dialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Retirer de ta boîte ?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-400">
            Le message de « {toDelete?.name} » disparaîtra de ta boîte Hub.
            L&apos;utilisateur <strong>garde sa copie</strong> de son côté (aucun impact pour lui).
          </p>
          <DialogFooter className="gap-2">
            <Button variant="ghost" size="sm" onClick={() => setToDelete(null)} disabled={remove.isPending}>
              Annuler
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={remove.isPending}
              onClick={() => {
                if (!toDelete) return
                remove.mutate(toDelete.id, {
                  onSuccess: () => {
                    toast.success('Message retiré de ta boîte')
                    setToDelete(null)
                  },
                  onError: (e) => toast.error((e as Error).message),
                })
              }}
            >
              {remove.isPending ? 'Retrait…' : 'Retirer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
