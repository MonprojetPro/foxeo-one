'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { type LucideIcon, User, Clock, FolderOpen, MessageSquare, Zap, Mail, Headphones, ClipboardList, Bot, Palette, FlaskConical, Settings } from 'lucide-react'
import { ClientInfoTab } from './client-info-tab'
import { ClientTimeline } from './client-timeline'
import { ClientDocumentsTab } from './client-documents-tab'
import { ClientExchangesTab } from './client-exchanges-tab'
import { ModuleToggleList } from './module-toggle-list'
import { ElioDocForm } from './elio-doc-form'
import type { ModuleManifest } from '@monprojetpro/types'

export interface ExtraTab {
  value: string
  label: string
  content: React.ReactNode
  icon?: LucideIcon
  color?: string
}

interface ClientTabsProps {
  clientId: string
  onEdit?: () => void
  extraTabs?: ExtraTab[]
  activeModules?: string[]
  allModules?: ModuleManifest[]
}

type TabConfig = {
  value: string
  label: string
  Icon: LucideIcon
  color: string
}

const DEFAULT_TABS: TabConfig[] = [
  { value: 'informations', label: 'Infos',      Icon: User,          color: '#3ecfa0' },
  { value: 'historique',   label: 'Historique', Icon: Clock,         color: '#3ecfa0' },
  { value: 'documents',    label: 'Documents',  Icon: FolderOpen,    color: '#3ecfa0' },
  { value: 'echanges',     label: 'Échanges',   Icon: MessageSquare, color: '#3ecfa0' },
  { value: 'modules',      label: 'One',        Icon: Zap,           color: '#3ecfa0' },
]

const FALLBACK_EXTRA_ICONS: Record<string, { Icon: LucideIcon; color: string }> = {
  'emails':          { Icon: Mail,          color: '#60a5fa' },
  'support':         { Icon: Headphones,    color: '#a78bfa' },
  'submissions':     { Icon: ClipboardList, color: '#34d399' },
  'elio-config':     { Icon: Bot,           color: '#f59e0b' },
  'branding':        { Icon: Palette,       color: '#ec4899' },
  'lab-billing':     { Icon: FlaskConical,  color: '#22d3ee' },
  'administration':  { Icon: Settings,      color: '#94a3b8' },
}

// ── Icon pill button ──────────────────────────────────────────────────────────

function TabPill({
  value,
  label,
  Icon,
  color,
  isActive,
  onClick,
}: {
  value: string
  label: string
  Icon: LucideIcon
  color: string
  isActive: boolean
  onClick: () => void
}) {
  return (
    <div className="relative flex flex-col items-center group" style={{ paddingBottom: '36px' }}>
      <button
        type="button"
        onClick={onClick}
        aria-label={label}
        aria-pressed={isActive}
        className="relative w-11 h-11 rounded-full overflow-hidden border transition-shadow duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
        style={{
          borderColor: isActive ? color : 'var(--border)',
          background: 'var(--card)',
          boxShadow: isActive ? `0 0 14px ${color}30` : undefined,
        }}
      >
        {/* Fill from bottom */}
        <span
          className="absolute inset-0 rounded-full transition-all duration-300 ease-in-out"
          style={{
            background: color,
            transform: isActive ? 'translateY(0%)' : 'translateY(100%)',
          }}
          aria-hidden
        />
        {/* Icon */}
        <Icon
          className="relative z-10 transition-colors duration-300"
          style={{
            width: 18, height: 18,
            position: 'absolute',
            top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            color: isActive ? '#fff' : 'var(--muted-foreground)',
          }}
        />
      </button>

      {/* Tooltip */}
      <span
        className="absolute whitespace-nowrap rounded-md px-2 py-1 text-xs font-semibold text-white pointer-events-none select-none
                   opacity-0 group-hover:opacity-100
                   transition-all duration-300 ease-in-out"
        style={{
          background: color,
          bottom: 2,
          left: '50%',
          transform: 'translateX(-50%)',
        }}
        aria-hidden
      >
        {label}
      </span>
    </div>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ClientTabs({
  clientId,
  onEdit,
  extraTabs = [],
  activeModules = [],
  allModules = [],
}: ClientTabsProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const activeTab = searchParams.get('tab') || 'informations'

  function handleTabChange(value: string) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', value)
    router.push(`${pathname}?${params.toString()}`)
  }

  // Build extra tab configs
  const extraTabConfigs: TabConfig[] = extraTabs.map((tab) => {
    const fallback = FALLBACK_EXTRA_ICONS[tab.value]
    return {
      value: tab.value,
      label: tab.label,
      Icon: tab.icon ?? fallback?.Icon ?? Settings,
      color: tab.color ?? fallback?.color ?? '#94a3b8',
    }
  })

  const allTabs = [...DEFAULT_TABS, ...extraTabConfigs]

  return (
    <div className="flex flex-col gap-0">
      {/* Icon bar */}
      <div className="rounded-xl border border-border bg-card px-4 pt-4 pb-0 overflow-x-auto">
        <div className="flex items-start gap-1 min-w-max">
          {allTabs.map((tab) => (
            <TabPill
              key={tab.value}
              value={tab.value}
              label={tab.label}
              Icon={tab.Icon}
              color={tab.color}
              isActive={activeTab === tab.value}
              onClick={() => handleTabChange(tab.value)}
            />
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="mt-4">
        {activeTab === 'informations' && (
          <ClientInfoTab clientId={clientId} onEdit={onEdit} />
        )}
        {activeTab === 'historique' && (
          <ClientTimeline clientId={clientId} />
        )}
        {activeTab === 'documents' && (
          <ClientDocumentsTab clientId={clientId} />
        )}
        {activeTab === 'echanges' && (
          <ClientExchangesTab clientId={clientId} />
        )}
        {activeTab === 'modules' && (
          <div className="space-y-8">
            <section>
              <h3 className="text-lg font-semibold mb-4">Modules actifs</h3>
              <ModuleToggleList
                clientId={clientId}
                activeModules={activeModules}
                allModules={allModules}
              />
            </section>
            <section>
              <h3 className="text-lg font-semibold mb-4">Documentation Élio</h3>
              <ElioDocForm clientId={clientId} activeModules={activeModules} />
            </section>
          </div>
        )}
        {extraTabs.map((tab) => (
          activeTab === tab.value && (
            <div key={tab.value}>{tab.content}</div>
          )
        ))}
      </div>
    </div>
  )
}
