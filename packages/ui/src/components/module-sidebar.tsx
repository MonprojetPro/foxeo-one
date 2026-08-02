'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Map, MessageCircle, Users, FileText, Send, Bot,
  LayoutDashboard, Settings, BarChart2, Video,
  Bell, HelpCircle, CheckCircle2, Calculator, Box,
  AlertTriangle,
} from 'lucide-react'
import { cn } from '@monprojetpro/utils'
import type { ModuleManifest, ModuleTarget } from '@monprojetpro/types'

export type ModuleSidebarBadgeVariant = 'red' | 'orange' | 'yellow' | 'blue' | 'violet' | 'green'

export type ModuleSidebarBadge = {
  count?: number
  variant: ModuleSidebarBadgeVariant
  ariaLabel?: string
}

type ModuleSidebarProps = {
  target: ModuleTarget
  modules: ModuleManifest[]
  elioWidget?: React.ReactNode
  badges?: Record<string, ModuleSidebarBadge>
}

/**
 * Signalement sidebar : une icône « attention » teintée, jamais une pastille pleine.
 * Décision MiKL (2026-08-01) — une gommette de couleur ne dit rien au client : l'icône
 * signale « il y a quelque chose à aller voir », et c'est Élio le Concierge qui explique
 * de quoi il s'agit (cf. règles parcours dans `system-prompts.ts`). Le code couleur est
 * conservé pour la hiérarchie (rouge > orange > jaune), mais il n'est qu'un renfort :
 * l'information reste lisible sans lui (icône + infobulle + aria-label).
 */
const BADGE_VARIANT_CLASSES: Record<ModuleSidebarBadgeVariant, string> = {
  red:    'text-red-400',
  orange: 'text-orange-400',
  yellow: 'text-yellow-400',
  blue:   'text-blue-400',
  violet: 'text-[#a78bfa]',
  green:  'text-green-400',
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

const SECTION_LABEL: Record<string, string> = {
  'client-lab': "Parcours d'incubation",
  'client-one': 'Espace pro',
  'hub': 'Hub MonprojetPro',
}

export function ModuleSidebar({ target, modules, elioWidget, badges }: ModuleSidebarProps) {
  const pathname = usePathname()
  const isLab = target === 'client-lab'
  const isOne = target === 'client-one'
  // Mode One : on utilise les variables CSS injectées par le layout (--brand-accent) pour suivre
  // la couleur custom du client. Mode Lab : violet fixe (pas de personnalisation brand Lab).
  const activeColor = isLab ? '#a78bfa' : 'var(--brand-accent, #4ade80)'
  const activeBg = isLab ? '#1e1557' : 'color-mix(in srgb, var(--brand-accent, #16a34a) 10%, transparent)'
  const activeBorder = isLab ? '#7c3aed' : 'var(--brand-accent, #16a34a)'

  // En mode One, Élio sort de la liste principale (widget dédié en bas via elioWidget prop).
  // En mode Lab, « Dashboard » (core-dashboard → '/') disparaît : la home Lab EST « Mon
  // Parcours » ('/' y redirige côté serveur) — garder l'entrée ferait un doublon inerte.
  const mainModules = isOne
    ? modules.filter(m => m.id !== 'elio')
    : isLab
      ? modules.filter(m => m.id !== 'core-dashboard')
      : modules

  return (
    <div className="flex flex-col h-full">
      {/* Section label */}
      <div className="px-[24px] pt-[18px] pb-[12px]">
        <span className="text-[10px] font-semibold text-[#6b7280] uppercase tracking-[0.1em]">
          {SECTION_LABEL[target] ?? 'Navigation'}
        </span>
      </div>

      {/* Nav items */}
      <nav className="flex flex-col gap-0.5 px-[14px]" aria-label="Navigation principale">
        {mainModules.map((module) => {
          // core-dashboard est l'accueil — on pointe vers / et non /modules/core-dashboard
          const href = module.id === 'core-dashboard' ? '/' : `/modules/${module.id}`
          const isActive = module.id === 'core-dashboard'
            ? pathname === '/'
            : Boolean(pathname?.startsWith(`/modules/${module.id}`))
          const IconComponent = ICON_MAP[module.navigation.icon] ?? Box

          const badge = badges?.[module.id]

          return (
            <Link
              key={module.id}
              href={href}
              style={isActive ? {
                background: activeBg,
                borderLeft: `2px solid ${activeBorder}`,
                color: activeColor,
                paddingLeft: '10px',
              } : {
                borderLeft: '2px solid transparent',
                paddingLeft: '12px',
              }}
              className={cn(
                'flex items-center gap-3 py-[9px] pr-3 rounded-lg text-[13px] transition-all duration-[0.12s]',
                isActive
                  ? 'font-semibold'
                  : 'font-medium text-[#9ca3af] hover:bg-[#1a1a1a]'
              )}
              aria-current={isActive ? 'page' : undefined}
            >
              <IconComponent size={16} aria-hidden="true" />
              <span className="flex-1">{module.navigation.label}</span>
              {badge && (badge.count === undefined || badge.count > 0) && (
                <span
                  className={cn(
                    'inline-flex items-center gap-1 shrink-0',
                    BADGE_VARIANT_CLASSES[badge.variant]
                  )}
                  aria-label={badge.ariaLabel}
                  title={badge.ariaLabel}
                >
                  <AlertTriangle size={14} aria-hidden="true" />
                  {badge.count !== undefined && (
                    <span className="text-[10px] font-bold leading-none">
                      {badge.count > 9 ? '9+' : badge.count}
                    </span>
                  )}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Élio widget — bas de sidebar (One uniquement, injecté depuis layout) */}
      {isOne && elioWidget && (
        <div className="border-t border-[#2d2d2d] pt-2">
          {elioWidget}
        </div>
      )}

      {/* Settings — bas de sidebar */}
      <div className="border-t border-[#2d2d2d] px-[14px] py-[14px] mb-2">
        <Link
          href="/settings"
          className={cn(
            'flex items-center gap-3 py-[9px] pl-3 pr-3 rounded-lg text-[13px] font-medium transition-all duration-[0.12s]',
            pathname?.startsWith('/settings')
              ? 'text-[#a78bfa]'
              : 'text-[#9ca3af] hover:bg-[#1a1a1a]'
          )}
        >
          <Settings size={16} aria-hidden="true" />
          <span>Paramètres</span>
        </Link>
      </div>
    </div>
  )
}
