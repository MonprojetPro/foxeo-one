import Link from 'next/link'
import { Badge } from '@monprojetpro/ui'

interface DashboardCardProps {
  title: string
  badge?: number
  linkText?: string
  linkHref?: string
  children: React.ReactNode
}

export function DashboardCard({
  title,
  badge,
  linkText = 'Voir tout →',
  linkHref,
  children,
}: DashboardCardProps) {
  return (
    <div className="bg-card rounded-lg border border-border">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <h3 className="text-[0.8rem] font-semibold uppercase tracking-wider text-foreground">
            {title}
          </h3>
          {badge !== undefined && badge > 0 && (
            <Badge className="text-[0.65rem] px-1.5 py-0">{badge}</Badge>
          )}
        </div>
        {linkHref && (
          <Link href={linkHref} className="text-xs text-primary hover:underline">
            {linkText}
          </Link>
        )}
      </div>
      <div className="p-1">{children}</div>
    </div>
  )
}
