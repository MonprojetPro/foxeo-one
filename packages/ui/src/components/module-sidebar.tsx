'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@monprojetpro/utils'
import type { ModuleManifest, ModuleTarget } from '@monprojetpro/types'
import * as LucideIcons from 'lucide-react'

type ModuleSidebarProps = {
  target: ModuleTarget
  modules: ModuleManifest[]
}

function toIconKey(icon: string): string {
  return icon.split('-').map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join('')
}

export function ModuleSidebar({ target, modules }: ModuleSidebarProps) {
  const pathname = usePathname()
  const isLab = target === 'client-lab'

  return (
    <nav className="flex flex-col gap-1 py-4">
      {modules.map((module) => {
        const isActive = Boolean(pathname?.startsWith(`/modules/${module.id}`))
        const IconComponent = (LucideIcons as any)[toIconKey(module.navigation.icon)] || LucideIcons.Box

        return (
          <div key={module.id} className="relative mx-2">
            {isActive && (
              <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-5 bg-[#7c3aed] rounded-full" />
            )}
            <Link
              href={`/modules/${module.id}`}
              className={cn(
                'flex items-center gap-3 h-[40px] rounded-lg px-3 text-[13px] font-medium transition-colors',
                isActive
                  ? 'bg-[#1e1557] border border-[#7c3aed] text-[#a78bfa]'
                  : 'text-[#9ca3af] hover:bg-[#1a1a1a] hover:text-[#f9fafb]'
              )}
            >
              <IconComponent size={16} />
              <span>{module.navigation.label}</span>
            </Link>
          </div>
        )
      })}
    </nav>
  )
}
