'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Card, CardContent, Badge, Button } from '@monprojetpro/ui'
import { useClientExchanges } from '../hooks/use-client-exchanges'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { MessageSquare, Mail, LifeBuoy, FileText, ExternalLink, ArrowRight } from 'lucide-react'

interface ClientExchangesTabProps {
  clientId: string
}

const exchangeTypeConfig: Record<string, { label: string; icon: string }> = {
  message: { label: 'Chat', icon: '💬' },
  notification: { label: 'Notification', icon: '🔔' },
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
    <div className="space-y-6 mt-6">
      {/* Accès rapide aux canaux */}
      <section>
        <h3 className="text-sm font-medium text-muted-foreground mb-3">Canaux de communication</h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {channels.map((channel) => (
            <Link key={channel.label} href={channel.href}>
              <Card className="cursor-pointer hover:bg-muted/50 transition-colors h-full">
                <CardContent className="p-4 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <channel.icon className="h-4 w-4 text-muted-foreground" />
                    {channel.external
                      ? <ExternalLink className="h-3 w-3 text-muted-foreground/50" />
                      : <ArrowRight className="h-3 w-3 text-muted-foreground/50" />
                    }
                  </div>
                  <div>
                    <p className="text-sm font-medium">{channel.label}</p>
                    <p className="text-xs text-muted-foreground">{channel.description}</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* Feed des échanges récents */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-muted-foreground">Échanges récents</h3>
          <Button asChild variant="ghost" size="sm" className="h-7 text-xs">
            <Link href={`/modules/chat/${clientId}`}>
              Aller au chat <ArrowRight className="ml-1 h-3 w-3" />
            </Link>
          </Button>
        </div>

        {isPending && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="h-8 w-8 rounded-full bg-muted animate-pulse shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 w-24 rounded bg-muted animate-pulse" />
                      <div className="h-3 w-full rounded bg-muted animate-pulse" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {error && (
          <Card>
            <CardContent className="p-4 text-sm text-destructive">
              Impossible de charger les échanges récents.
            </CardContent>
          </Card>
        )}

        {!isPending && !error && (!exchanges || exchanges.length === 0) && (
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-sm text-muted-foreground mb-3">
                Aucun échange avec ce client pour le moment.
              </p>
              <Button asChild variant="outline" size="sm">
                <Link href={`/modules/chat/${clientId}`}>
                  <MessageSquare className="mr-2 h-3.5 w-3.5" />
                  Démarrer une conversation
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {!isPending && !error && exchanges && exchanges.length > 0 && (
          <div className="space-y-2">
            {exchanges.map((exchange) => {
              const config = exchangeTypeConfig[exchange.type] ?? { label: exchange.type, icon: '📌' }
              const exchangeDate = format(new Date(exchange.createdAt), 'd MMM yyyy, HH:mm', { locale: fr })
              const preview = exchange.content.length > 120
                ? exchange.content.substring(0, 120) + '…'
                : exchange.content

              const href = exchange.type === 'message'
                ? `/modules/chat/${clientId}`
                : exchange.type === 'notification'
                ? null
                : null

              const content = (
                <Card className={href ? 'cursor-pointer hover:bg-muted/50 transition-colors' : ''}>
                  <CardContent className="p-3">
                    <div className="flex items-start gap-3">
                      <span className="text-lg shrink-0 mt-0.5">{config.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <Badge variant="outline" className="text-xs h-5 px-1.5">
                            {config.label}
                          </Badge>
                          <span className="text-xs text-muted-foreground shrink-0">{exchangeDate}</span>
                        </div>
                        <p className="text-sm text-muted-foreground truncate">{preview}</p>
                      </div>
                      {href && <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0 mt-1" />}
                    </div>
                  </CardContent>
                </Card>
              )

              return href
                ? <Link key={exchange.id} href={href}>{content}</Link>
                : <div key={exchange.id}>{content}</div>
            })}
          </div>
        )}
      </section>
    </div>
  )
}
