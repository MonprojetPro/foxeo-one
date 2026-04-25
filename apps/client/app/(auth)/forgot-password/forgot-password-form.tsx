'use client'

import { useTransition, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button, Input, Alert, AlertDescription } from '@monprojetpro/ui'
import { forgotPasswordAction } from '../actions/auth'
import { forgotPasswordSchema } from '../actions/schemas'

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>

export function ForgotPasswordForm() {
  const [isPending, startTransition] = useTransition()
  const [sent, setSent] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const { register, handleSubmit, formState: { errors } } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
  })

  function onSubmit(data: ForgotPasswordFormData) {
    setServerError(null)
    startTransition(async () => {
      const formData = new FormData()
      formData.set('email', data.email)
      const result = await forgotPasswordAction(formData)
      if (result.error) {
        setServerError(result.error.message)
        return
      }
      setSent(true)
    })
  }

  if (sent) {
    return (
      <Alert>
        <AlertDescription>
          Si un compte existe pour cet email, vous recevrez un lien de reinitialisation dans quelques minutes.
        </AlertDescription>
      </Alert>
    )
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

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? 'Envoi en cours...' : 'Envoyer le lien'}
      </Button>
    </form>
  )
}
