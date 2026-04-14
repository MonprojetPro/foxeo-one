import Link from 'next/link'
import { ChevronRight, AlertTriangle, Bell, GraduationCap } from 'lucide-react'

const iconMap = {
  warning: AlertTriangle,
  bell: Bell,
  graduation: GraduationCap,
}

interface AlertItemProps {
  icon: keyof typeof iconMap
  title: string
  detail: string
  iconColor?: string
  href?: string
}

export function AlertItem({ icon, title, detail, iconColor = 'text-muted-foreground', href }: AlertItemProps) {
  const Icon = iconMap[icon]
  return (
    <Link
      href={href ?? '/modules/elio'}
      className="flex items-center gap-3 rounded-md px-3 py-2.5 hover:bg-accent/50 transition-colors group"
    >
      <Icon className={`h-4 w-4 shrink-0 ${iconColor}`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-foreground font-medium">{title}</p>
        <p className="text-xs text-muted-foreground truncate">{detail}</p>
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
    </Link>
  )
}
