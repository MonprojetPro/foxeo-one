'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Button } from '@monprojetpro/ui'
import { changeTemporaryPassword } from '../../onboarding/actions/change-temporary-password'

const MIN_LENGTH = 10

interface PasswordChangeFormProps {
  firstName: string
}

export function PasswordChangeForm({ firstName }: PasswordChangeFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    if (password.length < MIN_LENGTH) {
      setError(`Au moins ${MIN_LENGTH} caractères.`)
      return
    }
    if (password !== confirm) {
      setError('Les deux mots de passe ne correspondent pas.')
      return
    }

    startTransition(async () => {
      const result = await changeTemporaryPassword(password)
      if (result.error) {
        setError(result.error.message)
        return
      }
      toast.success('Mot de passe mis à jour')
      router.push('/')
      router.refresh()
    })
  }

  const greeting = firstName ? `Bonjour ${firstName}` : 'Bonjour'

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background px-4">
      <form
        onSubmit={handleSubmit}
        className="max-w-md w-full space-y-6 rounded-xl border border-border bg-card p-8 shadow-lg"
      >
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-bold">{greeting}</h1>
          <p className="text-sm text-muted-foreground">
            Pour des raisons de sécurité, vous devez choisir votre propre mot de passe avant d'accéder à votre espace.
          </p>
        </div>

        <div className="space-y-3">
          <div className="flex flex-col gap-1">
            <label htmlFor="new-password" className="text-sm font-medium">
              Nouveau mot de passe
            </label>
            <input
              id="new-password"
              type="password"
              autoComplete="new-password"
              required
              minLength={MIN_LENGTH}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-md border border-border bg-background px-3 py-2 text-sm"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="confirm-password" className="text-sm font-medium">
              Confirmer le mot de passe
            </label>
            <input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              required
              minLength={MIN_LENGTH}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="rounded-md border border-border bg-background px-3 py-2 text-sm"
            />
          </div>
        </div>

        {error && (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending ? 'Mise à jour…' : 'Définir mon mot de passe'}
        </Button>
      </form>
    </div>
  )
}
