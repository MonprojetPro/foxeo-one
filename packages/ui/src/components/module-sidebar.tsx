'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Map, MessageCircle, Users, FileText, Send, Bot,
  LayoutDashboard, Settings, BarChart2, Video,
  Bell, HelpCircle, CheckCircle2, Calculator, Box,
} from 'lucide-react'
import { cn } from '@monprojetpro/utils'
import type { ModuleManifest, ModuleTarget } from '@monprojetpro/types'

type ModuleSidebarProps = {
  target: ModuleTarget
  modules: ModuleManifest[]
}

const ICON_MAP: Record<string, React.ElementType> = {
  'map': Map,
  'message-circle': MessageCircle,
  'users': Users,
  'file-text': FileText,
  'send': Send,
  'bot': Bot,
  'LayoutDashboard': LayoutDashboard,
  'layout-dashboard': LayoutDashboard,
  'settings': Settings,
  'bar-chart': BarChart2,
  'video': Video,
  'bell': Bell,
  'help-circle': HelpCircle,
  'check-circle-2': CheckCircle2,
  'calculator': Calculator,
}

export function ModuleSidebar({ target, modules }: ModuleSidebarProps) {
  const pathname = usePathname()

  return (
    <nav className="flex flex-col gap-1 px-3 py-4">
      {modules.map((module) => {
        const isActive = Boolean(pathname?.startsWith(`/modules/${module.id}`))
        const IconComponent = ICON_MAP[module.navigation.icon] ?? Box

        return (
          <div key={module.id} className="relative">
            {isActive && (
              <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 bg-[#7c3aed] rounded-full" />
            )}
            <Link
              href={`/modules/${module.id}`}
              className={cn(
                'flex items-center gap-3 h-11 rounded-lg px-3 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-[#1e1557] border border-[#7c3aed] text-[#a78bfa]'
                  : 'text-[#9ca3af] hover:bg-[#1a1a1a] hover:text-[#f9fafb]'
              )}
            >
              <IconComponent size={18} className="shrink-0" />
              <span>{module.navigation.label}</span>
            </Link>
          </div>
        )
      })}
    </nav>
  )
}
