import { Suspense } from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Skeleton } from '@monprojetpro/ui'
import { SetupMfaForm } from './setup-mfa-form'

export default function SetupMfaPage() {
  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold">Configuration 2FA</CardTitle>
        <CardDescription>
          Securisez votre compte avec l&apos;authentification a deux facteurs
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Suspense fallback={<SetupMfaSkeleton />}>
          <SetupMfaForm />
        </Suspense>
      </CardContent>
    </Card>
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
