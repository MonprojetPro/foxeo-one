import { Archive, MessageCircle } from 'lucide-react'

export interface ReadOnlyBannerProps {
  /** Lien vers le chat MiKL — le canal qui reste ouvert. Interne à l'app client. */
  chatHref?: string
  className?: string
}

/**
 * Bandeau « abonnement terminé » affiché en haut du dashboard d'un client résilié
 * (`subscription_cancelled` / `handed_off`).
 *
 * INTENTION — ce bandeau n'annonce pas une sanction, il annonce une porte ouverte.
 * Le client doit comprendre en une lecture : (1) son espace et ses documents sont
 * toujours là, (2) il peut écrire à MiKL quand il veut. On ne mentionne donc jamais
 * ce qui est « bloqué » : on dit ce qui reste possible.
 *
 * Code couleur ambre (et non rouge) volontaire : information, pas erreur. Distinct de
 * la rubalise orange « chantier » du header, qui parle du développement de l'outil.
 */
export function ReadOnlyBanner({
  chatHref = '/modules/chat',
  className = '',
}: ReadOnlyBannerProps) {
  return (
    <div
      role="status"
      className={[
        'flex flex-col gap-3 rounded-xl border px-4 py-3 sm:flex-row sm:items-center sm:justify-between',
        'border-amber-300/70 bg-amber-50 text-amber-950',
        'dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100',
        className,
      ].join(' ')}
    >
      <div className="flex items-start gap-3">
        <Archive
          className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400"
          aria-hidden="true"
        />
        <div className="space-y-0.5">
          <p className="text-sm font-semibold">Votre abonnement est terminé</p>
          <p className="text-sm opacity-90">
            Votre espace reste ouvert : vous pouvez consulter tout votre parcours et
            télécharger vos documents à tout moment. Envie de reprendre ou besoin d&apos;autre
            chose ? Écrivez à MiKL, il vous répond.
          </p>
        </div>
      </div>

      <a
        href={chatHref}
        className={[
          'inline-flex shrink-0 items-center justify-center gap-2 rounded-lg px-4 py-2',
          'text-sm font-semibold transition-colors',
          'bg-amber-600 text-white hover:bg-amber-700',
          'dark:bg-amber-500/90 dark:text-amber-950 dark:hover:bg-amber-400',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2',
        ].join(' ')}
      >
        <MessageCircle className="h-4 w-4" aria-hidden="true" />
        Contacter MiKL
      </a>
    </div>
  )
}
