'use client'

import { useForm, useFieldArray, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { showSuccess, showError } from '@monprojetpro/ui'
import { createAndSendQuote } from '../actions/create-quote'
import { updateQuote } from '../actions/update-quote'
import { CommercialGestureFields } from './commercial-gesture-fields'
import { DEFAULT_GESTURE_LABEL, reconstructGestureFromLines } from '../utils/commercial-gesture'
import type { ClientWithPennylane, QuoteType, LineItem } from '../types/billing.types'
import { QUOTE_TYPE_LABELS } from '../types/billing.types'

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

const QUOTE_TYPE_VALUES = [
  'lab_onboarding',
  'one_direct_deposit',
  'one_direct_final',
  'ponctuel_deposit',
  'ponctuel_final',
] as const satisfies readonly QuoteType[]

const quoteFormSchema = z.object({
  clientId: z.string().uuid('Client requis'),
  quoteType: z.enum(QUOTE_TYPE_VALUES, { message: 'Type de devis requis' }),
  lineItems: z.array(lineItemSchema).min(1, 'Au moins une ligne requise'),
  publicNotes: z.string().nullable().optional(),
  privateNotes: z.string().nullable().optional(),
  /** T-037 — prix final HT voulu. Chaîne vide = aucune remise globale. */
  targetTotalHt: z.string().optional(),
  /** T-037 — libellé du geste commercial, vide = défaut serveur */
  gestureLabel: z.string().optional(),
})

type QuoteFormValues = z.infer<typeof quoteFormSchema>

// ── TVA rates ─────────────────────────────────────────────────────────────────

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

// ── Props ─────────────────────────────────────────────────────────────────────

export interface QuoteFormInitialValues {
  pennylaneQuoteId: string
  clientId: string
  quoteType: QuoteType
  lineItems: LineItem[]
  publicNotes?: string | null
  /** Story 13.4 — true si ce devis a deja ete envoye par email au client */
  wasOriginallySent?: boolean
}

type QuoteFormProps = {
  clients: ClientWithPennylane[]
  onSuccess?: () => void
  /** Story 13.4 patch — si fourni, le formulaire passe en mode edition */
  initialValues?: QuoteFormInitialValues
}

// ── Presets par type de devis ─────────────────────────────────────────────────

type LineItemPreset = { label: string; description: string | null; quantity: number; unitPrice: number; vatRate: string; unit: string }

const QUOTE_TYPE_PRESETS: Partial<Record<QuoteType, LineItemPreset[]>> = {
  lab_onboarding: [
    { label: 'Forfait Lab MonprojetPro', description: 'Parcours d\'incubation Lab — accompagnement complet', quantity: 1, unitPrice: 199, vatRate: 'FR_200', unit: 'u' },
  ],
}

// ── Component ─────────────────────────────────────────────────────────────────

export function QuoteForm({ clients, onSuccess, initialValues }: QuoteFormProps) {
  const isEditMode = Boolean(initialValues)

  // T-037 — un devis deja emis revient de Pennylane AVEC ses contre-lignes a
  // montant negatif. Sans cette reconstruction, la reprise en edition echouait
  // sur « Prix >= 0 » et, si elle passait, le geste se serait applique une
  // seconde fois par-dessus — remise doublee en silence.
  const restored = initialValues ? reconstructGestureFromLines(initialValues.lineItems) : null
  const [isSubmitting, setIsSubmitting] = useState(false)
  const queryClient = useQueryClient()

  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<QuoteFormValues>({
    resolver: zodResolver(quoteFormSchema),
    defaultValues: initialValues && restored
      ? {
          clientId: initialValues.clientId,
          quoteType: initialValues.quoteType,
          lineItems: restored.lineItems.map((li) => ({
            label: li.label,
            description: li.description,
            quantity: li.quantity,
            unitPrice: li.unitPrice,
            vatRate: li.vatRate,
            unit: li.unit,
            offered: li.offered === true,
          })),
          publicNotes: initialValues.publicNotes ?? null,
          privateNotes: null,
          targetTotalHt: restored.targetTotalHt != null ? String(restored.targetTotalHt) : '',
          gestureLabel: restored.label ?? '',
        }
      : {
          clientId: '',
          quoteType: 'one_direct_deposit',
          lineItems: [
            { label: '', description: null, quantity: 1, unitPrice: 0, vatRate: 'FR_200', unit: 'u', offered: false },
          ],
          publicNotes: null,
          privateNotes: null,
          targetTotalHt: '',
          gestureLabel: '',
        },
  })

  const { fields, append, remove, replace } = useFieldArray({ control, name: 'lineItems' })
  const watchedItems = useWatch({ control, name: 'lineItems' })
  const watchedClientId = useWatch({ control, name: 'clientId' })
  const watchedTarget = useWatch({ control, name: 'targetTotalHt' }) ?? ''
  const watchedGestureLabel = useWatch({ control, name: 'gestureLabel' }) ?? ''

  // Auto-remplissage des lignes quand le type de devis change (creation uniquement)
  function handleQuoteTypeChange(newType: string) {
    setValue('quoteType', newType as QuoteType)
    if (isEditMode) return
    const preset = QUOTE_TYPE_PRESETS[newType as QuoteType]
    if (preset) {
      replace(preset)
    }
  }

  // Story 11.6 — Déduction Lab indicator
  const selectedClient = clients.find((c) => c.id === watchedClientId)
  const clientHasLabPaid = selectedClient?.labPaid === true

  // Calculs en temps réel — T-037 : le catalogue reste distinct du prix dû
  const catalogTotalHt = (watchedItems ?? []).reduce((sum, item) => {
    return sum + (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0)
  }, 0)

  const offeredTotalHt = (watchedItems ?? []).reduce((sum, item) => {
    if (item.offered !== true) return sum
    return sum + (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0)
  }, 0)

  const parsedTarget = watchedTarget.trim() === '' ? null : Number(watchedTarget)
  const targetIsUsable = parsedTarget !== null && Number.isFinite(parsedTarget) && parsedTarget >= 0

  const afterOffersHt = catalogTotalHt - offeredTotalHt
  const totalHt = targetIsUsable ? Math.min(parsedTarget, afterOffersHt) : afterOffersHt

  // TVA calculee LIGNE PAR LIGNE sur les prestations payantes — appliquer un
  // taux unique au total serait faux des que les lignes portent des taux
  // differents, ce que la brique autorise sans remise globale.
  const tvaOnPaidLines = (watchedItems ?? []).reduce((sum, item) => {
    if (item.offered === true) return sum
    const lineHt = (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0)
    return sum + lineHt * vatRateToMultiplier(item.vatRate ?? 'FR_200')
  }, 0)

  const discountHt = afterOffersHt - totalHt
  const discountRate =
    (watchedItems ?? []).find((i) => i.offered !== true && Number(i.unitPrice) > 0)?.vatRate ??
    (watchedItems ?? [])[0]?.vatRate ??
    'FR_200'

  const totalTva = tvaOnPaidLines - discountHt * vatRateToMultiplier(discountRate)
  const totalTtc = totalHt + totalTva

  async function onSubmit(values: QuoteFormValues, sendNow: boolean) {
    setIsSubmitting(true)
    try {
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

      const rawTarget = values.targetTotalHt?.trim() ?? ''
      const target = rawTarget === '' ? null : Number(rawTarget)
      const gestureLabel = values.gestureLabel?.trim() || null

      // Mode edition — workflow cancel+recreate via updateQuote
      // sendNow ici est detourne pour signifier "renvoyer auto au client"
      // dans le cas ou le devis original avait deja ete envoye.
      if (isEditMode && initialValues) {
        const editResult = await updateQuote(initialValues.pennylaneQuoteId, {
          lineItems,
          publicNotes: values.publicNotes ?? null,
          autoResend: sendNow,
        })
        if (editResult.error) {
          showError(editResult.error.message)
          return
        }
        const newNumber = editResult.data?.newQuoteNumber ?? ''
        if (editResult.data?.resent) {
          // sendNow=true ET autoResend a reussi
          showSuccess(
            editResult.data?.wasOriginallySent
              ? `Devis remplacé par ${newNumber} et renvoyé au client`
              : `Devis modifié et envoyé au client (${newNumber})`
          )
        } else if (sendNow) {
          // sendNow=true mais l envoi auto a echoue (PDF pas encore pret)
          showSuccess(
            `Devis modifié (${newNumber}) — l'email automatique a échoué, utilise "Envoyer par email" depuis la liste`
          )
        } else if (editResult.data?.wasOriginallySent) {
          showSuccess(`Devis remplacé par ${newNumber} (non renvoyé au client)`)
        } else {
          showSuccess(`Devis modifié — nouveau numéro : ${newNumber}`)
        }
        await queryClient.invalidateQueries({ queryKey: ['billing'] })
        onSuccess?.()
        return
      }

      const result = await createAndSendQuote(values.clientId, lineItems, {
        sendNow,
        publicNotes: values.publicNotes ?? null,
        privateNotes: values.privateNotes ?? null,
        quoteType: values.quoteType,
        targetTotalHt: target,
        gestureLabel,
      })

      if (result.error) {
        showError(result.error.message)
        return
      }

      const clientName = clients.find((c) => c.id === values.clientId)?.name ?? 'le client'
      showSuccess(sendNow ? `Devis envoyé à ${clientName}` : 'Devis créé sans envoi')

      // Patch — invalider les caches de la liste devis pour rafraichir l affichage
      // sans attendre le polling Edge Function billing-sync.
      await queryClient.invalidateQueries({ queryKey: ['billing'] })

      reset()
      onSuccess?.()
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form className="flex flex-col gap-6" onSubmit={(e) => e.preventDefault()}>
      {/* Story 13.4 — Warning Pennylane numbering quand on edite un devis */}
      {isEditMode && (
        <div className="rounded-md border border-orange-500/30 bg-orange-500/10 px-4 py-3 text-xs">
          {initialValues?.wasOriginallySent ? (
            <>
              <strong className="text-orange-400">⚠️ Devis déjà envoyé au client</strong>
              <p className="mt-1 text-orange-300/90">
                Pennylane interdit la modification d'un devis envoyé. Tes changements vont créer un{' '}
                <strong>nouveau devis</strong> avec un numéro différent. L'ancien sera annulé. Choisis
                ci-dessous si tu veux <strong>renvoyer automatiquement</strong> le nouveau devis au client
                ou non.
              </p>
            </>
          ) : (
            <>
              <strong className="text-orange-400">ℹ️ Numéro de devis</strong>
              <p className="mt-1 text-orange-300/90">
                Pennylane impose une numérotation séquentielle immutable. Tes modifications vont créer un{' '}
                <strong>nouveau devis</strong> (ex: D-2026-XXX → D-2026-XXY). L'ancien sera annulé
                automatiquement. Le client n'a jamais reçu l'ancien donc c'est invisible pour lui.
              </p>
            </>
          )}
        </div>
      )}

      {/* Client selector — verrouille en mode edition */}
      <div className="flex flex-col gap-1">
        <label htmlFor="clientId" className="text-sm font-medium">
          Client {isEditMode && <span className="text-xs text-muted-foreground">(non modifiable)</span>}
        </label>
        <select
          id="clientId"
          disabled={isEditMode}
          {...register('clientId')}
          className="rounded-md border border-border bg-background px-3 py-2 text-sm disabled:opacity-60"
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
            Aucun client avec un compte Pennylane. Créez d'abord le client dans Pennylane.
          </span>
        )}
        {clientHasLabPaid && (
          <div className="flex items-center gap-2 rounded-md border border-green-500/30 bg-green-500/10 px-3 py-2">
            <span className="text-green-400 text-xs">✓</span>
            <span className="text-xs text-green-400">
              Ce client a payé le Lab (199€) — déduction auto appliquée sur les devis setup One
            </span>
          </div>
        )}
      </div>

      {/* Story 13.4 — Type de devis (pilote le tunnel paiement Pennylane) */}
      <div className="flex flex-col gap-1">
        <label htmlFor="quoteType" className="text-sm font-medium">
          Type de devis
        </label>
        <select
          id="quoteType"
          disabled={isEditMode}
          {...register('quoteType', {
            onChange: (e) => handleQuoteTypeChange(e.target.value),
          })}
          className="rounded-md border border-border bg-background px-3 py-2 text-sm disabled:opacity-60"
          data-testid="quote-type-select"
        >
          {QUOTE_TYPE_VALUES.map((value) => (
            <option key={value} value={value}>
              {QUOTE_TYPE_LABELS[value]}
            </option>
          ))}
        </select>
        <span className="text-xs text-muted-foreground">
          Le webhook Pennylane utilisera ce type pour créer le compte ou débloquer la livraison.
        </span>
        {errors.quoteType && (
          <span className="text-xs text-destructive">{errors.quoteType.message}</span>
        )}
      </div>

      {/* Line items */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Lignes du devis</span>
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
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-muted-foreground">Désignation</label>
                <input
                  {...register(`lineItems.${index}.label`)}
                  placeholder="Désignation"
                  className="rounded-md border border-border bg-background px-3 py-2 text-sm"
                />
                {errors.lineItems?.[index]?.label && (
                  <span className="text-xs text-destructive">{errors.lineItems[index]?.label?.message}</span>
                )}
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs text-muted-foreground">Description</label>
                <input
                  {...register(`lineItems.${index}.description`)}
                  placeholder="Description (optionnel)"
                  className="rounded-md border border-border bg-background px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-4 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-muted-foreground">Qté</label>
                <input
                  {...register(`lineItems.${index}.quantity`)}
                  type="number"
                  min="0.01"
                  step="0.01"
                  placeholder="Qté"
                  className="rounded-md border border-border bg-background px-3 py-2 text-sm"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs text-muted-foreground">Prix unitaire HT (€)</label>
                <input
                  {...register(`lineItems.${index}.unitPrice`)}
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Prix unitaire"
                  className="rounded-md border border-border bg-background px-3 py-2 text-sm"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs text-muted-foreground">TVA</label>
                <select
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
                <label className="text-xs text-muted-foreground">Unité</label>
                <input
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
                htmlFor={`quote-line-${index}-offered`}
                className="flex items-center gap-2 text-xs text-muted-foreground"
              >
                <input
                  id={`quote-line-${index}-offered`}
                  type="checkbox"
                  {...register(`lineItems.${index}.offered`)}
                  data-testid={`quote-line-${index}-offered`}
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

      {/* T-037 — geste commercial, même panneau que le formulaire de facture */}
      <CommercialGestureFields
        catalogTotalHt={catalogTotalHt}
        offeredTotalHt={offeredTotalHt}
        targetValue={watchedTarget}
        onTargetChange={(v) => setValue('targetTotalHt', v, { shouldValidate: false })}
        labelValue={watchedGestureLabel}
        onLabelChange={(v) => setValue('gestureLabel', v, { shouldValidate: false })}
        labelPlaceholder={DEFAULT_GESTURE_LABEL}
        documentWord="devis"
      />

      {/* Totals */}
      <div className="rounded-lg border border-border p-4 flex flex-col gap-2 bg-muted/30">
        {catalogTotalHt !== totalHt && (
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Tarif catalogue HT</span>
            <span className="line-through" data-testid="catalog-ht">
              {catalogTotalHt.toFixed(2)} €
            </span>
          </div>
        )}
        <div className="flex justify-between text-sm">
          <span>Total HT</span>
          <span data-testid="total-ht">{totalHt.toFixed(2)} €</span>
        </div>
        <div className="flex justify-between text-sm">
          <span>TVA</span>
          <span data-testid="total-tva">{totalTva.toFixed(2)} €</span>
        </div>
        <div className="flex justify-between font-semibold">
          <span>Total TTC</span>
          <span data-testid="total-ttc">{totalTtc.toFixed(2)} €</span>
        </div>
      </div>

      {/* Notes */}
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">Notes publiques (visibles par le client)</label>
          <textarea
            {...register('publicNotes')}
            rows={3}
            placeholder="Notes visibles par le client..."
            className="rounded-md border border-border bg-background px-3 py-2 text-sm resize-none"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">Notes privées (MiKL uniquement)</label>
          <textarea
            {...register('privateNotes')}
            rows={3}
            placeholder="Notes internes..."
            className="rounded-md border border-border bg-background px-3 py-2 text-sm resize-none"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        {isEditMode ? (
          <>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleSubmit((values) => onSubmit(values, false))}
              className="rounded-md border border-border px-4 py-2 text-sm hover:bg-accent disabled:opacity-50"
            >
              {isSubmitting ? '…' : 'Modifier sans envoyer'}
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleSubmit((values) => onSubmit(values, true))}
              className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {isSubmitting
                ? 'Modification…'
                : initialValues?.wasOriginallySent
                  ? 'Modifier et renvoyer au client'
                  : 'Modifier et envoyer au client'}
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleSubmit((values) => onSubmit(values, false))}
              className="rounded-md border border-border px-4 py-2 text-sm hover:bg-accent disabled:opacity-50"
            >
              Créer sans envoyer
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleSubmit((values) => onSubmit(values, true))}
              className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              Créer et envoyer au client
            </button>
          </>
        )}
      </div>
    </form>
  )
}
