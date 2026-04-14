'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createClientSchema } from '@monprojetpro/utils'
import { Input, Button } from '@monprojetpro/ui'
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
    formState: { errors },
  } = useForm<CreateClientInput>({
    resolver: zodResolver(createClientSchema),
    defaultValues: {
      firstName: '',
      name: '',
      email: '',
      company: '',
      phone: '',
      sector: '',
      clientType: 'ponctuel',
      ...defaultValues,
    },
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
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

      {/* Entreprise */}
      <div className="space-y-1">
        <label htmlFor="client-company" className="text-sm font-medium">
          Entreprise
        </label>
        <Input
          id="client-company"
          placeholder="Nom de l'entreprise"
          {...register('company')}
        />
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
          Secteur d'activité
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
