'use client'

import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { showSuccess, showError } from '@monprojetpro/ui'
import { useParcourTemplates } from '../hooks/use-parcours-templates'
import {
  saveParcourTemplate,
  duplicateParcourTemplate,
  archiveParcourTemplate,
  type ParcourTemplate,
  type Stage,
} from '../actions/save-parcours-template'

// ============================================================
// Form state types
// ============================================================

interface StageForm {
  key: string
  name: string
  description: string
  order: number
  active_by_default: boolean
  elio_prompts: string
}

interface TemplateForm {
  name: string
  description: string
  parcours_type: 'complet' | 'partiel' | 'ponctuel'
  stages: StageForm[]
}

const EMPTY_FORM: TemplateForm = {
  name: '',
  description: '',
  parcours_type: 'complet',
  stages: [
    { key: 'etape_1', name: '', description: '', order: 1, active_by_default: true, elio_prompts: '' },
    { key: 'etape_2', name: '', description: '', order: 2, active_by_default: true, elio_prompts: '' },
  ],
}

// ============================================================
// Main component
// ============================================================

export function ParcourTemplateEditor() {
  const queryClient = useQueryClient()
  const { data: templates, isPending, error } = useParcourTemplates()
  const [editing, setEditing] = useState<{ templateId?: string; form: TemplateForm } | null>(null)
  const [saving, setSaving] = useState(false)

  function openNew() {
    setEditing({ form: { ...EMPTY_FORM, stages: EMPTY_FORM.stages.map((s) => ({ ...s })) } })
  }

  function openEdit(template: ParcourTemplate) {
    setEditing({
      templateId: template.id,
      form: {
        name: template.name,
        description: template.description ?? '',
        parcours_type: template.parcoursType,
        stages: template.stages.map((s) => ({
          key: s.key,
          name: s.name,
          description: s.description,
          order: s.order,
          active_by_default: s.active_by_default,
          elio_prompts: s.elio_prompts,
        })),
      },
    })
  }

  async function handleSave() {
    if (!editing) return
    setSaving(true)
    try {
      const result = await saveParcourTemplate({
        templateId: editing.templateId,
        name: editing.form.name,
        description: editing.form.description,
        parcours_type: editing.form.parcours_type,
        stages: editing.form.stages,
      })
      if (result.error) {
        showError(result.error.message)
      } else {
        showSuccess('Template sauvegardé')
        setEditing(null)
        queryClient.invalidateQueries({ queryKey: ['parcours-templates'] })
      }
    } finally {
      setSaving(false)
    }
  }

  async function handleDuplicate(templateId: string) {
    const result = await duplicateParcourTemplate(templateId)
    if (result.error) {
      showError(result.error.message)
    } else {
      showSuccess('Template dupliqué')
      queryClient.invalidateQueries({ queryKey: ['parcours-templates'] })
    }
  }

  async function handleArchive(templateId: string) {
    if (!window.confirm('Êtes-vous sûr de vouloir archiver ce template ?')) return
    const result = await archiveParcourTemplate(templateId)
    if (result.error) {
      showError(result.error.message)
    } else {
      showSuccess('Template archivé')
      queryClient.invalidateQueries({ queryKey: ['parcours-templates'] })
    }
  }

  function addStage() {
    if (!editing) return
    const order = editing.form.stages.length + 1
    const newStage: StageForm = {
      key: `etape_${order}`,
      name: '',
      description: '',
      order,
      active_by_default: true,
      elio_prompts: '',
    }
    setEditing({ ...editing, form: { ...editing.form, stages: [...editing.form.stages, newStage] } })
  }

  function moveStage(idx: number, direction: 'up' | 'down') {
    if (!editing) return
    const stages = [...editing.form.stages]
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1
    if (targetIdx < 0 || targetIdx >= stages.length) return
    ;[stages[idx], stages[targetIdx]] = [stages[targetIdx], stages[idx]]
    const reordered = stages.map((s, i) => ({ ...s, order: i + 1 }))
    setEditing({ ...editing, form: { ...editing.form, stages: reordered } })
  }

  function removeStage(idx: number) {
    if (!editing) return
    const stages = editing.form.stages.filter((_, i) => i !== idx).map((s, i) => ({ ...s, order: i + 1 }))
    setEditing({ ...editing, form: { ...editing.form, stages } })
  }

  function updateStage(idx: number, field: keyof StageForm, value: string | boolean) {
    if (!editing) return
    const stages = editing.form.stages.map((s, i) => (i === idx ? { ...s, [field]: value } : s))
    setEditing({ ...editing, form: { ...editing.form, stages } })
  }

  if (editing) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">
            {editing.templateId ? 'Modifier le template' : 'Nouveau template'}
          </h2>
          <button
            type="button"
            onClick={() => setEditing(null)}
            className="text-sm text-gray-400 hover:text-white transition-colors"
          >
            Annuler
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Nom *</label>
            <input
              type="text"
              value={editing.form.name}
              onChange={(e) => setEditing({ ...editing, form: { ...editing.form, name: e.target.value } })}
              className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-400"
              placeholder="Ex: Parcours Standard"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Type</label>
            <select
              value={editing.form.parcours_type}
              onChange={(e) =>
                setEditing({
                  ...editing,
                  form: { ...editing.form, parcours_type: e.target.value as 'complet' | 'partiel' | 'ponctuel' },
                })
              }
              className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-400"
            >
              <option value="complet">Complet</option>
              <option value="partiel">Partiel</option>
              <option value="ponctuel">Ponctuel</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">Description</label>
          <textarea
            value={editing.form.description}
            onChange={(e) => setEditing({ ...editing, form: { ...editing.form, description: e.target.value } })}
            rows={2}
            className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-400"
            placeholder="Description du parcours..."
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-white">Étapes ({editing.form.stages.length})</h3>
            <button
              type="button"
              onClick={addStage}
              className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
            >
              + Ajouter une étape
            </button>
          </div>

          {editing.form.stages.length < 2 && (
            <p className="text-xs text-amber-400 mb-2">Minimum 2 étapes requises</p>
          )}

          <div className="space-y-3">
            {editing.form.stages.map((stage, idx) => (
              <div key={idx} className="bg-white/5 border border-white/10 rounded p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 w-6">{stage.order}.</span>
                  <input
                    type="text"
                    value={stage.name}
                    onChange={(e) => updateStage(idx, 'name', e.target.value)}
                    className="flex-1 bg-transparent border-b border-white/10 px-1 py-0.5 text-sm text-white focus:outline-none focus:border-cyan-400"
                    placeholder="Titre de l'étape"
                  />
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => moveStage(idx, 'up')}
                      disabled={idx === 0}
                      className="text-gray-500 hover:text-white disabled:opacity-30 text-xs px-1"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => moveStage(idx, 'down')}
                      disabled={idx === editing.form.stages.length - 1}
                      className="text-gray-500 hover:text-white disabled:opacity-30 text-xs px-1"
                    >
                      ↓
                    </button>
                    {editing.form.stages.length > 2 && (
                      <button
                        type="button"
                        onClick={() => removeStage(idx)}
                        className="text-red-400 hover:text-red-300 text-xs px-1"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>
                <input
                  type="text"
                  value={stage.description}
                  onChange={(e) => updateStage(idx, 'description', e.target.value)}
                  className="w-full bg-transparent border-b border-white/10 px-1 py-0.5 text-xs text-gray-400 focus:outline-none focus:border-cyan-400"
                  placeholder="Description..."
                />
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || editing.form.stages.length < 2 || !editing.form.name.trim()}
            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-sm rounded transition-colors"
          >
            {saving ? 'Sauvegarde...' : 'Sauvegarder'}
          </button>
          <button
            type="button"
            onClick={() => setEditing(null)}
            className="px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-300 text-sm rounded transition-colors"
          >
            Annuler
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Templates Parcours Lab</h2>
        <button
          type="button"
          onClick={openNew}
          className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white text-sm rounded transition-colors"
        >
          + Nouveau template
        </button>
      </div>

      {isPending && (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 bg-white/5 rounded animate-pulse" />
          ))}
        </div>
      )}

      {error && (
        <div className="text-sm text-red-400">Erreur de chargement des templates</div>
      )}

      {!isPending && !error && (templates ?? []).length === 0 && (
        <div className="text-sm text-gray-500 text-center py-8">
          Aucun template — créez-en un pour commencer
        </div>
      )}

      {!isPending && !error && (templates ?? []).length > 0 && (
        <div className="border border-white/10 rounded overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-white/5">
              <tr>
                <th className="px-4 py-3 text-left text-xs text-gray-400 font-medium">Nom</th>
                <th className="px-4 py-3 text-left text-xs text-gray-400 font-medium">Étapes</th>
                <th className="px-4 py-3 text-left text-xs text-gray-400 font-medium">Clients</th>
                <th className="px-4 py-3 text-left text-xs text-gray-400 font-medium">Modifié</th>
                <th className="px-4 py-3 text-left text-xs text-gray-400 font-medium">Statut</th>
                <th className="px-4 py-3 text-right text-xs text-gray-400 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(templates ?? []).map((tmpl) => (
                <tr key={tmpl.id} className="border-t border-white/5 hover:bg-white/3">
                  <td className="px-4 py-3 text-white">{tmpl.name}</td>
                  <td className="px-4 py-3 text-gray-400">{tmpl.stages.length}</td>
                  <td className="px-4 py-3 text-gray-400">{tmpl.clientCount}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    {new Date(tmpl.updatedAt).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        tmpl.isActive ? 'bg-green-900/40 text-green-400' : 'bg-gray-800 text-gray-500'
                      }`}
                    >
                      {tmpl.isActive ? 'Actif' : 'Archivé'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => openEdit(tmpl)}
                        className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
                      >
                        Modifier
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDuplicate(tmpl.id)}
                        className="text-xs text-gray-400 hover:text-white transition-colors"
                      >
                        Dupliquer
                      </button>
                      {tmpl.isActive && (
                        <button
                          type="button"
                          onClick={() => handleArchive(tmpl.id)}
                          className="text-xs text-red-400 hover:text-red-300 transition-colors"
                        >
                          Archiver
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
