import Link from 'next/link'
import { Lock } from 'lucide-react'

interface ElioVeilleProps {
  title?: string
  body?: string
  /** Lien d'action (ex : réactiver le consentement). Masqué si absent. */
  ctaHref?: string
  ctaLabel?: string
}

/**
 * État « Élio en veille » — affiché quand Élio ne peut pas répondre. Deux cas :
 *  - consentement IA absent (défaut) → CTA vers les consentements ;
 *  - agents Lab coupés par l'opérateur → message sans CTA (c'est MiKL qui décide).
 * Le verrou réel est côté serveur (sendToElio / newConversation) ; ce composant est
 * l'interface honnête côté UI.
 */
export function ElioVeille({
  title = 'Élio est en veille',
  body = "Vous n'avez pas activé l'assistant IA, donc Élio ne traite aucune de vos données pour le moment. Pour discuter avec lui, activez le traitement de vos données par l'IA.",
  ctaHref = '/settings/consents',
  ctaLabel = 'Activer Élio',
}: ElioVeilleProps = {}) {
  return (
    <div className="flex flex-1 items-center justify-center p-8">
      <div className="max-w-md space-y-4 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-muted">
          <Lock className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
        </div>
        <h2 className="text-xl font-semibold">{title}</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">{body}</p>
        {ctaHref && (
          <Link
            href={ctaHref}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {ctaLabel}
          </Link>
        )}
      </div>
    </div>
  )
}
