'use client'

import { useForm, useFieldArray, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { showSuccess, showError } from '@monprojetpro/ui'
import { createInvoice } from '../actions/create-invoice'
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
})

const invoiceFormSchema = z
  .object({
    clientId: z.string().uuid('Client requis'),
    lineItems: z.array(lineItemSchema).min(1, 'Au moins une ligne requise'),
    date: z.string().min(1, "Date d'émission requise"),
    deadline: z.string().min(1, 'Échéance requise'),
    publicNotes: z.string().nullable().optional(),
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
  const queryClient = useQueryClient()

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<InvoiceFormValues>({
    resolver: zodResolver(invoiceFormSchema),
    defaultValues: {
      clientId: '',
      lineItems: [{ label: '', description: null, quantity: 1, unitPrice: 0, vatRate: 'FR_200', unit: 'u' }],
      date: todayIso(),
      deadline: isoPlusDays(30),
      publicNotes: null,
    },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'lineItems' })
  const watchedItems = useWatch({ control, name: 'lineItems' })

  const totalHt = (watchedItems ?? []).reduce((sum, item) => {
    return sum + (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0)
  }, 0)

  const totalTva = (watchedItems ?? []).reduce((sum, item) => {
    const lineHt = (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0)
    return sum + lineHt * vatRateToMultiplier(item.vatRate ?? 'FR_200')
  }, 0)

  const totalTtc = totalHt + totalTva

  async function onSubmit(values: InvoiceFormValues, sendNow: boolean) {
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
      }))

      const result = await createInvoice(values.clientId, lineItems, {
        sendNow,
        publicNotes: values.publicNotes ?? null,
        date: values.date,
        deadline: values.deadline,
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
          `Facture${numberSuffix} créée, mais l'email n'est pas parti. Utilise « Relancer » depuis la liste des factures.`
        )
      } else if (sendNow) {
        showSuccess(`Facture${numberSuffix} envoyée à ${clientName}`)
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
            onClick={() => append({ label: '', description: null, quantity: 1, unitPrice: 0, vatRate: 'FR_200', unit: 'u' })}
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

            {fields.length > 1 && (
              <button
                type="button"
                onClick={() => remove(index)}
                className="self-end text-xs text-destructive hover:underline"
              >
                Supprimer la ligne
              </button>
            )}
          </div>
        ))}

        {errors.lineItems?.root && (
          <span className="text-xs text-destructive">{errors.lineItems.root.message}</span>
        )}
      </div>

      {/* Totaux */}
      <div className="rounded-lg border border-border p-4 flex flex-col gap-2 bg-muted/30">
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
