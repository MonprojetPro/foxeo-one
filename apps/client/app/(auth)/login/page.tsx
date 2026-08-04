import { Suspense } from 'react'
import Link from 'next/link'
import { Skeleton } from '@monprojetpro/ui'
import { LoginForm } from './login-form'

/**
 * Entrée de connexion UNIQUE — clients (Lab, One) et opérateur.
 *
 * Volontairement muette sur les destinations : rien n'indique qu'un cockpit
 * existe, et l'aiguillage se fait après authentification. Le libellé reste donc
 * « votre espace », jamais « espace client » ni « espace admin ».
 *
 * Signature visuelle du Hub : verre sur fond noir, bordures fines, halo coloré,
 * intitulés en majuscules espacées.
 */
export default function LoginPage() {
  return (
    <div className="w-full max-w-sm">
      {/* Fond noir semi-opaque et non `white/[0.03]` : le faisceau traversait la carte
          et la teintait en vert, au détriment de la lisibilité des champs. Le flou
          laisse deviner la lumière derrière sans la laisser colorer le formulaire. */}
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-black/55 shadow-[0_24px_80px_-32px_rgba(0,0,0,0.9)] backdrop-blur-2xl">
        {/* Halos d'angle : rappellent les deux destinations possibles derrière
            cette porte unique — violet pour le Lab, vert pour One. */}
        <div
          aria-hidden
          className="pointer-events-none absolute -left-20 -top-24 h-56 w-56 rounded-full bg-[#935fee]/25 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-24 -right-20 h-56 w-56 rounded-full bg-[#09e159]/20 blur-3xl"
        />

        <div className="relative px-7 pb-7 pt-8">
          <header className="mb-7 text-center">
            <h1 className="text-2xl font-semibold tracking-tight text-white">
              MonprojetPro
            </h1>
            <p className="mt-1.5 text-sm text-gray-400">Connexion à votre espace</p>
          </header>

          <Suspense fallback={<LoginFormSkeleton />}>
            <LoginForm />
          </Suspense>

          <footer className="mt-6 border-t border-white/10 pt-4 text-center">
            <Link
              href="/forgot-password"
              className="text-sm text-gray-400 underline-offset-4 transition-colors hover:text-white hover:underline"
            >
              Mot de passe oublié ?
            </Link>
          </footer>
        </div>
      </div>

      <p className="mt-6 text-center text-xs text-gray-400">
        <Link
          href="https://www.monprojet-pro.com"
          className="underline-offset-4 transition-colors hover:text-white hover:underline"
        >
          monprojet-pro.com
        </Link>
      </p>
    </div>
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
