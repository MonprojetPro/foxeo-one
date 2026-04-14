'use client'

import { useState, useTransition } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Button,
  Textarea,
  Skeleton,
  showSuccess,
  showError,
} from '@monprojetpro/ui'
import { useClientNotes } from '../hooks/use-client-notes'
import { createClientNote } from '../actions/create-client-note'
import { ClientNoteCard } from './client-note-card'

interface ClientNotesSectionProps {
  clientId: string
}

export function ClientNotesSection({ clientId }: ClientNotesSectionProps) {
  const { data: notes, isPending: isLoading } = useClientNotes(clientId)
  const [newContent, setNewContent] = useState('')
  const [isPending, startTransition] = useTransition()
  const queryClient = useQueryClient()

  const handleAdd = () => {
    if (!newContent.trim()) return

    startTransition(async () => {
      const result = await createClientNote({
        clientId,
        content: newContent.trim(),
      })

      if (result.error) {
        showError(result.error.message)
        return
      }

      showSuccess('Note ajoutée')
      await queryClient.invalidateQueries({ queryKey: ['client-notes', clientId] })
      setNewContent('')
    })
  }

  return (
    <Card data-testid="client-notes-section">
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <CardTitle>Notes privées</CardTitle>
          <Badge variant="secondary">Privé</Badge>
        </div>
      </CardHeader>
      <CardContent>
        {/* Add note form */}
        <div className="space-y-2 mb-4">
          <Textarea
            placeholder="Ajouter une note privée..."
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            rows={3}
            maxLength={5000}
            data-testid="new-note-textarea"
          />
          <div className="flex justify-end">
            <Button
              size="sm"
              onClick={handleAdd}
              disabled={isPending || !newContent.trim()}
              data-testid="add-note-btn"
            >
              {isPending ? 'Ajout...' : 'Ajouter'}
            </Button>
          </div>
        </div>

        {/* Notes list */}
        {isLoading ? (
          <div className="space-y-3" data-testid="notes-loading">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : !notes || notes.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4" data-testid="notes-empty">
            Aucune note privée pour ce client.
          </p>
        ) : (
          <div className="space-y-3" data-testid="notes-list">
            {notes.map((note) => (
              <ClientNoteCard key={note.id} note={note} clientId={clientId} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
