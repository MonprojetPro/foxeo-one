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
  Skeleton,
  showSuccess,
  showError,
} from '@monprojetpro/ui'
import { EmptyState } from '@monprojetpro/ui'
import { ParcoursStageList } from './parcours-stage-list'
import { useParcoursTemplates } from '../hooks/use-parcours-templates'
import { assignParcours } from '../actions/assign-parcours'
import type { ParcoursTemplate } from '../types/crm.types'

interface AssignParcoursDialogProps {
  clientId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AssignParcoursDialog({ clientId, open, onOpenChange }: AssignParcoursDialogProps) {
  const { data: templates, isPending: isLoadingTemplates } = useParcoursTemplates()
  const [selectedTemplate, setSelectedTemplate] = useState<ParcoursTemplate | null>(null)
  const [activeStages, setActiveStages] = useState<{ key: string; active: boolean }[]>([])
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

  const handleAssign = () => {
    if (!selectedTemplate) return

    startTransition(async () => {
      const result = await assignParcours({
        clientId,
        templateId: selectedTemplate.id,
        activeStages,
      })

      if (result.error) {
        showError(result.error.message)
        return
      }

      showSuccess('Parcours Lab assigné avec succès')
      await queryClient.invalidateQueries({ queryKey: ['client', clientId] })
      await queryClient.invalidateQueries({ queryKey: ['clients'] })
      await queryClient.invalidateQueries({ queryKey: ['client-parcours', clientId] })
      onOpenChange(false)
      setSelectedTemplate(null)
      setActiveStages([])
    })
  }

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) {
      setSelectedTemplate(null)
      setActiveStages([])
    }
    onOpenChange(isOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assigner un parcours Lab</DialogTitle>
          <DialogDescription>
            Sélectionnez un template de parcours et configurez les étapes actives.
          </DialogDescription>
        </DialogHeader>

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
            {/* Template selection */}
            <div className="space-y-2">
              <p className="text-sm font-medium">Type de parcours</p>
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

            {/* Stage list */}
            {selectedTemplate && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Étapes du parcours</p>
                <ParcoursStageList
                  stages={selectedTemplate.stages}
                  activeStages={activeStages}
                  onToggle={handleStageToggle}
                />
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)}>
            Annuler
          </Button>
          <Button
            onClick={handleAssign}
            disabled={!selectedTemplate || isPending}
          >
            {isPending ? 'Assignation...' : 'Assigner'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
