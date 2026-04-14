'use client'

import { useState } from 'react'
import {
  Badge,
  Button,
  Checkbox,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@monprojetpro/ui'
import { MoreVertical, Pencil, Trash2 } from 'lucide-react'
import { useToggleReminderComplete, useDeleteReminder } from '../hooks/use-reminders'
import type { Reminder } from '../types/crm.types'
import { toast } from 'sonner'

interface ReminderCardProps {
  reminder: Reminder
  onEdit?: (reminder: Reminder) => void
}

export function ReminderCard({ reminder, onEdit }: ReminderCardProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  const toggleComplete = useToggleReminderComplete()
  const deleteReminder = useDeleteReminder()

  const isOverdue = !reminder.completed && new Date(reminder.dueDate) < new Date()
  const isCompleted = reminder.completed

  const handleToggleComplete = async () => {
    try {
      await toggleComplete.mutateAsync({ reminderId: reminder.id })
      toast.success(reminder.completed ? 'Rappel marqué non complété' : 'Rappel marqué complété')
    } catch (error) {
      toast.error('Erreur lors de la modification du rappel')
    }
  }

  const handleDelete = async () => {
    try {
      await deleteReminder.mutateAsync({ reminderId: reminder.id })
      toast.success('Rappel supprimé')
      setShowDeleteDialog(false)
    } catch (error) {
      toast.error('Erreur lors de la suppression du rappel')
    }
  }

  return (
    <>
      <div
        className={`flex items-start gap-3 rounded-lg border p-3 ${
          isCompleted ? 'bg-muted/30' : 'bg-background'
        }`}
      >
        <Checkbox
          checked={reminder.completed}
          onCheckedChange={handleToggleComplete}
          className="mt-0.5"
        />

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p
                className={`font-medium ${
                  isCompleted ? 'line-through text-muted-foreground' : ''
                }`}
              >
                {reminder.title}
              </p>

              {reminder.description && (
                <p className="text-sm text-muted-foreground mt-1">
                  {reminder.description}
                </p>
              )}

              <div className="flex items-center gap-2 mt-2">
                <Badge
                  variant={isOverdue ? 'destructive' : isCompleted ? 'secondary' : 'default'}
                  className="text-xs"
                >
                  {new Date(reminder.dueDate).toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Badge>

                {isOverdue && !isCompleted && (
                  <span className="text-xs text-destructive font-medium">En retard</span>
                )}
              </div>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEdit?.(reminder)}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Modifier
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setShowDeleteDialog(true)}
                  className="text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Supprimer
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer le rappel ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Le rappel sera définitivement supprimé.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
