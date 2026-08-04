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

/** Retours de la passerelle Hub (`/auth/handoff`), traduits pour l'écran. */
const HANDOFF_ERRORS: Record<string, string> = {
  handoff_expired: 'Le lien de connexion au cockpit a expiré. Reconnectez-vous.',
  handoff_invalid: 'Lien de connexion au cockpit invalide. Reconnectez-vous.',
  handoff_unauthorized: 'Ce compte n’a pas accès au cockpit.',
  session_expired: 'Votre session a expiré (coupure de 2 h du matin). Reconnectez-vous.',
}

export function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  // Sécurité : n'autoriser que des chemins internes (évite l'open redirect).
  const rawRedirect = searchParams.get('redirectTo') ?? '/'
  const redirectTo =
    rawRedirect.startsWith('/') && !rawRedirect.startsWith('//') ? rawRedirect : '/'
  const [isPending, startTransition] = useTransition()
  // Message renvoyé par la passerelle Hub quand le jeton de bascule n'a pas abouti.
  // Sans ça, l'opérateur reviendrait sur un login muet, sans savoir ce qui a échoué.
  const [serverError, setServerError] = useState<string | null>(
    HANDOFF_ERRORS[searchParams.get('error') ?? ''] ?? null
  )

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

      // Entrée unique : un opérateur repart vers le Hub, qui vit sur un autre
      // sous-domaine. `router.push` ne sait pas franchir une origine — il faut une
      // vraie navigation pour que le jeton de bascule soit consommé là-bas.
      if (result.data?.kind === 'operator') {
        window.location.href = result.data.handoffUrl
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
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {serverError && (
        <Alert variant="destructive">
          <AlertDescription>{serverError}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <label
          htmlFor="email"
          className="block text-[0.7rem] font-semibold uppercase tracking-wider text-gray-400"
        >
          Email
        </label>
        <Input
          id="email"
          type="email"
          placeholder="vous@example.com"
          autoComplete="email"
          aria-invalid={!!errors.email}
          className="h-11 border-white/10 bg-black/40 text-white placeholder:text-gray-600 focus-visible:border-white/25"
          {...register('email')}
        />
        {errors.email && (
          <p className="text-sm text-destructive">{errors.email.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <label
          htmlFor="password"
          className="block text-[0.7rem] font-semibold uppercase tracking-wider text-gray-400"
        >
          Mot de passe
        </label>
        <PasswordInput
          id="password"
          placeholder="••••••••"
          autoComplete="current-password"
          aria-invalid={!!errors.password}
          className="h-11 border-white/10 bg-black/40 text-white placeholder:text-gray-600 focus-visible:border-white/25"
          {...register('password')}
        />
        {errors.password && (
          <p className="text-sm text-destructive">{errors.password.message}</p>
        )}
      </div>

      {/* Le dégradé du bouton reprend celui du faisceau : violet (Lab) → vert (One).
          Texte noir — seul contraste correct sur ces deux teintes claires. */}
      <Button
        type="submit"
        className="h-11 w-full bg-gradient-to-r from-[#935fee] to-[#09e159] font-semibold text-black transition-opacity hover:opacity-90 disabled:opacity-60"
        disabled={isPending}
      >
        {isPending ? 'Connexion...' : 'Se connecter'}
      </Button>
    </form>
  )
}
