'use client'

import { useState } from 'react'
import { Mail, Phone, Pencil, Trash2, Plus, AlertTriangle } from 'lucide-react'
import { Button, Skeleton, showSuccess, showError } from '@monprojetpro/ui'
import { useClientContacts, useDeleteClientContact } from '../hooks/use-client-contacts'
import { ClientContactDialog } from './client-contact-dialog'
import type { ClientContact } from '../types/crm.types'

// ============================================================
// ClientContactsTab — T-039
//
// Le carnet : qui fait quoi chez ce client, et surtout A QUI PARTENT LES FACTURES.
//
// ⚠️ L'encart « aucun destinataire » n'est pas decoratif : sans contact coche, les
// factures repartent sur `clients.email`, l'adresse de connexion du client. C'est
// un repli volontaire (jamais d'envoi dans le vide), mais MiKL doit le SAVOIR en
// regardant l'ecran, pas le decouvrir en lisant une facture partie au mauvais
// interlocuteur.
// ============================================================

type ClientContactsTabProps = {
  clientId: string
  /** Adresse de connexion du client — repli si aucun destinataire n'est coche */
  clientEmail: string
}

export function ClientContactsTab({ clientId, clientEmail }: ClientContactsTabProps) {
  const { data: contacts, isLoading, error } = useClientContacts(clientId)
  const deleteContact = useDeleteClientContact(clientId)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<ClientContact | null>(null)
  const [pendingDelete, setPendingDelete] = useState<ClientContact | null>(null)

  const recipients = (contacts ?? []).filter((c) => c.receivesInvoices)
  const named = (contacts ?? []).filter((c) => c.showOnInvoice)

  function openCreate() {
    setEditing(null)
    setDialogOpen(true)
  }

  function openEdit(contact: ClientContact) {
    setEditing(contact)
    setDialogOpen(true)
  }

  async function confirmDelete(contact: ClientContact) {
    try {
      const result = await deleteContact.mutateAsync(contact.id)
      setPendingDelete(null)
      if (result.remainingRecipients === 0) {
        // On ne laisse pas MiKL le decouvrir sur une facture : la suppression est
        // autorisee (une comptable peut partir), mais sa consequence est dite.
        showSuccess(
          `Contact supprimé — plus aucun destinataire de facturation. Les factures repartiront à ${result.fallbackEmail ?? "l'adresse du client"}.`
        )
      } else {
        showSuccess('Contact supprimé')
      }
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Suppression impossible')
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm" role="alert">
        Impossible de charger le carnet de contacts : {error.message}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {/* État des destinataires — en haut, parce que c'est la question qui compte */}
      {recipients.length === 0 ? (
        <div
          className="rounded-md border border-orange-500/40 bg-orange-500/10 px-4 py-3 text-xs text-orange-200/90"
          role="alert"
          data-testid="contacts-no-recipient"
        >
          <strong className="text-orange-400">Aucun contact ne reçoit les factures</strong>
          <p className="mt-1">
            Les factures, devis et relances partiront à <strong>{clientEmail}</strong> — l&apos;adresse
            de connexion du client. Coche « Envoyer la facture à cette adresse » sur le contact qui
            paie pour changer ça.
          </p>
        </div>
      ) : (
        <div
          className="rounded-md border border-cyan-400/25 bg-cyan-400/5 px-4 py-3 text-xs text-cyan-200/90"
          data-testid="contacts-recipients-summary"
        >
          Les factures partent à{' '}
          <strong>{recipients.map((c) => c.email).filter(Boolean).join(', ')}</strong>
          {named.length > 0 && (
            <>
              , à l&apos;attention de <strong>{named.map((c) => c.fullName).join(', ')}</strong>
            </>
          )}
          . Appliqué à chaque émission.
        </div>
      )}

      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">
          {(contacts ?? []).length === 0
            ? 'Aucun contact'
            : `${(contacts ?? []).length} contact${(contacts ?? []).length > 1 ? 's' : ''}`}
        </span>
        <Button size="sm" onClick={openCreate} data-testid="contacts-add">
          <Plus className="h-4 w-4 mr-1" />
          Ajouter un contact
        </Button>
      </div>

      {(contacts ?? []).length === 0 && (
        <div className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
          Note ici les personnes de ce client : l&apos;interlocuteur, la personne qui paie, celle qui
          signe. Tu peux en mettre autant que tu veux.
        </div>
      )}

      <div className="flex flex-col gap-3">
        {(contacts ?? []).map((contact) => (
          <div
            key={contact.id}
            className="rounded-lg border border-border bg-card p-4 flex flex-col gap-2"
            data-testid="contact-card"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-col gap-1 min-w-0">
                <span className="font-medium truncate">{contact.fullName}</span>
                {contact.email ? (
                  <span className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                    <Mail className="h-3 w-3 shrink-0" />
                    {contact.email}
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Phone className="h-3 w-3 shrink-0" />
                    Pas d&apos;adresse e-mail
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => openEdit(contact)}
                  aria-label={`Modifier ${contact.fullName}`}
                  className="rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-foreground"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setPendingDelete(contact)}
                  aria-label={`Supprimer ${contact.fullName}`}
                  className="rounded-md p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            {(contact.receivesInvoices || contact.showOnInvoice) && (
              <div className="flex flex-wrap items-center gap-2">
                {contact.receivesInvoices && (
                  <span className="rounded-md bg-cyan-400/15 px-2 py-0.5 text-xs text-cyan-300">
                    Reçoit les factures
                  </span>
                )}
                {contact.showOnInvoice && (
                  <span className="rounded-md bg-emerald-400/15 px-2 py-0.5 text-xs text-emerald-300">
                    Nom imprimé sur la facture
                  </span>
                )}
              </div>
            )}

            {contact.note && (
              <p className="text-xs text-muted-foreground whitespace-pre-wrap">{contact.note}</p>
            )}

            {/* Confirmation en ligne plutôt qu'une seconde pop-up : empiler deux
                portails Radix est précisément ce qui décroche les dialogues. */}
            {pendingDelete?.id === contact.id && (
              <div
                className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 flex flex-col gap-2"
                role="alert"
              >
                <span className="text-xs flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-destructive" />
                  Supprimer « {contact.fullName} » du carnet ?
                  {contact.receivesInvoices && recipients.length === 1 && (
                    <strong> C&apos;est le seul destinataire des factures : elles repartiront à {clientEmail}.</strong>
                  )}
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => confirmDelete(contact)}
                    disabled={deleteContact.isPending}
                    data-testid="contact-delete-confirm"
                  >
                    {deleteContact.isPending ? '…' : 'Supprimer'}
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => setPendingDelete(null)}>
                    Annuler
                  </Button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <ClientContactDialog
        clientId={clientId}
        contact={editing}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </div>
  )
}
