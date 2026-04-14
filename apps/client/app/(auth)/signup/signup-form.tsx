'use client'

import { useTransition, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button, Input, Alert, AlertDescription, ConsentCheckbox } from '@monprojetpro/ui'
import { signupAction } from '../actions/auth'
import { signupSchema } from '../actions/schemas'

type SignupFormData = z.infer<typeof signupSchema>

export function SignupForm() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [serverError, setServerError] = useState<string | null>(null)
  const [acceptCgu, setAcceptCgu] = useState(false)
  const [acceptIaProcessing, setAcceptIaProcessing] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      acceptCgu: false,
      acceptIaProcessing: false,
    },
  })

  function handleCguChange(checked: boolean) {
    setAcceptCgu(checked)
    setValue('acceptCgu', checked, { shouldValidate: true })
  }

  function handleIaProcessingChange(checked: boolean) {
    setAcceptIaProcessing(checked)
    setValue('acceptIaProcessing', checked, { shouldValidate: true })
  }

  function onSubmit(data: SignupFormData) {
    setServerError(null)
    startTransition(async () => {
      const formData = new FormData()
      formData.set('email', data.email)
      formData.set('password', data.password)
      formData.set('confirmPassword', data.confirmPassword)
      formData.set('acceptCgu', data.acceptCgu.toString())
      formData.set('acceptIaProcessing', data.acceptIaProcessing.toString())

      const result = await signupAction(formData)

      if (result.error) {
        setServerError(result.error.message)
        return
      }

      router.push('/')
      router.refresh()
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {serverError && (
        <Alert variant="destructive">
          <AlertDescription>{serverError}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <label htmlFor="email" className="text-sm font-medium">
          Email
        </label>
        <Input
          id="email"
          type="email"
          placeholder="vous@example.com"
          autoComplete="email"
          aria-invalid={!!errors.email}
          {...register('email')}
        />
        {errors.email && (
          <p className="text-sm text-destructive">{errors.email.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <label htmlFor="password" className="text-sm font-medium">
          Mot de passe
        </label>
        <Input
          id="password"
          type="password"
          placeholder="••••••••"
          autoComplete="new-password"
          aria-invalid={!!errors.password}
          {...register('password')}
        />
        {errors.password && (
          <p className="text-sm text-destructive">{errors.password.message}</p>
        )}
        <p className="text-xs text-muted-foreground">
          8 caracteres minimum, 1 majuscule, 1 minuscule, 1 chiffre
        </p>
      </div>

      <div className="space-y-2">
        <label htmlFor="confirmPassword" className="text-sm font-medium">
          Confirmer le mot de passe
        </label>
        <Input
          id="confirmPassword"
          type="password"
          placeholder="••••••••"
          autoComplete="new-password"
          aria-invalid={!!errors.confirmPassword}
          {...register('confirmPassword')}
        />
        {errors.confirmPassword && (
          <p className="text-sm text-destructive">
            {errors.confirmPassword.message}
          </p>
        )}
      </div>

      {/* Consentements */}
      <div className="space-y-4 pt-4 border-t border-border">
        <ConsentCheckbox
          id="acceptCgu"
          checked={acceptCgu}
          onCheckedChange={handleCguChange}
          label="J'accepte les Conditions Générales d'Utilisation"
          link="/legal/cgu"
          linkText="Consulter les CGU"
          tooltip="Vous devez accepter les CGU pour créer un compte MonprojetPro. Les CGU définissent les règles d'utilisation de la plateforme."
          required
        />
        {errors.acceptCgu && (
          <p className="text-sm text-destructive">{errors.acceptCgu.message}</p>
        )}

        <ConsentCheckbox
          id="acceptIaProcessing"
          checked={acceptIaProcessing}
          onCheckedChange={handleIaProcessingChange}
          label="J'accepte le traitement de mes données par l'IA Élio"
          link="/legal/ia-processing"
          linkText="En savoir plus sur Élio"
          tooltip="Optionnel : Élio est l'assistant IA de MonprojetPro. Si vous refusez, vous pourrez utiliser la plateforme sans Élio. Vous pourrez modifier ce choix à tout moment dans vos paramètres."
        />
      </div>

      <Button type="submit" className="w-full" disabled={isPending || !acceptCgu}>
        {isPending ? 'Creation...' : 'Creer mon compte'}
      </Button>
    </form>
  )
}
