'use client'

import { useState, useTransition } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  Button,
  Badge,
  Separator,
  showSuccess,
  showError,
} from '@monprojetpro/ui'
import { graduateClient } from '../actions/graduate-client'
import type { GraduationTier } from '../types/graduation.types'
import type { Parcours } from '../types/crm.types'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { differenceInDays } from 'date-fns'

// Catalogue réel des modules activables côté CLIENT ONE (manifests `targets: ['client-one']`).
// ⚠️ Tenu à jour avec la vision One v2 : « Comptabilité » (facturation) et « Validation Hub »
// sont des modules HUB (opérateur), JAMAIS activables pour un client → exclus d'ici.
// « Suivi de l'outil » et « Support » font partie du socle relation One.
const AVAILABLE_MODULES = [
  { id: 'core-dashboard', label: 'Dashboard' },
  { id: 'chat', label: 'Messagerie' },
  { id: 'documents', label: 'Documents' },
  { id: 'visio', label: 'Visioconférence' },
  { id: 'suivi-outil', label: "Suivi de l'outil" },
  { id: 'support', label: 'Support' },
  { id: 'elio', label: 'Élio' },
]

// Socle relation par défaut. `elio` est inclus car le tier par défaut (One) comprend
// Élio ; il est retiré automatiquement si MiKL choisit « Ponctuel » (cf. handleSelectTier).
const DEFAULT_MODULES = ['core-dashboard', 'chat', 'documents', 'suivi-outil', 'support', 'elio']

// Les 3 offres — alignées sur docs/one-vision-v2-2026-06-24.md (actées 2026-06-24).
// Recyclage subscription_tier (2026-07-26) : les `value` SONT désormais les identifiants
// commerciaux directs ('ponctuel'/'one'/'one_plus') — plus de mapping technique caché.
// La 3ᵉ offre n'est PLUS « Agentique IA » (devenue option au devis) : c'est « One+ » dont le
// SEUL différenciateur est le COACHING HUMAIN (1 visio/mois).
const TIERS: Array<{ value: GraduationTier; label: string; description: string }> = [
  {
    value: 'ponctuel',
    label: 'Ponctuel — devis projet',
    description: 'Outil livré en one-shot, sans abonnement One ni Élio',
  },
  {
    value: 'one',
    label: 'One — 49 €/mois',
    description: 'Élio (assistant), chat & demandes d\'évolution, hébergement + maintenance',
  },
  {
    value: 'one_plus',
    label: 'One+ — 99 €/mois',
    description: 'Tout One + 1 visio de coaching humain / mois (accompagnement de l\'entrepreneur)',
  },
]

interface GraduationDialogProps {
  clientId: string
  clientName: string
  clientCompany: string
  parcours: Parcours
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function GraduationDialog({
  clientId,
  clientName,
  clientCompany,
  parcours,
  open,
  onOpenChange,
  onSuccess,
}: GraduationDialogProps) {
  const [selectedTier, setSelectedTier] = useState<GraduationTier>('one')
  const [selectedModules, setSelectedModules] = useState<string[]>(DEFAULT_MODULES)
  const [notes, setNotes] = useState('')
  // Forçage opérateur : graduer même si le parcours n'est pas terminé (cf. graduateClient).
  const [forceGraduation, setForceGraduation] = useState(false)
  const [isPending, startTransition] = useTransition()
  const queryClient = useQueryClient()

  const completedSteps = parcours.activeStages.filter((s) => s.status === 'completed').length
  const totalSteps = parcours.activeStages.filter((s) => s.active).length
  const durationDays = differenceInDays(new Date(), new Date(parcours.startedAt))

  // L'offre IMPLIQUE Élio : Essentiel/Agentique → Élio activé ; Ponctuel → Élio retiré.
  // Évite l'incohérence « Ponctuel (sans Élio) mais case Élio cochée ».
  const handleSelectTier = (tier: GraduationTier) => {
    setSelectedTier(tier)
    setSelectedModules((prev) => {
      const withoutElio = prev.filter((m) => m !== 'elio')
      return tier === 'ponctuel' ? withoutElio : [...withoutElio, 'elio']
    })
  }

  const toggleModule = (moduleId: string) => {
    setSelectedModules((prev) =>
      prev.includes(moduleId)
        ? prev.filter((m) => m !== moduleId)
        : [...prev, moduleId]
    )
  }

  const handleConfirm = () => {
    if (selectedModules.length === 0) {
      showError('Sélectionnez au moins un module')
      return
    }

    startTransition(async () => {
      const result = await graduateClient({
        clientId,
        tier: selectedTier,
        activeModules: selectedModules,
        notes: notes.trim() || undefined,
        force: forceGraduation,
      })

      if (result.error) {
        showError(result.error.message)
        return
      }

      showSuccess(
        `Graduation réussie — ${clientName} a désormais accès au mode One. Le toggle Lab/One est visible dans son dashboard.`
      )
      await queryClient.invalidateQueries({ queryKey: ['clients', clientId] })
      await queryClient.invalidateQueries({ queryKey: ['parcours', clientId] })
      onOpenChange(false)
      onSuccess?.()
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Graduer vers MonprojetPro One</DialogTitle>
          <DialogDescription>
            Confirmez la graduation de ce client vers son espace professionnel One.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 mt-2">
          {/* Récapitulatif client */}
          <div className="rounded-lg border p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">Client</span>
              <span className="text-sm font-semibold">{clientName}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">Entreprise</span>
              <span className="text-sm">{clientCompany}</span>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">Durée parcours</span>
              <span className="text-sm">{durationDays} jours</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">Étapes complétées</span>
              <Badge variant="secondary">{completedSteps} / {totalSteps}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">Démarré le</span>
              <span className="text-sm">
                {format(new Date(parcours.startedAt), 'd MMMM yyyy', { locale: fr })}
              </span>
            </div>
          </div>

          {/* Choix du tier */}
          <div>
            <p className="text-sm font-semibold mb-2">Tier One</p>
            <div className="space-y-2">
              {TIERS.map((tier) => (
                <button
                  key={tier.value}
                  type="button"
                  onClick={() => handleSelectTier(tier.value)}
                  className={[
                    'w-full text-left rounded-lg border p-3 transition-colors',
                    selectedTier === tier.value
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-primary/50',
                  ].join(' ')}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className={[
                        'w-4 h-4 rounded-full border-2 flex-shrink-0',
                        selectedTier === tier.value
                          ? 'border-primary bg-primary'
                          : 'border-muted-foreground',
                      ].join(' ')}
                    />
                    <div>
                      <p className="text-sm font-medium">{tier.label}</p>
                      <p className="text-xs text-muted-foreground">{tier.description}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Choix des modules */}
          <div>
            <p className="text-sm font-semibold mb-2">Modules à activer</p>
            <div className="space-y-2">
              {AVAILABLE_MODULES.map((mod) => {
                const isSelected = selectedModules.includes(mod.id)
                return (
                  <label
                    key={mod.id}
                    className="flex items-center gap-3 p-2 rounded cursor-pointer hover:bg-muted/50"
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleModule(mod.id)}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">{mod.label}</span>
                  </label>
                )
              })}
            </div>
            {selectedModules.length === 0 && (
              <p className="text-xs text-destructive mt-1">
                Au moins un module doit être sélectionné
              </p>
            )}
          </div>

          {/* Notes optionnelles */}
          <div>
            <label className="text-sm font-semibold mb-2 block">
              Notes de graduation{' '}
              <span className="text-muted-foreground font-normal">(optionnel)</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Observations, contexte, instructions particulières…"
              rows={3}
              maxLength={2000}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* Forçage — graduer même si le parcours n'est pas terminé */}
          <label className="flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 cursor-pointer">
            <input
              type="checkbox"
              checked={forceGraduation}
              onChange={(e) => setForceGraduation(e.target.checked)}
              className="w-4 h-4 mt-0.5 shrink-0"
            />
            <span className="text-sm">
              <span className="font-medium text-amber-600 dark:text-amber-400">
                Graduer même si le parcours n&apos;est pas terminé
              </span>
              <span className="block text-xs text-muted-foreground mt-0.5">
                Ignore les étapes restantes et les demandes de validation en attente. À utiliser
                en connaissance de cause (le client garde l&apos;accès Lab via le toggle).
              </span>
            </span>
          </label>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Annuler
            </Button>
            <Button
              className="flex-1"
              onClick={handleConfirm}
              disabled={isPending || selectedModules.length === 0}
            >
              {isPending ? 'Graduation en cours…' : 'Confirmer la graduation'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

GraduationDialog.displayName = 'GraduationDialog'
