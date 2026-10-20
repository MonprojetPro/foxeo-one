import { Suspense } from 'react'
import { AuthCard } from '@monprojetpro/ui'
import { SetupMfaForm } from './setup-mfa-form'

export default function SetupMfaPage() {
  return (
    <AuthCard
      title="Configuration 2FA"
      description="Sécurisez votre compte avec l'authentification à deux facteurs"
    >
      <Suspense fallback={<SetupMfaSkeleton />}>
        <SetupMfaForm />
      </Suspense>
    </AuthCard>
  )
}

function SetupMfaSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-48 bg-muted rounded mx-auto w-48" />
      <div className="h-4 bg-muted rounded w-3/4 mx-auto" />
    </div>
  )
}
