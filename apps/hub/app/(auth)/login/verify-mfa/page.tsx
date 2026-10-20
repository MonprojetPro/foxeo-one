import { Suspense } from 'react'
import { AuthCard, Skeleton } from '@monprojetpro/ui'
import { MfaForm } from './mfa-form'

export default function VerifyMfaPage() {
  return (
    <AuthCard
      title="Vérification 2FA"
      description="Saisissez le code de votre application d'authentification"
    >
      <Suspense fallback={<MfaFormSkeleton />}>
        <MfaForm />
      </Suspense>
    </AuthCard>
  )
}

function MfaFormSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-4 w-48 mx-auto" />
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-10 w-full" />
    </div>
  )
}
