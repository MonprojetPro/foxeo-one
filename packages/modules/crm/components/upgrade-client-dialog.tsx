'use client'

import { useState, useTransition } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Button,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Skeleton,
  Checkbox,
  showSuccess,
  showError,
  EmptyState,
  Label,
} from '@monprojetpro/ui'
import { getModulesForTarget } from '@monprojetpro/utils'
import { ParcoursStageList } from './parcours-stage-list'
import { useParcoursTemplates } from '../hooks/use-parcours-templates'
import { upgradeClient } from '../actions/upgrade-client'
import type { ParcoursTemplate } from '../types/crm.types'

type UpgradeMode = 'lab' | 'one'

interface UpgradeClientDialogProps {
  clientId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultMode?: UpgradeMode
}

const CORE_DASHBOARD_MODULE = 'core-dashboard'

const CORE_MODULE_FALLBACK = {
  id: CORE_DASHBOARD_MODULE,
  name: 'Core Dashboard',
  description: 'Tableau de bord principal (inclus par défaut)',
  required: true,
}

function getAvailableOneModules(): Array<{ id: string; name: string; description: string; required: boolean }> {
  const registryModules = getModulesForTarget('client-one')
  if (registryModules.length > 0) {
    return registryModules.map((m) => ({
      id: m.id,
      name: m.name,
      description: m.description,
      required: m.id === CORE_DASHBOARD_MODULE,
    }))
  }
  return [CORE_MODULE_FALLBACK]
}

export function UpgradeClientDialog({
  clientId,
  open,
  onOpenChange,
  defaultMode = 'lab',
}: UpgradeClientDialogProps) {
  const { data: templates, isPending: isLoadingTemplates } = useParcoursTemplates()
  const availableModules = getAvailableOneModules()
  const [activeTab, setActiveTab] = useState<UpgradeMode>(defaultMode)
  const [selectedTemplate, setSelectedTemplate] = useState<ParcoursTemplate | null>(null)
  const [activeStages, setActiveStages] = useState<{ key: string; active: boolean }[]>([])
  const [selectedModules, setSelectedModules] = useState<string[]>([CORE_DASHBOARD_MODULE])
  const [isPending, startTransition] = useTransition()
  const queryClient = useQueryClient()

  const handleTemplateSelect = (template: ParcoursTemplate) => {
    setSelectedTemplate(template)
    setActiveStages(template.stages.map((s) => ({ key: s.key, active: true })))
  }

  const handleStageToggle = (key: string, active: boolean) => {
    setActiveStages((prev) =>
      prev.map((s) => (s.key === key ? { ...s, active } : s))
    )
  }

  const handleModuleToggle = (moduleId: string, checked: boolean) => {
    if (moduleId === CORE_DASHBOARD_MODULE) return // required, cannot uncheck
    setSelectedModules((prev) =>
      checked ? [...prev, moduleId] : prev.filter((m) => m !== moduleId)
    )
  }

  const handleSubmit = () => {
    startTransition(async () => {
      const input =
        activeTab === 'lab'
          ? {
              clientId,
              targetType: 'complet' as const,
              parcoursConfig: selectedTemplate
                ? { templateId: selectedTemplate.id, activeStages }
                : undefined,
            }
          : {
              clientId,
              targetType: 'direct_one' as const,
              modules: selectedModules,
            }

      const result = await upgradeClient(input)

      if (result.error) {
        showError(result.error.message)
        return
      }

      const targetLabel = activeTab === 'lab' ? 'Lab' : 'One'
      showSuccess(`Client upgradé vers ${targetLabel} avec succès`)
      await queryClient.invalidateQueries({ queryKey: ['client', clientId] })
      await queryClient.invalidateQueries({ queryKey: ['clients'] })
      handleClose(false)
    })
  }

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) {
      setSelectedTemplate(null)
      setActiveStages([])
      setSelectedModules([CORE_DASHBOARD_MODULE])
      setActiveTab(defaultMode)
    }
    onOpenChange(isOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upgrader le client</DialogTitle>
          <DialogDescription>
            Choisissez le type de compte cible et configurez les paramètres.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as UpgradeMode)}>
          <TabsList>
            <TabsTrigger value="lab">Upgrader vers Lab</TabsTrigger>
            <TabsTrigger value="one">Upgrader vers One</TabsTrigger>
          </TabsList>

          {/* ── Lab Mode ────────────────────────────────────────── */}
          <TabsContent value="lab">
            {isLoadingTemplates ? (
              <div className="space-y-3" data-testid="templates-loading">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : !templates || templates.length === 0 ? (
              <EmptyState
                title="Aucun template de parcours"
                description="Les templates de parcours seront disponibles via le module Templates (Epic 12)."
              />
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <p className="text-sm font-medium">Template de parcours</p>
                  <div className="grid gap-2">
                    {templates.map((template) => (
                      <button
                        key={template.id}
                        type="button"
                        onClick={() => handleTemplateSelect(template)}
                        className={`text-left rounded-md border p-3 transition-colors hover:bg-accent ${
                          selectedTemplate?.id === template.id
                            ? 'border-primary bg-accent'
                            : 'border-border'
                        }`}
                        data-testid={`template-${template.id}`}
                      >
                        <p className="text-sm font-medium">{template.name}</p>
                        {template.description && (
                          <p className="text-xs text-muted-foreground mt-1">{template.description}</p>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {selectedTemplate && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Étapes actives</p>
                    <ParcoursStageList
                      stages={selectedTemplate.stages}
                      activeStages={activeStages}
                      onToggle={handleStageToggle}
                    />
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          {/* ── One Mode ────────────────────────────────────────── */}
          <TabsContent value="one">
            <div className="space-y-4">
              <p className="text-sm font-medium">Modules à activer</p>
              {availableModules.length === 0 ? (
                <EmptyState
                  title="Aucun module supplémentaire disponible"
                  description="Seul le module Core Dashboard est disponible à ce stade."
                />
              ) : (
                <div className="space-y-2">
                  {availableModules.map((mod) => (
                    <div
                      key={mod.id}
                      className="flex items-start gap-3 rounded-md border p-3"
                      data-testid={`module-${mod.id}`}
                    >
                      <Checkbox
                        checked={selectedModules.includes(mod.id)}
                        onCheckedChange={(checked) => handleModuleToggle(mod.id, Boolean(checked))}
                        disabled={mod.required}
                        aria-label={`Activer ${mod.name}`}
                      />
                      <div className="flex-1">
                        <Label className="text-sm font-medium">{mod.name}</Label>
                        {mod.description && (
                          <p className="text-xs text-muted-foreground mt-0.5">{mod.description}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)}>
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending ? 'Upgrade...' : 'Upgrader'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
