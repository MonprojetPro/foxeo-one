import Link from 'next/link'
import { Lock } from 'lucide-react'

/**
 * État « Élio en veille » — affiché quand le client n'a pas (ou plus) consenti
 * au traitement de ses données par l'IA. Le verrou réel est côté serveur
 * (sendToElio / newConversation) ; ce composant est l'interface honnête côté UI :
 * il dit clairement qu'aucune donnée n'est traitée et propose de réactiver.
 */
export function ElioVeille() {
  return (
    <div className="flex flex-1 items-center justify-center p-8">
      <div className="max-w-md space-y-4 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-muted">
          <Lock className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
        </div>
        <h2 className="text-xl font-semibold">Élio est en veille</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Vous n&apos;avez pas activé l&apos;assistant IA, donc Élio ne traite aucune
          de vos données pour le moment. Pour discuter avec lui, activez le
          traitement de vos données par l&apos;IA.
        </p>
        <Link
          href="/settings/consents"
          className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Activer Élio
        </Link>
      </div>
    </div>
  )
}
