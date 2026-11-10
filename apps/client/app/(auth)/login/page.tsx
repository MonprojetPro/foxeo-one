import { Suspense } from 'react'
import Link from 'next/link'
import { AuthCard, Skeleton } from '@monprojetpro/ui'
import { LoginForm } from './login-form'

/**
 * Entrée de connexion UNIQUE — clients (Lab, One) et opérateur.
 *
 * Volontairement muette sur les destinations : rien n'indique qu'un cockpit
 * existe, et l'aiguillage se fait après authentification. Le libellé reste donc
 * « votre espace », jamais « espace client » ni « espace admin ».
 *
 * T-079 — utilise désormais `AuthCard` (le même composant que le Hub) au lieu
 * d'une copie manuelle de son propre style : cette page EST l'origine du style
 * (cf. commentaire dans auth-card.tsx), mais les autres écrans d'auth du client
 * (mot de passe oublié, nouveau mot de passe) n'avaient jamais été alignés dessus.
 */
export default function LoginPage() {
  return (
    <AuthCard
      title="MonprojetPro"
      description="Connexion à votre espace"
      footer={
        <Link
          href="/forgot-password"
          className="text-sm text-gray-400 underline-offset-4 transition-colors hover:text-white hover:underline"
        >
          Mot de passe oublié ?
        </Link>
      }
    >
      <Suspense fallback={<LoginFormSkeleton />}>
        <LoginForm />
      </Suspense>
    </AuthCard>
  )
}

function LoginFormSkeleton() {
  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-11 w-full" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-11 w-full" />
      </div>
      <Skeleton className="h-11 w-full" />
    </div>
  )
}
