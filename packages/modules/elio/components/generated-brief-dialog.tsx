'use client'

import { useState, useEffect, useTransition } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Button,
  Textarea,
  Skeleton,
  showSuccess,
  showError,
} from '@monprojetpro/ui'
import { useRouter } from 'next/navigation'
import { BriefMarkdownRenderer } from './brief-markdown-renderer'
import { generateBrief } from '../actions/generate-brief'
import { submitElioBrief } from '../actions/submit-elio-brief'

interface GeneratedBriefDialogProps {
  isOpen: boolean
  onClose: () => void
  stepId: string
}

export function GeneratedBriefDialog({ isOpen, onClose, stepId }: GeneratedBriefDialogProps) {
  const router = useRouter()
  const [brief, setBrief] = useState<string>('')
  const [isEditing, setIsEditing] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSubmitting, startSubmitTransition] = useTransition()

  useEffect(() => {
    if (isOpen) {
      handleGenerate()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, stepId])

  const handleGenerate = async () => {
    setIsGenerating(true)
    const response = await generateBrief(stepId)

    if (response.error) {
      showError(response.error.message)
      setIsGenerating(false)
      return
    }

    setBrief(response.data?.brief ?? '')
    setIsGenerating(false)
  }

  const handleSubmit = () => {
    startSubmitTransition(async () => {
      const response = await submitElioBrief({ stepId, content: brief })

      if (response.error) {
        showError(response.error.message)
        return
      }

      showSuccess('Brief soumis — MiKL va valider votre travail.')
      onClose()
      router.push('/modules/parcours')
    })
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Votre brief généré par Élio</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {isGenerating ? (
            <div className="space-y-4 py-4">
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-6 w-1/2 mt-4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-4/5" />
              <p className="mt-4 text-muted-foreground text-center text-sm">Élio génère votre brief...</p>
            </div>
          ) : isEditing ? (
            <Textarea
              value={brief}
              onChange={(e) => setBrief(e.target.value)}
              rows={20}
              className="font-mono text-sm"
            />
          ) : (
            <BriefMarkdownRenderer content={brief} />
          )}
        </div>

        <div className="flex justify-between">
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setIsEditing(!isEditing)}
              disabled={isGenerating}
            >
              {isEditing ? 'Aperçu' : 'Éditer'}
            </Button>
            <Button
              variant="ghost"
              onClick={handleGenerate}
              disabled={isGenerating}
            >
              Régénérer
            </Button>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
              Annuler
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || isGenerating || !brief}
            >
              {isSubmitting ? 'Soumission...' : 'Soumettre pour validation'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
