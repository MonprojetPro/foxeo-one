'use client'

import { useMemo, useState, useTransition } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Button,
  CockpitCallout,
  CockpitPanel,
  EmptyRow,
  RowSkeleton,
  showError,
  showSuccess,
} from '@monprojetpro/ui'
import { AlertCircle, Receipt } from 'lucide-react'
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
import { NewVisioForm, type SendMeetLinkFn } from './new-visio-form'

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
// Réexporté pour compat (index.ts du module le reprend depuis ce fichier).
export type { SendMeetLinkFn }

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

  return (
    <div className="space-y-4">
      <NewVisioForm
        clientId={clientId}
        clientName={clientName}
        clientEmail={clientEmail}
        contacts={contacts}
        contactsLoading={contactsLoading}
        mailState={mailState}
        sendMeetLinkAction={sendMeetLinkAction}
        defaultIsFree={defaultIsFree}
        onCreated={() => {
          invalidateMeetings()
          void queryClient.invalidateQueries({ queryKey: ['visio-debt', clientId] })
        }}
      />

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

