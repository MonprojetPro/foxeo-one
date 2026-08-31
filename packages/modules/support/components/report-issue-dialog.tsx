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
import { AttachmentsPicker } from './attachments-picker'
import { useCreateSupportTicket } from '../hooks/use-support-tickets'
import { uploadAttachments, cleanupUploadedAttachments } from '../lib/upload-attachments'
import { MAX_ATTACHMENTS, readableSize } from '../lib/attachment-constraints'

interface ReportIssueDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ReportIssueDialog({ open, onOpenChange }: ReportIssueDialogProps) {
  const [files, setFiles] = useState<File[]>([])
  const [fileError, setFileError] = useState<string | null>(null)
  const [stage, setStage] = useState<null | 'uploading' | 'saving'>(null)
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
      screenshotUrls: [],
    },
  })

  const busy = isSubmitting || stage !== null

  const onSubmit = async (data: CreateTicketInput) => {
    const ticketId = crypto.randomUUID()
    let uploadedPaths: string[] = []

    try {
      setFileError(null)

      let screenshotUrls: string[] = []
      if (files.length > 0) {
        setStage('uploading')
        const uploaded = await uploadAttachments(files, ticketId)
        uploadedPaths = uploaded.map((u) => u.path)
        screenshotUrls = uploaded.map((u) => u.publicUrl)
      }

      setStage('saving')
      await createTicket.mutateAsync({
        id: ticketId,
        ...data,
        screenshotUrls,
      })

      showSuccess('Votre signalement a été envoyé')
      reset()
      setFiles([])
      onOpenChange(false)
    } catch (err) {
      // La demande n'a pas abouti : on ne laisse pas des pièces jointes
      // orphelines dans le stockage, rattachées à aucun ticket.
      await cleanupUploadedAttachments(uploadedPaths)
      const message = err instanceof Error ? err.message : 'Erreur lors de l\'envoi'
      showError(message)
    } finally {
      setStage(null)
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

        <form onSubmit={handleSubmit(onSubmit)} className="min-w-0 space-y-4">
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

          <div className="space-y-2">
            <label className="text-sm font-medium">Pièces jointes</label>
            <AttachmentsPicker
              files={files}
              onChange={(next) => {
                setFiles(next)
                setFileError(null)
              }}
              onRejected={setFileError}
              disabled={busy}
            />
            <p className="text-xs text-muted-foreground">
              Images ou PDF, {MAX_ATTACHMENTS} maximum. Les images sont compressées automatiquement
              avant l'envoi.
            </p>
            {files.length > 1 && (
              <p className="text-xs text-muted-foreground">
                Total : {readableSize(files.reduce((sum, f) => sum + f.size, 0))}
              </p>
            )}
            {fileError && <p className="text-xs text-destructive">{fileError}</p>}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={busy}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={busy}>
              {stage === 'uploading'
                ? 'Envoi des pièces jointes...'
                : stage === 'saving'
                  ? 'Enregistrement...'
                  : 'Envoyer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
