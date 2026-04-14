'use client'

import { Skeleton, Button } from '@monprojetpro/ui'
import { useClientActivityLogs } from '../hooks/use-client-activity-logs'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import { useRouter, usePathname } from 'next/navigation'
import {
  UserPlus,
  RefreshCw,
  FileText,
  CheckCircle,
  XCircle,
  Video,
  GraduationCap,
  FileUp,
  MessageSquare,
  Pin,
  ArrowRight,
  Archive,
  PauseCircle,
  PlayCircle,
  Trash2,
  ToggleLeft,
  CreditCard,
  Receipt,
  Package,
  Palette,
  Bot,
  FolderSync,
  TrendingUp,
} from 'lucide-react'
import { cn } from '@monprojetpro/utils'
import type { LucideIcon } from 'lucide-react'

interface ClientTimelineProps {
  clientId: string
}

interface EventConfig {
  label: string
  Icon: LucideIcon
  iconClass: string
  tab: string | null
  actionLabel: string | null
}

const EVENT_CONFIG: Record<string, EventConfig> = {
  // Client lifecycle
  client_created: {
    label: 'Client créé',
    Icon: UserPlus,
    iconClass: 'text-primary bg-primary/10',
    tab: 'informations',
    actionLabel: 'Voir le profil',
  },
  client_graduated: {
    label: 'Graduation vers One',
    Icon: GraduationCap,
    iconClass: 'text-primary bg-primary/10',
    tab: 'informations',
    actionLabel: 'Voir le profil',
  },
  client_archived: {
    label: 'Client archivé',
    Icon: Archive,
    iconClass: 'text-orange-500 bg-orange-500/10',
    tab: 'informations',
    actionLabel: 'Voir le profil',
  },
  client_suspended: {
    label: 'Client suspendu',
    Icon: PauseCircle,
    iconClass: 'text-yellow-500 bg-yellow-500/10',
    tab: 'informations',
    actionLabel: 'Voir le profil',
  },
  client_reactivated: {
    label: 'Client réactivé',
    Icon: PlayCircle,
    iconClass: 'text-green-500 bg-green-500/10',
    tab: 'informations',
    actionLabel: 'Voir le profil',
  },
  client_closed: {
    label: 'Client clôturé',
    Icon: Trash2,
    iconClass: 'text-destructive bg-destructive/10',
    tab: 'informations',
    actionLabel: 'Voir le profil',
  },
  client_upgraded: {
    label: 'Type de client mis à jour',
    Icon: TrendingUp,
    iconClass: 'text-blue-500 bg-blue-500/10',
    tab: 'informations',
    actionLabel: 'Voir le profil',
  },
  // Parcours
  parcours_assigned: {
    label: 'Parcours assigné',
    Icon: FileText,
    iconClass: 'text-blue-500 bg-blue-500/10',
    tab: 'submissions',
    actionLabel: 'Voir les soumissions',
  },
  parcours_suspended: {
    label: 'Parcours suspendu',
    Icon: PauseCircle,
    iconClass: 'text-yellow-500 bg-yellow-500/10',
    tab: 'submissions',
    actionLabel: 'Voir les soumissions',
  },
  parcours_reactivated: {
    label: 'Parcours réactivé',
    Icon: PlayCircle,
    iconClass: 'text-green-500 bg-green-500/10',
    tab: 'submissions',
    actionLabel: 'Voir les soumissions',
  },
  // Modules & config
  module_toggled: {
    label: 'Module modifié',
    Icon: ToggleLeft,
    iconClass: 'text-purple-500 bg-purple-500/10',
    tab: 'modules',
    actionLabel: 'Voir les modules',
  },
  tier_changed: {
    label: 'Tier d\'abonnement modifié',
    Icon: RefreshCw,
    iconClass: 'text-yellow-500 bg-yellow-500/10',
    tab: 'lab-billing',
    actionLabel: 'Voir la facturation',
  },
  branding_updated: {
    label: 'Branding personnalisé',
    Icon: Palette,
    iconClass: 'text-pink-500 bg-pink-500/10',
    tab: 'branding',
    actionLabel: 'Voir le branding',
  },
  elio_doc_injected: {
    label: 'Documentation Élio mise à jour',
    Icon: Bot,
    iconClass: 'text-cyan-500 bg-cyan-500/10',
    tab: 'elio-config',
    actionLabel: 'Voir Élio',
  },
  // Documents
  document_uploaded: {
    label: 'Document importé',
    Icon: FileUp,
    iconClass: 'text-cyan-500 bg-cyan-500/10',
    tab: 'documents',
    actionLabel: 'Voir les documents',
  },
  document_shared: {
    label: 'Document partagé',
    Icon: FileUp,
    iconClass: 'text-green-500 bg-green-500/10',
    tab: 'documents',
    actionLabel: 'Voir les documents',
  },
  documents_synced: {
    label: 'Documents synchronisés (ZIP)',
    Icon: FolderSync,
    iconClass: 'text-cyan-500 bg-cyan-500/10',
    tab: 'documents',
    actionLabel: 'Voir les documents',
  },
  // Billing
  quote_created: {
    label: 'Devis créé',
    Icon: Receipt,
    iconClass: 'text-indigo-500 bg-indigo-500/10',
    tab: 'lab-billing',
    actionLabel: 'Voir la facturation',
  },
  quote_converted: {
    label: 'Devis converti en facture',
    Icon: CheckCircle,
    iconClass: 'text-green-500 bg-green-500/10',
    tab: 'lab-billing',
    actionLabel: 'Voir la facturation',
  },
  subscription_created: {
    label: 'Abonnement créé',
    Icon: Package,
    iconClass: 'text-green-500 bg-green-500/10',
    tab: 'lab-billing',
    actionLabel: 'Voir la facturation',
  },
  credit_note_created: {
    label: 'Avoir créé',
    Icon: CreditCard,
    iconClass: 'text-orange-500 bg-orange-500/10',
    tab: 'lab-billing',
    actionLabel: 'Voir la facturation',
  },
  lab_invoice_sent: {
    label: 'Facture Lab envoyée',
    Icon: Receipt,
    iconClass: 'text-indigo-500 bg-indigo-500/10',
    tab: 'lab-billing',
    actionLabel: 'Voir la facturation',
  },
  // Emails & comms
  message_sent: {
    label: 'Message envoyé',
    Icon: MessageSquare,
    iconClass: 'text-indigo-500 bg-indigo-500/10',
    tab: 'emails',
    actionLabel: 'Voir les emails',
  },
  // Visio (legacy)
  visio_completed: {
    label: 'Visio terminée',
    Icon: Video,
    iconClass: 'text-purple-500 bg-purple-500/10',
    tab: 'echanges',
    actionLabel: 'Voir les échanges',
  },
  // Validation Hub (legacy)
  validation_submitted: {
    label: 'Brief soumis',
    Icon: FileText,
    iconClass: 'text-blue-500 bg-blue-500/10',
    tab: 'submissions',
    actionLabel: 'Voir la soumission',
  },
  validation_approved: {
    label: 'Brief approuvé',
    Icon: CheckCircle,
    iconClass: 'text-green-500 bg-green-500/10',
    tab: 'submissions',
    actionLabel: 'Voir la soumission',
  },
  validation_rejected: {
    label: 'Brief refusé',
    Icon: XCircle,
    iconClass: 'text-destructive bg-destructive/10',
    tab: 'submissions',
    actionLabel: 'Voir la soumission',
  },
}

const FALLBACK_CONFIG: EventConfig = {
  label: 'Activité',
  Icon: Pin,
  iconClass: 'text-muted-foreground bg-muted',
  tab: null,
  actionLabel: null,
}

export function ClientTimeline({ clientId }: ClientTimelineProps) {
  const router = useRouter()
  const pathname = usePathname()

  const {
    data,
    isPending,
    error,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useClientActivityLogs(clientId)

  const navigateTo = (tab: string) => {
    router.push(`${pathname}?tab=${tab}`)
  }

  if (isPending) {
    return (
      <div className="mt-6 space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex gap-4">
            <Skeleton className="h-9 w-9 rounded-full shrink-0" />
            <div className="flex-1 space-y-2 pt-1">
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-20" />
              </div>
              <Skeleton className="h-3 w-3/4" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="mt-6 rounded-lg border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
        Impossible de charger l&apos;historique.
      </div>
    )
  }

  const logs = data?.pages.flat() ?? []

  if (logs.length === 0) {
    return (
      <div className="mt-6 rounded-lg border border-dashed p-10 text-center text-muted-foreground text-sm">
        Aucune activité enregistrée pour ce client.
      </div>
    )
  }

  return (
    <div className="mt-6">
      <div className="space-y-0">
        {logs.map((log, index) => {
          const config = EVENT_CONFIG[log.eventType] ?? FALLBACK_CONFIG
          const { Icon, iconClass, label, tab, actionLabel } = config
          const isLast = index === logs.length - 1

          const timeAgo = formatDistanceToNow(new Date(log.createdAt), {
            addSuffix: true,
            locale: fr,
          })

          return (
            <div key={log.id} className="flex gap-4">
              {/* Timeline line + icon */}
              <div className="flex flex-col items-center shrink-0">
                <div className={cn(
                  'flex h-9 w-9 items-center justify-center rounded-full',
                  iconClass
                )}>
                  <Icon className="h-4 w-4" />
                </div>
                {!isLast && (
                  <div className="w-px flex-1 bg-border" style={{ minHeight: '1.5rem' }} />
                )}
              </div>

              {/* Content */}
              <div className={cn('flex-1 pb-6', isLast && 'pb-0')}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-sm leading-5">{label}</p>
                    {log.description && (
                      <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">
                        {log.description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-muted-foreground whitespace-nowrap">{timeAgo}</span>
                    {tab && actionLabel && (
                      <button
                        type="button"
                        onClick={() => navigateTo(tab)}
                        className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-medium whitespace-nowrap"
                      >
                        {actionLabel}
                        <ArrowRight className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {hasNextPage && (
        <div className="flex justify-center pt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
          >
            {isFetchingNextPage ? 'Chargement...' : 'Charger plus'}
          </Button>
        </div>
      )}
    </div>
  )
}
