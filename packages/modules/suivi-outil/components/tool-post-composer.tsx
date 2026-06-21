'use client'

import { useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ImagePlus, X, Loader2, Send } from 'lucide-react'
import { useToolPosts } from '../hooks/use-tool-posts'

const MAX_IMAGES = 5
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

const ComposerSchema = z.object({
  title: z.string().max(200).optional(),
  body: z.string().min(1, 'Le contenu est requis').max(5000),
})
type ComposerValues = z.infer<typeof ComposerSchema>

interface ToolPostComposerProps {
  clientId: string
  onSuccess?: () => void
}

export function ToolPostComposer({ clientId, onSuccess }: ToolPostComposerProps) {
  const [images, setImages] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  const [serverError, setServerError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { create, isCreating } = useToolPosts(clientId)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ComposerValues>({
    resolver: zodResolver(ComposerSchema),
    defaultValues: { title: '', body: '' },
  })

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    const remaining = MAX_IMAGES - images.length
    const valid = files
      .filter((f) => ACCEPTED_TYPES.includes(f.type))
      .slice(0, remaining)

    const newPreviews = valid.map((f) => URL.createObjectURL(f))
    setImages((prev) => [...prev, ...valid])
    setImagePreviews((prev) => [...prev, ...newPreviews])

    // Reset input pour permettre re-sélection du même fichier
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const removeImage = (index: number) => {
    URL.revokeObjectURL(imagePreviews[index] ?? '')
    setImages((prev) => prev.filter((_, i) => i !== index))
    setImagePreviews((prev) => prev.filter((_, i) => i !== index))
  }

  const onSubmit = (values: ComposerValues) => {
    setServerError(null)
    const formData = new FormData()
    formData.append('clientId', clientId)
    if (values.title) formData.append('title', values.title)
    formData.append('body', values.body)
    images.forEach((img) => formData.append('images', img))

    create(formData, {
      onSuccess: (response) => {
        if (response.error) {
          setServerError(response.error.message)
          return
        }
        reset()
        imagePreviews.forEach((url) => URL.revokeObjectURL(url))
        setImages([])
        setImagePreviews([])
        onSuccess?.()
      },
      onError: () => setServerError('Erreur réseau, veuillez réessayer.'),
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 rounded-xl border border-white/10 bg-white/5 p-5">
      <h2 className="text-sm font-semibold text-white">Publier une mise à jour</h2>

      {/* Titre */}
      <div>
        <input
          {...register('title')}
          type="text"
          placeholder="Titre (optionnel)"
          className="w-full rounded-md bg-white/10 border border-white/20 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-green-500/50"
          maxLength={200}
        />
        {errors.title && <p className="mt-1 text-xs text-red-400">{errors.title.message}</p>}
      </div>

      {/* Corps */}
      <div>
        <textarea
          {...register('body')}
          placeholder="Décrivez l'avancement, les décisions prises, les prochaines étapes…"
          rows={4}
          maxLength={5000}
          className="w-full rounded-md bg-white/10 border border-white/20 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-green-500/50 resize-none"
        />
        {errors.body && <p className="mt-1 text-xs text-red-400">{errors.body.message}</p>}
      </div>

      {/* Prévisualisations images */}
      {imagePreviews.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
          {imagePreviews.map((src, i) => (
            <div key={i} className="relative aspect-square rounded-md overflow-hidden bg-white/10">
              <img src={src} alt={`Aperçu ${i + 1}`} className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => removeImage(i)}
                className="absolute top-1 right-1 rounded-full bg-black/60 p-0.5 text-white hover:bg-black/80"
              >
                <X size={10} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Actions bas */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_TYPES.join(',')}
            multiple
            className="hidden"
            onChange={handleImageSelect}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={images.length >= MAX_IMAGES}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs text-white/60 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ImagePlus size={14} />
            <span>
              Images ({images.length}/{MAX_IMAGES})
            </span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          {serverError && <p className="text-xs text-red-400">{serverError}</p>}
          <button
            type="submit"
            disabled={isCreating}
            className="flex items-center gap-1.5 px-4 py-2 rounded-md bg-green-600 hover:bg-green-500 text-white text-sm font-medium transition-colors disabled:opacity-50"
          >
            {isCreating ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            Publier
          </button>
        </div>
      </div>
    </form>
  )
}
