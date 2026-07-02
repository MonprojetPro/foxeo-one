'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Users, CheckCircle, Calendar, MessageSquare, FolderOpen, Calculator, Settings, Bot, Video, ChefHat, Wrench } from 'lucide-react'
import { Badge } from '@monprojetpro/ui'
import { cn } from '@monprojetpro/utils'
import { useValidationBadge, useValidationRealtime } from '@monprojetpro/modules-validation-hub'
import { usePendingRemindersCount } from '@monprojetpro/modules-facturation'
import { useConversations, useConversationsRealtime } from '@monprojetpro/modules-chat'
import { ElioQueryBox } from './elio-query-box'

const navItems = [
  { icon: Home,          label: 'Accueil',       href: '/' },
  { icon: Users,         label: 'Clients',        href: '/modules/crm' },
  { icon: CheckCircle,   label: 'Validation Hub', href: '/modules/validation-hub' },
  { icon: Calendar,      label: 'Agenda',         href: '/modules/agenda' },
  { icon: MessageSquare, label: 'Chat',            href: '/modules/chat' },
  { icon: Video,         label: 'Visio',           href: '/modules/visio' },
  { icon: FolderOpen,    label: 'Documents',      href: '/modules/documents' },
  { icon: Calculator,    label: 'Comptabilité',   href: '/modules/facturation' },
  { icon: Bot,           label: 'Élio',            href: '/elio' },
  { icon: Settings,      label: 'Instances',        href: '/modules/admin' },
  { icon: Wrench,        label: 'Maintenance & Système', href: '/modules/admin/system' },
]

// Section « Produits » — produits externes pilotés depuis le Hub (cockpits).
const produitItems = [
  { icon: ChefHat, label: 'MenuFacile', href: '/modules/menu-facile' },
]

export function HubSidebarClient({ operatorId, userId }: { operatorId: string; userId: string }) {
  const pathname = usePathname()
  const { pendingCount } = useValidationBadge(operatorId)
  const { pendingCount: reminderCount } = usePendingRemindersCount()
  // Branche Realtime sur validation_requests pour que le badge se mette à jour instantanément
  // (sinon polling 30s via refetchInterval, ce qui fait râler l'utilisateur).
  useValidationRealtime(operatorId)

  // Badge "Chat" — somme des messages non lus toutes conversations confondues.
  // useConversations a un refetchInterval 30s en fallback + useConversationsRealtime
  // pour update instantané quand un client envoie un message.
  const { data: conversations } = useConversations()
  useConversationsRealtime({ operatorId })
  const unreadChatCount = conversations?.reduce((sum, c) => sum + c.unreadCount, 0) ?? 0

  return (
    <aside className="w-64 shrink-0 border-r border-sidebar-border bg-sidebar flex flex-col">
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = item.href === '/'
            ? pathname === '/'
            : item.href === '/modules/admin'
              // « Instances » ne doit pas rester actif sur la sous-route /modules/admin/system
              // (« Maintenance & Système »), qui partage le même préfixe.
              ? !!pathname?.startsWith('/modules/admin') && !pathname.startsWith('/modules/admin/system')
              : pathname?.startsWith(item.href)
          const badge =
            item.href === '/modules/validation-hub' ? pendingCount
            : item.href === '/modules/facturation' ? reminderCount
            : item.href === '/modules/chat' ? unreadChatCount
            : undefined

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors font-medium',
                isActive
                  ? 'bg-primary/15 text-primary'
                  : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground'
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              <span className="flex-1">{item.label}</span>
              {badge !== undefined && badge > 0 && (
                <Badge className="text-[0.6rem] px-1.5 py-0 h-4 min-w-[1.25rem] flex items-center justify-center">
                  {badge}
                </Badge>
              )}
            </Link>
          )
        })}

        {/* Section Produits — cockpits de produits externes pilotés depuis le Hub */}
        <div className="pt-4 mt-2">
          <p className="px-3 pb-1 text-[0.65rem] font-semibold uppercase tracking-wider text-sidebar-foreground/40">
            Produits
          </p>
          {produitItems.map((item) => {
            const isActive = pathname?.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors font-medium',
                  isActive
                    ? 'bg-primary/15 text-primary'
                    : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground'
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                <span className="flex-1">{item.label}</span>
              </Link>
            )
          })}
        </div>
      </nav>

      {/* Élio Hub — widget bas de sidebar */}
      <div className="border-t border-sidebar-border">
        <ElioQueryBox userId={userId} />
      </div>
    </aside>
  )
}
