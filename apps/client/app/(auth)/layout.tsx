import { LightPillar } from '@monprojetpro/ui'
import { ThemeReset } from './theme-reset'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <ThemeReset />
      {/* Décor commun à toute la porte d'entrée : connexion, inscription,
          mot de passe oublié, mentions légales. */}
      <LightPillar />
      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-10">
        {children}
      </div>
    </>
  )
}
