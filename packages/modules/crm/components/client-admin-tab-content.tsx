'use client'

import { useState, useTransition } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Badge, Button, showSuccess, showError, CockpitPanel, CockpitCallout } from '@monprojetpro/ui'
import { exportClientData } from '@monprojetpro/module-admin'
import { useClient } from '../hooks/use-client'
import { HandoffDialog } from './handoff-dialog'
import { LabExitKitDialog } from './lab-exit-kit-dialog'
import { ArchiveClientDialog } from './archive-client-dialog'
import { ChangeTierDialog } from './change-tier-dialog'
import { CoachingCreditsPanel } from './coaching-credits-panel'
import { TIER_INFO, TIER_BADGE_CLASSES } from '../utils/tier-helpers'
import type { SubscriptionTier } from '../types/subscription.types'

interface ClientAdminTabContentProps {
  clientId: string
}

export function ClientAdminTabContent({ clientId }: ClientAdminTabContentProps) {
  const { data: client } = useClient(clientId)
  const [handoffDialogOpen, setHandoffDialogOpen] = useState(false)
  const [labExitKitDialogOpen, setLabExitKitDialogOpen] = useState(false)
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false)
  const [changeTierDialogOpen, setChangeTierDialogOpen] = useState(false)
  const [exportConfirmOpen, setExportConfirmOpen] = useState(false)
  const [isExporting, startExportTransition] = useTransition()

  if (!client) return null

  const isLabClient = client.config?.dashboardType === 'lab'
  const isOneClient = client.config?.dashboardType === 'one'
  const currentTier: SubscriptionTier = (client.config?.subscriptionTier as SubscriptionTier) ?? 'ponctuel'
  const tierInfo = TIER_INFO[currentTier]
  const tierBadgeClass = TIER_BADGE_CLASSES[currentTier]

  return (
    <div className="space-y-6">
      {/* Abonnement — pour clients One */}
      {isOneClient && client.config && (
        <CockpitPanel
          title="Abonnement"
          linkHref={undefined}
        >
          <div className="space-y-0 divide-y divide-white/[0.05]">
            <div className="flex items-center justify-between px-3 py-2.5">
              <span className="text-xs text-gray-400">Tier actuel</span>
              <div className="flex items-center gap-2">
                <span className={`rounded-full px-2 py-0.5 text-[0.65rem] font-semibold ${tierBadgeClass}`}>{tierInfo.name}</span>
                <Button variant="outline" size="sm" onClick={() => setChangeTierDialogOpen(true)} data-testid="change-tier-button">
                  Modifier
                </Button>
              </div>
            </div>
            <div className="flex items-center justify-between px-3 py-2.5">
              <span className="text-xs text-gray-400">Cout mensuel</span>
              <span className="text-sm font-medium text-white">{tierInfo.price}</span>
            </div>
            <div className="flex items-center justify-between px-3 py-2.5">
              <span className="text-xs text-gray-400">Elio</span>
              <span className="text-sm font-medium text-white">{tierInfo.elio}</span>
            </div>
          </div>
        </CockpitPanel>
      )}

      {/* Coaching One+ — visible seulement si elio_tier='one_plus' (le panneau se masque sinon) */}
      {isOneClient && <CoachingCreditsPanel clientId={clientId} />}

      {/* Export RGPD */}
      <CockpitPanel title="Export RGPD">
        <div className="space-y-3 px-3 py-3">
          <p className="text-sm text-gray-400">
            Exportez les donnees personnelles du client (droit d&apos;acces RGPD).
          </p>
          {exportConfirmOpen ? (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-400">Confirmer ?</span>
              <Button
                variant="destructive"
                size="sm"
                disabled={isExporting}
                data-testid="confirm-export-button"
                onClick={() => {
                  setExportConfirmOpen(false)
                  startExportTransition(async () => {
                    const result = await exportClientData({ clientId, requestedBy: 'operator' })
                    if (result.error) showError(result.error.message)
                    else showSuccess('Export en cours')
                  })
                }}
              >
                {isExporting ? 'Export en cours...' : 'Confirmer'}
              </Button>
              <Button variant="outline" size="sm" onClick={() => setExportConfirmOpen(false)}>Annuler</Button>
            </div>
          ) : (
            <Button variant="outline" size="sm" disabled={isExporting} data-testid="export-client-data-button" onClick={() => setExportConfirmOpen(true)}>
              Exporter les donnees client
            </Button>
          )}
        </div>
      </CockpitPanel>

      {/* Kit de sortie One */}
      {client.status !== 'archived' && client.status !== 'deleted' && client.status !== 'handed_off' && (
        <CockpitPanel title="Kit de sortie — Deploiement standalone">
          <div className="space-y-3 px-3 py-3">
            <p className="text-sm text-gray-400">
              Livrez au client un deploiement standalone (Vercel + GitHub + Supabase).
            </p>
            <Button variant="destructive" size="sm" onClick={() => setHandoffDialogOpen(true)} data-testid="start-handoff-button">
              Lancer le kit de sortie
            </Button>
          </div>
        </CockpitPanel>
      )}
      {client.status === 'handed_off' && (
        <CockpitCallout tone="cyan" title="Deploiement transfere">
          <div className="flex items-center gap-2">
            <Badge variant="outline">Transfere</Badge>
            <span className="text-xs">Le client a recu son deploiement standalone.</span>
          </div>
        </CockpitCallout>
      )}

      {/* Archivage */}
      {client.status !== 'archived' && client.status !== 'deleted' && (
        <CockpitPanel title="Archivage">
          <div className="space-y-3 px-3 py-3">
            <p className="text-sm text-gray-400">
              Archivez le client pour bloquer son acces. Les donnees seront anonymisees apres la periode de retention (RGPD).
            </p>
            <Button variant="outline" size="sm" onClick={() => setArchiveDialogOpen(true)} data-testid="archive-client-button">
              Archiver le client
            </Button>
          </div>
        </CockpitPanel>
      )}

      {/* Dialogs */}
      {client.status !== 'archived' && client.status !== 'deleted' && client.status !== 'handed_off' && (
        <HandoffDialog
          clientId={clientId}
          clientName={client.name}
          clientCompany={client.company}
          clientStatus={client.status}
          activeModules={client.config?.activeModules ?? []}
          open={handoffDialogOpen}
          onOpenChange={setHandoffDialogOpen}
        />
      )}
      {client.status !== 'archived' && client.status !== 'deleted' && (
        <ArchiveClientDialog clientId={clientId} clientName={client.name} open={archiveDialogOpen} onOpenChange={setArchiveDialogOpen} />
      )}
      {isOneClient && client.config && (
        <ChangeTierDialog
          clientId={clientId}
          clientName={client.name}
          currentTier={currentTier}
          open={changeTierDialogOpen}
          onOpenChange={setChangeTierDialogOpen}
        />
      )}
    </div>
  )
}
