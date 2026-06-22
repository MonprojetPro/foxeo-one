'use client'

import { useState, useRef } from 'react'
import { Loader2, MessageSquare, Send, ImagePlus, X as XIcon } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import { createBrowserSupabaseClient } from '@monprojetpro/supabase'
import { useToolComments, useCreateToolComment } from '../hooks/use-tool-comments'
import type { ToolPostComment } from '../types/tool-post.types'

const BUCKET = 'tool-screenshots'
const MAX_COMMENT_IMAGES = 3

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

// ─── Lightbox ─────────────────────────────────────────────────────────────────

function ImageLightbox({ url, onClose }: { url: string; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div className="relative max-w-4xl max-h-[90vh] p-4">
        <button
          onClick={onClose}
          className="absolute top-2 right-2 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
          aria-label="Fermer"
        >
          <XIcon size={20} />
        </button>
        <img
          src={url}
          alt="Image agrandie"
          className="max-w-full max-h-[80vh] rounded-lg object-contain"
          onClick={(e) => e.stopPropagation()}
        />
      </div>
    </div>
  )
}

// ─── Commentaire individuel ───────────────────────────────────────────────────

function CommentItem({ comment }: { comment: ToolPostComment }) {
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)
  const isOperator = comment.authorType === 'operator'
  const timeAgo = formatDistanceToNow(new Date(comment.createdAt), {
    addSuffix: true,
    locale: fr,
  })

  return (
    <>
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

        {/* Images du commentaire */}
        {comment.imageUrls.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
            {comment.imageUrls.map((url, i) => (
              <button
                key={i}
                onClick={() => setLightboxUrl(url)}
                className="aspect-video rounded-md overflow-hidden bg-white/5 hover:ring-2 hover:ring-green-500/50 transition-all"
                aria-label={`Agrandir l'image ${i + 1}`}
              >
                <img
                  src={url}
                  alt={`Image ${i + 1}`}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {lightboxUrl && (
        <ImageLightbox url={lightboxUrl} onClose={() => setLightboxUrl(null)} />
      )}
    </>
  )
}

// ─── Formulaire de commentaire ────────────────────────────────────────────────

interface CommentFormProps {
  postId: string
  clientId: string
}

function CommentForm({ postId, clientId }: CommentFormProps) {
  const [body, setBody] = useState('')
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { mutate, isPending, data } = useCreateToolComment(postId)

  const serverError = data?.error?.message ?? null
  const bodyTrimmed = body.trim()
  const isDisabled = isPending || (bodyTrimmed.length === 0 && selectedFiles.length === 0) || bodyTrimmed.length > 2000

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null)
    const files = Array.from(e.target.files ?? [])
    const remaining = MAX_COMMENT_IMAGES - selectedFiles.length
    if (files.length > remaining) {
      setUploadError(`Maximum ${MAX_COMMENT_IMAGES} images autorisées`)
      return
    }
    const newFiles = [...selectedFiles, ...files].slice(0, MAX_COMMENT_IMAGES)
    setSelectedFiles(newFiles)
    // Générer les previews pour les nouveaux fichiers
    const newPreviews = files.slice(0, remaining).map((f) => URL.createObjectURL(f))
    setPreviews((prev) => [...prev, ...newPreviews].slice(0, MAX_COMMENT_IMAGES))
    // Réinitialiser le input pour permettre de resélectionner le même fichier
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleRemoveFile = (index: number) => {
    URL.revokeObjectURL(previews[index])
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index))
    setPreviews((prev) => prev.filter((_, i) => i !== index))
    setUploadError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isDisabled) return
    setUploadError(null)

    // Upload des images directement vers Supabase Storage depuis le client
    let imagePaths: string[] = []
    if (selectedFiles.length > 0) {
      const supabase = createBrowserSupabaseClient()
      for (const file of selectedFiles) {
        const ext = file.name.split('.').pop() ?? 'png'
        const path = `comments/${clientId}/${crypto.randomUUID()}.${ext}`
        const { error } = await supabase.storage
          .from(BUCKET)
          .upload(path, file, { contentType: file.type, upsert: false })
        if (error) {
          setUploadError("Échec de l'upload d'une image. Réessayez.")
          // Nettoyer les images déjà uploadées
          if (imagePaths.length > 0) {
            await supabase.storage.from(BUCKET).remove(imagePaths)
          }
          return
        }
        imagePaths.push(path)
      }
    }

    mutate(
      { body: bodyTrimmed, imagePaths },
      {
        onSuccess: (res) => {
          if (!res.error) {
            setBody('')
            // Révoquer les object URLs de preview
            previews.forEach((p) => URL.revokeObjectURL(p))
            setSelectedFiles([])
            setPreviews([])
          }
        },
      }
    )
  }

  const canAddMore = selectedFiles.length < MAX_COMMENT_IMAGES

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

      {/* Previews images sélectionnées */}
      {previews.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {previews.map((src, i) => (
            <div key={i} className="relative w-16 h-16 rounded-md overflow-hidden bg-white/5 group">
              <img src={src} alt={`Aperçu ${i + 1}`} className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => handleRemoveFile(i)}
                className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label="Supprimer l'image"
              >
                <XIcon size={14} className="text-white" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {/* Bouton ajout image */}
          {canAddMore && (
            <label
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-white/70 border border-white/15 hover:text-white hover:border-white/30 hover:bg-white/10 transition-colors cursor-pointer"
              title={`Joindre une image (${selectedFiles.length}/${MAX_COMMENT_IMAGES})`}
            >
              <ImagePlus size={14} />
              <span>
                {selectedFiles.length > 0
                  ? `Ajouter une image (${selectedFiles.length}/${MAX_COMMENT_IMAGES})`
                  : 'Ajouter une image'}
              </span>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                className="hidden"
                onChange={handleFileChange}
                disabled={isPending}
              />
            </label>
          )}
          {selectedFiles.length >= MAX_COMMENT_IMAGES && (
            <span className="text-xs text-white/30">{MAX_COMMENT_IMAGES}/{MAX_COMMENT_IMAGES} images</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {(uploadError || serverError) && (
            <p className="text-xs text-red-400">{uploadError ?? serverError}</p>
          )}
          {!uploadError && !serverError && body.length > 0 && (
            <span className="text-xs text-white/30">{body.length} / 2000</span>
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
      </div>
    </form>
  )
}

// ─── Liste + formulaire (export principal) ────────────────────────────────────

interface ToolPostCommentsProps {
  postId: string
  clientId: string
}

export function ToolPostComments({ postId, clientId }: ToolPostCommentsProps) {
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
      <CommentForm postId={postId} clientId={clientId} />
    </div>
  )
}
