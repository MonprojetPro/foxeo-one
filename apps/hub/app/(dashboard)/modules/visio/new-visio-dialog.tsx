'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@monprojetpro/ui'
import { NewVisioForm, type VisioRecipient } from '@monprojetpro/module-visio'
import { getClients, useClientContacts } from '@monprojetpro/modules-crm'
import { getGmailStatus } from '@monprojetpro/modules-email'
import { sendMeetLink } from '../../../../actions/send-meet-link'
import { getClientVisioBillingDefault } from '../../../../actions/visio-billing'

/**
 * Dialogue « Nouveau meeting » de la page globale `/modules/visio` — T-061.
 *
 * Remplace `MeetingScheduleDialog` (formulaire brut, sans salle Google Meet ni
 * email) par le MÊME chemin de création que l'onglet Visio du dossier client
 * (T-051/T-059) : `NewVisioForm` + `sendMeetLink`, réel lien Google Meet, email
 * envoyé, toggle gratuit/payant. La seule différence ici : pas de client fixe,
 * donc un sélecteur de client EN PLUS, avant le formulaire.
 */

interface NewVisioDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function NewVisioDialog({ open, onOpenChange, onSuccess }: NewVisioDialogProps) {
  const [clientId, setClientId] = useState<string | null>(null)

  const { data: clients, isPending: clientsLoading } = useQuery({
    queryKey: ['clients', 'visio-picker'],
    queryFn: async () => {
      const res = await getClients()
      return res.data ?? []
    },
    enabled: open,
    staleTime: 60 * 1000,
  })

  const selectedClient = clients?.find((c) => c.id === clientId) ?? null

  const { data: contactRows, isLoading: contactsLoading } = useClientContacts(clientId ?? '')

  const { data: gmailStatus } = useQuery({
    queryKey: ['gmail-status'],
    queryFn: async () => {
      const r = await getGmailStatus()
      return r.data ?? null
    },
    enabled: open,
    staleTime: 2 * 60 * 1000,
  })

  const { data: billingDefault } = useQuery({
    queryKey: ['visio-billing-default', clientId],
    queryFn: async () => {
      if (!clientId) return { isFree: true }
      const r = await getClientVisioBillingDefault(clientId)
      return r.data ?? { isFree: true }
    },
    enabled: Boolean(clientId),
    staleTime: 5 * 60 * 1000,
  })

  const contacts: VisioRecipient[] = (contactRows ?? [])
    .filter((c): c is typeof c & { email: string } => Boolean(c.email))
    .map((c) => ({ email: c.email, label: `${c.fullName} (${c.email})` }))

  function handleClose(next: boolean) {
    if (!next) setClientId(null)
    onOpenChange(next)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Nouveau meeting</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-1.5 pb-2">
          <label htmlFor="visio-client-picker" className="text-xs font-medium text-muted-foreground">
            Client *
          </label>
          <Select
            value={clientId ?? undefined}
            onValueChange={(v) => setClientId(v)}
            disabled={clientsLoading}
          >
            <SelectTrigger id="visio-client-picker">
              <SelectValue placeholder={clientsLoading ? 'Chargement…' : 'Choisir un client'} />
            </SelectTrigger>
            <SelectContent>
              {(clients ?? []).map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                  {c.company ? ` — ${c.company}` : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedClient && (
          <NewVisioForm
            clientId={selectedClient.id}
            clientName={selectedClient.name}
            clientEmail={selectedClient.email ?? null}
            contacts={contacts}
            contactsLoading={contactsLoading}
            mailState={gmailStatus?.state}
            sendMeetLinkAction={sendMeetLink}
            defaultIsFree={billingDefault?.isFree ?? true}
            onCreated={() => {
              onSuccess?.()
              handleClose(false)
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}
