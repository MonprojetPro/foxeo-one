'use client'

import { useState } from 'react'
import { Badge, Button } from '@monprojetpro/ui'
import { useOneClients, useSetOneStatus, useApplyOneSetup, ONE_SETUP_MODULES, type OneClientEntry } from '../hooks/use-one-clients'

/**
 * Vue « Clients One » — vision v2 (2026-06-24).
 * Remplace l'ancienne liste d'« instances » (provisioning dédié abandonné).
 * Pilote : offre (② One / ③ One+), cycle de vie chantier → livré, modules actifs.
 */
export function ClientsOneList() {
  const { data: clients, isPending, isError } = useOneClients()
  const setStatusMutation = useSetOneStatus()
  const applySetupMutation = useApplyOneSetup()
  const [confirmAction, setConfirmAction] = useState<{
    client: OneClientEntry
    target: 'delivered' | 'construction'
  } | null>(null)

  if (isPending) {
    return (
      <div className="space-y-2" aria-label="Chargement des clients One">
        {[1, 2, 3].map((n) => (
          <div key={n} className="h-12 animate-pulse rounded bg-white/5" />
        ))}
      </div>
    )
  }

  if (isError) {
    return (
      <div className="rounded border border-red-500/20 bg-red-950/30 p-4 text-sm text-red-400">
        Erreur lors du chargement des clients One
      </div>
    )
  }

  if (!clients || clients.length === 0) {
    return (
      <div className="rounded border border-white/10 bg-white/5 p-8 text-center text-sm text-gray-500">
        Aucun client avec le Mode One débloqué pour l&apos;instant.
        <p className="mt-1 text-xs text-gray-600">
          Débloque le Mode One d&apos;un client depuis sa fiche CRM (toggles d&apos;accès), il apparaîtra ici.
        </p>
      </div>
    )
  }

  const missingSetupModules = (client: OneClientEntry) =>
    ONE_SETUP_MODULES.filter((m) => !client.activeModules.includes(m))

  function handleToggleStatus(client: OneClientEntry) {
    // Les deux directions sont des événements forts côté client (notif + bandeau) → confirmation
    setConfirmAction({
      client,
      target: client.oneStatus === 'construction' ? 'delivered' : 'construction',
    })
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded border border-white/10">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 bg-white/5 text-left text-gray-400">
              <th className="px-4 py-3 font-medium">Client</th>
              <th className="px-4 py-3 font-medium">Offre</th>
              <th className="px-4 py-3 font-medium">Outil</th>
              <th className="px-4 py-3 font-medium">Modules actifs</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {clients.map((client) => {
              const missing = missingSetupModules(client)
              return (
                <tr key={client.clientId} className="border-b border-white/5 hover:bg-white/5">
                  <td className="px-4 py-3">
                    <span className="font-medium text-white">{client.name}</span>
                    {client.company && (
                      <span className="ml-2 text-xs text-gray-500">{client.company}</span>
                    )}
                    {client.dashboardType !== 'one' && (
                      <span className="ml-2 text-xs text-purple-400" title="Client Lab avec Mode One débloqué">
                        gradué Lab
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={client.offer === 'one_plus' ? 'default' : 'secondary'}>
                      {client.offer === 'one_plus' ? 'One+ (coaching)' : 'One'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => handleToggleStatus(client)}
                      disabled={setStatusMutation.isPending}
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                        client.oneStatus === 'delivered'
                          ? 'bg-green-500/15 text-green-400 hover:bg-green-500/25'
                          : 'bg-amber-500/15 text-amber-400 hover:bg-amber-500/25'
                      }`}
                      title="Cliquer pour basculer chantier / livré"
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${client.oneStatus === 'delivered' ? 'bg-green-400' : 'bg-amber-400 animate-pulse'}`} />
                      {client.oneStatus === 'delivered' ? 'Livré' : 'En chantier'}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-white">{client.activeModules.length}</span>
                    <span className="ml-1 text-xs text-gray-500">
                      {client.activeModules.join(' · ') || '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {missing.length > 0 ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => applySetupMutation.mutate(client.clientId)}
                        disabled={applySetupMutation.isPending}
                        title={`Modules manquants : ${missing.join(', ')}`}
                      >
                        {applySetupMutation.isPending ? 'Application...' : `Setup One complet (+${missing.length})`}
                      </Button>
                    ) : (
                      <span className="text-xs text-green-400">✓ Setup One complet</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Confirmation bascule chantier ↔ livré (les deux directions) */}
      {confirmAction && (
        <div
          className={`rounded border p-4 ${
            confirmAction.target === 'delivered'
              ? 'border-green-500/20 bg-green-950/30'
              : 'border-amber-500/20 bg-amber-950/30'
          }`}
        >
          <p className="text-sm text-white">
            {confirmAction.target === 'delivered' ? (
              <>
                Marquer l&apos;outil de <span className="font-medium">{confirmAction.client.name}</span> comme{' '}
                <span className="font-medium text-green-400">livré</span> ?
              </>
            ) : (
              <>
                Repasser l&apos;outil de <span className="font-medium">{confirmAction.client.name}</span>{' '}
                <span className="font-medium text-amber-400">en chantier</span> ?
              </>
            )}
          </p>
          <p className="mt-1 text-xs text-gray-400">
            {confirmAction.target === 'delivered'
              ? 'Côté client : le bandeau « en chantier » disparaît, les cockpits s\'allument, et il reçoit une notification (cloche + mot d\'Élio). Instantané.'
              : 'Côté client : le bandeau « en chantier » réapparaît immédiatement, et il reçoit une notification (cloche + mot d\'Élio). Son tableau de bord reste entièrement accessible.'}
          </p>
          <div className="mt-3 flex gap-2">
            <Button
              size="sm"
              variant={confirmAction.target === 'delivered' ? 'default' : 'outline'}
              onClick={() => {
                setStatusMutation.mutate({
                  clientId: confirmAction.client.clientId,
                  oneStatus: confirmAction.target,
                })
                setConfirmAction(null)
              }}
              disabled={setStatusMutation.isPending}
            >
              {confirmAction.target === 'delivered' ? 'Confirmer la livraison' : 'Confirmer le retour en chantier'}
            </Button>
            <Button variant="outline" size="sm" onClick={() => setConfirmAction(null)}>
              Annuler
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
