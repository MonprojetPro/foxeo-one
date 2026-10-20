'use client'

import { useMemo, useState, useTransition } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Button,
  CockpitCallout,
  CockpitPanel,
  EmptyRow,
  RowSkeleton,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  showError,
  showSuccess,
} from '@monprojetpro/ui'
import { AlertCircle, Receipt, Send, Video } from 'lucide-react'
import type { ActionResponse } from '@monprojetpro/types'
import { useMeetings } from '../hooks/use-meetings'
import {
  MeetingRow,
  type VisioRecipient,
  type ResendMeetLinkFn,
  type MeetingActionFn,
  type RescheduleMeetingFn,
  type SyncMeetingResultsFn,
} from './meeting-row'

/**
 * Onglet « Visio » du dossier client (Hub).
 *
 * 🔑 GÉNÉRIQUE PAR CONSTRUCTION (doctrine FORGE) : ce composant ne connaît ni
 * Google Meet, ni Gmail, ni le Hub. L'envoi lui arrive par la prop
 * `sendMeetLinkAction` — même pattern que `createMeetingAction` de
 * `MeetingScheduleDialog`. Il est donc réutilisable par toute app qui sait
 * créer un lien de visio, quel que soit le fournisseur.
 *
 * Le destinataire par défaut est l'email du client ; les contacts du carnet
 * (T-039) sont proposés en complément. On n'utilise PAS la case « reçoit les
 * factures » pour présélectionner : elle désigne la comptabilité, pas
 * l'interlocuteur d'une visio.
 */

export type { VisioRecipient }

export type SendMeetLinkFn = (input: {
  clientId: string
  title: string
  scheduledAt?: string
  recipientEmail: string
  message?: string
  isFree?: boolean
  priceCents?: number
}) => Promise<ActionResponse<{ meetUri: string; recipientEmail: string }>>

export interface VisioDebtItem {
  id: string
  label: string
  amountCents: number
  createdAt: string
}

export type GetVisioDebtFn = (clientId: string) => Promise<ActionResponse<VisioDebtItem[]>>
export type InvoiceVisioDebtFn = (
  clientId: string,
  billableItemIds: string[]
) => Promise<ActionResponse<{ pennylaneInvoiceId: string; invoicedCount: number; totalCents: number }>>

interface ClientVisioTabProps {
  clientId: string
  clientName: string
  /** Email principal du client — destinataire par défaut. */
  clientEmail?: string | null
  /** Contacts du carnet, proposés en plus de l'email principal. */
  contacts?: VisioRecipient[]
  /**
   * Vrai tant que les contacts du carnet chargent. Sans cette information, un
   * client dont la fiche n'a pas d'email afficherait « aucune adresse email »
   * pendant le chargement — un message FAUX, et décourageant, juste avant que
   * les contacts n'arrivent.
   */
  contactsLoading?: boolean
  /**
   * État réel de la messagerie (T-055). `expired` → on prévient AVANT que MiKL
   * ne crée un rendez-vous dont l'email ne partira pas. C'est exactement ce qui
   * s'est produit le 15-10 : la salle a été créée, l'email a échoué, et MiKL
   * ne l'a appris qu'après coup.
   */
  mailState?: 'never' | 'connected' | 'expired'
  sendMeetLinkAction: SendMeetLinkFn
  /** Renvoyer le lien EXISTANT — jamais en recréer un (il invaliderait l'ancien). */
  onResend?: ResendMeetLinkFn
  onCancel?: MeetingActionFn
  onReschedule?: RescheduleMeetingFn
  /**
   * « Récupérer maintenant » (T-050) — relance la recherche du compte rendu
   * chez Google pour une visio passée. Présent ICI autant que sur la page
   * détail du Hub : une action qui n'existe que sur un seul des deux écrans
   * est une action introuvable (leçon « fiche client = 2 surfaces d'actions »).
   */
  onSyncResults?: SyncMeetingResultsFn
  /**
   * Défaut gratuit/payant à la création (T-059) — déduit du profil client
   * (one_plus = gratuit, ponctuel = payant). MiKL peut toujours le changer.
   */
  defaultIsFree?: boolean
  /** Dette visio de ce client (T-059) — séances payantes non encore facturées. */
  getVisioDebtAction?: GetVisioDebtFn
  invoiceVisioDebtAction?: InvoiceVisioDebtFn
}

export function ClientVisioTab({
  clientId,
  clientName,
  clientEmail,
  contacts = [],
  contactsLoading = false,
  mailState,
  sendMeetLinkAction,
  onResend,
  onCancel,
  onReschedule,
  onSyncResults,
  defaultIsFree = true,
  getVisioDebtAction,
  invoiceVisioDebtAction,
}: ClientVisioTabProps) {
  const queryClient = useQueryClient()
  const { data: meetings, isPending, error } = useMeetings({ clientId })

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

  // T-059 — gratuite/payante, initialisé sur le défaut au moment où le
  // formulaire s'ouvre (pas à l'état initial du composant — même piège que
  // le destinataire : le défaut peut dépendre d'une requête pas encore arrivée).
  const [isFree, setIsFree] = useState(defaultIsFree)
  const [priceInput, setPriceInput] = useState('')

  function openForm() {
    setIsFree(defaultIsFree)
    setPriceInput('')
    setFormOpen(true)
  }

  // T-059 — dette visio de ce client : séances payantes non facturées.
  const { data: debtItems, isPending: debtPending } = useQuery({
    queryKey: ['visio-debt', clientId],
    queryFn: async () => {
      if (!getVisioDebtAction) return []
      const res = await getVisioDebtAction(clientId)
      return res.data ?? []
    },
    enabled: Boolean(getVisioDebtAction),
    staleTime: 30 * 1000,
  })

  const [selectedDebtIds, setSelectedDebtIds] = useState<Set<string>>(new Set())
  const [isInvoicing, startInvoicing] = useTransition()

  function toggleDebtSelection(id: string) {
    setSelectedDebtIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function handleInvoiceSelection() {
    if (!invoiceVisioDebtAction || selectedDebtIds.size === 0) return
    startInvoicing(async () => {
      const result = await invoiceVisioDebtAction(clientId, Array.from(selectedDebtIds))
      if (result.error) {
        showError(result.error.message)
        return
      }
      showSuccess(
        `Facture créée en brouillon (${result.data?.invoicedCount} séance${(result.data?.invoicedCount ?? 0) > 1 ? 's' : ''}) — à vérifier dans Facturation avant envoi.`
      )
      setSelectedDebtIds(new Set())
      void queryClient.invalidateQueries({ queryKey: ['visio-debt', clientId] })
    })
  }

  /**
   * ⚠️ LE DESTINATAIRE EST DÉRIVÉ, JAMAIS FIGÉ DANS L'ÉTAT INITIAL.
   * Un `useState(recipients[0]?.email ?? '')` capture la liste au PREMIER
   * rendu — or les contacts du carnet arrivent d'une requête, donc plus tard.
   * Pour un client dont la fiche n'a pas d'email, l'état restait alors
   * définitivement vide : le navigateur affichait pourtant la première option
   * du menu, et le bouton d'envoi restait grisé sans que rien ne l'explique.
   * On ne garde donc en état que le choix EXPLICITE de MiKL, et on retombe sur
   * le premier destinataire disponible le reste du temps.
   */
  const [chosenEmail, setChosenEmail] = useState<string | null>(null)
  const recipientEmail =
    chosenEmail && recipients.some((r) => r.email === chosenEmail)
      ? chosenEmail
      : recipients[0]?.email ?? ''

  const upcoming = useMemo(
    () =>
      (meetings ?? [])
        .filter((m) => m.status === 'scheduled' || m.status === 'in_progress')
        .sort((a, b) => (a.scheduledAt ?? '').localeCompare(b.scheduledAt ?? '')),
    [meetings]
  )

  const past = useMemo(
    () =>
      (meetings ?? [])
        .filter((m) => m.status === 'completed' || m.status === 'cancelled')
        .sort((a, b) => (b.endedAt ?? b.scheduledAt ?? '').localeCompare(a.endedAt ?? a.scheduledAt ?? '')),
    [meetings]
  )

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
        // Un échec d'EMAIL laisse le rendez-vous en place : on rafraîchit pour
        // qu'il apparaisse malgré tout dans l'historique, avec son lien.
        if (result.error.code === 'EMAIL_ERROR') invalidateMeetings()
        return
      }

      showSuccess(`Lien de visio envoyé à ${result.data?.recipientEmail ?? recipientEmail}`)
      setTitle('')
      setScheduledAt('')
      setMessage('')
      setFormOpen(false)
      invalidateMeetings()
      if (!isFree) void queryClient.invalidateQueries({ queryKey: ['visio-debt', clientId] })
    })
  }

  /**
   * On invalide TOUTES les vues des meetings, pas seulement celle de ce client :
   * la page globale `/modules/visio` du Hub lit la même donnée sous une autre
   * clé de cache (`['meetings','all','all']`). Ne rafraîchir que la vue courante
   * laisserait l'autre écran afficher un état périmé — c'est le piège du
   * consumer oublié, déjà payé plusieurs fois.
   */
  function invalidateMeetings() {
    void queryClient.invalidateQueries({ queryKey: ['meetings'] })
  }

  // Tant que le carnet charge, on ne PRÉTEND PAS qu'il n'y a aucune adresse.
  const noRecipient = recipients.length === 0 && !contactsLoading

  return (
    <div className="space-y-4">
      {/* Envoyer un lien */}
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
                {/* `<select>` natif abandonné (T-059) : son menu déroulant
                    rend en style navigateur par défaut (fond blanc, bleu),
                    jamais thémé par le CSS de la page — Select Radix déjà
                    utilisé ailleurs dans l'app (ex: ElioModelSelector) rend
                    un menu réellement dans le thème sombre. */}
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
                  Ajoutée à la dette du client — à facturer plus tard depuis ce même onglet.
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

      {/* Dette visio (T-059) — séances payantes non encore facturées */}
      {getVisioDebtAction && !debtPending && (debtItems?.length ?? 0) > 0 && (
        <CockpitPanel title="Dette visio">
          <div className="flex flex-col gap-2 px-3 py-2">
            <p className="text-xs text-muted-foreground">
              {debtItems!.length} séance{debtItems!.length > 1 ? 's' : ''} payante
              {debtItems!.length > 1 ? 's' : ''} non facturée{debtItems!.length > 1 ? 's' : ''} — coche
              celles à regrouper dans une facture.
            </p>
            <div className="flex flex-col gap-1.5">
              {debtItems!.map((item) => (
                <label
                  key={item.id}
                  className="flex items-center justify-between gap-3 rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm"
                >
                  <span className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selectedDebtIds.has(item.id)}
                      onChange={() => toggleDebtSelection(item.id)}
                      className="h-4 w-4"
                    />
                    {item.label}
                  </span>
                  <span className="font-medium text-foreground">
                    {(item.amountCents / 100).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                  </span>
                </label>
              ))}
            </div>
            <div className="flex items-center justify-between pt-1">
              <p className="text-xs text-muted-foreground">
                {selectedDebtIds.size > 0
                  ? `Total sélectionné : ${(
                      debtItems!
                        .filter((i) => selectedDebtIds.has(i.id))
                        .reduce((sum, i) => sum + i.amountCents, 0) / 100
                    ).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}`
                  : 'Aucune séance sélectionnée'}
              </p>
              <Button
                onClick={handleInvoiceSelection}
                disabled={selectedDebtIds.size === 0 || isInvoicing || !invoiceVisioDebtAction}
                className="gap-2"
              >
                <Receipt className="h-4 w-4" />
                {isInvoicing ? 'Création...' : 'Facturer la sélection'}
              </Button>
            </div>
          </div>
        </CockpitPanel>
      )}

      {/* Historique des appels */}
      {isPending ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <RowSkeleton key={i} className="h-16" />
          ))}
        </div>
      ) : error ? (
        <CockpitCallout tone="red" icon={AlertCircle}>
          Impossible de charger les visios de ce client.
        </CockpitCallout>
      ) : (
        <>
          {upcoming.length > 0 && (
            <CockpitPanel title="À venir">
              <div className="flex flex-col gap-2">
                {upcoming.map((meeting) => (
                  <MeetingRow
                    key={meeting.id}
                    meeting={meeting}
                    recipients={recipients}
                    onResend={onResend}
                    onCancel={onCancel}
                    onReschedule={onReschedule}
                    /**
                     * ⚠️ OUI, AUSSI DANS « À VENIR ». Une visio qui vient
                     * d'avoir lieu reste listée ici tant que la synchro n'a
                     * pas lu son horaire de fin chez Google — c'est
                     * précisément celle qu'il faut pouvoir récupérer. Ne
                     * passer cette action qu'à l'historique la rend
                     * introuvable au seul moment où elle sert.
                     */
                    onSyncResults={onSyncResults}
                    onChanged={invalidateMeetings}
                  />
                ))}
              </div>
            </CockpitPanel>
          )}

          <CockpitPanel title="Historique des appels">
            {past.length === 0 ? (
              <EmptyRow>
                Aucune visio passée avec ce client. L&apos;enregistrement et la transcription
                apparaîtront ici après le premier appel.
              </EmptyRow>
            ) : (
              <div className="flex flex-col gap-2">
                {past.map((meeting) => (
                  <MeetingRow
                    key={meeting.id}
                    meeting={meeting}
                    recipients={recipients}
                    onSyncResults={onSyncResults}
                    onChanged={invalidateMeetings}
                  />
                ))}
              </div>
            )}
          </CockpitPanel>
        </>
      )}
    </div>
  )
}

