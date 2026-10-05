'use client'

import { useState, useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createClientSchema } from '@monprojetpro/utils'
import { Input, Button, showError, showSuccess } from '@monprojetpro/ui'
import { lookupSiret } from '../actions/lookup-siret'
import { normalizeSiret } from '../utils/naf-sections'
import type { CreateClientInput } from '../types/crm.types'

interface ServerError {
  field: string
  message: string
}

interface ClientFormProps {
  onSubmit: (data: CreateClientInput) => void
  onCancel?: () => void
  defaultValues?: Partial<CreateClientInput>
  mode?: 'create' | 'edit'
  isPending?: boolean
  serverError?: ServerError | null
}

export function ClientForm({
  onSubmit,
  onCancel,
  defaultValues,
  mode = 'create',
  isPending = false,
  serverError,
}: ClientFormProps) {
  const {
    register,
    handleSubmit,
    setValue,
    getValues,
    watch,
    formState: { errors },
  } = useForm<CreateClientInput>({
    resolver: zodResolver(createClientSchema),
    defaultValues: {
      clientKind: 'individual',
      firstName: '',
      name: '',
      email: '',
      company: '',
      contact: '',
      siret: '',
      nafCode: '',
      billingAddress: '',
      billingPostalCode: '',
      billingCity: '',
      phone: '',
      sector: '',
      clientType: 'ponctuel',
      ...defaultValues,
    },
  })

  const clientKind = watch('clientKind')
  const isEntity = clientKind === 'entity'

  const [isLookingUp, startLookup] = useTransition()
  const [lookupMessage, setLookupMessage] = useState<string | null>(null)

  // Rapprochement SIRET : remplit la raison sociale, le secteur et l'adresse de
  // facturation. On ne touche jamais à ce que l'opérateur a déjà saisi de la main
  // SAUF la raison sociale, qui est l'information officielle que le SIRET apporte.
  const handleSiretLookup = () => {
    const raw = getValues('siret') ?? ''
    const siret = normalizeSiret(raw)
    setValue('siret', siret, { shouldValidate: false })
    setLookupMessage(null)

    startLookup(async () => {
      const result = await lookupSiret(siret)

      if (result.error || !result.data) {
        showError(result.error?.message ?? 'Rapprochement impossible')
        setLookupMessage(result.error?.message ?? null)
        return
      }

      const info = result.data
      if (info.companyName) setValue('company', info.companyName, { shouldValidate: true })
      if (info.sector && !getValues('sector')) setValue('sector', info.sector)
      if (info.nafCode) setValue('nafCode', info.nafCode)
      if (info.address) setValue('billingAddress', info.address)
      if (info.postalCode) setValue('billingPostalCode', info.postalCode)
      if (info.city) setValue('billingCity', info.city)

      if (info.closed) {
        setLookupMessage(
          `${info.companyName} — attention, cet établissement est déclaré fermé au répertoire Sirene.`
        )
        showError('Établissement déclaré fermé — vérifiez le SIRET')
        return
      }

      setLookupMessage(`${info.companyName} — informations récupérées depuis le répertoire Sirene.`)
      showSuccess('Entreprise identifiée')
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      {/* Nature du client — commande tout le reste du formulaire */}
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Nature du client *</legend>
        <div className="flex gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              value="individual"
              className="accent-primary"
              {...register('clientKind')}
            />
            Particulier
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              value="entity"
              className="accent-primary"
              {...register('clientKind')}
            />
            Entité (société, association, CSE)
          </label>
        </div>
      </fieldset>

      {isEntity ? (
        <>
          {/* SIRET + rapprochement Sirene */}
          <div className="space-y-1">
            <label htmlFor="client-siret" className="text-sm font-medium">
              SIRET
            </label>
            <div className="flex gap-2">
              <Input
                id="client-siret"
                inputMode="numeric"
                placeholder="14 chiffres"
                aria-invalid={!!errors.siret}
                {...register('siret')}
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleSiretLookup}
                disabled={isLookingUp}
              >
                {isLookingUp ? 'Recherche...' : 'Rechercher'}
              </Button>
            </div>
            {errors.siret && (
              <p className="text-sm text-destructive">{errors.siret.message}</p>
            )}
            {lookupMessage && (
              <p className="text-sm text-muted-foreground">{lookupMessage}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Remplit automatiquement la raison sociale, le secteur et l&apos;adresse de facturation.
            </p>
          </div>

          {/* Raison sociale — l'identité du client pour une entité */}
          <div className="space-y-1">
            <label htmlFor="client-company" className="text-sm font-medium">
              Nom de l&apos;entité *
            </label>
            <Input
              id="client-company"
              placeholder="Ex : CSE Habitat 77"
              aria-invalid={!!errors.company}
              {...register('company')}
            />
            {errors.company && (
              <p className="text-sm text-destructive">{errors.company.message}</p>
            )}
          </div>

          {/* Contact — facultatif, jamais facturé */}
          <div className="space-y-1">
            <label htmlFor="client-contact" className="text-sm font-medium">
              Nom du contact
            </label>
            <Input
              id="client-contact"
              placeholder="Ex : Marie Dupont (facultatif)"
              {...register('contact')}
            />
            <p className="text-xs text-muted-foreground">
              Interlocuteur chez le client. N&apos;apparaît pas sur les devis et les factures.
            </p>
          </div>

          {/* Adresse de facturation — transmise à Pennylane */}
          <div className="space-y-1">
            <label htmlFor="client-billing-address" className="text-sm font-medium">
              Adresse de facturation
            </label>
            <Input
              id="client-billing-address"
              placeholder="Numéro et voie"
              {...register('billingAddress')}
            />
            <div className="grid grid-cols-[1fr_2fr] gap-3 pt-1">
              <Input
                id="client-billing-postal-code"
                placeholder="Code postal"
                aria-label="Code postal"
                {...register('billingPostalCode')}
              />
              <Input
                id="client-billing-city"
                placeholder="Ville"
                aria-label="Ville"
                {...register('billingCity')}
              />
            </div>
          </div>
        </>
      ) : (
        <>
          {/* Prénom + Nom */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label htmlFor="client-firstname" className="text-sm font-medium">
                Prénom
              </label>
              <Input
                id="client-firstname"
                placeholder="Prénom"
                {...register('firstName')}
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="client-name" className="text-sm font-medium">
                Nom *
              </label>
              <Input
                id="client-name"
                placeholder="Nom de famille"
                aria-invalid={!!errors.name}
                {...register('name')}
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name.message}</p>
              )}
            </div>
          </div>

          {/* Entreprise (facultative pour un particulier) */}
          <div className="space-y-1">
            <label htmlFor="client-company-individual" className="text-sm font-medium">
              Entreprise
            </label>
            <Input
              id="client-company-individual"
              placeholder="Nom de l'entreprise"
              {...register('company')}
            />
          </div>
        </>
      )}

      {/* Email */}
      <div className="space-y-1">
        <label htmlFor="client-email" className="text-sm font-medium">
          Email *
        </label>
        <Input
          id="client-email"
          type="email"
          placeholder="email@exemple.com"
          aria-invalid={!!errors.email || !!serverError?.field}
          {...register('email')}
        />
        {errors.email && (
          <p className="text-sm text-destructive">{errors.email.message}</p>
        )}
        {serverError?.field === 'email' && (
          <p className="text-sm text-destructive">{serverError.message}</p>
        )}
      </div>

      {/* Téléphone */}
      <div className="space-y-1">
        <label htmlFor="client-phone" className="text-sm font-medium">
          Téléphone
        </label>
        <Input
          id="client-phone"
          type="tel"
          placeholder="+33 6 12 34 56 78"
          {...register('phone')}
        />
      </div>

      {/* Secteur */}
      <div className="space-y-1">
        <label htmlFor="client-sector" className="text-sm font-medium">
          Secteur d&apos;activité
        </label>
        <Input
          id="client-sector"
          placeholder="Ex: Tech, Commerce, Santé..."
          {...register('sector')}
        />
      </div>

      {/* Type de client - RadioGroup */}
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Type de client *</legend>
        <div className="flex gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              value="ponctuel"
              className="accent-primary"
              {...register('clientType')}
            />
            Ponctuel
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              value="complet"
              className="accent-primary"
              {...register('clientType')}
            />
            Complet
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              value="direct_one"
              className="accent-primary"
              {...register('clientType')}
            />
            Direct One
          </label>
        </div>
        {errors.clientType && (
          <p className="text-sm text-destructive">{errors.clientType.message}</p>
        )}
      </fieldset>

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Annuler
          </Button>
        )}
        <Button type="submit" disabled={isPending}>
          {isPending
            ? 'En cours...'
            : mode === 'edit'
              ? 'Enregistrer'
              : 'Créer'}
        </Button>
      </div>
    </form>
  )
}

ClientForm.displayName = 'ClientForm'
