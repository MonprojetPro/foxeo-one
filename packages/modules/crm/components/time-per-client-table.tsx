'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, Badge, Button } from '@monprojetpro/ui'
import { ArrowUpDown } from 'lucide-react'
import type { ClientTimeEstimate, ClientType } from '../types/crm.types'

interface TimePerClientTableProps {
  data: ClientTimeEstimate[]
}

function formatDuration(totalSeconds: number): string {
  if (totalSeconds === 0) return '0min'
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  if (hours > 0) return `${hours}h ${minutes}min`
  return `${minutes}min`
}

const TYPE_LABELS: Record<ClientType, string> = {
  complet: 'Complet',
  'direct_one': 'Direct One',
  ponctuel: 'Ponctuel',
}

type SortField = 'totalEstimatedSeconds' | 'clientName' | 'lastActivity'
type SortDir = 'asc' | 'desc'

export function TimePerClientTable({ data }: TimePerClientTableProps) {
  const [sortField, setSortField] = useState<SortField>('totalEstimatedSeconds')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortDir('desc')
    }
  }

  const sorted = [...data].sort((a, b) => {
    const dir = sortDir === 'asc' ? 1 : -1
    if (sortField === 'clientName') {
      return a.clientName.localeCompare(b.clientName) * dir
    }
    if (sortField === 'lastActivity') {
      const aDate = a.lastActivity ?? ''
      const bDate = b.lastActivity ?? ''
      return aDate.localeCompare(bDate) * dir
    }
    return (a.totalEstimatedSeconds - b.totalEstimatedSeconds) * dir
  })

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Temps passé par client</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Aucune donnée d'activité</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Temps passé par client</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm" data-testid="time-per-client-table">
            <thead>
              <tr className="border-b text-left">
                <th className="pb-2 pr-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto p-0 font-medium"
                    onClick={() => toggleSort('clientName')}
                  >
                    Client
                    <ArrowUpDown className="ml-1 h-3 w-3" />
                  </Button>
                </th>
                <th className="pb-2 pr-4">Type</th>
                <th className="pb-2 pr-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto p-0 font-medium"
                    onClick={() => toggleSort('totalEstimatedSeconds')}
                  >
                    Temps total
                    <ArrowUpDown className="ml-1 h-3 w-3" />
                  </Button>
                </th>
                <th className="pb-2 pr-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto p-0 font-medium"
                    onClick={() => toggleSort('lastActivity')}
                  >
                    Dernière activité
                    <ArrowUpDown className="ml-1 h-3 w-3" />
                  </Button>
                </th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((client) => (
                <tr key={client.clientId} className="border-b last:border-0" data-testid={`time-row-${client.clientId}`}>
                  <td className="py-3 pr-4">
                    <div>
                      <p className="font-medium">{client.clientName}</p>
                      <p className="text-xs text-muted-foreground">{client.clientCompany}</p>
                    </div>
                  </td>
                  <td className="py-3 pr-4">
                    <Badge variant="outline">{TYPE_LABELS[client.clientType]}</Badge>
                  </td>
                  <td className="py-3 pr-4 font-mono">
                    {formatDuration(client.totalEstimatedSeconds)}
                  </td>
                  <td className="py-3 pr-4 text-muted-foreground">
                    {client.lastActivity
                      ? new Date(client.lastActivity).toLocaleDateString('fr-FR')
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}

export { formatDuration }
