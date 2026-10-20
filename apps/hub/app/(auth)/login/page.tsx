import { Suspense } from 'react'
import { AuthCard } from '@monprojetpro/ui'
import { LoginForm } from './login-form'

export default function LoginPage() {
  return (
    <AuthCard title="MonprojetPro Hub" description="Connexion opérateur">
      <Suspense fallback={<LoginFormSkeleton />}>
        <LoginForm />
      </Suspense>
    </AuthCard>
  )
}

function LoginFormSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="space-y-2">
        <div className="h-4 w-12 bg-muted rounded" />
        <div className="h-10 bg-muted rounded" />
      </div>
      <div className="space-y-2">
        <div className="h-4 w-20 bg-muted rounded" />
        <div className="h-10 bg-muted rounded" />
      </div>
      <div className="h-10 bg-muted rounded" />
    </div>
  )
}
