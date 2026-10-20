'use client'

import { useMemo, useState, useTransition } from 'react'
import {
  Button,
  CockpitCallout,
  CockpitPanel,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  showError,
  showSuccess,
} from '@monprojetpro/ui'
import { AlertCircle, Send, Video } from 'lucide-react'
import type { ActionResponse } from '@monprojetpro/types'
import type { VisioRecipient } from './meeting-row'

/**
 * Formulaire « Nouvelle visio » — T-061.
 *
 * Extrait de `ClientVisioTab` pour être réutilisable ailleurs qu'au sein d'un
 * dossier client (ex: la page globale `/modules/visio` du Hub, qui n'a pas de
 * client fixe et doit d'abord en faire choisir un). GÉNÉRIQUE PAR CONSTRUCTION
 * (doctrine FORGE) : ne connaît ni Google Meet, ni Gmail, ni le Hub — tout
 * arrive par `sendMeetLinkAction`, même pattern que `createMeetingAction` de
 * `MeetingScheduleDialog`.
 */

export type SendMeetLinkFn = (input: {
  clientId: string
  title: string
  scheduledAt?: string
  recipientEmail: string
  message?: string
  isFree?: boolean
  priceCents?: number
}) => Promise<ActionResponse<{ meetUri: string; recipientEmail: string }>>

export interface NewVisioFormProps {
  clientId: string
  clientName: string
  /** Email principal du client — destinataire par défaut. */
  clientEmail?: string | null
  /** Contacts du carnet, proposés en plus de l'email principal. */
  contacts?: VisioRecipient[]
  /** Vrai tant que les contacts du carnet chargent (évite un faux « aucune adresse »). */
  contactsLoading?: boolean
  /** État réel de la messagerie (T-055) — prévient AVANT que l'email échoue. */
  mailState?: 'never' | 'connected' | 'expired'
  sendMeetLinkAction: SendMeetLinkFn
  /** Défaut gratuit/payant (T-059), déduit du profil client. */
  defaultIsFree?: boolean
  /** Appelé après un envoi réussi — à la charge de l'appelant d'invalider son cache. */
  onCreated?: () => void
}

export function NewVisioForm({
  clientId,
  clientName,
  clientEmail,
  contacts = [],
  contactsLoading = false,
  mailState,
  sendMeetLinkAction,
  defaultIsFree = true,
  onCreated,
}: NewVisioFormProps) {
  const recipients = useMemo<VisioRecipient[]>(() => {
    const seen = new Set<string>()
    const list: VisioRecipient[] = []
    if (clientEmail) {
      seen.add(clientEmail.toLowerCase())
      list.push({ email: clientEmail, label: `${clientName} (${clientEmail})` })
    }
    for (const contact of contacts) {
      const key = contact.email.toLowerCase()
      if (!contact.email || seen.has(key)) continue
      seen.add(key)
      list.push(contact)
    }
    return list
  }, [clientEmail, clientName, contacts])

  const [formOpen, setFormOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [scheduledAt, setScheduledAt] = useState('')
  const [message, setMessage] = useState('')
  const [isSending, startSending] = useTransition()

  const [isFree, setIsFree] = useState(defaultIsFree)
  const [priceInput, setPriceInput] = useState('')

  function openForm() {
    setIsFree(defaultIsFree)
    setPriceInput('')
    setFormOpen(true)
  }

  const [chosenEmail, setChosenEmail] = useState<string | null>(null)
  const recipientEmail =
    chosenEmail && recipients.some((r) => r.email === chosenEmail)
      ? chosenEmail
      : recipients[0]?.email ?? ''

  const priceCents = isFree ? undefined : Math.round(parseFloat(priceInput.replace(',', '.')) * 100)
  const priceInvalid = !isFree && (!priceInput.trim() || !Number.isFinite(priceCents) || (priceCents ?? 0) <= 0)

  function handleSend(e: React.FormEvent) {
    e.preventDefault()
    if (priceInvalid) return
    startSending(async () => {
      const result = await sendMeetLinkAction({
        clientId,
        title: title.trim(),
        ...(scheduledAt ? { scheduledAt: new Date(scheduledAt).toISOString() } : {}),
        recipientEmail,
        ...(message.trim() ? { message: message.trim() } : {}),
        isFree,
        ...(!isFree ? { priceCents } : {}),
      })

      if (result.error) {
        showError(result.error.message)
        if (result.error.code === 'EMAIL_ERROR') onCreated?.()
        return
      }

      showSuccess(`Lien de visio envoyé à ${result.data?.recipientEmail ?? recipientEmail}`)
      setTitle('')
      setScheduledAt('')
      setMessage('')
      setFormOpen(false)
      onCreated?.()
    })
  }

  const noRecipient = recipients.length === 0 && !contactsLoading

  return (
    <CockpitPanel title="Nouvelle visio">
      <div className="flex flex-wrap items-center justify-between gap-3 px-3 py-2">
        <div className="flex flex-col gap-0.5">
          <p className="text-sm font-medium text-foreground">Lancer une visio avec {clientName}</p>
          <p className="text-xs text-muted-foreground">
            Crée une salle Google Meet et envoie le lien par email — le client n&apos;a pas besoin
            d&apos;un espace pour le recevoir.
          </p>
        </div>
        {!formOpen && (
          <Button onClick={openForm} disabled={noRecipient} className="gap-2">
            <Video className="h-4 w-4" />
            Envoyer un lien Google Meet
          </Button>
        )}
      </div>

      {mailState && mailState !== 'connected' && (
        <CockpitCallout tone="amber" icon={AlertCircle} className="mx-3 mb-2">
          {mailState === 'expired' ? (
            <>
              La connexion Gmail a expiré : la salle de visio sera bien créée, mais{' '}
              <strong>l&apos;email ne partira pas</strong>. Reconnecte Gmail depuis l&apos;onglet
              Emails, ou transmets le lien à la main.
            </>
          ) : (
            <>
              Aucun compte Gmail connecté : la salle sera créée, mais{' '}
              <strong>l&apos;email ne partira pas</strong>. Connecte Gmail depuis l&apos;onglet
              Emails, ou transmets le lien à la main.
            </>
          )}
        </CockpitCallout>
      )}

      {noRecipient && (
        <CockpitCallout tone="amber" icon={AlertCircle} className="mx-3 mb-2">
          Ce client n&apos;a aucune adresse email — ni sur sa fiche, ni dans son carnet de
          contacts. Ajoute-en une avant d&apos;envoyer un lien de visio.
        </CockpitCallout>
      )}

      {formOpen && (
        <form onSubmit={handleSend} className="flex flex-col gap-3 px-3 pb-3 pt-1" data-testid="send-meet-form">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="visio-title" className="text-xs font-medium text-muted-foreground">
              Objet de la visio *
            </label>
            <input
              id="visio-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Point d'avancement, présentation du devis..."
              required
              className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-white/30"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="visio-date" className="text-xs font-medium text-muted-foreground">
                Date et heure (facultatif)
              </label>
              <input
                id="visio-date"
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-white/30"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="visio-recipient" className="text-xs font-medium text-muted-foreground">
                Destinataire *
              </label>
              <select
                id="visio-recipient"
                value={recipientEmail}
                onChange={(e) => setChosenEmail(e.target.value)}
                required
                className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-white/30"
              >
                {recipients.map((r) => (
                  <option key={r.email} value={r.email}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* T-059 — gratuit/payant, défaut selon le profil client, modifiable ici */}
          <div className="flex flex-wrap items-end gap-3 rounded-md border border-white/10 bg-white/5 px-3 py-2">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="visio-billing" className="text-xs font-medium text-muted-foreground">
                Facturation
              </label>
              <Select value={isFree ? 'free' : 'paid'} onValueChange={(v) => setIsFree(v === 'free')}>
                <SelectTrigger id="visio-billing" className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">Gratuite</SelectItem>
                  <SelectItem value="paid">Payante</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {!isFree && (
              <div className="flex flex-col gap-1.5">
                <label htmlFor="visio-price" className="text-xs font-medium text-muted-foreground">
                  Montant HT (€) *
                </label>
                <input
                  id="visio-price"
                  type="number"
                  min="0"
                  step="0.01"
                  inputMode="decimal"
                  value={priceInput}
                  onChange={(e) => setPriceInput(e.target.value)}
                  placeholder="45.00"
                  required
                  className="w-28 rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-white/30"
                />
              </div>
            )}
            {!isFree && (
              <p className="pb-2 text-[10px] text-muted-foreground">
                Ajoutée à la dette du client — à facturer plus tard depuis l&apos;onglet Visio de son
                dossier.
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="visio-message" className="text-xs font-medium text-muted-foreground">
              Mot d&apos;accompagnement (facultatif)
            </label>
            <textarea
              id="visio-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              placeholder="Quelques mots avant le lien..."
              className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-white/30"
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={isSending || !title.trim() || !recipientEmail || priceInvalid} className="gap-2">
              <Send className="h-4 w-4" />
              {isSending ? 'Envoi...' : 'Créer et envoyer'}
            </Button>
          </div>
        </form>
      )}
    </CockpitPanel>
  )
}
