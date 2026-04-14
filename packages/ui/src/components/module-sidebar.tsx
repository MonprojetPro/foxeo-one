'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@monprojetpro/utils'
import type { ModuleManifest, ModuleTarget } from '@monprojetpro/types'
import * as LucideIcons from 'lucide-react'

type ModuleSidebarProps = {
  target: ModuleTarget
  modules: ModuleManifest[]
}

export function ModuleSidebar({ target, modules }: ModuleSidebarProps) {
  const pathname = usePathname()

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-sidebar-border">
        <h2 className="text-lg font-semibold text-sidebar-foreground">
          {target === 'hub' ? 'MonprojetPro Hub' : 'MonprojetPro Client'}
        </h2>
      </div>

      <nav className="flex-1 p-2 overflow-y-auto">
        <ul className="space-y-1">
          {modules.map((module) => {
            const isActive = pathname?.startsWith(`/modules/${module.id}`)
            const IconComponent = (LucideIcons as any)[module.navigation.icon] || LucideIcons.Box

            return (
              <li key={module.id}>
                <Link
                  href={`/modules/${module.id}`}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                    'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                    isActive
                      ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                      : 'text-sidebar-foreground'
                  )}
                >
                  <IconComponent className="h-5 w-5 shrink-0" />
                  <span>{module.navigation.label}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      <div className="p-4 border-t border-sidebar-border">
        <p className="text-xs text-muted-foreground">
          {modules.length} module{modules.length > 1 ? 's' : ''} actif{modules.length > 1 ? 's' : ''}
        </p>
      </div>
    </div>
  )
}
