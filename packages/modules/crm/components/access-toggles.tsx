'use client'

import { useState, useTransition } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Switch,
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  showSuccess,
  showError,
} from '@monprojetpro/ui'
import { Lock } from 'lucide-react'
import { toggleAccess } from '../actions/toggle-access'

interface AccessTogglesProps {
  clientId: string
  /** has_lab — le client a un espace Lab (permanent une fois accordé). */
  labModeAvailable: boolean
  /** Agents Élio Lab actifs (communication). C'est CE levier que la switch « Agents Lab » pilote. */
  elioLabEnabled: boolean
  /** Accès One ouvert. */
  oneModeAvailable: boolean
  hasActiveParcours: boolean
  /** Onglet Lab : n'affiche que le toggle « Agents du parcours » (l'accès global vit dans le Pilote). */
  showOnlyAgents?: boolean
}

export function AccessToggles({
  clientId,
  labModeAvailable,
  elioLabEnabled,
  oneModeAvailable,
  hasActiveParcours,
  showOnlyAgents = false,
}: AccessTogglesProps) {
  const [confirmDialog, setConfirmDialog] = useState<{ type: 'lab' | 'one'; show: boolean }>({ type: 'lab', show: false })
  const [isPending, startTransition] = useTransition()
  const queryClient = useQueryClient()

  // Les switches lisent les VRAIS flags (plus de dérivation depuis dashboard_type) :
  //  - « Agents Lab » = elio_lab_enabled (couper/réactiver la communication ; l'espace Lab reste).
  //  - « Accès One »  = one_mode_available (ouvrir/fermer).
  const agentsEnabled = elioLabEnabled
  const oneEnabled = oneModeAvailable

  const handleToggle = (accessType: 'lab' | 'one', enabled: boolean) => {
    // À la désactivation, on confirme (couper les agents suspend le parcours en cours).
    if (!enabled) {
      setConfirmDialog({ type: accessType, show: true })
      return
    }
    executeToggle(accessType, enabled)
  }

  const executeToggle = (accessType: 'lab' | 'one', enabled: boolean) => {
    startTransition(async () => {
      const result = await toggleAccess({ clientId, accessType, enabled })

      if (result.error) {
        showError(result.error.message)
        return
      }

      const label = accessType === 'lab' ? 'Agents du parcours' : 'Accès One'
      const action = enabled ? 'activé' : 'désactivé'
      showSuccess(`${label} ${action}`)

      if (result.data?.labAutoPaused) {
        showSuccess('Le Lab a été mis en pause automatiquement (One déclenché) — réactive les agents si besoin')
      }

      if (result.data?.parcoursSuspended) {
        showSuccess('Le parcours Lab a été suspendu')
      }

      await queryClient.invalidateQueries({ queryKey: ['client', clientId] })
      await queryClient.invalidateQueries({ queryKey: ['clients'] })
      await queryClient.invalidateQueries({ queryKey: ['client-parcours', clientId] })
    })
  }

  const confirmDisable = () => {
    executeToggle(confirmDialog.type, false)
    setConfirmDialog({ type: 'lab', show: false })
  }

  const dialogLabel = confirmDialog.type === 'lab' ? 'les agents du parcours' : 'l’accès One'

  return (
    <>
      <Card data-testid="access-toggles">
        <CardHeader>
          <CardTitle>{showOnlyAgents ? 'Lab — agents du parcours' : 'Accès dashboards'}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Espace Lab — statut permanent (lecture seule, non désactivable) — masqué en mode agents-only */}
            {!showOnlyAgents && (
              <div className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
                <div>
                  <p className="flex items-center gap-1.5 text-sm font-medium">
                    <Lock className="h-3 w-3 text-muted-foreground" />
                    Espace Lab
                    <span className="text-xs font-normal text-muted-foreground">— statut, lecture seule</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {labModeAvailable
                      ? 'Acquis définitivement — l’historique reste accessible même si les agents sont coupés (non désactivable).'
                      : 'Aucun espace Lab (le client n’est jamais passé par le Lab).'}
                  </p>
                </div>
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium border ${
                    labModeAvailable
                      ? 'bg-violet-500/15 text-violet-300 border-violet-500/30'
                      : 'bg-muted/40 text-muted-foreground border-transparent'
                  }`}
                >
                  {labModeAvailable ? 'Permanent' : 'Inexistant'}
                </span>
              </div>
            )}

            {/* Agents du parcours — communication (le vrai levier on/off).
                NB : distinct d'Élio Lab, l'assistant du dashboard, qui reste toujours dispo. */}
            <div className="flex items-center justify-between">
              <div>
                <p className="flex items-center gap-2 text-sm font-medium">
                  Agents du parcours
                  {labModeAvailable && (
                    <span
                      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${
                        agentsEnabled
                          ? 'border-emerald-500/30 bg-emerald-500/15 text-emerald-400'
                          : 'border-amber-500/30 bg-amber-500/15 text-amber-400'
                      }`}
                      data-testid="lab-agents-state"
                    >
                      {agentsEnabled ? 'Actifs' : 'En pause'}
                    </span>
                  )}
                </p>
                <p className="text-xs text-muted-foreground">C&apos;est LE levier on/off du Lab : communication avec les agents Élio des étapes (Élio Lab l&apos;assistant reste dispo)</p>
              </div>
              <Switch
                checked={agentsEnabled}
                onCheckedChange={(checked: boolean) => handleToggle('lab', checked)}
                disabled={isPending || !labModeAvailable}
                aria-label="Activer les agents Lab"
                data-testid="toggle-lab"
              />
            </div>

            {/* Accès One — masqué en mode agents-only (piloté depuis le Pilote) */}
            {!showOnlyAgents && (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Accès One</p>
                  <p className="text-xs text-muted-foreground">Dashboard business client</p>
                </div>
                <Switch
                  checked={oneEnabled}
                  onCheckedChange={(checked: boolean) => handleToggle('one', checked)}
                  disabled={isPending}
                  aria-label="Activer l'accès One"
                  data-testid="toggle-one"
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Confirmation dialog for disabling access */}
      <Dialog open={confirmDialog.show} onOpenChange={(open) => setConfirmDialog((prev) => ({ ...prev, show: open }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Désactiver {dialogLabel}</DialogTitle>
            <DialogDescription>
              {confirmDialog.type === 'lab' ? (
                <>
                  Le client ne pourra plus échanger avec les agents de son parcours. Son espace Lab,
                  son historique et l&apos;assistant Élio Lab restent accessibles.
                  {hasActiveParcours && <> Le parcours en cours sera suspendu (pas supprimé).</>}
                </>
              ) : (
                <>Le client perdra l&apos;accès à son dashboard One.</>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDialog({ type: 'lab', show: false })}>
              Annuler
            </Button>
            <Button variant="destructive" onClick={confirmDisable} disabled={isPending}>
              {isPending ? 'Désactivation...' : 'Confirmer la désactivation'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
