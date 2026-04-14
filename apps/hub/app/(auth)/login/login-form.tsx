'use client'

import { useTransition, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button, Input, Alert, AlertDescription } from '@monprojetpro/ui'
import { hubLoginAction } from '../actions/auth'
import { hubLoginSchema } from '../actions/auth-schemas'

type LoginFormData = z.infer<typeof hubLoginSchema>

export function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const errorParam = searchParams.get('error')
  const [isPending, startTransition] = useTransition()
  const [serverError, setServerError] = useState<string | null>(
    errorParam === 'unauthorized' ? 'Acces reserve aux operateurs.' : null
  )

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(hubLoginSchema),
  })

  function onSubmit(data: LoginFormData) {
    setServerError(null)
    startTransition(async () => {
      const formData = new FormData()
      formData.set('email', data.email)
      formData.set('password', data.password)

      const result = await hubLoginAction(formData)

      if (result.error) {
        setServerError(result.error.message)
        return
      }

      if (result.data?.needsSetup) {
        router.push('/setup-mfa')
        return
      }

      if (result.data?.requiresMfa) {
        router.push('/login/verify-mfa')
        return
      }

      // No MFA required (shouldn't happen for operators, but handle gracefully)
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
          placeholder="operateur@monprojet-pro.com"
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
          autoComplete="current-password"
          aria-invalid={!!errors.password}
          {...register('password')}
        />
        {errors.password && (
          <p className="text-sm text-destructive">{errors.password.message}</p>
        )}
      </div>

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? 'Connexion...' : 'Se connecter'}
      </Button>
    </form>
  )
}
