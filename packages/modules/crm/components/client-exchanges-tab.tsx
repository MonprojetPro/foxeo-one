'use client'

import Link from 'next/link'
import { Card, CardContent, Badge, Button } from '@foxeo/ui'
import { useClientExchanges } from '../hooks/use-client-exchanges'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

interface ClientExchangesTabProps {
  clientId: string
}

const exchangeTypeLabels: Record<string, string> = {
  message: 'Message',
  notification: 'Notification',
  elio_summary: 'Résumé Élio',
}

const exchangeTypeIcons: Record<string, string> = {
  message: '💬',
  notification: '🔔',
  elio_summary: '🤖',
}

export function ClientExchangesTab({ clientId }: ClientExchangesTabProps) {
  const { data: exchanges, isPending, error } = useClientExchanges(clientId)

  if (isPending) {
    return <div className="p-4">Chargement des échanges...</div>
  }

  if (error) {
    return <div className="p-4 text-destructive">Erreur de chargement</div>
  }

  if (!exchanges || exchanges.length === 0) {
    return (
      <Card className="mt-6">
        <CardContent className="p-8 text-center">
          <div className="space-y-4">
            <p className="text-muted-foreground">Aucun échange pour le moment</p>
            <Button asChild variant="outline">
              <Link href={`/modules/chat/${clientId}`}>Ouvrir le chat →</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4 mt-6">
      <div className="flex justify-end">
        <Button asChild variant="outline">
          <Link href={`/modules/chat/${clientId}`}>Ouvrir le chat complet →</Link>
        </Button>
      </div>

      {exchanges.map((exchange) => {
        const exchangeDate = format(new Date(exchange.createdAt), 'd MMMM yyyy à HH:mm', { locale: fr })
        const preview = exchange.content.substring(0, 100) + (exchange.content.length > 100 ? '...' : '')

        return (
          <Card key={exchange.id}>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <span className="text-2xl">{exchangeTypeIcons[exchange.type] || '📌'}</span>
                <div className="flex-1">
                  <div className="flex items-baseline justify-between">
                    <Badge variant="outline" className="text-xs">
                      {exchangeTypeLabels[exchange.type] || exchange.type}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{exchangeDate}</span>
                  </div>
                  <p className="text-sm mt-2">{preview}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
