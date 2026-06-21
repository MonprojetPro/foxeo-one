'use client'

import { useTransition } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  Card, CardContent, CardHeader, CardTitle,
  showSuccess, showError, useConfirmDialog,
} from '@monprojetpro/ui'
import { Route, Shuffle } from 'lucide-react'
import { cn } from '@monprojetpro/utils'
import { setParcoursMode } from '../actions/set-parcours-mode'
import type { ParcoursMode } from '../types/crm.types'

interface ParcoursModeSelectorProps {
  clientId: string
  /** Mode courant (défaut 'tracee'). */
  mode: ParcoursMode
}

const OPTIONS: Array<{
  value: ParcoursMode
  label: string
  description: string
  Icon: typeof Route
}> = [
  {
    value: 'tracee',
    label: 'Tracé',
    description: 'Étapes séquentielles : une seule active à la fois, la suivante se débloque à la validation.',
    Icon: Route,
  },
  {
    value: 'libre',
    label: 'Libre',
    description: 'Toutes les étapes activées sont ouvertes en parallèle : le client avance dans l’ordre qu’il veut.',
    Icon: Shuffle,
  },
]

/**
 * LOT E — Sélecteur du mode de séquençage du parcours (cockpit Hub).
 * Choisi PAR MiKL, par client. La bascule est autorisée à chaud : un dialogue de
 * confirmation rappelle l'effet sur les étapes en cours avant d'appliquer.
 */
export function ParcoursModeSelector({ clientId, mode }: ParcoursModeSelectorProps) {
  const [isPending, startTransition] = useTransition()
  const queryClient = useQueryClient()
  const { confirm, ConfirmDialog } = useConfirmDialog()

  const handleSelect = async (next: ParcoursMode) => {
    if (next === mode || isPending) return

    const ok = await confirm({
      title: next === 'libre' ? 'Passer en mode libre ?' : 'Passer en mode tracé ?',
      description:
        next === 'libre'
          ? 'Toutes les étapes activées du parcours deviennent accessibles en parallèle. Le client pourra les traiter dans l’ordre qu’il veut. Les étapes déjà terminées ou en cours d’examen ne changent pas.'
          : 'Le parcours redevient séquentiel : la première étape non terminée garde le focus, les suivantes se re-verrouillent jusqu’à validation. Les étapes déjà terminées ne changent pas.',
      confirmLabel: 'Appliquer',
    })
    if (!ok) return

    startTransition(async () => {
      const result = await setParcoursMode({ clientId, mode: next })
      if (result.error) {
        showError(result.error.message)
        return
      }
      const resynced = result.data?.resynced ?? 0
      showSuccess(
        `Mode ${next === 'libre' ? 'libre' : 'tracé'} activé${resynced > 0 ? ` — ${resynced} étape(s) resynchronisée(s)` : ''}`
      )
      await queryClient.invalidateQueries({ queryKey: ['client', clientId] })
      await queryClient.invalidateQueries({ queryKey: ['client-parcours', clientId] })
    })
  }

  return (
    <>
      <Card data-testid="parcours-mode-selector">
        <CardHeader>
          <CardTitle className="text-base">Mode du parcours</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Mode du parcours">
            {OPTIONS.map(({ value, label, description, Icon }) => {
              const selected = value === mode
              return (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  disabled={isPending}
                  onClick={() => handleSelect(value)}
                  className={cn(
                    'flex flex-col gap-1.5 rounded-lg border p-3 text-left transition-colors disabled:opacity-60',
                    selected
                      ? 'border-cyan-500/60 bg-cyan-500/10'
                      : 'border-border/60 bg-muted/20 hover:bg-muted/40'
                  )}
                  data-testid={`parcours-mode-option-${value}`}
                >
                  <span className="flex items-center gap-2 text-sm font-medium">
                    <Icon className={cn('h-4 w-4', selected ? 'text-cyan-300' : 'text-muted-foreground')} />
                    {label}
                    {selected && (
                      <span className="ml-auto rounded-full bg-cyan-500/20 px-2 py-0.5 text-[10px] font-bold uppercase text-cyan-200">
                        Actif
                      </span>
                    )}
                  </span>
                  <span className="text-xs text-muted-foreground">{description}</span>
                </button>
              )
            })}
          </div>
        </CardContent>
      </Card>
      <ConfirmDialog />
    </>
  )
}
