import Link from 'next/link'

interface DashboardCardProps {
  title: string
  badge?: number
  linkText?: string
  linkHref?: string
  children: React.ReactNode
}

/**
 * Conteneur titré du tableau de bord — style « cockpit » (verre sur fond noir).
 * En-tête avec titre en petites majuscules, pastille compteur cyan et lien « voir tout ».
 */
export function DashboardCard({
  title,
  badge,
  linkText = 'Voir tout →',
  linkHref,
  children,
}: DashboardCardProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02]">
      <div className="flex items-center justify-between gap-2 border-b border-white/10 px-4 py-3">
        <div className="flex items-center gap-2">
          <h3 className="text-[0.8rem] font-semibold uppercase tracking-wider text-gray-300">
            {title}
          </h3>
          {badge !== undefined && badge > 0 && (
            <span className="inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-cyan-400/20 px-1.5 text-[0.7rem] font-semibold tabular-nums text-cyan-100 ring-1 ring-cyan-400/30">
              {badge > 99 ? '99+' : badge}
            </span>
          )}
        </div>
        {linkHref && (
          <Link
            href={linkHref}
            className="text-xs text-cyan-300/80 transition-colors hover:text-cyan-200"
          >
            {linkText}
          </Link>
        )}
      </div>
      <div className="p-1.5">{children}</div>
    </div>
  )
}
