'use client'

import { useState, useTransition } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  Card,
  CardContent,
  Badge,
  Button,
  Textarea,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  showSuccess,
  showError,
} from '@monprojetpro/ui'
import { updateClientNote } from '../actions/update-client-note'
import { deleteClientNote } from '../actions/delete-client-note'
import type { ClientNote } from '../types/crm.types'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

interface ClientNoteCardProps {
  note: ClientNote
  clientId: string
}

export function ClientNoteCard({ note, clientId }: ClientNoteCardProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState(note.content)
  const [isPending, startTransition] = useTransition()
  const queryClient = useQueryClient()

  const handleUpdate = () => {
    if (!editContent.trim()) return

    startTransition(async () => {
      const result = await updateClientNote({
        noteId: note.id,
        content: editContent.trim(),
      })

      if (result.error) {
        showError(result.error.message)
        return
      }

      showSuccess('Note modifiée')
      await queryClient.invalidateQueries({ queryKey: ['client-notes', clientId] })
      setIsEditing(false)
    })
  }

  const handleDelete = () => {
    startTransition(async () => {
      const result = await deleteClientNote(note.id)

      if (result.error) {
        showError(result.error.message)
        return
      }

      showSuccess('Note supprimée')
      await queryClient.invalidateQueries({ queryKey: ['client-notes', clientId] })
    })
  }

  const handleCancelEdit = () => {
    setEditContent(note.content)
    setIsEditing(false)
  }

  const createdDate = format(new Date(note.createdAt), 'd MMM yyyy à HH:mm', { locale: fr })

  return (
    <Card data-testid={`note-card-${note.id}`}>
      <CardContent className="pt-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="secondary">Privé</Badge>
              <span className="text-xs text-muted-foreground">{createdDate}</span>
            </div>

            {isEditing ? (
              <div className="space-y-2">
                <Textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  rows={3}
                  maxLength={5000}
                  data-testid="edit-note-textarea"
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={handleUpdate}
                    disabled={isPending || !editContent.trim()}
                  >
                    {isPending ? 'Sauvegarde...' : 'Sauvegarder'}
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleCancelEdit}>
                    Annuler
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-sm whitespace-pre-wrap">{note.content}</p>
            )}
          </div>

          {!isEditing && (
            <div className="flex gap-1 shrink-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditing(true)}
                data-testid="edit-note-btn"
              >
                Modifier
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    data-testid="delete-note-btn"
                  >
                    Supprimer
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Supprimer cette note ?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Cette action est irréversible. La note sera définitivement supprimée.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} disabled={isPending}>
                      {isPending ? 'Suppression...' : 'Supprimer'}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
