'use client'

import { useTransition, useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Input, Alert, AlertDescription } from '@monprojetpro/ui'
import { hubVerifyMfaAction } from '../../actions/auth'

export function MfaForm() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [serverError, setServerError] = useState<string | null>(null)
  const [code, setCode] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  function handleCodeChange(value: string) {
    // Only allow digits, max 6
    const cleaned = value.replace(/\D/g, '').slice(0, 6)
    setCode(cleaned)

    // Auto-submit when 6 digits entered
    if (cleaned.length === 6) {
      submitCode(cleaned)
    }
  }

  function submitCode(totpCode: string) {
    setServerError(null)
    startTransition(async () => {
      const formData = new FormData()
      formData.set('code', totpCode)

      const result = await hubVerifyMfaAction(formData)

      if (result.error) {
        setServerError(result.error.message)
        setCode('')
        inputRef.current?.focus()
        return
      }

      router.push('/')
      router.refresh()
    })
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (code.length === 6) {
      submitCode(code)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {serverError && (
        <Alert variant="destructive">
          <AlertDescription>{serverError}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <label htmlFor="mfa-code" className="text-sm font-medium">
          Code d&apos;authentification (6 chiffres)
        </label>
        <Input
          ref={inputRef}
          id="mfa-code"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          placeholder="000000"
          maxLength={6}
          value={code}
          onChange={(e) => handleCodeChange(e.target.value)}
          className="text-center text-2xl tracking-widest font-mono"
          aria-invalid={!!serverError}
        />
        <p className="text-xs text-muted-foreground text-center">
          Ouvrez Google Authenticator et saisissez le code
        </p>
      </div>

      <Button type="submit" className="w-full" disabled={isPending || code.length !== 6}>
        {isPending ? 'Verification...' : 'Verifier'}
      </Button>

      <Button
        type="button"
        variant="ghost"
        className="w-full"
        onClick={() => {
          router.push('/login')
        }}
      >
        Retour au login
      </Button>
    </form>
  )
}
