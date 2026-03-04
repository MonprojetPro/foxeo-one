'use client'

import { useState } from 'react'
import { Button } from '@foxeo/ui'
import type { ModuleActionVerb } from '../utils/detect-intent'

export const CONFIRMATION_REQUIRED_LABEL = 'Confirmation requise'

export const DESTRUCTIVE_VERBS: ModuleActionVerb[] = ['delete']

export function isDestructiveAction(verb: string): boolean {
  return DESTRUCTIVE_VERBS.includes(verb as ModuleActionVerb)
}

const VERB_LABELS: Record<ModuleActionVerb, string> = {
  send: 'Envoyer',
  create: 'Créer',
  update: 'Modifier',
  delete: 'Supprimer',
}

const MODULE_LABELS: Record<string, string> = {
  adhesions: 'Adhésions',
  agenda: 'Agenda',
  sms: 'SMS',
  facturation: 'Facturation',
  unknown: 'module',
}

/**
 * Construit une description lisible de l'action pour l'affichage dans la confirmation.
 */
export function buildActionDescription(verb: ModuleActionVerb, moduleTarget: string, target: string): string {
  const verbLabel = VERB_LABELS[verb] ?? verb
  const moduleLabel = MODULE_LABELS[moduleTarget] ?? moduleTarget
  return `${verbLabel} dans le module ${moduleLabel} — cible : ${target}`
}

interface ActionConfirmationProps {
  action: string
  details: string[]
  isDestructive?: boolean
  onConfirm: () => void
  onCancel: () => void
  onModify?: () => void
}

/**
 * Composant de confirmation avant exécution d'une action One+ (AC2 — Story 8.9a).
 * Affiche les détails de l'action, les entités concernées et les boutons Oui/Non/Modifier.
 * Pour les actions destructives, exige une double confirmation.
 */
export function ActionConfirmation({
  action,
  details,
  isDestructive,
  onConfirm,
  onCancel,
  onModify,
}: ActionConfirmationProps) {
  const [doubleConfirm, setDoubleConfirm] = useState(false)

  return (
    <div className="border-2 border-yellow-500/20 rounded-lg p-4 my-4 bg-yellow-500/5">
      <h4 className="font-medium mb-2">{CONFIRMATION_REQUIRED_LABEL}</h4>
      <p className="mb-3">{action}</p>

      {details.length > 0 && (
        <div className="bg-card rounded p-3 mb-3 max-h-40 overflow-y-auto">
          <ul className="text-sm space-y-1">
            {details.map((detail, i) => (
              <li key={i}>- {detail}</li>
            ))}
          </ul>
        </div>
      )}

      {isDestructive && !doubleConfirm ? (
        <div>
          <p className="text-sm text-red-500 mb-2">
            ⚠️ Cette action est irréversible. Êtes-vous sûr ?
          </p>
          <div className="flex gap-2 flex-wrap">
            <Button variant="destructive" onClick={() => setDoubleConfirm(true)}>
              Je confirme
            </Button>
            <Button variant="outline" onClick={onCancel}>
              Annuler
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex gap-2 flex-wrap">
          <Button onClick={onConfirm}>Confirmer</Button>
          {onModify && (
            <Button variant="outline" onClick={onModify}>
              Modifier
            </Button>
          )}
          <Button variant="outline" onClick={onCancel}>
            Annuler
          </Button>
        </div>
      )}
    </div>
  )
}
