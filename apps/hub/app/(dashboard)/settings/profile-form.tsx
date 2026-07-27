'use client'

import { useTransition, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button, Input, Label, Alert, AlertDescription } from '@monprojetpro/ui'
import { updateOperatorProfile } from './actions/update-operator-profile'

const schema = z.object({
  name: z
    .string()
    .min(1, 'Le nom est requis')
    .max(100, 'Le nom ne doit pas dépasser 100 caractères'),
  email: z.string().email('Email invalide'),
})

type FormData = z.infer<typeof schema>

export function ProfileForm({ name, email }: { name: string; email: string }) {
  const [isPending, startTransition] = useTransition()
  const [serverError, setServerError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { name, email },
  })

  // Avertissement affiché dès que le champ diverge de l'email actuel — avant
  // même la soumission, pour que MiKL sache ce qu'il déclenche.
  const emailChanged = watch('email') !== email

  function onSubmit(data: FormData) {
    setServerError(null)
    setSuccessMessage(null)
    startTransition(async () => {
      const result = await updateOperatorProfile(data)
      if (result.error) {
        setServerError(result.error.message)
        return
      }
      setSuccessMessage(
        result.data?.requiresReauth
          ? "Profil mis à jour. Votre email de connexion a changé : reconnectez-vous avec la nouvelle adresse pour continuer à utiliser le Hub."
          : 'Profil mis à jour.'
      )
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {serverError && (
        <Alert variant="destructive">
          <AlertDescription>{serverError}</AlertDescription>
        </Alert>
      )}
      {successMessage && (
        <Alert>
          <AlertDescription>{successMessage}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <Label htmlFor="name">Nom</Label>
        <Input id="name" aria-invalid={!!errors.name} {...register('name')} />
        {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email de connexion</Label>
        <Input id="email" type="email" aria-invalid={!!errors.email} {...register('email')} />
        {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
        {/* Avertissement explicite : c'est l'identifiant de connexion, pas juste
            une donnée de fiche — le changer implique de se reconnecter ensuite. */}
        {emailChanged && !errors.email && (
          <p className="text-xs text-amber-500">
            Cette adresse sert aussi à vous connecter au Hub. Après enregistrement, vous devrez vous
            reconnecter avec la nouvelle adresse.
          </p>
        )}
      </div>

      <Button type="submit" disabled={isPending}>
        {isPending ? 'Enregistrement...' : 'Enregistrer'}
      </Button>
    </form>
  )
}
