'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Button,
  Input,
  Textarea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@monprojetpro/ui'
import { showSuccess, showError } from '@monprojetpro/ui'
import { CreateTicketInputSchema, type CreateTicketInput } from '../types/support.types'
import { ScreenshotUpload } from './screenshot-upload'
import { useCreateSupportTicket } from '../hooks/use-support-tickets'

interface ReportIssueDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ReportIssueDialog({ open, onOpenChange }: ReportIssueDialogProps) {
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null)
  const createTicket = useCreateSupportTicket()

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateTicketInput>({
    resolver: zodResolver(CreateTicketInputSchema),
    defaultValues: {
      type: 'bug',
      subject: '',
      description: '',
    },
  })

  const onSubmit = async (data: CreateTicketInput) => {
    try {
      await createTicket.mutateAsync({
        ...data,
        screenshotUrl,
      })
      showSuccess('Votre signalement a été envoyé')
      reset()
      setScreenshotUrl(null)
      onOpenChange(false)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur lors de l\'envoi'
      showError(message)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Signaler un problème</DialogTitle>
          <DialogDescription>
            Décrivez le problème rencontré. MiKL sera notifié immédiatement.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Type</label>
            <Select
              defaultValue="bug"
              onValueChange={(value) => setValue('type', value as CreateTicketInput['type'])}
            >
              <SelectTrigger>
                <SelectValue placeholder="Type de signalement" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bug">Bug</SelectItem>
                <SelectItem value="question">Question</SelectItem>
                <SelectItem value="suggestion">Suggestion</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Sujet *</label>
            <Input
              {...register('subject')}
              placeholder="Résumé du problème"
            />
            {errors.subject && (
              <p className="text-xs text-destructive">{errors.subject.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Description *</label>
            <Textarea
              {...register('description')}
              placeholder="Décrivez le problème en détail..."
              rows={4}
            />
            {errors.description && (
              <p className="text-xs text-destructive">{errors.description.message}</p>
            )}
          </div>

          <ScreenshotUpload
            currentUrl={screenshotUrl}
            onUploaded={(url) => setScreenshotUrl(url)}
            onRemove={() => setScreenshotUrl(null)}
          />

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Envoi...' : 'Envoyer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
