'use client'

import { useState } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import {
  type LucideIcon,
  User, Clock, FolderOpen, MessageSquare, Zap,
  Mail, Headphones, ClipboardList, Bot, Palette, FlaskConical, Settings,
  MessageCircle, Code2, Pause, Lock,
} from 'lucide-react'
import { cn } from '@monprojetpro/utils'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, Button, showSuccess } from '@monprojetpro/ui'
import { ClientInfoTab } from './client-info-tab'
import { ClientTimeline } from './client-timeline'
import { ClientDocumentsTab } from './client-documents-tab'
import { ClientExchangesTab } from './client-exchanges-tab'
import { ModuleToggleList } from './module-toggle-list'
import { ElioDocForm } from './elio-doc-form'
import { SuspendClientDialog } from './suspend-client-dialog'
import { CloseClientDialog } from './close-client-dialog'
import { buildClientSlug, buildBmadPath, buildCursorUrl } from '../utils/cursor-integration'
import type { ModuleManifest } from '@monprojetpro/types'
import type { Client } from '../types/crm.types'

export interface ExtraTab {
  value: string
  label: string
  content: React.ReactNode
  icon?: LucideIcon
  color?: string
}

interface ClientTabsProps {
  client: Client
  onEdit?: () => void
  extraTabs?: ExtraTab[]
  activeModules?: string[]
  allModules?: ModuleManifest[]
}

// ── Tab pill button ───────────────────────────────────────────────────────────

function TabPill({
  label,
  Icon,
  color,
  isActive,
  disabled,
  onClick,
}: {
  label: string
  Icon: LucideIcon
  color: string
  isActive?: boolean
  disabled?: boolean
  onClick: () => void
}) {
  const [hovered, setHovered] = useState(false)
  const filled = isActive || (hovered && !disabled)

  return (
    <div className="relative flex flex-col items-center flex-1" style={{ paddingBottom: 34 }}>
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        aria-label={label}
        aria-pressed={isActive}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className="relative flex items-center justify-center focus-visible:outline-none disabled:opacity-30 disabled:cursor-not-allowed"
        style={{
          width: 46,
          height: 46,
          borderRadius: '50%',
          border: `1px solid ${filled ? 'transparent' : 'hsl(var(--border))'}`,
          backgroundImage: `linear-gradient(to top, ${color} 50%, transparent 50%)`,
          backgroundSize: '100% 200%',
          backgroundPosition: filled ? '0% 100%' : '0% 0%',
          boxShadow: isActive ? `0 0 16px ${color}40` : undefined,
          transition: 'background-position 0.35s ease-in-out, border-color 0.3s, box-shadow 0.3s',
        }}
      >
        <Icon
          className={cn(
            'transition-colors duration-300',
            filled ? 'text-white' : 'text-muted-foreground'
          )}
          style={{ width: 20, height: 20 }}
        />
      </button>

      {/* Tooltip below */}
      <span
        className="absolute whitespace-nowrap rounded-md px-2 py-1 text-xs font-semibold text-white pointer-events-none select-none transition-opacity duration-300"
        style={{
          background: color,
          bottom: 2,
          left: '50%',
          transform: 'translateX(-50%)',
          opacity: hovered ? 1 : 0,
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
  client,
  onEdit,
  extraTabs = [],
  activeModules = [],
  allModules = [],
}: ClientTabsProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const activeTab = searchParams.get('tab') || 'informations'

  // Dialog states
  const [suspendOpen, setSuspendOpen] = useState(false)
  const [closeOpen, setCloseOpen] = useState(false)
  const [cursorOpen, setCursorOpen] = useState(false)

  function handleTabChange(value: string) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', value)
    router.push(`${pathname}?${params.toString()}`)
  }

  // Cursor integration
  const clientSlug = buildClientSlug(client.name, client.company)
  const bmadPath = buildBmadPath(clientSlug)
  const cursorUrl = buildCursorUrl(bmadPath)

  function handleOpenCursor() {
    window.location.href = cursorUrl
    setTimeout(() => setCursorOpen(true), 1500)
  }

  async function handleCopyPath() {
    try {
      await navigator.clipboard.writeText(bmadPath)
      showSuccess('Chemin copié dans le presse-papier')
    } catch { /* silencieux */ }
  }

  const isActive = client.status === 'active'
  const isSuspended = client.status === 'suspended'

  // ── All 16 icons ────────────────────────────────────────────────────────────

  type IconItem =
    | { type: 'tab'; value: string; label: string; Icon: LucideIcon; color: string }
    | { type: 'action'; value: string; label: string; Icon: LucideIcon; color: string; onClick: () => void; disabled?: boolean }

  const actionItems: IconItem[] = [
    {
      type: 'action', value: 'chat', label: 'Chat',
      Icon: MessageCircle, color: '#38bdf8',
      onClick: () => router.push(`/modules/chat/${client.id}`),
    },
    {
      type: 'action', value: 'cursor', label: 'Cursor',
      Icon: Code2, color: '#818cf8',
      onClick: handleOpenCursor,
    },
    {
      type: 'action', value: 'suspendre', label: 'Suspendre',
      Icon: Pause, color: '#fb923c',
      onClick: () => setSuspendOpen(true),
      disabled: !isActive,
    },
    {
      type: 'action', value: 'cloturer', label: 'Clôturer',
      Icon: Lock, color: '#f87171',
      onClick: () => setCloseOpen(true),
      disabled: !isActive && !isSuspended,
    },
  ]

  const defaultTabItems: IconItem[] = [
    { type: 'tab', value: 'informations', label: 'Infos',      Icon: User,          color: '#3ecfa0' },
    { type: 'tab', value: 'historique',   label: 'Historique', Icon: Clock,         color: '#3ecfa0' },
    { type: 'tab', value: 'documents',    label: 'Documents',  Icon: FolderOpen,    color: '#3ecfa0' },
    { type: 'tab', value: 'echanges',     label: 'Échanges',   Icon: MessageSquare, color: '#3ecfa0' },
    { type: 'tab', value: 'modules',      label: 'One',        Icon: Zap,           color: '#3ecfa0' },
  ]

  const fallbackIcons: Record<string, { Icon: LucideIcon; color: string }> = {
    'emails':         { Icon: Mail,          color: '#60a5fa' },
    'support':        { Icon: Headphones,    color: '#a78bfa' },
    'submissions':    { Icon: ClipboardList, color: '#34d399' },
    'elio-config':    { Icon: Bot,           color: '#f59e0b' },
    'branding':       { Icon: Palette,       color: '#ec4899' },
    'lab-billing':    { Icon: FlaskConical,  color: '#22d3ee' },
    'administration': { Icon: Settings,      color: '#94a3b8' },
  }

  const extraTabItems: IconItem[] = extraTabs.map((tab) => {
    const fb = fallbackIcons[tab.value]
    return {
      type: 'tab' as const,
      value: tab.value,
      label: tab.label,
      Icon: tab.icon ?? fb?.Icon ?? Settings,
      color: tab.color ?? fb?.color ?? '#94a3b8',
    }
  })

  const allItems: IconItem[] = [...actionItems, ...defaultTabItems, ...extraTabItems]

  return (
    <div className="flex flex-col gap-4">
      {/* Icon bar */}
      <div className="rounded-xl border border-border bg-card px-4 pt-4 pb-0">
        <div className="flex items-start justify-between w-full">
          {allItems.map((item) => (
            <TabPill
              key={item.value}
              label={item.label}
              Icon={item.Icon}
              color={item.color}
              isActive={item.type === 'tab' && activeTab === item.value}
              disabled={item.type === 'action' ? item.disabled : false}
              onClick={
                item.type === 'tab'
                  ? () => handleTabChange(item.value)
                  : item.onClick
              }
            />
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div>
        {activeTab === 'informations' && <ClientInfoTab clientId={client.id} onEdit={onEdit} />}
        {activeTab === 'historique'   && <ClientTimeline clientId={client.id} />}
        {activeTab === 'documents'    && <ClientDocumentsTab clientId={client.id} />}
        {activeTab === 'echanges'     && <ClientExchangesTab clientId={client.id} />}
        {activeTab === 'modules' && (
          <div className="space-y-8">
            <section>
              <h3 className="text-lg font-semibold mb-4">Modules actifs</h3>
              <ModuleToggleList clientId={client.id} activeModules={activeModules} allModules={allModules} />
            </section>
            <section>
              <h3 className="text-lg font-semibold mb-4">Documentation Élio</h3>
              <ElioDocForm clientId={client.id} activeModules={activeModules} />
            </section>
          </div>
        )}
        {extraTabs.map((tab) => activeTab === tab.value && <div key={tab.value}>{tab.content}</div>)}
      </div>

      {/* Dialogs */}
      <SuspendClientDialog
        clientId={client.id}
        clientName={client.name}
        open={suspendOpen}
        onOpenChange={setSuspendOpen}
      />
      <CloseClientDialog
        clientId={client.id}
        clientName={client.name}
        open={closeOpen}
        onOpenChange={setCloseOpen}
      />
      <Dialog open={cursorOpen} onOpenChange={setCursorOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ouvrir dans Cursor</DialogTitle>
            <DialogDescription>
              Le protocole Cursor n&apos;est pas supporté par votre navigateur. Copiez le chemin et ouvrez-le manuellement (File → Open Folder).
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-2 rounded-md border bg-muted p-3">
            <code className="flex-1 text-sm break-all">{bmadPath}</code>
            <Button variant="secondary" size="sm" onClick={handleCopyPath}>Copier</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
