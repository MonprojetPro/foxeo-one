'use client'

import { useState, useMemo, useEffect } from 'react'
import { Button, Dialog, DialogContent, DialogHeader, DialogTitle, showSuccess, showError } from '@monprojetpro/ui'
import { createAndSendQuote } from '@monprojetpro/modules-facturation'
import type { LineItem, QuoteType } from '@monprojetpro/modules-facturation'
import { QUOTE_TYPE_LABELS } from '@monprojetpro/modules-facturation'
import { type ModuleCatalogEntry } from '../actions/list-module-catalog'

interface GenerateQuoteFromModulesModalProps {
  clientId: string
  clientName: string
  activeModules: string[]
  catalog: ModuleCatalogEntry[]
  dashboardType?: string
  labPaid?: boolean
  onClose: () => void
}

interface QuoteLine {
  moduleKey: string
  label: string
  unitPrice: number
  type: 'setup' | 'monthly'
  included: boolean
}

function inferQuoteType(dashboardType?: string, labPaid?: boolean): QuoteType {
  if (dashboardType === 'lab' || labPaid === false) return 'lab_onboarding'
  return 'one_direct_deposit'
}

export function GenerateQuoteFromModulesModal({
  clientId,
  clientName,
  activeModules,
  catalog,
  dashboardType,
  labPaid,
  onClose,
}: GenerateQuoteFromModulesModalProps) {
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'annual'>('annual')
  const [quoteType, setQuoteType] = useState<QuoteType>(inferQuoteType(dashboardType, labPaid))
  const [sending, setSending] = useState(false)

  // Build initial lines from active modules
  const initialLines = useMemo(() => {
    const lines: QuoteLine[] = []
    for (const mod of catalog) {
      if (!activeModules.includes(mod.module_key)) continue
      if (mod.setup_price_ht > 0) {
        lines.push({
          moduleKey: mod.module_key,
          label: `${mod.name} — Setup`,
          unitPrice: mod.setup_price_ht,
          type: 'setup',
          included: true,
        })
      }
      if (mod.monthly_price_ht !== null && mod.monthly_price_ht > 0) {
        lines.push({
          moduleKey: mod.module_key,
          label: `${mod.name} — Abonnement ${billingPeriod === 'annual' ? '(×12)' : '(mensuel)'}`,
          unitPrice: mod.monthly_price_ht,
          type: 'monthly',
          included: true,
        })
      }
    }
    return lines
  }, [catalog, activeModules, billingPeriod])

  const [lines, setLines] = useState(initialLines)

  // Sync lines when billing period changes, preserving user price edits
  useEffect(() => {
    setLines(prev => {
      const priceOverrides = new Map(prev.map(l => [`${l.moduleKey}-${l.type}`, l.unitPrice]))
      return initialLines.map(l => ({
        ...l,
        unitPrice: priceOverrides.get(`${l.moduleKey}-${l.type}`) ?? l.unitPrice,
      }))
    })
  }, [initialLines])

  const toggleLine = (index: number) => {
    setLines(prev => prev.map((l, i) => i === index ? { ...l, included: !l.included } : l))
  }

  const updatePrice = (index: number, price: number) => {
    setLines(prev => prev.map((l, i) => i === index ? { ...l, unitPrice: price } : l))
  }

  const setupTotal = lines
    .filter(l => l.included && l.type === 'setup')
    .reduce((sum, l) => sum + l.unitPrice, 0)

  const monthlyTotal = lines
    .filter(l => l.included && l.type === 'monthly')
    .reduce((sum, l) => sum + l.unitPrice, 0)

  const grandTotal = setupTotal + (billingPeriod === 'annual' ? monthlyTotal * 12 : monthlyTotal)

  const handleSend = async () => {
    setSending(true)
    try {
      const lineItems: LineItem[] = lines
        .filter(l => l.included)
        .map(l => ({
          label: l.label,
          description: null,
          quantity: l.type === 'monthly' && billingPeriod === 'annual' ? 12 : 1,
          unit: l.type === 'monthly' ? 'mois' : 'unité',
          unitPrice: l.unitPrice,
          vatRate: '20',
          total: l.unitPrice * (l.type === 'monthly' && billingPeriod === 'annual' ? 12 : 1),
        }))

      if (lineItems.length === 0) {
        showError('Aucune ligne sélectionnée')
        setSending(false)
        return
      }

      const result = await createAndSendQuote(clientId, lineItems, {
        sendNow: false,
        quoteType,
        publicNotes: `Devis généré depuis le catalogue modules pour ${clientName}`,
      })

      if (result.error) {
        showError(result.error.message)
      } else {
        showSuccess('Devis créé avec succès')
        onClose()
      }
    } finally {
      setSending(false)
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Générer un devis — {clientName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Options */}
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="mb-1 block text-sm text-gray-400">Type de devis</label>
              <select
                value={quoteType}
                onChange={(e) => setQuoteType(e.target.value as QuoteType)}
                className="w-full rounded border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
              >
                {Object.entries(QUOTE_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value} className="bg-gray-900">
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label className="mb-1 block text-sm text-gray-400">Période facturation</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setBillingPeriod('monthly')}
                  className={`flex-1 rounded px-3 py-2 text-sm ${
                    billingPeriod === 'monthly'
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                      : 'bg-white/5 text-gray-400 border border-white/10'
                  }`}
                >
                  Mensuel
                </button>
                <button
                  type="button"
                  onClick={() => setBillingPeriod('annual')}
                  className={`flex-1 rounded px-3 py-2 text-sm ${
                    billingPeriod === 'annual'
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                      : 'bg-white/5 text-gray-400 border border-white/10'
                  }`}
                >
                  Annuel (×12)
                </button>
              </div>
            </div>
          </div>

          {/* Setup lines */}
          {lines.some(l => l.type === 'setup') && (
            <div>
              <h4 className="mb-2 text-sm font-medium text-gray-300">Setup</h4>
              <div className="space-y-1">
                {lines.map((line, i) => {
                  if (line.type !== 'setup') return null
                  return (
                    <div key={i} className="flex items-center gap-3 rounded border border-white/5 bg-white/5 px-3 py-2">
                      <input
                        type="checkbox"
                        checked={line.included}
                        onChange={() => toggleLine(i)}
                        className="h-4 w-4 rounded border-white/20"
                      />
                      <span className="flex-1 text-sm text-white">{line.label}</span>
                      <input
                        type="number"
                        value={line.unitPrice}
                        onChange={(e) => updatePrice(i, parseFloat(e.target.value) || 0)}
                        step={0.01}
                        min={0}
                        className="w-24 rounded border border-white/10 bg-white/5 px-2 py-1 text-right text-sm text-white"
                      />
                      <span className="text-xs text-gray-500">€ HT</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Monthly lines */}
          {lines.some(l => l.type === 'monthly') && (
            <div>
              <h4 className="mb-2 text-sm font-medium text-gray-300">
                Abonnement {billingPeriod === 'annual' ? '(annuel)' : '(mensuel)'}
              </h4>
              <div className="space-y-1">
                {lines.map((line, i) => {
                  if (line.type !== 'monthly') return null
                  return (
                    <div key={i} className="flex items-center gap-3 rounded border border-white/5 bg-white/5 px-3 py-2">
                      <input
                        type="checkbox"
                        checked={line.included}
                        onChange={() => toggleLine(i)}
                        className="h-4 w-4 rounded border-white/20"
                      />
                      <span className="flex-1 text-sm text-white">{line.label}</span>
                      <input
                        type="number"
                        value={line.unitPrice}
                        onChange={(e) => updatePrice(i, parseFloat(e.target.value) || 0)}
                        step={0.01}
                        min={0}
                        className="w-24 rounded border border-white/10 bg-white/5 px-2 py-1 text-right text-sm text-white"
                      />
                      <span className="text-xs text-gray-500">€/mois</span>
                      {billingPeriod === 'annual' && (
                        <span className="text-xs text-gray-500">
                          = {(line.unitPrice * 12).toLocaleString('fr-FR')}€/an
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Totals */}
          <div className="rounded-lg border border-white/10 bg-white/5 p-4">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Setup total</span>
              <span className="text-white">{setupTotal.toLocaleString('fr-FR')}€ HT</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">
                Abonnement {billingPeriod === 'annual' ? '(12 mois)' : '(mensuel)'}
              </span>
              <span className="text-white">
                {(billingPeriod === 'annual' ? monthlyTotal * 12 : monthlyTotal).toLocaleString('fr-FR')}€ HT
              </span>
            </div>
            <div className="mt-2 flex justify-between border-t border-white/10 pt-2 text-sm font-semibold">
              <span className="text-white">Total HT</span>
              <span className="text-cyan-400">{grandTotal.toLocaleString('fr-FR')}€</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button onClick={handleSend} disabled={sending}>
              {sending ? 'Création...' : 'Créer le devis'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
