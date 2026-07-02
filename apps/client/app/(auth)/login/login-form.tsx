'use client'

import { useTransition, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button, Input, PasswordInput, Alert, AlertDescription } from '@monprojetpro/ui'
import { loginAction } from '../actions/auth'
import { loginSchema } from '../actions/schemas'

type LoginFormData = z.infer<typeof loginSchema>

export function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  // Sécurité : n'autoriser que des chemins internes (évite l'open redirect).
  const rawRedirect = searchParams.get('redirectTo') ?? '/'
  const redirectTo =
    rawRedirect.startsWith('/') && !rawRedirect.startsWith('//') ? rawRedirect : '/'
  const [isPending, startTransition] = useTransition()
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  function onSubmit(data: LoginFormData) {
    setServerError(null)
    startTransition(async () => {
      const formData = new FormData()
      formData.set('email', data.email)
      formData.set('password', data.password)

      const result = await loginAction(formData)

      if (result.error) {
        setServerError(result.error.message)
        return
      }

      // Une route API (ex: /api/exports/.../download) sert un fichier, pas une
      // page : y naviguer laisserait l'écran figé sur le login. On atterrit sur
      // le dashboard, puis on déclenche le téléchargement en arrière-plan.
      const isApiTarget = redirectTo.startsWith('/api/')
      router.push(isApiTarget ? '/' : redirectTo)
      router.refresh()

      if (isApiTarget) {
        setTimeout(() => {
          const a = document.createElement('a')
          a.href = redirectTo
          document.body.appendChild(a)
          a.click()
          a.remove()
        }, 150)
      }
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
        <PasswordInput
          id="password"
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
