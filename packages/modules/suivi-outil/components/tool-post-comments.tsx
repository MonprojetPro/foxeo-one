'use client'

import { useState } from 'react'
import { Loader2, MessageSquare, Send } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import { useToolComments, useCreateToolComment } from '../hooks/use-tool-comments'
import type { ToolPostComment } from '../types/tool-post.types'

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function CommentSkeleton() {
  return (
    <div className="space-y-2 animate-pulse">
      <div className="h-2.5 w-24 rounded bg-white/10" />
      <div className="h-2 w-full rounded bg-white/10" />
      <div className="h-2 w-3/4 rounded bg-white/10" />
    </div>
  )
}

// ─── Commentaire individuel ───────────────────────────────────────────────────

function CommentItem({ comment }: { comment: ToolPostComment }) {
  const isOperator = comment.authorType === 'operator'
  const timeAgo = formatDistanceToNow(new Date(comment.createdAt), {
    addSuffix: true,
    locale: fr,
  })

  return (
    <div
      className={[
        'rounded-lg px-3 py-2.5 text-sm space-y-1',
        isOperator
          ? 'bg-cyan-950/40 border border-cyan-500/15'
          : 'bg-indigo-950/40 border border-indigo-500/15',
      ].join(' ')}
    >
      <div className="flex items-center justify-between gap-2">
        <span
          className={[
            'text-xs font-medium',
            isOperator ? 'text-cyan-400' : 'text-indigo-400',
          ].join(' ')}
        >
          {isOperator ? 'MonprojetPro' : 'Vous'}
        </span>
        <time className="text-xs text-white/30">{timeAgo}</time>
      </div>
      <p className="text-white/80 leading-relaxed whitespace-pre-wrap">{comment.body}</p>
    </div>
  )
}

// ─── Formulaire de commentaire ────────────────────────────────────────────────

interface CommentFormProps {
  postId: string
}

function CommentForm({ postId }: CommentFormProps) {
  const [body, setBody] = useState('')
  const { mutate, isPending, data } = useCreateToolComment(postId)

  const serverError = data?.error?.message ?? null
  const bodyTrimmed = body.trim()
  const isDisabled = isPending || bodyTrimmed.length === 0 || bodyTrimmed.length > 2000

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (isDisabled) return
    mutate(bodyTrimmed, {
      onSuccess: (res) => {
        if (!res.error) setBody('')
      },
    })
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3 space-y-2">
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Réagissez à cette mise à jour…"
        rows={2}
        maxLength={2000}
        disabled={isPending}
        className="w-full rounded-md bg-white/5 border border-white/15 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-green-500/40 resize-none disabled:opacity-50 transition-colors"
      />
      <div className="flex items-center justify-between gap-2">
        {serverError ? (
          <p className="text-xs text-red-400">{serverError}</p>
        ) : (
          <span className="text-xs text-white/30">
            {body.length > 0 ? `${body.length} / 2000` : ''}
          </span>
        )}
        <button
          type="submit"
          disabled={isDisabled}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs bg-green-700 hover:bg-green-600 text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isPending ? (
            <Loader2 size={12} className="animate-spin" />
          ) : (
            <Send size={12} />
          )}
          Réagir
        </button>
      </div>
    </form>
  )
}

// ─── Liste + formulaire (export principal) ────────────────────────────────────

interface ToolPostCommentsProps {
  postId: string
}

export function ToolPostComments({ postId }: ToolPostCommentsProps) {
  const { comments, isPending, isError } = useToolComments(postId)

  return (
    <div className="pt-3 mt-3 border-t border-white/8 space-y-3">
      {/* En-tête */}
      <div className="flex items-center gap-1.5 text-xs text-white/40">
        <MessageSquare size={12} />
        <span>
          {isPending
            ? 'Chargement…'
            : comments.length === 0
              ? 'Aucune réaction pour l\'instant'
              : `${comments.length} réaction${comments.length > 1 ? 's' : ''}`}
        </span>
      </div>

      {/* Liste */}
      {isPending && (
        <div className="space-y-3">
          <CommentSkeleton />
          <CommentSkeleton />
        </div>
      )}

      {isError && (
        <p className="text-xs text-red-400">Impossible de charger les réactions.</p>
      )}

      {!isPending && !isError && comments.length > 0 && (
        <div className="space-y-2">
          {comments.map((c) => (
            <CommentItem key={c.id} comment={c} />
          ))}
        </div>
      )}

      {/* Formulaire */}
      <CommentForm postId={postId} />
    </div>
  )
}
