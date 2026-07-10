'use client'

import Link from 'next/link'
import { Building, ExternalLink, BarChart } from 'lucide-react'
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
} from '@monprojetpro/ui'
import { CockpitPanel, SectionTitle } from '@monprojetpro/ui'
import { cn, getInitials } from '@monprojetpro/utils'
import type { ClientDetail, ParcoursDetail } from '../types/validation.types'

// Config des types de client
const CLIENT_TYPE_CONFIG: Record<string, { label: string; className: string }> =
  {
    complet: {
      label: 'Complet',
      className: 'bg-violet-500/20 text-violet-300 border-violet-500/30',
    },
    direct_one: {
      label: 'Direct One',
      className: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
    },
    ponctuel: {
      label: 'Ponctuel',
      className: 'bg-gray-500/20 text-gray-300 border-gray-500/30',
    },
  }

type ClientInfoCardProps = {
  client: ClientDetail
  parcours?: ParcoursDetail
}

export function ClientInfoCard({ client, parcours }: ClientInfoCardProps) {
  const typeConfig = CLIENT_TYPE_CONFIG[client.clientType] ?? {
    label: client.clientType,
    className: 'bg-gray-500/20 text-gray-300 border-gray-500/30',
  }

  const progressPercent =
    parcours && parcours.totalSteps > 0
      ? Math.round((parcours.completedSteps / parcours.totalSteps) * 100)
      : 0

  return (
    <CockpitPanel title="Client" tone="cyan">
      <div className="space-y-4 p-3">
        {/* Avatar + nom + type client */}
        <div className="flex items-center gap-3">
          <Avatar className="h-12 w-12 shrink-0">
            {client.avatarUrl && (
              <AvatarImage src={client.avatarUrl} alt={client.name} />
            )}
            <AvatarFallback className="bg-cyan-400/10 text-cyan-300 text-sm font-medium">
              {getInitials(client.name)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="truncate font-medium text-white">{client.name}</p>
            {client.company && (
              <p className="flex items-center gap-1 truncate text-sm text-gray-400">
                <Building className="h-3 w-3 shrink-0" />
                {client.company}
              </p>
            )}
          </div>
          <Badge
            variant="outline"
            className={cn('shrink-0 border text-xs', typeConfig.className)}
          >
            {typeConfig.label}
          </Badge>
        </div>

        {/* Lien CRM */}
        <Link
          href={`/modules/crm/clients/${client.id}`}
          className="flex items-center gap-1.5 text-sm text-cyan-300 hover:text-cyan-200 hover:underline transition-colors"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          Voir la fiche client
        </Link>

        {/* Parcours Lab (uniquement pour les briefs Lab) */}
        {parcours && (
          <>
            <div className="border-t border-white/10" />
            <div className="space-y-2">
              <SectionTitle>
                <span className="flex items-center gap-1.5">
                  <BarChart className="h-3.5 w-3.5" />
                  {parcours.name}
                </span>
              </SectionTitle>

              {parcours.currentStepTitle && (
                <p className="text-sm text-gray-400">
                  Étape {parcours.currentStepNumber} :{' '}
                  <span className="text-gray-200">{parcours.currentStepTitle}</span>
                </p>
              )}

              {/* Barre de progression */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-gray-500 tabular-nums">
                  <span>
                    {parcours.completedSteps}/{parcours.totalSteps} étapes
                  </span>
                  <span>{progressPercent}%</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
                  <div
                    className="h-full rounded-full bg-cyan-400/60 transition-all"
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
      </div>
    </CockpitPanel>
  )
}
