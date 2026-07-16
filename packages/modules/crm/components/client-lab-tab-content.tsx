'use client'

import { useState, type ReactNode } from 'react'
import { Card, CardContent, CardHeader, CardTitle, Badge, Separator, Button } from '@monprojetpro/ui'
import { useClient } from '../hooks/use-client'
import { useClientParcours } from '../hooks/use-client-parcours'
import { useClientPendingValidations } from '../hooks/use-client-pending-validations'
import { ParcoursStatusBadge } from './parcours-status-badge'
import { AccessToggles } from './access-toggles'
import { AssignParcoursDialog } from './assign-parcours-dialog'
import { GraduationDialog } from './graduation-dialog'
import { ReactivateParcoursDialog } from './reactivate-parcours-dialog'
import { LabExitKitDialog } from './lab-exit-kit-dialog'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

interface ClientLabTabContentProps {
  clientId: string
  /** Bloc facturation Lab (module facturation) — rendu en sous-statut de l'activation. */
  billingSlot?: ReactNode
  /** Bloc « Configuration Élio par étape » (module parcours). */
  elioConfigSlot?: ReactNode
  /** Statut facturation pour l'en-tête (fourni par le parent, qui a la donnée cross-module). */
  billingStatus?: { invoiceSent: boolean; labPaid: boolean }
}

/** Titre de section numéroté — matérialise le parcours logique Activer → Accompagner → Évoluer. */
function SectionTitle({ n, title, subtitle }: { n: number; title: string; subtitle?: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-sm font-semibold text-primary">
        {n}
      </div>
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wide">{title}</h3>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </div>
    </div>
  )
}

export function ClientLabTabContent({
  clientId,
  billingSlot,
  elioConfigSlot,
  billingStatus,
}: ClientLabTabContentProps) {
  const { data: client } = useClient(clientId)
  const { data: parcours } = useClientParcours(clientId)
  const { data: pendingValidations } = useClientPendingValidations(clientId)

  const [assignDialogOpen, setAssignDialogOpen] = useState(false)
  const [graduationDialogOpen, setGraduationDialogOpen] = useState(false)
  const [reactivateDialogOpen, setReactivateDialogOpen] = useState(false)
  const [labExitKitDialogOpen, setLabExitKitDialogOpen] = useState(false)

  if (!client) return null

  const dashboardType = client.config?.dashboardType ?? 'hub'
  const isLabClient = dashboardType === 'lab'
  const hasActiveParcours = parcours?.status === 'en_cours'
  const parcoursAbandoned = parcours?.status === 'abandoned'
  const parcoursCompleted = parcours?.status === 'termine'
  const noPendingValidations = (pendingValidations?.count ?? 0) === 0

  // État du Lab — SOURCE UNIQUE : les vrais flags (plus jamais dashboard_type, qui ne dit
  // que le mode par défaut au login et rendait cet en-tête incohérent avec le switch agents).
  //  - lab_mode_available = l'espace Lab existe (permanent une fois accordé)
  //  - elio_lab_enabled   = agents du parcours actifs ou en pause
  // Règle métier : One déclenché ⇒ Lab en pause automatiquement (sauf réactivation manuelle).
  const hasLab = client.config?.labModeAvailable ?? false
  const agentsOn = client.config?.elioLabEnabled ?? false
  const labState: 'none' | 'active' | 'paused' = !hasLab ? 'none' : agentsOn ? 'active' : 'paused'

  const activationNote =
    labState === 'none'
      ? "Le client n'a pas encore accès à son espace Lab."
      : labState === 'paused'
        ? 'Espace Lab acquis (historique consultable) — agents du parcours en pause. Le One actif met le Lab en pause ; réactive les agents ci-dessous si besoin.'
        : billingStatus?.labPaid
          ? 'Forfait Lab payé — accès actif.'
          : billingStatus?.invoiceSent
            ? 'Activé — facture envoyée, paiement en attente.'
            : 'Activé manuellement (sans facturation).'

  const labStateBadge =
    labState === 'none' ? 'Lab non activé' : labState === 'paused' ? 'Lab en pause' : 'Lab actif'

  const graduationTooltip = !isLabClient
    ? null
    : !parcoursCompleted
      ? `Parcours non terminé — ${
          parcours?.activeStages.filter((s) => s.active && s.status !== 'completed').length ?? '?'
        } étape(s) restante(s)`
      : !noPendingValidations
        ? `Demandes de validation en attente — traitez-les d'abord`
        : null

  return (
    <div className="space-y-8">
      {/* ──────────── ① ACTIVATION DU LAB ──────────── */}
      <section className="space-y-4">
        <SectionTitle n={1} title="Activation du Lab" subtitle="L'accès du client à son espace Lab" />

        {/* Statut unique */}
        <Card>
          <CardContent className="flex items-center justify-between pt-6">
            <div>
              <p className="text-sm font-medium">État du Lab</p>
              <p className="text-xs text-muted-foreground">{activationNote}</p>
            </div>
            <Badge variant={labState === 'active' ? 'default' : 'outline'} data-testid="lab-activation-badge">
              {labStateBadge}
            </Badge>
          </CardContent>
        </Card>

        {/* Onglet Lab : uniquement le levier « couper les agents du parcours ».
            L'accès global Lab/One est piloté depuis le cockpit Pilote. */}
        <AccessToggles
          clientId={clientId}
          labModeAvailable={client.config?.labModeAvailable ?? false}
          elioLabEnabled={client.config?.elioLabEnabled ?? false}
          oneModeAvailable={client.config?.oneModeAvailable ?? false}
          hasActiveParcours={hasActiveParcours}
          showOnlyAgents
        />

        {/* Facturation = sous-statut optionnel de l'activation (plus un bloc isolé en bas) */}
        {billingSlot && <Card>{billingSlot}</Card>}
      </section>

      {/* ──────────── ② ACCOMPAGNEMENT ──────────── */}
      <section className="space-y-4">
        <SectionTitle n={2} title="Accompagnement" subtitle="Parcours Lab et configuration d'Élio" />

        {/* Parcours Lab — détaillé */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Parcours Lab</CardTitle>
            {!parcours && (
              <Button variant="outline" size="sm" onClick={() => setAssignDialogOpen(true)}>
                Assigner un parcours
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {parcours ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">Statut</span>
                  <ParcoursStatusBadge status={parcours.status} />
                </div>
                <Separator />
                {/* Barre de progression */}
                {(() => {
                  const activeStages = parcours.activeStages.filter((s) => s.active)
                  const completedStages = activeStages.filter((s) => s.status === 'completed')
                  const progressPct = activeStages.length > 0
                    ? Math.round((completedStages.length / activeStages.length) * 100)
                    : 0
                  return (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-muted-foreground">Progression</span>
                        <span className="text-sm font-medium">
                          {completedStages.length} / {activeStages.length} étapes ({progressPct}%)
                        </span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary transition-all"
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                    </div>
                  )
                })()}
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">Démarré le</span>
                  <span className="text-sm">
                    {format(new Date(parcours.startedAt), 'd MMMM yyyy', { locale: fr })}
                  </span>
                </div>
                {/* Parcours abandonné */}
                {parcoursAbandoned && (
                  <>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="destructive">Abandonné</Badge>
                        {parcours.abandonmentReason && (
                          <span className="text-xs text-muted-foreground">
                            {parcours.abandonmentReason}
                          </span>
                        )}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setReactivateDialogOpen(true)}
                        data-testid="reactivate-parcours-button"
                      >
                        Réactiver le parcours
                      </Button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Aucun parcours Lab assigné.</p>
            )}
          </CardContent>
        </Card>

        {/* Configuration Élio par étape */}
        {elioConfigSlot && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Configuration Élio par étape</CardTitle>
            </CardHeader>
            <CardContent>{elioConfigSlot}</CardContent>
          </Card>
        )}
      </section>

      {/* ──────────── ③ ÉVOLUTION & SORTIE ──────────── */}
      {isLabClient && (
        <section className="space-y-4">
          <SectionTitle n={3} title="Évolution & sortie" subtitle="Graduation vers One ou clôture du Lab" />

          {/* Graduation vers One */}
          <Card>
            <CardHeader>
              <CardTitle>Graduation vers MonprojetPro One</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Déclenchez la graduation du client vers son espace professionnel One.
                </p>
                {graduationTooltip ? (
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" disabled title={graduationTooltip} aria-disabled="true">
                      Graduer vers MonprojetPro One
                    </Button>
                    <span className="text-xs text-muted-foreground">{graduationTooltip}</span>
                  </div>
                ) : (
                  <Button size="sm" onClick={() => setGraduationDialogOpen(true)} data-testid="graduation-button">
                    Graduer vers MonprojetPro One
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Kit de sortie Lab */}
          {client.status !== 'archived_lab' && client.status !== 'archived' && client.status !== 'deleted' && (
            <Card>
              <CardHeader>
                <CardTitle>Kit de sortie Lab</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Exportez les documents, briefs et conversations Élio Lab du client dans un ZIP téléchargeable.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setLabExitKitDialogOpen(true)}
                    data-testid="start-lab-exit-kit-button"
                  >
                    Lancer le kit de sortie Lab
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
          {client.status === 'archived_lab' && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">Archivé Lab</Badge>
                  <span className="text-xs text-muted-foreground">
                    Le kit de sortie Lab a été généré — le client peut télécharger ses documents pendant 14 jours.
                  </span>
                </div>
              </CardContent>
            </Card>
          )}
        </section>
      )}

      {/* Dialogs */}
      <AssignParcoursDialog clientId={clientId} open={assignDialogOpen} onOpenChange={setAssignDialogOpen} />
      {isLabClient && parcours && (
        <GraduationDialog
          clientId={clientId}
          clientName={client.name}
          clientCompany={client.company}
          parcours={parcours}
          open={graduationDialogOpen}
          onOpenChange={setGraduationDialogOpen}
        />
      )}
      {parcours && parcoursAbandoned && (
        <ReactivateParcoursDialog
          clientId={clientId}
          clientName={client.name}
          open={reactivateDialogOpen}
          onOpenChange={setReactivateDialogOpen}
        />
      )}
      {isLabClient && client.status !== 'archived_lab' && (
        <LabExitKitDialog
          clientId={clientId}
          clientName={client.name}
          clientCompany={client.company}
          open={labExitKitDialogOpen}
          onOpenChange={setLabExitKitDialogOpen}
        />
      )}
    </div>
  )
}
