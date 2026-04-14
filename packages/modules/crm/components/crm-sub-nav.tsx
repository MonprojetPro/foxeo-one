'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@monprojetpro/utils'

const NAV_ITEMS = [
  { href: '/modules/crm', label: 'Clients' },
  { href: '/modules/crm/reminders', label: 'Rappels' },
  { href: '/modules/crm/stats', label: 'Statistiques' },
] as const

export function CrmSubNav() {
  const pathname = usePathname()

  return (
    <nav className="flex gap-1 border-b pb-2 mb-6" data-testid="crm-sub-nav">
      {NAV_ITEMS.map((item) => {
        const isActive = item.href === '/modules/crm'
          ? pathname === item.href
          : pathname.startsWith(item.href)

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'px-3 py-1.5 text-sm rounded-md transition-colors',
              isActive
                ? 'bg-primary/10 text-primary font-medium'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            )}
          >
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
