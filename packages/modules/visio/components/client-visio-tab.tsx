'use client'

import { useMemo, useState, useTransition } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  Button,
  CockpitCallout,
  CockpitPanel,
  EmptyRow,
  RowSkeleton,
  showError,
  showSuccess,
} from '@monprojetpro/ui'
import { AlertCircle, Send, Video } from 'lucide-react'
import type { ActionResponse } from '@monprojetpro/types'
import { useMeetings } from '../hooks/use-meetings'
import {
  MeetingRow,
  type VisioRecipient,
  type ResendMeetLinkFn,
  type MeetingActionFn,
  type RescheduleMeetingFn,
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
}) => Promise<ActionResponse<{ meetUri: string; recipientEmail: string }>>

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

  function handleSend(e: React.FormEvent) {
    e.preventDefault()
    startSending(async () => {
      const result = await sendMeetLinkAction({
        clientId,
        title: title.trim(),
        ...(scheduledAt ? { scheduledAt: new Date(scheduledAt).toISOString() } : {}),
        recipientEmail,
        ...(message.trim() ? { message: message.trim() } : {}),
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
            <Button onClick={() => setFormOpen(true)} disabled={noRecipient} className="gap-2">
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
              <Button type="submit" disabled={isSending || !title.trim() || !recipientEmail} className="gap-2">
                <Send className="h-4 w-4" />
                {isSending ? 'Envoi...' : 'Créer et envoyer'}
              </Button>
            </div>
          </form>
        )}
      </CockpitPanel>

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
                  <MeetingRow key={meeting.id} meeting={meeting} recipients={recipients} />
                ))}
              </div>
            )}
          </CockpitPanel>
        </>
      )}
    </div>
  )
}

