'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Button } from '@monprojetpro/ui'
import {
  CockpitPanel,
  CockpitCallout,
  SectionTitle,
  RowSkeleton,
} from '@monprojetpro/ui'
import { useClientExchanges } from '../hooks/use-client-exchanges'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { MessageSquare, Mail, LifeBuoy, FileText, ExternalLink, ArrowRight, AlertTriangle } from 'lucide-react'

interface ClientExchangesTabProps {
  clientId: string
}

const exchangeTypeConfig: Record<string, { label: string; icon: string }> = {
  message: { label: 'Chat', icon: '💬' },
  notification: { label: 'Notification', icon: '🔔' },
  elio_escalation: { label: 'Question Élio', icon: '🔺' },
  elio_summary: { label: 'Résumé Élio', icon: '🤖' },
}

export function ClientExchangesTab({ clientId }: ClientExchangesTabProps) {
  const pathname = usePathname()
  const { data: exchanges, isPending, error } = useClientExchanges(clientId)

  const channels = [
    {
      icon: MessageSquare,
      label: 'Chat',
      description: 'Messagerie temps réel',
      href: `/modules/chat/${clientId}`,
      external: true,
    },
    {
      icon: Mail,
      label: 'Emails',
      description: 'Threads Gmail',
      href: `${pathname}?tab=emails`,
      external: false,
    },
    {
      icon: LifeBuoy,
      label: 'Support',
      description: 'Tickets et demandes',
      href: `${pathname}?tab=support`,
      external: false,
    },
    {
      icon: FileText,
      label: 'Soumissions',
      description: 'Briefs envoyés',
      href: `${pathname}?tab=submissions`,
      external: false,
    },
  ]

  return (
    <div className="space-y-5 mt-4">
      {/* Canaux de communication */}
      <section>
        <SectionTitle>Canaux de communication</SectionTitle>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {channels.map((channel) => (
            <Link
              key={channel.label}
              href={channel.href}
              className="group flex flex-col gap-2 rounded-2xl border border-white/10 bg-white/[0.02] p-3 transition-colors hover:border-cyan-400/30 hover:bg-cyan-400/[0.04]"
            >
              <div className="flex items-center justify-between">
                <channel.icon className="h-4 w-4 text-gray-500 group-hover:text-cyan-300 transition-colors" />
                {channel.external
                  ? <ExternalLink className="h-3 w-3 text-gray-600 group-hover:text-cyan-400/70 transition-colors" />
                  : <ArrowRight className="h-3 w-3 text-gray-600 group-hover:text-cyan-400/70 transition-colors" />
                }
              </div>
              <div>
                <p className="text-sm font-medium text-gray-200">{channel.label}</p>
                <p className="text-xs text-gray-500">{channel.description}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Feed des échanges récents */}
      <section>
        <SectionTitle
          action={
            <Button asChild variant="ghost" size="sm" className="h-6 px-2 text-xs text-cyan-300/70 hover:text-cyan-200 hover:bg-transparent">
              <Link href={`/modules/chat/${clientId}`}>
                Aller au chat <ArrowRight className="ml-1 h-3 w-3" />
              </Link>
            </Button>
          }
        >
          Échanges récents
        </SectionTitle>

        {isPending && (
          <div className="space-y-1.5">
            <RowSkeleton className="h-14" />
            <RowSkeleton className="h-14" />
            <RowSkeleton className="h-14" />
          </div>
        )}

        {error && (
          <CockpitCallout tone="red" icon={AlertTriangle}>
            Impossible de charger les échanges récents.
          </CockpitCallout>
        )}

        {!isPending && !error && (!exchanges || exchanges.length === 0) && (
          <CockpitCallout tone="gray" icon={MessageSquare}>
            <span>
              Aucun échange avec ce client pour le moment.{' '}
              <Link
                href={`/modules/chat/${clientId}`}
                className="text-cyan-300 hover:underline"
              >
                Démarrer une conversation &rarr;
              </Link>
            </span>
          </CockpitCallout>
        )}

        {!isPending && !error && exchanges && exchanges.length > 0 && (
          <CockpitPanel
            title="Échanges"
            badge={exchanges.length}
            badgeTone="cyan"
            linkHref={`/modules/chat/${clientId}`}
            linkText="Voir le chat →"
          >
            <div className="divide-y divide-white/5">
              {exchanges.map((exchange) => {
                const config = exchangeTypeConfig[exchange.type] ?? { label: exchange.type, icon: '📌' }
                const exchangeDate = format(new Date(exchange.createdAt), 'd MMM yyyy, HH:mm', { locale: fr })

                // Rendu spécial pour les escalades Élio
                if (exchange.type === 'elio_escalation') {
                  return (
                    <div key={exchange.id} className="p-1.5">
                      <CockpitCallout tone="amber" icon={AlertTriangle} title={config.label}>
                        <div className="w-full space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm whitespace-pre-wrap leading-relaxed">{exchange.content}</p>
                            <span className="text-[11px] text-amber-400/60 shrink-0">{exchangeDate}</span>
                          </div>
                          <Button
                            asChild
                            size="sm"
                            variant="outline"
                            className="w-full border-amber-400/25 bg-amber-400/5 text-amber-300 hover:bg-amber-400/10 hover:text-amber-200"
                          >
                            <Link href={`/modules/chat/${clientId}`}>
                              <MessageSquare className="mr-2 h-3.5 w-3.5" />
                              Répondre via Chat
                            </Link>
                          </Button>
                        </div>
                      </CockpitCallout>
                    </div>
                  )
                }

                // Rendu standard
                const preview = exchange.content.length > 120
                  ? exchange.content.substring(0, 120) + '…'
                  : exchange.content
                const href = exchange.type === 'message' ? `/modules/chat/${clientId}` : null

                const rowContent = (
                  <div className="flex items-start gap-3 px-3 py-2.5 hover:bg-white/[0.03] transition-colors rounded-xl">
                    <span className="text-base shrink-0 mt-0.5" aria-hidden="true">{config.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-0.5">
                        <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                          {config.label}
                        </span>
                        <span className="text-[11px] text-gray-600 shrink-0">{exchangeDate}</span>
                      </div>
                      <p className="text-sm text-gray-400 truncate">{preview}</p>
                    </div>
                    {href && <ArrowRight className="h-3.5 w-3.5 text-gray-600 shrink-0 mt-1" />}
                  </div>
                )

                return href
                  ? <Link key={exchange.id} href={href}>{rowContent}</Link>
                  : <div key={exchange.id}>{rowContent}</div>
              })}
            </div>
          </CockpitPanel>
        )}
      </section>
    </div>
  )
}
