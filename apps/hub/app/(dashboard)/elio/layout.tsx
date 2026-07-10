'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { pillClasses, type CockpitTone } from '@monprojetpro/ui'

const tabs: { label: string; href: string; tone: CockpitTone }[] = [
  { label: 'Élio Lab', href: '/elio/lab', tone: 'violet' },
  { label: 'Élio One', href: '/elio/one', tone: 'emerald' },
  { label: 'Élio Hub', href: '/elio/hub', tone: 'cyan' },
]

export default function ElioLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="flex h-full flex-col">
      {/* Nav à pills cockpit — chaque espace Élio garde son ton (Lab violet / One vert / Hub cyan) */}
      <div className="px-6 pt-6 md:px-8">
        <nav aria-label="Navigation Élio" className="flex flex-wrap gap-2">
          {tabs.map((tab) => {
            const isActive = pathname?.startsWith(tab.href) ?? false
            return (
              <Link key={tab.href} href={tab.href} className={pillClasses(isActive, tab.tone)}>
                {tab.label}
              </Link>
            )
          })}
        </nav>
      </div>
      <div className="flex-1 overflow-y-auto">{children}</div>
    </div>
  )
}
