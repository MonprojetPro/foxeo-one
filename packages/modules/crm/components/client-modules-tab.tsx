'use client'

import { useState, useMemo, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createBrowserSupabaseClient } from '@monprojetpro/supabase'
import { Button } from '@monprojetpro/ui'
import { useModuleCatalog } from '@monprojetpro/module-admin'
import { useClientModules, useApplyClientModuleConfig } from '@monprojetpro/module-admin'
import { type ModuleCatalogEntry } from '@monprojetpro/module-admin'
import { GenerateQuoteFromModulesModal } from '@monprojetpro/module-admin'

function formatPrice(price: number | null): string {
  if (price === null || price === undefined) return '—'
  if (price === 0) return 'Gratuit'
  return `${price.toLocaleString('fr-FR')}€`
}

interface ClientModulesTabProps {
  clientId: string
  clientName: string
  dashboardType?: string
  labPaid?: boolean
}

export function ClientModulesTab({ clientId, clientName, dashboardType, labPaid }: ClientModulesTabProps) {
  const { data: catalog, isLoading: catalogLoading } = useModuleCatalog({ isActive: true })
  const { data: activeModules, isLoading: modulesLoading } = useClientModules(clientId)
  const applyMutation = useApplyClientModuleConfig(clientId)

  const [pendingChanges, setPendingChanges] = useState<Map<string, boolean>>(new Map())
  const [showQuoteModal, setShowQuoteModal] = useState(false)

  // AC10 — Warning cohérence devis vs modules actifs
  const { data: lastPaidQuoteModules } = useQuery({
    queryKey: ['last-paid-quote-modules', clientId],
    queryFn: async () => {
      const supabase = createBrowserSupabaseClient()
      // Chercher le dernier devis payé de type one_direct_deposit ou one_amendment
      const { data: quoteMeta } = await supabase
        .from('quote_metadata')
        .select('pennylane_quote_id, total_amount_ht')
        .eq('client_id', clientId)
        .in('quote_type', ['one_direct_deposit', 'one_amendment'])
        .not('paid_at', 'is', null)
        .order('paid_at', { ascending: false })
        .limit(1)

      if (!quoteMeta || quoteMeta.length === 0) return null

      // Chercher les lignes du devis dans billing_sync pour extraire les modules
      const { data: syncEntry } = await supabase
        .from('billing_sync')
        .select('data')
        .eq('pennylane_id', quoteMeta[0].pennylane_quote_id)
        .eq('entity_type', 'quote')
        .single()

      if (!syncEntry?.data) return null

      // Extraire les module keys des labels de lignes
      const lineItems = (syncEntry.data as Record<string, unknown>).line_items as Array<{ label?: string }> | undefined
      if (!lineItems) return null

      const moduleKeys = new Set<string>()
      if (catalog) {
        for (const mod of catalog) {
          for (const line of lineItems) {
            if (line.label?.includes(mod.name)) {
              moduleKeys.add(mod.module_key)
            }
          }
        }
      }
      return Array.from(moduleKeys)
    },
    enabled: !!clientId && !!catalog,
  })

  const isLoading = catalogLoading || modulesLoading

  // Compute effective state (current + pending changes)
  const effectiveModules = useMemo(() => {
    if (!activeModules) return new Set<string>()
    const set = new Set(activeModules)
    for (const [key, enable] of pendingChanges) {
      if (enable) set.add(key)
      else set.delete(key)
    }
    return set
  }, [activeModules, pendingChanges])

  const hasPendingChanges = pendingChanges.size > 0

  const handleToggle = (moduleKey: string, isDefault: boolean) => {
    if (isDefault) return
    const currentlyActive = activeModules?.includes(moduleKey) ?? false
    const pendingState = pendingChanges.get(moduleKey)

    if (pendingState !== undefined) {
      // Undo pending change
      const next = new Map(pendingChanges)
      next.delete(moduleKey)
      setPendingChanges(next)
    } else {
      // Toggle
      const next = new Map(pendingChanges)
      next.set(moduleKey, !currentlyActive)
      setPendingChanges(next)
    }
  }

  const handleApply = () => {
    const finalModules = Array.from(effectiveModules)
    applyMutation.mutate(finalModules, {
      onSuccess: () => setPendingChanges(new Map()),
    })
  }

  const handleReset = () => setPendingChanges(new Map())

  // Group by category
  const grouped = useMemo(() => {
    if (!catalog) return new Map<string, ModuleCatalogEntry[]>()
    const map = new Map<string, ModuleCatalogEntry[]>()
    for (const mod of catalog) {
      const group = map.get(mod.category) ?? []
      group.push(mod)
      map.set(mod.category, group)
    }
    return map
  }, [catalog])

  const categoryLabels: Record<string, string> = {
    business: 'Business',
    communication: 'Communication',
    integration: 'Intégration',
  }

  // Compute pricing summary
  const pricingSummary = useMemo(() => {
    if (!catalog) return { setupTotal: 0, monthlyTotal: 0 }
    let setupTotal = 0
    let monthlyTotal = 0
    for (const mod of catalog) {
      if (effectiveModules.has(mod.module_key)) {
        setupTotal += mod.setup_price_ht
        monthlyTotal += mod.monthly_price_ht ?? 0
      }
    }
    return { setupTotal, monthlyTotal }
  }, [catalog, effectiveModules])

  // AC10 — Diff modules vs dernier devis payé
  const quoteModuleDiff = useMemo(() => {
    if (!lastPaidQuoteModules || !activeModules) return null
    const added = activeModules.filter(k => !lastPaidQuoteModules.includes(k))
    const removed = lastPaidQuoteModules.filter(k => !activeModules.includes(k))
    if (added.length === 0 && removed.length === 0) return null
    return { added, removed }
  }, [lastPaidQuoteModules, activeModules])

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-14 animate-pulse rounded bg-white/5" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* AC10 — Warning cohérence devis vs modules actifs */}
      {quoteModuleDiff && (
        <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-4">
          <p className="text-sm font-medium text-yellow-300">
            Les modules actifs diffèrent du dernier devis payé. Génère un avenant ou un nouveau devis pour régulariser.
          </p>
          <div className="mt-2 flex gap-4 text-xs">
            {quoteModuleDiff.added.length > 0 && (
              <span className="text-green-400">
                + Ajoutés : {quoteModuleDiff.added.join(', ')}
              </span>
            )}
            {quoteModuleDiff.removed.length > 0 && (
              <span className="text-red-400">
                - Retirés : {quoteModuleDiff.removed.join(', ')}
              </span>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            className="mt-2 border-yellow-500/30 text-yellow-300 hover:bg-yellow-500/10"
            onClick={() => setShowQuoteModal(true)}
          >
            Générer avenant
          </Button>
        </div>
      )}

      {/* Summary bar */}
      <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 p-4">
        <div className="flex gap-6 text-sm">
          <div>
            <span className="text-gray-400">Modules actifs : </span>
            <span className="font-medium text-white">{effectiveModules.size}</span>
          </div>
          <div>
            <span className="text-gray-400">Setup total : </span>
            <span className="font-medium text-white">{formatPrice(pricingSummary.setupTotal)}</span>
          </div>
          <div>
            <span className="text-gray-400">Mensuel : </span>
            <span className="font-medium text-white">
              {formatPrice(pricingSummary.monthlyTotal)}
              {pricingSummary.monthlyTotal > 0 && <span className="text-gray-500">/mois</span>}
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          {hasPendingChanges && (
            <>
              <Button variant="outline" size="sm" onClick={handleReset}>
                Annuler
              </Button>
              <Button size="sm" onClick={handleApply} disabled={applyMutation.isPending}>
                {applyMutation.isPending ? 'Application...' : 'Appliquer la configuration'}
              </Button>
            </>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowQuoteModal(true)}
          >
            Générer devis
          </Button>
        </div>
      </div>

      {/* Modules by category */}
      {Array.from(grouped.entries()).map(([category, modules]) => (
        <section key={category}>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-400">
            {categoryLabels[category] ?? category}
          </h3>
          <div className="space-y-2">
            {modules.map((mod) => {
              const isActive = effectiveModules.has(mod.module_key)
              const isPending = pendingChanges.has(mod.module_key)
              const isDefault = mod.is_default

              return (
                <div
                  key={mod.id}
                  className={`flex items-center justify-between rounded-lg border p-3 transition-colors ${
                    isPending
                      ? 'border-cyan-500/30 bg-cyan-500/5'
                      : 'border-white/10 bg-white/5'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={isActive}
                      disabled={isDefault}
                      onChange={() => handleToggle(mod.module_key, isDefault)}
                      className="h-4 w-4 rounded border-white/20"
                      aria-label={`${isActive ? 'Désactiver' : 'Activer'} ${mod.name}`}
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-white">{mod.name}</span>
                        {isDefault && (
                          <span className="rounded-full bg-cyan-500/20 px-2 py-0.5 text-xs text-cyan-300">
                            One de base
                          </span>
                        )}
                        {mod.kind === 'custom' && (
                          <span className="rounded-full bg-purple-500/20 px-2 py-0.5 text-xs text-purple-300">
                            Sur-mesure
                          </span>
                        )}
                        {isPending && (
                          <span className="rounded-full bg-yellow-500/20 px-2 py-0.5 text-xs text-yellow-300">
                            Modifié
                          </span>
                        )}
                      </div>
                      {mod.description && (
                        <p className="mt-0.5 text-xs text-gray-500">{mod.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-400">
                    <span>{formatPrice(mod.setup_price_ht)} setup</span>
                    <span>
                      {mod.monthly_price_ht !== null && mod.monthly_price_ht > 0
                        ? `${formatPrice(mod.monthly_price_ht)}/mois`
                        : '—'}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      ))}

      {/* Quote modal */}
      {showQuoteModal && catalog && (
        <GenerateQuoteFromModulesModal
          clientId={clientId}
          clientName={clientName}
          activeModules={Array.from(effectiveModules)}
          catalog={catalog}
          dashboardType={dashboardType}
          labPaid={labPaid}
          onClose={() => setShowQuoteModal(false)}
        />
      )}
    </div>
  )
}
