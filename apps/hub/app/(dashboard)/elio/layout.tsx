'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@monprojetpro/utils'

const tabs = [
  { label: 'Élio Lab',  href: '/elio/lab' },
  { label: 'Élio One',  href: '/elio/one' },
  { label: 'Élio Hub',  href: '/elio/hub' },
]

export default function ElioLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-border px-8 pt-6">
        <h1 className="text-xl font-bold text-foreground mb-4">Élio — Agents</h1>
        <nav aria-label="Navigation Élio" className="flex gap-1">
          {tabs.map((tab) => {
            const isActive = pathname?.startsWith(tab.href)
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  'px-4 py-2 text-sm font-medium rounded-t-md transition-colors',
                  isActive
                    ? 'bg-background border border-border border-b-background text-primary'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                )}
              >
                {tab.label}
              </Link>
            )
          })}
        </nav>
      </div>
      <div className="flex-1 overflow-y-auto">
        {children}
      </div>
    </div>
  )
}
