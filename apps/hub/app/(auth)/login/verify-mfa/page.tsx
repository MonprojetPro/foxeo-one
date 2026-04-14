import { Suspense } from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Skeleton } from '@monprojetpro/ui'
import { MfaForm } from './mfa-form'

export default function VerifyMfaPage() {
  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold">Verification 2FA</CardTitle>
        <CardDescription>
          Saisissez le code de votre application d&apos;authentification
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Suspense fallback={<MfaFormSkeleton />}>
          <MfaForm />
        </Suspense>
      </CardContent>
    </Card>
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
