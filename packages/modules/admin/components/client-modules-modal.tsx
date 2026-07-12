'use client'

import { useState } from 'react'
import { Loader2, Save, Lock } from 'lucide-react'
import { Dialog, DialogContent, DialogTitle, Button } from '@monprojetpro/ui'
import { useApplyClientModules, ONE_SETUP_MODULES, type OneClientEntry } from '../hooks/use-one-clients'

/** Libellés lisibles des modules pilotables côté One. */
const MODULE_LABELS: Record<string, string> = {
  'core-dashboard': 'Tableau de bord',
  chat: 'Chat MiKL',
  documents: 'Documents',
  visio: 'Visio',
  facturation: 'Facturation',
  support: 'Support',
  elio: 'Élio (assistant)',
  'suivi-outil': "Suivi de l'outil",
  parcours: 'Parcours (Lab)',
  notifications: 'Notifications',
}

/** Modules qu'on ne peut jamais désactiver (infrastructure du dashboard). */
const LOCKED_MODULES = new Set(['core-dashboard', 'notifications'])

interface ClientModulesModalProps {
  client: OneClientEntry
  onClose: () => void
}

/**
 * Modale « Modules du client » — active/désactive à la carte les modules d'un client One.
 *
 * La liste = union des modules actuellement actifs du client + le socle One (ONE_SETUP_MODULES).
 * On affiche TOUS les modules actifs (même hors socle) pour ne jamais en retirer un par omission.
 * `core-dashboard` est verrouillé (le tableau de bord ne se coupe pas).
 *
 * Désactiver ici retire le module de `active_modules` → il disparaît réellement de la sidebar
 * du client (le layout client filtre sur `active_modules`). Certains modules `is_default` du
 * catalogue peuvent revenir en cascade : le toast final indique le nombre réactivé.
 */
export function ClientModulesModal({ client, onClose }: ClientModulesModalProps) {
  const applyMutation = useApplyClientModules()

  // Liste stable des clés à afficher : socle One ∪ modules actifs du client.
  const allKeys = Array.from(new Set([...ONE_SETUP_MODULES, ...client.activeModules]))

  const [checked, setChecked] = useState<Set<string>>(() => new Set(client.activeModules))

  function toggle(key: string) {
    if (LOCKED_MODULES.has(key)) return
    setChecked((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  async function handleSave() {
    // On garantit que les modules verrouillés restent inclus.
    const finalKeys = new Set(checked)
    for (const k of LOCKED_MODULES) if (client.activeModules.includes(k) || allKeys.includes(k)) finalKeys.add(k)
    await applyMutation.mutateAsync({ clientId: client.clientId, moduleKeys: [...finalKeys] })
    onClose()
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="sm:max-w-md flex max-h-[85vh] flex-col">
        <DialogTitle>Modules — {client.name}</DialogTitle>
        <p className="text-xs text-gray-400">
          Coche les modules accessibles à ce client. Décocher un module le fait disparaître de sa
          sidebar (instantané côté client).
        </p>

        <ul className="mt-3 flex-1 space-y-2 overflow-y-auto pr-1">
          {allKeys.map((key) => {
            const isLocked = LOCKED_MODULES.has(key)
            const isOn = checked.has(key)
            return (
              <li
                key={key}
                className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2.5"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-white">
                    {MODULE_LABELS[key] ?? key}
                  </p>
                  <p className="truncate font-mono text-[11px] text-gray-600">{key}</p>
                </div>
                {isLocked ? (
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-gray-500">
                    <Lock className="h-3 w-3" /> Toujours actif
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => toggle(key)}
                    aria-pressed={isOn}
                    aria-label={`${isOn ? 'Désactiver' : 'Activer'} ${MODULE_LABELS[key] ?? key}`}
                    className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                      isOn
                        ? 'bg-green-500/15 text-green-400 hover:bg-green-500/25'
                        : 'bg-white/[0.04] text-gray-500 hover:bg-white/[0.08]'
                    }`}
                  >
                    {isOn ? 'Actif' : 'Désactivé'}
                  </button>
                )}
              </li>
            )
          })}
        </ul>

        <div className="mt-4 flex shrink-0 justify-end gap-2 border-t border-white/10 pt-4">
          <Button variant="outline" size="sm" onClick={onClose} disabled={applyMutation.isPending}>
            Annuler
          </Button>
          <Button size="sm" onClick={() => void handleSave()} disabled={applyMutation.isPending}>
            {applyMutation.isPending ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-1.5 h-4 w-4" />
            )}
            Enregistrer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
