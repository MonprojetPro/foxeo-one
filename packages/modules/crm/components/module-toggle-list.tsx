'use client'

import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { showSuccess, showError } from '@monprojetpro/ui'
import { updateActiveModules } from '../actions/update-active-modules'
import type { ModuleManifest } from '@monprojetpro/types'

const LOCKED_MODULES = ['core-dashboard', 'chat', 'documents', 'elio'] as const

interface ModuleToggleListProps {
  clientId: string
  activeModules: string[]
  allModules: ModuleManifest[]
}

export function ModuleToggleList({ clientId, activeModules, allModules }: ModuleToggleListProps) {
  const queryClient = useQueryClient()
  const [pending, setPending] = useState<string | null>(null)

  const isLocked = (moduleId: string) =>
    (LOCKED_MODULES as readonly string[]).includes(moduleId)

  const handleToggle = async (moduleId: string, moduleName: string, currentlyActive: boolean) => {
    if (isLocked(moduleId)) return
    setPending(moduleId)

    const newEnabled = !currentlyActive
    const result = await updateActiveModules(clientId, moduleId, newEnabled)

    if (result.error) {
      showError(`Erreur : ${result.error.message}`)
    } else {
      const action = newEnabled ? 'activé' : 'désactivé'
      showSuccess(`Module ${moduleName} ${action}`)
      await queryClient.invalidateQueries({ queryKey: ['client-config', clientId] })
    }

    setPending(null)
  }

  if (allModules.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Aucun module disponible
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {allModules.map((module) => {
        const isActive = activeModules.includes(module.id)
        const locked = isLocked(module.id)
        const isPending = pending === module.id

        return (
          <div
            key={module.id}
            className="flex items-center justify-between p-4 rounded-lg border border-border bg-card"
          >
            <div className="flex items-center gap-3 min-w-0">
              <span className="text-2xl flex-shrink-0" aria-hidden="true">
                {module.navigation.icon}
              </span>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm truncate">{module.name}</span>
                  {locked && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground flex-shrink-0">
                      Inclus
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">
                  {module.description}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 flex-shrink-0 ml-4">
              {isActive && (
                <span className="text-xs text-green-500 hidden sm:block">
                  Activé
                </span>
              )}
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  role="switch"
                  aria-label={`${isActive ? 'Désactiver' : 'Activer'} le module ${module.name}`}
                  checked={isActive}
                  disabled={locked || isPending}
                  onChange={() => handleToggle(module.id, module.name, isActive)}
                  className="sr-only peer"
                />
                <div
                  className={[
                    'w-11 h-6 rounded-full transition-colors',
                    isActive ? 'bg-green-500' : 'bg-muted',
                    locked || isPending ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
                    'peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2',
                    'after:content-[\'\'] after:absolute after:top-[2px] after:start-[2px]',
                    'after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all',
                    isActive ? 'after:translate-x-5' : 'after:translate-x-0',
                  ].join(' ')}
                />
              </label>
            </div>
          </div>
        )
      })}
    </div>
  )
}
