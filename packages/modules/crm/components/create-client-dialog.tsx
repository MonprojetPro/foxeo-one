'use client'

import { useState, useTransition } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
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
import { createClient } from '../actions/create-client'
import { getStoredRootFolder, hasFolderPermission, ensureClientFolder } from '../utils/local-folder'
import type { CreateClientInput } from '../types/crm.types'

// T-063 (suite, 27-10) — provisionne tout de suite le dossier local du client,
// si le dossier racine "Projets MPP" est deja lie dans ce navigateur. Best
// effort : aucune erreur ne doit empecher la creation du client (navigateur
// non supporte, dossier racine pas encore lie, permission expiree…) — dans ces
// cas, le rattrapage se fait depuis l'onglet Dossier du client.
async function provisionClientFolder(clientName: string) {
  try {
    const rootHandle = await getStoredRootFolder()
    if (!rootHandle || !(await hasFolderPermission(rootHandle))) return
    await ensureClientFolder(rootHandle, clientName)
  } catch {
    // Non bloquant — voir commentaire ci-dessus.
  }
}

interface CreateClientDialogProps {
  onClientCreated?: (clientId: string) => void
}

export function CreateClientDialog({ onClientCreated }: CreateClientDialogProps) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [serverError, setServerError] = useState<{ field: string; message: string } | null>(null)
  const queryClient = useQueryClient()
  const router = useRouter()

  const handleSubmit = (data: CreateClientInput) => {
    setServerError(null)

    startTransition(async () => {
      const result = await createClient(data)

      if (result.error) {
        if (result.error.code === 'EMAIL_ALREADY_EXISTS') {
          setServerError({ field: 'email', message: result.error.message })
          return
        }
        showError(result.error.message)
        return
      }

      if (result.data) {
        showSuccess('Client créé avec succès')
        await queryClient.invalidateQueries({ queryKey: ['clients'] })
        void provisionClientFolder(result.data.company || result.data.name)
        setOpen(false)
        onClientCreated?.(result.data.id)
        router.push(`/modules/crm/clients/${result.data.id}`)
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Créer un client</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nouveau client</DialogTitle>
          <DialogDescription>
            Remplissez les informations pour créer un nouveau client.
          </DialogDescription>
        </DialogHeader>
        <ClientForm
          onSubmit={handleSubmit}
          onCancel={() => setOpen(false)}
          isPending={isPending}
          serverError={serverError}
        />
      </DialogContent>
    </Dialog>
  )
}

CreateClientDialog.displayName = 'CreateClientDialog'
