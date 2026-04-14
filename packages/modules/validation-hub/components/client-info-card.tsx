'use client'

import Link from 'next/link'
import { Building, ExternalLink, BarChart } from 'lucide-react'
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  Card,
  CardContent,
  CardHeader,
  Separator,
} from '@monprojetpro/ui'
import { cn, getInitials } from '@monprojetpro/utils'
import type { ClientDetail, ParcoursDetail } from '../types/validation.types'

const CLIENT_TYPE_CONFIG: Record<string, { label: string; className: string }> =
  {
    complet: {
      label: 'Complet',
      className: 'bg-violet-500/20 text-violet-400 border-violet-500/30',
    },
    direct_one: {
      label: 'Direct One',
      className: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    },
    ponctuel: {
      label: 'Ponctuel',
      className: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
    },
  }

type ClientInfoCardProps = {
  client: ClientDetail
  parcours?: ParcoursDetail
}

export function ClientInfoCard({ client, parcours }: ClientInfoCardProps) {
  const typeConfig = CLIENT_TYPE_CONFIG[client.clientType] ?? {
    label: client.clientType,
    className: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
  }

  const progressPercent =
    parcours && parcours.totalSteps > 0
      ? Math.round((parcours.completedSteps / parcours.totalSteps) * 100)
      : 0

  return (
    <Card className="bg-card/50 border-border/50">
      <CardHeader className="pb-3">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          Client
        </h2>
      </CardHeader>
      <CardContent className="pt-0 space-y-4">
        {/* Avatar + nom */}
        <div className="flex items-center gap-3">
          <Avatar className="h-12 w-12 shrink-0">
            {client.avatarUrl && (
              <AvatarImage src={client.avatarUrl} alt={client.name} />
            )}
            <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
              {getInitials(client.name)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-foreground truncate">{client.name}</p>
            {client.company && (
              <p className="text-sm text-muted-foreground flex items-center gap-1 truncate">
                <Building className="h-3 w-3 shrink-0" />
                {client.company}
              </p>
            )}
          </div>
          <Badge
            variant="outline"
            className={cn('shrink-0 text-xs border', typeConfig.className)}
          >
            {typeConfig.label}
          </Badge>
        </div>

        {/* Lien CRM */}
        <Link
          href={`/modules/crm/clients/${client.id}`}
          className="flex items-center gap-1.5 text-sm text-primary hover:underline"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          Voir la fiche client
        </Link>

        {/* Parcours (si brief Lab) */}
        {parcours && (
          <>
            <Separator className="bg-border/50" />
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <BarChart className="h-3.5 w-3.5" />
                <span className="font-medium text-foreground">{parcours.name}</span>
              </div>

              {parcours.currentStepTitle && (
                <p className="text-sm text-muted-foreground">
                  Étape {parcours.currentStepNumber} :{' '}
                  <span className="text-foreground">
                    {parcours.currentStepTitle}
                  </span>
                </p>
              )}

              {/* Barre de progression */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>
                    {parcours.completedSteps}/{parcours.totalSteps} étapes
                  </span>
                  <span>{progressPercent}%</span>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all"
                    style={{ width: `${progressPercent}%` }}
                    role="progressbar"
                    aria-valuenow={progressPercent}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  />
                </div>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
