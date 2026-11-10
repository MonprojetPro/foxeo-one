import { Suspense } from 'react'
import Link from 'next/link'
import { AuthCard, Skeleton } from '@monprojetpro/ui'
import { ResetPasswordForm } from './reset-password-form'

// T-079 — harmonisé sur AuthCard (même carte que /login, /forgot-password et le Hub) :
// ce formulaire utilisait une simple Card shadcn sans le verre/halo, rupture de style
// repérée par MiKL entre deux écrans du même parcours d'activation.
export default function ResetPasswordPage() {
  return (
    <AuthCard
      title="Nouveau mot de passe"
      description="Choisissez votre nouveau mot de passe"
      footer={
        <Link href="/login" className="text-sm text-gray-400 underline-offset-4 transition-colors hover:text-white hover:underline">
          Retour à la connexion
        </Link>
      }
    >
      <Suspense fallback={<FormSkeleton />}>
        <ResetPasswordForm />
      </Suspense>
    </AuthCard>
  )
}

function FormSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
    </div>
  )
}
