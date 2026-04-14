'use client'

import { useState, useTransition } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  Button,
  showSuccess,
  showError,
} from '@monprojetpro/ui'
import { ClientForm } from './client-form'
import { updateClient } from '../actions/update-client'
import type { Client, UpdateClientInput } from '../types/crm.types'

interface EditClientDialogProps {
  client: Client
  onClientUpdated?: () => void
  open?: boolean
  onOpenChange?: (open: boolean) => void
  trigger?: React.ReactNode
}

export function EditClientDialog({
  client,
  onClientUpdated,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  trigger,
}: EditClientDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false)

  // Use controlled state if provided, otherwise use internal state
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen
  const setOpen = controlledOnOpenChange || setInternalOpen
  const [isPending, startTransition] = useTransition()
  const [serverError, setServerError] = useState<{ field: string; message: string } | null>(null)
  const queryClient = useQueryClient()

  const handleSubmit = (data: UpdateClientInput) => {
    setServerError(null)

    startTransition(async () => {
      const result = await updateClient(client.id, data)

      if (result.error) {
        if (result.error.code === 'EMAIL_ALREADY_EXISTS') {
          setServerError({ field: 'email', message: result.error.message })
          return
        }
        showError(result.error.message)
        return
      }

      if (result.data) {
        showSuccess('Client mis à jour')
        await queryClient.invalidateQueries({ queryKey: ['clients'] })
        await queryClient.invalidateQueries({ queryKey: ['client', client.id] })
        setOpen(false)
        onClientUpdated?.()
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && (
        <DialogTrigger asChild>
          {trigger}
        </DialogTrigger>
      )}
      {!trigger && controlledOpen === undefined && (
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">Modifier</Button>
        </DialogTrigger>
      )}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Modifier le client</DialogTitle>
          <DialogDescription>
            Modifiez les informations du client.
          </DialogDescription>
        </DialogHeader>
        <ClientForm
          onSubmit={handleSubmit}
          onCancel={() => setOpen(false)}
          defaultValues={{
            name: client.name,
            email: client.email,
            company: client.company,
            phone: client.phone,
            sector: client.sector,
            clientType: client.clientType,
          }}
          mode="edit"
          isPending={isPending}
          serverError={serverError}
        />
      </DialogContent>
    </Dialog>
  )
}

EditClientDialog.displayName = 'EditClientDialog'
