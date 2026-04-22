'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Users, CheckCircle, Calendar, MessageSquare, FolderOpen, Calculator, Settings, Bot, Video } from 'lucide-react'
import { Badge } from '@monprojetpro/ui'
import { cn } from '@monprojetpro/utils'
import { useValidationBadge } from '@monprojetpro/modules-validation-hub'
import { usePendingRemindersCount } from '@monprojetpro/modules-facturation'
import { ElioQueryBox } from './elio-query-box'

const navItems = [
  { icon: Home,          label: 'Accueil',       href: '/' },
  { icon: Users,         label: 'Clients',        href: '/modules/crm' },
  { icon: CheckCircle,   label: 'Validation Hub', href: '/modules/validation-hub' },
  { icon: Calendar,      label: 'Agenda',         href: '/modules/agenda' },
  { icon: MessageSquare, label: 'Chat',            href: '/modules/chat' },
  { icon: Video,         label: 'Visio',           href: '/modules/visio' },
  { icon: FolderOpen,    label: 'Documents',      href: '/modules/documents' },
  { icon: Calculator,    label: 'Comptabilité',   href: '/modules/facturation' },
  { icon: Bot,           label: 'Élio',            href: '/elio' },
  { icon: Settings,      label: 'One',              href: '/modules/admin' },
]

export function HubSidebarClient({ operatorId, userId }: { operatorId: string; userId: string }) {
  const pathname = usePathname()
  const { pendingCount } = useValidationBadge(operatorId)
  const { pendingCount: reminderCount } = usePendingRemindersCount()

  return (
    <aside className="w-64 shrink-0 border-r border-sidebar-border bg-sidebar flex flex-col">
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = item.href === '/'
            ? pathname === '/'
            : pathname?.startsWith(item.href)
          const badge =
            item.href === '/modules/validation-hub' ? pendingCount
            : item.href === '/modules/facturation' ? reminderCount
            : undefined

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors font-medium',
                isActive
                  ? 'bg-primary/15 text-primary'
                  : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground'
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              <span className="flex-1">{item.label}</span>
              {badge !== undefined && badge > 0 && (
                <Badge className="text-[0.6rem] px-1.5 py-0 h-4 min-w-[1.25rem] flex items-center justify-center">
                  {badge}
                </Badge>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Élio Hub — widget bas de sidebar */}
      <div className="border-t border-sidebar-border">
        <ElioQueryBox userId={userId} />
      </div>
    </aside>
  )
}
