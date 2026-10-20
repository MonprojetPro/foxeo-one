import { LightPillar } from '@monprojetpro/ui'

// T-060 — même décor que la porte d'entrée unique (apps/client/(auth)/layout.tsx) :
// avant ce correctif, le Hub avait son propre layout nu (`bg-background` plat),
// alors que la connexion (étape 1, sur apps/client) a le faisceau de lumière.
// MiKL passe par les deux dans la MÊME connexion (login → 2FA du Hub) — la
// rupture de design se voyait entre deux écrans de la même action.
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <LightPillar />
      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-10">
        {children}
      </div>
    </>
  )
}
