'use client'

import { useTransition, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Input, Alert, AlertDescription } from '@monprojetpro/ui'
import { hubSetupMfaAction, hubVerifyMfaSetupAction } from '../actions/auth'

type SetupStep = 'loading' | 'scan' | 'recovery'

export function SetupMfaForm() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [step, setStep] = useState<SetupStep>('loading')
  const [serverError, setServerError] = useState<string | null>(null)
  const [factorId, setFactorId] = useState('')
  const [qrCode, setQrCode] = useState('')
  const [secret, setSecret] = useState('')
  const [code, setCode] = useState('')
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([])

  // Auto-start enrollment on mount
  useEffect(() => {
    startTransition(async () => {
      const result = await hubSetupMfaAction()
      if (result.error) {
        setServerError(result.error.message)
        setStep('scan')
        return
      }
      if (result.data) {
        setFactorId(result.data.factorId)
        setQrCode(result.data.qrCode)
        setSecret(result.data.secret)
        setStep('scan')
      }
    })
  }, [])

  function handleVerify(e: React.FormEvent) {
    e.preventDefault()
    setServerError(null)
    startTransition(async () => {
      const formData = new FormData()
      formData.set('code', code)
      formData.set('factorId', factorId)

      const result = await hubVerifyMfaSetupAction(formData)

      if (result.error) {
        setServerError(result.error.message)
        setCode('')
        return
      }

      if (result.data) {
        setRecoveryCodes(result.data.recoveryCodes)
        setStep('recovery')
      }
    })
  }

  function handleDone() {
    router.push('/')
    router.refresh()
  }

  if (step === 'loading') {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-48 bg-muted rounded mx-auto w-48" />
        <div className="h-4 bg-muted rounded w-3/4 mx-auto" />
      </div>
    )
  }

  if (step === 'recovery') {
    return (
      <div className="space-y-4">
        <Alert>
          <AlertDescription>
            Notez ces codes de recuperation dans un endroit sur. Ils ne seront plus affiches.
          </AlertDescription>
        </Alert>

        <div className="grid grid-cols-2 gap-2 p-4 bg-muted rounded-md font-mono text-sm">
          {recoveryCodes.map((recCode, i) => (
            <div key={i} className="text-center py-1">
              {recCode}
            </div>
          ))}
        </div>

        <Button onClick={handleDone} className="w-full">
          J&apos;ai note mes codes — Continuer
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {serverError && (
        <Alert variant="destructive">
          <AlertDescription>{serverError}</AlertDescription>
        </Alert>
      )}

      {step === 'scan' && (
        <>
          <div className="text-center space-y-3">
            <p className="text-sm text-muted-foreground">
              Scannez ce QR code avec Google Authenticator
            </p>
            {qrCode && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={qrCode}
                alt="QR Code TOTP"
                className="mx-auto w-48 h-48 rounded-md bg-white p-2"
              />
            )}
            <details className="text-xs text-muted-foreground">
              <summary className="cursor-pointer">Saisie manuelle</summary>
              <code className="block mt-2 p-2 bg-muted rounded font-mono text-xs break-all">
                {secret}
              </code>
            </details>
          </div>

          <form onSubmit={handleVerify} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="setup-code" className="text-sm font-medium">
                Code de verification
              </label>
              <Input
                id="setup-code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="000000"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="text-center text-2xl tracking-widest font-mono"
              />
            </div>

            <Button type="submit" className="w-full" disabled={isPending || code.length !== 6}>
              {isPending ? 'Activation...' : 'Activer le 2FA'}
            </Button>
          </form>
        </>
      )}
    </div>
  )
}
