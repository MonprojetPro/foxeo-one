'use client'

import { useState, useTransition } from 'react'
import { Button, showError, showSuccess } from '@monprojetpro/ui'
import { applyParcoursTemplate } from '../actions/apply-parcours-template'
import { PARCOURS_TEMPLATES } from '../templates/parcours-templates'

interface ApplyTemplateModalProps {
  clientId: string
  /** Le client a-t-il déjà des étapes ? Si oui, on demande remplacer / ajouter. */
  hasExistingSteps: boolean
  onClose: () => void
  onApplied: () => void
}

export function ApplyTemplateModal({ clientId, hasExistingSteps, onClose, onApplied }: ApplyTemplateModalProps) {
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const [askMode, setAskMode] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const selected = PARCOURS_TEMPLATES.find((t) => t.key === selectedKey) ?? null

  function handleInstallClick() {
    if (!selected) return
    setError(null)
    if (hasExistingSteps) {
      setAskMode(true)
      return
    }
    apply('replace')
  }

  function apply(mode: 'replace' | 'append') {
    if (!selected) return
    startTransition(async () => {
      const result = await applyParcoursTemplate({ clientId, templateKey: selected.key, mode })
      if (result.error) {
        setError(result.error.message)
        return
      }
      const count = result.data?.count ?? 0
      const skipped = result.data?.skipped ?? []
      if (count === 0) {
        showError('Aucune étape ajoutée : tous les agents de ce circuit sont déjà présents.')
        setAskMode(false)
        return
      }
      if (skipped.length > 0) {
        showSuccess(`Circuit « ${selected.label} » installé (${count} étape${count > 1 ? 's' : ''}). Ignorés (absents du catalogue) : ${skipped.join(', ')}.`)
      } else {
        showSuccess(`Circuit « ${selected.label} » installé (${count} étape${count > 1 ? 's' : ''}).`)
      }
      onApplied()
    })
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Installer un circuit type"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
    >
      <div className="w-full max-w-2xl rounded-2xl border border-border bg-card shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Installer un circuit type</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Un parcours classique préréglé — tu pourras toujours l&apos;ajuster ensuite (ajouter, retirer, réordonner).
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Fermer"
            className="rounded-lg p-2 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <span aria-hidden="true">✕</span>
          </button>
        </div>

        {/* Liste des circuits */}
        <div className="p-4 overflow-y-auto flex-1 min-h-0 space-y-2">
          {PARCOURS_TEMPLATES.map((tpl) => {
            const isSelected = tpl.key === selectedKey
            return (
              <button
                key={tpl.key}
                onClick={() => setSelectedKey(tpl.key)}
                aria-pressed={isSelected}
                className={`w-full text-left rounded-xl border p-4 transition-colors ${
                  isSelected
                    ? 'border-cyan-500/60 bg-cyan-500/5'
                    : 'border-border bg-background hover:border-cyan-500/40 hover:bg-cyan-500/5'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-foreground">{tpl.label}</p>
                  <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                    {tpl.agentNames.length} étapes
                  </span>
                </div>
                <p className="text-xs text-cyan-400/90 mt-0.5">{tpl.targetProfile}</p>
                <p className="text-xs text-muted-foreground mt-1">{tpl.description}</p>
                {/* Aperçu de l'ordre des agents */}
                <div className="flex flex-wrap gap-1 mt-2">
                  {tpl.agentNames.map((name, i) => (
                    <span
                      key={`${tpl.key}-${name}`}
                      className="rounded-md border border-border bg-muted/50 px-1.5 py-0.5 text-[11px] text-muted-foreground"
                    >
                      {i + 1}. {name.replace(/^Élio\s+/, '')}
                    </span>
                  ))}
                </div>
              </button>
            )
          })}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border shrink-0 space-y-2">
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}

          {!askMode ? (
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={onClose} disabled={isPending}>
                Annuler
              </Button>
              <Button
                onClick={handleInstallClick}
                disabled={isPending || !selected}
                aria-label="Installer le circuit sélectionné"
              >
                {isPending ? 'Installation…' : 'Installer ce circuit'}
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-foreground">
                Ce client a déjà un parcours. Tu veux <strong>remplacer</strong> tout le parcours existant, ou{' '}
                <strong>ajouter</strong> ce circuit à la suite ?
              </p>
              <div className="flex flex-wrap justify-end gap-2">
                <Button variant="outline" onClick={() => setAskMode(false)} disabled={isPending}>
                  Retour
                </Button>
                <Button variant="outline" onClick={() => apply('append')} disabled={isPending}>
                  {isPending ? '…' : 'Ajouter à la suite'}
                </Button>
                <Button onClick={() => apply('replace')} disabled={isPending}>
                  {isPending ? '…' : 'Remplacer le parcours'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
