import { Suspense } from 'react'
import Link from 'next/link'
import { AuthCard, Skeleton } from '@monprojetpro/ui'
import { ForgotPasswordForm } from './forgot-password-form'

// T-079 — harmonisé sur AuthCard, cf. /login et /reset-password.
export default function ForgotPasswordPage() {
  return (
    <AuthCard
      title="Mot de passe oublié"
      description="Entrez votre email pour recevoir un lien de réinitialisation"
      footer={
        <Link href="/login" className="text-sm text-gray-400 underline-offset-4 transition-colors hover:text-white hover:underline">
          Retour à la connexion
        </Link>
      }
    >
      <Suspense fallback={<FormSkeleton />}>
        <ForgotPasswordForm />
      </Suspense>
    </AuthCard>
  )
}

function FormSkeleton() {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Skeleton className="h-4 w-12" />
        <Skeleton className="h-10 w-full" />
      </div>
      <Skeleton className="h-10 w-full" />
    </div>
  )
}
