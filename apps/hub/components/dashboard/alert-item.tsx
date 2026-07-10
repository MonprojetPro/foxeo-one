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
      className="group flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-white/[0.03]"
    >
      <Icon className={`h-4 w-4 shrink-0 ${iconColor}`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-100">{title}</p>
        <p className="truncate text-xs text-gray-500">{detail}</p>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-gray-500 opacity-0 transition-opacity group-hover:opacity-100" />
    </Link>
  )
}
