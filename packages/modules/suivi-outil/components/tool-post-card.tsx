'use client'

import { useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Pencil, Trash2, X, Check, Loader2 } from 'lucide-react'
import { useToolPosts } from '../hooks/use-tool-posts'
import { UpdateToolPostSchema } from '../types/tool-post.types'
import type { ToolPost } from '../types/tool-post.types'
import { ToolPostComments } from './tool-post-comments'

interface ToolPostCardProps {
  post: ToolPost
  isOperator?: boolean
  clientId: string
}

export function ToolPostCard({ post, isOperator = false, clientId }: ToolPostCardProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(post.title ?? '')
  const [editBody, setEditBody] = useState(post.body)
  const [editError, setEditError] = useState<string | null>(null)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)

  const { update, isUpdating, remove, isDeleting } = useToolPosts(clientId)

  const handleSave = () => {
    setEditError(null)
    const parsed = UpdateToolPostSchema.safeParse({
      postId: post.id,
      title: editTitle || undefined,
      body: editBody,
    })
    if (!parsed.success) {
      setEditError(parsed.error.errors[0]?.message ?? 'Données invalides')
      return
    }
    update(parsed.data, {
      onSuccess: () => setIsEditing(false),
      onError: () => setEditError('Erreur lors de la sauvegarde'),
    })
  }

  const handleDelete = () => {
    if (!window.confirm('Supprimer cette mise à jour ? Cette action est irréversible.')) return
    remove(post.id)
  }

  const timeAgo = formatDistanceToNow(new Date(post.createdAt), { addSuffix: true, locale: fr })

  return (
    <>
      <article className="rounded-xl border border-white/10 bg-white/5 p-5 space-y-3 transition-colors hover:bg-white/8">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            {isEditing ? (
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="Titre (optionnel)"
                className="w-full rounded-md bg-white/10 border border-white/20 px-3 py-1.5 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-green-500/50"
                maxLength={200}
              />
            ) : (
              post.title && (
                <h3 className="text-sm font-semibold text-white truncate">{post.title}</h3>
              )
            )}
            <time className="text-xs text-white/40 mt-0.5 block">{timeAgo}</time>
          </div>

          {/* Actions opérateur */}
          {isOperator && !isEditing && (
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => setIsEditing(true)}
                className="p-1.5 rounded-md text-white/50 hover:text-white hover:bg-white/10 transition-colors"
                title="Modifier"
              >
                <Pencil size={14} />
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="p-1.5 rounded-md text-white/50 hover:text-red-400 hover:bg-red-400/10 transition-colors disabled:opacity-50"
                title="Supprimer"
              >
                {isDeleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
              </button>
            </div>
          )}
        </div>

        {/* Body */}
        {isEditing ? (
          <div className="space-y-2">
            <textarea
              value={editBody}
              onChange={(e) => setEditBody(e.target.value)}
              rows={4}
              maxLength={5000}
              className="w-full rounded-md bg-white/10 border border-white/20 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-green-500/50 resize-none"
            />
            {editError && <p className="text-xs text-red-400">{editError}</p>}
            <div className="flex items-center gap-2 justify-end">
              <button
                onClick={() => {
                  setIsEditing(false)
                  setEditTitle(post.title ?? '')
                  setEditBody(post.body)
                  setEditError(null)
                }}
                className="flex items-center gap-1 px-3 py-1.5 rounded-md text-xs text-white/70 hover:bg-white/10 transition-colors"
              >
                <X size={12} /> Annuler
              </button>
              <button
                onClick={handleSave}
                disabled={isUpdating}
                className="flex items-center gap-1 px-3 py-1.5 rounded-md text-xs bg-green-600 hover:bg-green-500 text-white transition-colors disabled:opacity-50"
              >
                {isUpdating ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                Sauvegarder
              </button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-white/80 leading-relaxed whitespace-pre-wrap">{post.body}</p>
        )}

        {/* Images */}
        {!isEditing && post.imageUrls.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
            {post.imageUrls.map((url, i) => (
              <button
                key={i}
                onClick={() => setSelectedImage(url)}
                className="aspect-video rounded-md overflow-hidden bg-white/5 hover:ring-2 hover:ring-green-500/50 transition-all"
              >
                <img
                  src={url}
                  alt={`Capture ${i + 1}`}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </button>
            ))}
          </div>
        )}

        {/* Commentaires / réactions */}
        {!isEditing && <ToolPostComments postId={post.id} />}
      </article>

      {/* Lightbox simple */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] p-4">
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute top-2 right-2 p-2 rounded-full bg-black/50 text-white hover:bg-black/70"
            >
              <X size={20} />
            </button>
            <img
              src={selectedImage}
              alt="Capture agrandie"
              className="max-w-full max-h-[80vh] rounded-lg object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </>
  )
}
