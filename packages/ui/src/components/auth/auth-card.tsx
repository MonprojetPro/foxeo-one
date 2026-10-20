import Link from 'next/link'
import { cn } from '@monprojetpro/utils'

export interface AuthCardProps {
  title: string
  description?: string
  children: React.ReactNode
  /** Zone sous le formulaire, séparée par une bordure (ex: « Mot de passe oublié ? », « Retour au login »). */
  footer?: React.ReactNode
  className?: string
}

/**
 * Carte de la porte d'entrée (connexion, 2FA, mot de passe oublié…) — T-060.
 *
 * Extraite de `apps/client/(auth)/login/page.tsx`, seule page qui avait
 * jusque-là ce traitement (verre sur fond noir, halos violet/vert, logo,
 * lien `monprojet-pro.com`). Les pages d'authentification secondaire du Hub
 * (2FA, configuration 2FA) utilisaient une simple `Card` shadcn sans ce
 * traitement — signalé par MiKL (20-10) après l'avoir remarqué entre les deux
 * étapes d'une même connexion.
 *
 * Se combine avec `<LightPillar />` posé dans le layout englobant : cette
 * carte ne dessine QUE le verre et les halos de coin, pas le faisceau de fond.
 */
export function AuthCard({ title, description, children, footer, className }: AuthCardProps) {
  return (
    <div className={cn('w-full max-w-sm', className)}>
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-black/55 shadow-[0_24px_80px_-32px_rgba(0,0,0,0.9)] backdrop-blur-2xl">
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
            <h1 className="text-2xl font-semibold tracking-tight text-white">{title}</h1>
            {description && <p className="mt-1.5 text-sm text-gray-400">{description}</p>}
          </header>

          {children}

          {footer && (
            <footer className="mt-6 border-t border-white/10 pt-4 text-center">{footer}</footer>
          )}
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
