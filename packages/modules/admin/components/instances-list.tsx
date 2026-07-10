'use client'

import { useState } from 'react'
import { Badge } from '@monprojetpro/ui'
import { useInstances } from '../hooks/use-instances'
import type { ClientInstance } from '../hooks/use-instances'

const STATUS_BADGE: Record<
  ClientInstance['status'],
  { label: string; variant: 'default' | 'outline' | 'secondary' | 'destructive' }
> = {
  active: { label: 'Actif', variant: 'default' },
  provisioning: { label: 'Provisioning...', variant: 'secondary' },
  suspended: { label: 'Suspendu', variant: 'outline' },
  failed: { label: 'Échec', variant: 'destructive' },
  transferred: { label: 'Transféré', variant: 'outline' },
}

const TIER_LABELS: Record<ClientInstance['tier'], string> = {
  base: 'Base',
  essentiel: 'Essentiel',
  agentique: 'Agentique',
}

interface InstancesListProps {
  onSuspend?: (instanceId: string) => void
  onArchive?: (instanceId: string) => void
  onViewMetrics?: (instanceId: string) => void
}

export function InstancesList({ onSuspend, onArchive, onViewMetrics }: InstancesListProps) {
  const { data: instances, isPending, isError } = useInstances()
  const [confirmAction, setConfirmAction] = useState<{
    type: 'suspend' | 'archive'
    instanceId: string
    slug: string
  } | null>(null)

  if (isPending) {
    return (
      <div className="space-y-2" aria-label="Chargement des instances">
        {[1, 2, 3].map((n) => (
          <div key={n} className="h-12 animate-pulse rounded-xl bg-white/5" />
        ))}
      </div>
    )
  }

  if (isError) {
    return (
      <div className="rounded-2xl border border-red-500/20 bg-red-950/20 p-4 text-sm text-red-400">
        Erreur lors du chargement des instances
      </div>
    )
  }

  if (!instances || instances.length === 0) {
    return (
      /* État vide cockpit */
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-white/10 p-10 text-center">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5">
          <span className="text-lg text-gray-500" aria-hidden="true">—</span>
        </div>
        <p className="text-sm text-gray-500">Aucune instance One provisionnée</p>
      </div>
    )
  }

  function handleAction(type: 'suspend' | 'archive', instance: ClientInstance) {
    setConfirmAction({ type, instanceId: instance.id, slug: instance.slug })
  }

  function confirmPendingAction() {
    if (!confirmAction) return
    if (confirmAction.type === 'suspend') {
      onSuspend?.(confirmAction.instanceId)
    } else {
      onArchive?.(confirmAction.instanceId)
    }
    setConfirmAction(null)
  }

  return (
    <>
      {/* Bandeau de confirmation d'action destructive */}
      {confirmAction && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Confirmer ${confirmAction.type === 'suspend' ? 'la suspension' : "l'archivage"}`}
          className="mb-4 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4"
        >
          <p className="text-sm text-amber-400">
            {confirmAction.type === 'suspend'
              ? `Confirmer la suspension de l'instance "${confirmAction.slug}" ?`
              : `Confirmer l'archivage de l'instance "${confirmAction.slug}" ?`}
          </p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={confirmPendingAction}
              className="rounded-lg bg-amber-600 px-3.5 py-1.5 text-xs font-medium text-white transition-colors hover:bg-amber-500"
            >
              Confirmer
            </button>
            <button
              type="button"
              onClick={() => setConfirmAction(null)}
              className="rounded-lg border border-white/10 bg-white/[0.02] px-3.5 py-1.5 text-xs text-gray-400 transition-colors hover:border-white/20 hover:text-white"
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* Tableau instances cockpit */}
      <div className="overflow-hidden rounded-2xl border border-white/10">
        <table className="w-full text-sm" aria-label="Liste des instances One">
          {/* En-tête */}
          <thead>
            <tr className="border-b border-white/10 text-left text-xs text-gray-400">
              <th className="px-4 py-3 font-medium">Client</th>
              <th className="px-4 py-3 font-medium">Slug</th>
              <th className="px-4 py-3 font-medium">Statut</th>
              <th className="px-4 py-3 font-medium">Tier</th>
              <th className="px-4 py-3 font-medium">Modules</th>
              <th className="px-4 py-3 font-medium">Créé le</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          {/* Lignes au survol discret */}
          <tbody className="divide-y divide-white/5">
            {instances.map((instance) => {
              const badgeCfg = STATUS_BADGE[instance.status]
              const createdDate = new Date(instance.createdAt).toLocaleDateString('fr-FR')

              return (
                <tr key={instance.id} className="text-gray-300 transition-colors hover:bg-white/[0.03]">
                  <td className="px-4 py-3 font-medium text-white">
                    {instance.clientName ?? instance.clientId.slice(0, 8)}
                  </td>
                  <td className="px-4 py-3">
                    <a
                      href={instance.instanceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-cyan-400 transition-colors hover:text-cyan-300 hover:underline"
                      aria-label={`Ouvrir l'instance ${instance.slug}`}
                    >
                      {instance.slug}
                    </a>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={badgeCfg.variant}>{badgeCfg.label}</Badge>
                  </td>
                  <td className="px-4 py-3 text-gray-300">{TIER_LABELS[instance.tier]}</td>
                  <td className="px-4 py-3">
                    <span className="tabular-nums text-xs text-gray-500">
                      {instance.activeModules.length} module{instance.activeModules.length !== 1 ? 's' : ''}
                    </span>
                  </td>
                  <td className="px-4 py-3 tabular-nums text-xs text-gray-500">{createdDate}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      {/* Voir métriques */}
                      <button
                        type="button"
                        onClick={() => onViewMetrics?.(instance.id)}
                        aria-label={`Voir les métriques de ${instance.slug}`}
                        className="rounded-lg border border-white/10 bg-white/[0.02] px-2.5 py-1.5 text-xs text-gray-300 transition-colors hover:border-white/20 hover:bg-white/5 hover:text-white"
                      >
                        Métriques
                      </button>
                      {/* Suspendre — visible uniquement si actif */}
                      {instance.status === 'active' && (
                        <button
                          type="button"
                          onClick={() => handleAction('suspend', instance)}
                          aria-label={`Suspendre ${instance.slug}`}
                          className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-2.5 py-1.5 text-xs text-amber-400 transition-colors hover:border-amber-400/50 hover:bg-amber-500/10"
                        >
                          Suspendre
                        </button>
                      )}
                      {/* Archiver — caché si transféré */}
                      {instance.status !== 'transferred' && (
                        <button
                          type="button"
                          onClick={() => handleAction('archive', instance)}
                          aria-label={`Archiver ${instance.slug}`}
                          className="rounded-lg border border-red-500/30 bg-red-500/5 px-2.5 py-1.5 text-xs text-red-400 transition-colors hover:border-red-400/50 hover:bg-red-500/10"
                        >
                          Archiver
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </>
  )
}
