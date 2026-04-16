'use client'

import { useState, useTransition } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle, Badge, Separator, Button, showSuccess, showError } from '@monprojetpro/ui'
import { exportClientData } from '@monprojetpro/module-admin'
import { useClient } from '../hooks/use-client'
import { HandoffDialog } from './handoff-dialog'
import { LabExitKitDialog } from './lab-exit-kit-dialog'
import { ArchiveClientDialog } from './archive-client-dialog'
import { ChangeTierDialog } from './change-tier-dialog'
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
  const currentTier: SubscriptionTier = (client.config?.subscriptionTier as SubscriptionTier) ?? 'base'
  const tierInfo = TIER_INFO[currentTier]
  const tierBadgeClass = TIER_BADGE_CLASSES[currentTier]

  return (
    <div className="space-y-6">
      {/* Abonnement — pour clients One */}
      {isOneClient && client.config && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Abonnement</CardTitle>
            <Button variant="outline" size="sm" onClick={() => setChangeTierDialogOpen(true)} data-testid="change-tier-button">
              Modifier le tier
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Tier actuel</span>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${tierBadgeClass}`}>{tierInfo.name}</span>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Coût mensuel</span>
                <span className="text-sm">{tierInfo.price}</span>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Élio</span>
                <span className="text-sm">{tierInfo.elio}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Export RGPD */}
      <Card>
        <CardHeader>
          <CardTitle>Export RGPD</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Exportez les données personnelles du client (droit d&apos;accès RGPD).
            </p>
            {exportConfirmOpen ? (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Confirmer ?</span>
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
                  {isExporting ? 'Export en cours…' : 'Confirmer'}
                </Button>
                <Button variant="outline" size="sm" onClick={() => setExportConfirmOpen(false)}>Annuler</Button>
              </div>
            ) : (
              <Button variant="outline" size="sm" disabled={isExporting} data-testid="export-client-data-button" onClick={() => setExportConfirmOpen(true)}>
                Exporter les données client
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Kit de sortie One */}
      {client.status !== 'archived' && client.status !== 'deleted' && client.status !== 'handed_off' && (
        <Card>
          <CardHeader>
            <CardTitle>Kit de sortie — Déploiement standalone</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Livrez au client un déploiement standalone (Vercel + GitHub + Supabase).
              </p>
              <Button variant="destructive" size="sm" onClick={() => setHandoffDialogOpen(true)} data-testid="start-handoff-button">
                Lancer le kit de sortie
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      {client.status === 'handed_off' && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Badge variant="outline">Transféré</Badge>
              <span className="text-xs text-muted-foreground">Le client a reçu son déploiement standalone.</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Archivage */}
      {client.status !== 'archived' && client.status !== 'deleted' && (
        <Card>
          <CardHeader>
            <CardTitle>Archivage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Archivez le client pour bloquer son accès. Les données seront anonymisées après la période de rétention (RGPD).
              </p>
              <Button variant="outline" size="sm" onClick={() => setArchiveDialogOpen(true)} data-testid="archive-client-button">
                Archiver le client
              </Button>
            </div>
          </CardContent>
        </Card>
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
