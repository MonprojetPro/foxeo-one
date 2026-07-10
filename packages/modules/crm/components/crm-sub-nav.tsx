'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { pillClasses } from '@monprojetpro/ui'

const NAV_ITEMS = [
  { href: '/modules/crm', label: 'Clients' },
  { href: '/modules/crm/reminders', label: 'Rappels' },
  { href: '/modules/crm/stats', label: 'Statistiques' },
] as const

export function CrmSubNav() {
  const pathname = usePathname()

  return (
    // Navigation sous-menu CRM — pills cockpit accent cyan
    <nav className="flex flex-wrap gap-2 mb-6" data-testid="crm-sub-nav">
      {NAV_ITEMS.map((item) => {
        const isActive = item.href === '/modules/crm'
          ? pathname === item.href
          : pathname.startsWith(item.href)

        return (
          <Link
            key={item.href}
            href={item.href}
            className={pillClasses(isActive, 'cyan')}
          >
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
