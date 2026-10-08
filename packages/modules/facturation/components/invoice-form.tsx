'use client'

import { useForm, useFieldArray, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { showSuccess, showError } from '@monprojetpro/ui'
import { createInvoice } from '../actions/create-invoice'
import { CommercialGestureFields } from './commercial-gesture-fields'
import { DEFAULT_GESTURE_LABEL } from '../utils/commercial-gesture'
import {
  findZeroAmountLines,
  describeZeroAmountLine,
  type ZeroAmountLine,
} from '../utils/zero-amount-lines'
import type { ClientWithPennylane } from '../types/billing.types'

// ============================================================
// InvoiceForm — T-036
//
// Emission d une facture DIRECTE, pour une prestation deja effectuee.
// Jusqu ici le seul chemin etait de fabriquer un devis puis de le convertir,
// ce qui laissait un devis fantome dans la comptabilite.
// ============================================================

// ── Schema Zod ────────────────────────────────────────────────────────────────

const lineItemSchema = z.object({
  label: z.string().min(1, 'Désignation requise'),
  description: z.string().nullable().optional(),
  quantity: z.coerce.number().min(0.01, 'Quantité > 0'),
  unitPrice: z.coerce.number().min(0, 'Prix >= 0'),
  vatRate: z.string().default('FR_200'),
  unit: z.string().default('u'),
  /** T-037 — prestation offerte : son prix catalogue reste imprimé */
  offered: z.boolean().default(false),
})

const invoiceFormSchema = z
  .object({
    clientId: z.string().uuid('Client requis'),
    lineItems: z.array(lineItemSchema).min(1, 'Au moins une ligne requise'),
    date: z.string().min(1, "Date d'émission requise"),
    deadline: z.string().min(1, 'Échéance requise'),
    publicNotes: z.string().nullable().optional(),
    /** T-037 — prix final HT voulu. Chaîne vide = aucune remise globale. */
    targetTotalHt: z.string().optional(),
    /** T-037 — libellé du geste commercial, vide = défaut serveur */
    gestureLabel: z.string().optional(),
  })
  // Les deux dates sont au format AAAA-MM-JJ : la comparaison de chaines suffit
  // et evite un fuseau horaire parasite.
  .refine((v) => v.deadline >= v.date, {
    message: "L'échéance ne peut pas précéder la date d'émission",
    path: ['deadline'],
  })

type InvoiceFormValues = z.infer<typeof invoiceFormSchema>

// ── TVA ───────────────────────────────────────────────────────────────────────

const VAT_RATES: Record<string, number> = {
  FR_200: 0.20,
  FR_100: 0.10,
  FR_55: 0.055,
  FR_21: 0.021,
  FR_0: 0,
}

function vatRateToMultiplier(rate: string): number {
  return VAT_RATES[rate] ?? 0.20
}

function todayIso(): string {
  return new Date().toISOString().split('T')[0]
}

function isoPlusDays(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

// ── Props ─────────────────────────────────────────────────────────────────────

type InvoiceFormProps = {
  clients: ClientWithPennylane[]
  onSuccess?: () => void
}

// ── Component ─────────────────────────────────────────────────────────────────

export function InvoiceForm({ clients, onSuccess }: InvoiceFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  // T-043 — l avertissement retient SEULEMENT l intention (emettre, avec ou sans
  // envoi). La liste des lignes fautives est recalculee a chaque rendu depuis le
  // formulaire : un etat figé afficherait des numeros de ligne perimes des que
  // MiKL corrige ou supprime quelque chose, et « Retirer ces lignes » retirerait
  // alors la mauvaise.
  const [zeroWarningIntent, setZeroWarningIntent] = useState<{ sendNow: boolean } | null>(null)
  const queryClient = useQueryClient()

  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<InvoiceFormValues>({
    resolver: zodResolver(invoiceFormSchema),
    defaultValues: {
      clientId: '',
      lineItems: [
        { label: '', description: null, quantity: 1, unitPrice: 0, vatRate: 'FR_200', unit: 'u', offered: false },
      ],
      date: todayIso(),
      deadline: isoPlusDays(30),
      publicNotes: null,
      targetTotalHt: '',
      gestureLabel: '',
    },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'lineItems' })
  const watchedItems = useWatch({ control, name: 'lineItems' })
  const watchedTarget = useWatch({ control, name: 'targetTotalHt' }) ?? ''
  const watchedGestureLabel = useWatch({ control, name: 'gestureLabel' }) ?? ''

  // Totaux au TARIF CATALOGUE — ce qui est saisi, gestes non deduits
  const catalogTotalHt = (watchedItems ?? []).reduce((sum, item) => {
    return sum + (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0)
  }, 0)

  const offeredTotalHt = (watchedItems ?? []).reduce((sum, item) => {
    if (item.offered !== true) return sum
    return sum + (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0)
  }, 0)

  const parsedTarget = watchedTarget.trim() === '' ? null : Number(watchedTarget)
  const targetIsUsable = parsedTarget !== null && Number.isFinite(parsedTarget) && parsedTarget >= 0

  // Total HT reellement du, apres gestes — c est lui qui porte la TVA
  const afterOffersHt = catalogTotalHt - offeredTotalHt
  const totalHt = targetIsUsable ? Math.min(parsedTarget, afterOffersHt) : afterOffersHt

  // TVA calculee LIGNE PAR LIGNE sur les prestations payantes — appliquer un
  // taux unique au total serait faux des que les lignes portent des taux
  // differents, ce que la brique autorise tant qu il n y a pas de remise
  // globale. Une ligne offerte et sa contre-ligne s annulent, taux compris.
  const tvaOnPaidLines = (watchedItems ?? []).reduce((sum, item) => {
    if (item.offered === true) return sum
    const lineHt = (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0)
    return sum + lineHt * vatRateToMultiplier(item.vatRate ?? 'FR_200')
  }, 0)

  // La remise globale porte un taux unique (la brique refuse les taux melanges
  // dans ce cas), donc on retire sa TVA a ce meme taux.
  const discountHt = afterOffersHt - totalHt
  const discountRate =
    (watchedItems ?? []).find((i) => i.offered !== true && Number(i.unitPrice) > 0)?.vatRate ??
    (watchedItems ?? [])[0]?.vatRate ??
    'FR_200'

  const totalTva = tvaOnPaidLines - discountHt * vatRateToMultiplier(discountRate)
  const totalTtc = totalHt + totalTva

  // T-043 — etat VIVANT des lignes a 0,00 €. Le panneau se vide de lui-meme des
  // que MiKL saisit un prix : un avertissement qui survit a sa propre correction
  // apprend a l ignorer.
  const liveZeroLines: ZeroAmountLine[] = findZeroAmountLines(watchedItems)
  const showZeroWarning = zeroWarningIntent !== null && liveZeroLines.length > 0

  async function onSubmit(values: InvoiceFormValues, sendNow: boolean, allowZeroLines = false) {
    const lineItems = values.lineItems.map((item) => ({
      label: item.label,
      description: item.description ?? null,
      quantity: Number(item.quantity),
      unitPrice: Number(item.unitPrice),
      vatRate: item.vatRate,
      unit: item.unit,
      total: Number(item.quantity) * Number(item.unitPrice),
      offered: item.offered === true,
    }))

    // T-043 — dernier moment utile pour attraper une ligne restee en trop : une
    // fois chez Pennylane, le document est definitif. On n emet pas encore, on
    // demande. Les contre-lignes « Offert » sont negatives, donc ignorees.
    if (!allowZeroLines && findZeroAmountLines(lineItems).length > 0) {
      setZeroWarningIntent({ sendNow })
      return
    }
    setZeroWarningIntent(null)

    setIsSubmitting(true)
    try {
      const rawTarget = values.targetTotalHt?.trim() ?? ''
      const target = rawTarget === '' ? null : Number(rawTarget)

      const result = await createInvoice(values.clientId, lineItems, {
        sendNow,
        publicNotes: values.publicNotes ?? null,
        date: values.date,
        deadline: values.deadline,
        targetTotalHt: target,
        gestureLabel: values.gestureLabel?.trim() || null,
        allowZeroAmountLines: allowZeroLines,
      })

      if (result.error) {
        showError(result.error.message)
        return
      }

      const clientName = clients.find((c) => c.id === values.clientId)?.name ?? 'le client'
      const number = result.data?.invoiceNumber ?? ''
      const numberSuffix = number ? ` ${number}` : ''

      if (sendNow && result.data?.emailSent === false) {
        // L envoi a echoue mais la facture EXISTE — ne jamais annoncer un envoi
        // qui n a pas eu lieu.
        showError(
          // T-044 — ce message renvoyait vers un bouton « Relancer » QUI N EXISTAIT
          // PAS : j'avais ecrit une consigne vers un ecran sans le verifier. Le
          // bouton existe depuis T-044, et le message le nomme exactement.
          `Facture${numberSuffix} créée, mais l'email n'est pas parti. Utilise « Envoyer au client » depuis la liste des factures.`
        )
      } else if (sendNow) {
        // T-039 — on nomme les ADRESSES reellement servies. « Envoyée à CSE
        // Habitat 77 » laissait croire que la bonne personne l'avait recue ;
        // c'est precisement le malentendu que le carnet existe pour lever.
        const sentTo = result.data?.sentTo ?? []
        const where = sentTo.length > 0 ? sentTo.join(', ') : clientName
        showSuccess(
          result.data?.usedFallbackRecipient === true && sentTo.length > 0
            ? `Facture${numberSuffix} envoyée à ${where} — aucun contact « reçoit les factures » n'est coché pour ce client.`
            : `Facture${numberSuffix} envoyée à ${where}`
        )
      } else {
        showSuccess(`Facture${numberSuffix} créée sans envoi`)
      }

      await queryClient.invalidateQueries({ queryKey: ['billing'] })
      reset()
      onSuccess?.()
    } finally {
      setIsSubmitting(false)
    }
  }

  // T-043 — « Retirer ces lignes ». On ne REEMET PAS automatiquement derriere :
  // retirer une ligne change le total HT et la TVA, et MiKL doit les revoir
  // avant d emettre un document definitif.
  function handleRemoveZeroLines() {
    // Indexes relus a l instant du clic, jamais ceux captures a l affichage.
    const indexes = liveZeroLines.map((l) => l.index)
    if (indexes.length === 0) return
    const removesEverything = indexes.length >= (watchedItems?.length ?? fields.length)
    remove(indexes)
    if (removesEverything) {
      append({ label: '', description: null, quantity: 1, unitPrice: 0, vatRate: 'FR_200', unit: 'u', offered: false })
    }
    setZeroWarningIntent(null)
    showSuccess('Lignes retirées — vérifie le total, puis émets.')
  }

  // « Les garder, c est voulu ». On repasse par handleSubmit pour relire les
  // valeurs FRAICHES du formulaire : MiKL a pu corriger une ligne entre-temps.
  function handleKeepZeroLines() {
    const sendNow = zeroWarningIntent?.sendNow ?? false
    setZeroWarningIntent(null)
    void handleSubmit((values) => onSubmit(values, sendNow, true))()
  }

  return (
    <form className="flex flex-col gap-6" onSubmit={(e) => e.preventDefault()}>
      <div className="rounded-md border border-cyan-400/25 bg-cyan-400/5 px-4 py-3 text-xs text-cyan-200/90">
        Facture directe, pour une prestation <strong>déjà effectuée</strong>. Pas de devis créé.
        Pennylane attribue le numéro et il est définitif — une facture ne se modifie pas, elle
        s&apos;annule par un avoir.
      </div>

      {/* Client */}
      <div className="flex flex-col gap-1">
        <label htmlFor="invoice-clientId" className="text-sm font-medium">
          Client
        </label>
        <select
          id="invoice-clientId"
          {...register('clientId')}
          data-testid="invoice-client-select"
          className="rounded-md border border-border bg-background px-3 py-2 text-sm"
        >
          <option value="">Sélectionner un client...</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.company ?? c.name} ({c.email})
            </option>
          ))}
        </select>
        {errors.clientId && (
          <span className="text-xs text-destructive">{errors.clientId.message}</span>
        )}
        {clients.length === 0 && (
          <span className="text-xs text-muted-foreground">
            Aucun client actif. Crée d&apos;abord la fiche client dans le CRM.
          </span>
        )}
      </div>

      {/* Dates */}
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="invoice-date" className="text-sm font-medium">
            Date d&apos;émission
          </label>
          <input
            id="invoice-date"
            type="date"
            {...register('date')}
            className="rounded-md border border-border bg-background px-3 py-2 text-sm"
          />
          <span className="text-xs text-muted-foreground">
            Pennylane numérote dans l&apos;ordre : une date antérieure à ta dernière facture peut
            être refusée.
          </span>
          {errors.date && <span className="text-xs text-destructive">{errors.date.message}</span>}
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="invoice-deadline" className="text-sm font-medium">
            Échéance de paiement
          </label>
          <input
            id="invoice-deadline"
            type="date"
            {...register('deadline')}
            className="rounded-md border border-border bg-background px-3 py-2 text-sm"
          />
          {errors.deadline && (
            <span className="text-xs text-destructive">{errors.deadline.message}</span>
          )}
        </div>
      </div>

      {/* Lignes */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Lignes de la facture</span>
          <button
            type="button"
            onClick={() => append({ label: '', description: null, quantity: 1, unitPrice: 0, vatRate: 'FR_200', unit: 'u', offered: false })}
            className="rounded-md bg-primary px-3 py-1.5 text-xs text-primary-foreground"
            aria-label="Ajouter une ligne"
          >
            + Ajouter une ligne
          </button>
        </div>

        {fields.map((field, index) => (
          <div key={field.id} className="rounded-lg border border-border p-4 flex flex-col gap-3">
            {/* Chaque label porte un htmlFor : sans lui, un lecteur d ecran ne sait
                pas a quel champ appartient « Qté » ou « TVA » sur une ligne donnee. */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label htmlFor={`invoice-line-${index}-label`} className="text-xs text-muted-foreground">
                  Désignation
                </label>
                <input
                  id={`invoice-line-${index}-label`}
                  {...register(`lineItems.${index}.label`)}
                  placeholder="Prestation réalisée"
                  className="rounded-md border border-border bg-background px-3 py-2 text-sm"
                />
                {errors.lineItems?.[index]?.label && (
                  <span className="text-xs text-destructive">
                    {errors.lineItems[index]?.label?.message}
                  </span>
                )}
              </div>

              <div className="flex flex-col gap-1">
                <label htmlFor={`invoice-line-${index}-description`} className="text-xs text-muted-foreground">
                  Description
                </label>
                <input
                  id={`invoice-line-${index}-description`}
                  {...register(`lineItems.${index}.description`)}
                  placeholder="Description (optionnel)"
                  className="rounded-md border border-border bg-background px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-4 gap-3">
              <div className="flex flex-col gap-1">
                <label htmlFor={`invoice-line-${index}-quantity`} className="text-xs text-muted-foreground">
                  Qté
                </label>
                <input
                  id={`invoice-line-${index}-quantity`}
                  {...register(`lineItems.${index}.quantity`)}
                  type="number"
                  min="0.01"
                  step="0.01"
                  className="rounded-md border border-border bg-background px-3 py-2 text-sm"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label htmlFor={`invoice-line-${index}-unitPrice`} className="text-xs text-muted-foreground">
                  Prix unitaire HT (€)
                </label>
                <input
                  id={`invoice-line-${index}-unitPrice`}
                  {...register(`lineItems.${index}.unitPrice`)}
                  type="number"
                  min="0"
                  step="0.01"
                  className="rounded-md border border-border bg-background px-3 py-2 text-sm"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label htmlFor={`invoice-line-${index}-vatRate`} className="text-xs text-muted-foreground">
                  TVA
                </label>
                <select
                  id={`invoice-line-${index}-vatRate`}
                  {...register(`lineItems.${index}.vatRate`)}
                  className="rounded-md border border-border bg-background px-3 py-2 text-sm"
                >
                  <option value="FR_200">20% (standard)</option>
                  <option value="FR_100">10%</option>
                  <option value="FR_55">5,5%</option>
                  <option value="FR_21">2,1%</option>
                  <option value="FR_0">0% (exonéré)</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label htmlFor={`invoice-line-${index}-unit`} className="text-xs text-muted-foreground">
                  Unité
                </label>
                <input
                  id={`invoice-line-${index}-unit`}
                  {...register(`lineItems.${index}.unit`)}
                  placeholder="u"
                  className="rounded-md border border-border bg-background px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              {/* T-037 — offrir CETTE prestation. Son prix catalogue reste
                  imprimé ; une contre-ligne « Offert — … » le ramène à zéro. */}
              <label
                htmlFor={`invoice-line-${index}-offered`}
                className="flex items-center gap-2 text-xs text-muted-foreground"
              >
                <input
                  id={`invoice-line-${index}-offered`}
                  type="checkbox"
                  {...register(`lineItems.${index}.offered`)}
                  data-testid={`invoice-line-${index}-offered`}
                  className="h-4 w-4 rounded border-border bg-background accent-green-500"
                />
                Offrir cette prestation
                {watchedItems?.[index]?.offered === true && (
                  <span className="rounded-md bg-green-500/15 px-2 py-0.5 text-green-400">
                    Offert — le prix reste affiché
                  </span>
                )}
              </label>

              {fields.length > 1 && (
                <button
                  type="button"
                  onClick={() => remove(index)}
                  className="text-xs text-destructive hover:underline"
                >
                  Supprimer la ligne
                </button>
              )}
            </div>
          </div>
        ))}

        {errors.lineItems?.root && (
          <span className="text-xs text-destructive">{errors.lineItems.root.message}</span>
        )}
      </div>

      {/* T-037 — geste commercial, partagé avec le formulaire de devis */}
      <CommercialGestureFields
        catalogTotalHt={catalogTotalHt}
        offeredTotalHt={offeredTotalHt}
        targetValue={watchedTarget}
        onTargetChange={(v) => setValue('targetTotalHt', v, { shouldValidate: false })}
        labelValue={watchedGestureLabel}
        onLabelChange={(v) => setValue('gestureLabel', v, { shouldValidate: false })}
        labelPlaceholder={DEFAULT_GESTURE_LABEL}
        documentWord="facture"
      />

      {/* Totaux réellement dus */}
      <div className="rounded-lg border border-border p-4 flex flex-col gap-2 bg-muted/30">
        {catalogTotalHt !== totalHt && (
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Tarif catalogue HT</span>
            <span className="line-through" data-testid="invoice-catalog-ht">
              {catalogTotalHt.toFixed(2)} €
            </span>
          </div>
        )}
        <div className="flex justify-between text-sm">
          <span>Total HT</span>
          <span data-testid="invoice-total-ht">{totalHt.toFixed(2)} €</span>
        </div>
        <div className="flex justify-between text-sm">
          <span>TVA</span>
          <span data-testid="invoice-total-tva">{totalTva.toFixed(2)} €</span>
        </div>
        <div className="flex justify-between font-semibold">
          <span>Total TTC</span>
          <span data-testid="invoice-total-ttc">{totalTtc.toFixed(2)} €</span>
        </div>
      </div>

      {/* Notes */}
      <div className="flex flex-col gap-1">
        <label htmlFor="invoice-notes" className="text-sm font-medium">
          Notes publiques (imprimées sur la facture)
        </label>
        <textarea
          id="invoice-notes"
          {...register('publicNotes')}
          rows={3}
          placeholder="Référence de la prestation, période réalisée, conditions de règlement..."
          className="rounded-md border border-border bg-background px-3 py-2 text-sm resize-none"
        />
      </div>

      {/* T-043 — avertissement lignes à 0,00 €, avant émission */}
      {showZeroWarning && (
        <div
          className="rounded-md border border-orange-500/40 bg-orange-500/10 px-4 py-3 flex flex-col gap-3"
          role="alert"
          data-testid="invoice-zero-lines-warning"
        >
          <div className="text-xs text-orange-200/90">
            <strong className="text-orange-400">
              {liveZeroLines.length > 1
                ? `${liveZeroLines.length} lignes à 0,00 € sur cette facture`
                : 'Une ligne à 0,00 € sur cette facture'}
            </strong>
            <ul className="mt-2 flex flex-col gap-1">
              {liveZeroLines.map((l) => (
                <li key={l.index}>{describeZeroAmountLine(l)}</li>
              ))}
            </ul>
            <p className="mt-2">
              Une ligne à zéro peut être voulue — une prestation affichée comme offerte, par
              exemple. Mais la facture sera <strong>définitive</strong> : une fois émise, elle ne se
              corrige que par un avoir.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleRemoveZeroLines}
              data-testid="invoice-zero-lines-remove"
              className="rounded-md bg-primary px-3 py-1.5 text-xs text-primary-foreground hover:bg-primary/90"
            >
              Retirer ces lignes
            </button>
            <button
              type="button"
              onClick={handleKeepZeroLines}
              data-testid="invoice-zero-lines-keep"
              className="rounded-md border border-orange-500/40 px-3 py-1.5 text-xs text-orange-200 hover:bg-orange-500/10"
            >
              Les garder, c&apos;est voulu
            </button>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          disabled={isSubmitting}
          onClick={handleSubmit((values) => onSubmit(values, false))}
          data-testid="invoice-submit-draft"
          className="rounded-md border border-border px-4 py-2 text-sm hover:bg-accent disabled:opacity-50"
        >
          {isSubmitting ? '…' : 'Créer sans envoyer'}
        </button>
        <button
          type="button"
          disabled={isSubmitting}
          onClick={handleSubmit((values) => onSubmit(values, true))}
          data-testid="invoice-submit-send"
          className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {isSubmitting ? 'Émission…' : 'Créer et envoyer au client'}
        </button>
      </div>
    </form>
  )
}
