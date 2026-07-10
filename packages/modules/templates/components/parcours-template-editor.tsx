'use client'

import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { ChevronUp, ChevronDown, X, Plus, LayoutTemplate } from 'lucide-react'
import {
  showSuccess,
  showError,
  CockpitHeader,
  CockpitPanel,
  CockpitCallout,
  SectionTitle,
  RowSkeleton,
} from '@monprojetpro/ui'
import { useParcourTemplates } from '../hooks/use-parcours-templates'
import {
  saveParcourTemplate,
  duplicateParcourTemplate,
  archiveParcourTemplate,
  type ParcourTemplate,
  type Stage,
} from '../actions/save-parcours-template'

// ============================================================
// Types du formulaire (inchangés)
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
// Sous-composant — formulaire d'édition d'un template
// ============================================================

interface EditorFormProps {
  editing: { templateId?: string; form: TemplateForm }
  saving: boolean
  onCancel: () => void
  onSave: () => void
  onChange: (form: TemplateForm) => void
}

function EditorForm({ editing, saving, onCancel, onSave, onChange }: EditorFormProps) {
  const { form } = editing

  function setField<K extends keyof TemplateForm>(key: K, value: TemplateForm[K]) {
    onChange({ ...form, [key]: value })
  }

  function addStage() {
    const order = form.stages.length + 1
    const newStage: StageForm = {
      key: `etape_${order}`,
      name: '',
      description: '',
      order,
      active_by_default: true,
      elio_prompts: '',
    }
    setField('stages', [...form.stages, newStage])
  }

  function moveStage(idx: number, direction: 'up' | 'down') {
    const stages = [...form.stages]
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1
    if (targetIdx < 0 || targetIdx >= stages.length) return
    ;[stages[idx], stages[targetIdx]] = [stages[targetIdx], stages[idx]]
    setField('stages', stages.map((s, i) => ({ ...s, order: i + 1 })))
  }

  function removeStage(idx: number) {
    setField(
      'stages',
      form.stages.filter((_, i) => i !== idx).map((s, i) => ({ ...s, order: i + 1 })),
    )
  }

  function updateStage(idx: number, field: keyof StageForm, value: string | boolean) {
    setField(
      'stages',
      form.stages.map((s, i) => (i === idx ? { ...s, [field]: value } : s)),
    )
  }

  /* Classe de champ texte cockpit */
  const inputCls =
    'w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:border-cyan-400/50 focus:outline-none transition-colors'

  return (
    <div className="space-y-6">

      {/* En-tête formulaire */}
      <CockpitHeader
        icon={LayoutTemplate}
        title={editing.templateId ? 'Modifier le template' : 'Nouveau template'}
        subtitle="Configurez les étapes du parcours Lab"
        tone="cyan"
        actions={
          <button
            type="button"
            onClick={onCancel}
            className="text-sm text-gray-400 hover:text-white transition-colors"
          >
            Annuler
          </button>
        }
      />

      {/* Champs principaux */}
      <CockpitPanel title="Informations générales">
        <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2">
          <div className="space-y-1">
            <label className="block text-xs font-medium uppercase tracking-wider text-gray-500">
              Nom *
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setField('name', e.target.value)}
              className={inputCls}
              placeholder="Ex : Parcours Standard"
            />
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-medium uppercase tracking-wider text-gray-500">
              Type
            </label>
            <select
              value={form.parcours_type}
              onChange={(e) =>
                setField('parcours_type', e.target.value as 'complet' | 'partiel' | 'ponctuel')
              }
              className={inputCls}
            >
              <option value="complet">Complet</option>
              <option value="partiel">Partiel</option>
              <option value="ponctuel">Ponctuel</option>
            </select>
          </div>
          <div className="col-span-full space-y-1">
            <label className="block text-xs font-medium uppercase tracking-wider text-gray-500">
              Description
            </label>
            <textarea
              value={form.description}
              onChange={(e) => setField('description', e.target.value)}
              rows={2}
              className={inputCls}
              placeholder="Description du parcours…"
            />
          </div>
        </div>
      </CockpitPanel>

      {/* Étapes */}
      <CockpitPanel
        title={`Étapes (${form.stages.length})`}
        linkText="+ Ajouter une étape"
        linkHref="#"
      >
        {/* On surcharge le lien par un bouton via action interne */}
        <div className="p-3 space-y-2">

          <div className="flex justify-end">
            <button
              type="button"
              onClick={addStage}
              className="inline-flex items-center gap-1 rounded-lg border border-cyan-400/20 bg-cyan-400/10 px-3 py-1.5 text-xs font-medium text-cyan-300 hover:bg-cyan-400/20 transition-colors"
            >
              <Plus className="h-3 w-3" />
              Ajouter une étape
            </button>
          </div>

          {form.stages.length < 2 && (
            <CockpitCallout tone="amber">
              Minimum 2 étapes requises pour sauvegarder
            </CockpitCallout>
          )}

          {form.stages.map((stage, idx) => (
            <div
              key={idx}
              className="rounded-xl border border-white/10 bg-white/[0.02] p-3 space-y-2"
            >
              <div className="flex items-center gap-2">
                {/* Numéro d'ordre */}
                <span className="w-5 shrink-0 text-center text-xs font-semibold tabular-nums text-gray-600">
                  {stage.order}
                </span>
                {/* Titre de l'étape */}
                <input
                  type="text"
                  value={stage.name}
                  onChange={(e) => updateStage(idx, 'name', e.target.value)}
                  className="flex-1 border-b border-white/10 bg-transparent px-1 py-0.5 text-sm text-white placeholder:text-gray-600 focus:border-cyan-400/50 focus:outline-none transition-colors"
                  placeholder="Titre de l'étape"
                />
                {/* Contrôles de position */}
                <div className="flex shrink-0 gap-0.5">
                  <button
                    type="button"
                    onClick={() => moveStage(idx, 'up')}
                    disabled={idx === 0}
                    aria-label="Monter l'étape"
                    className="rounded p-1 text-gray-500 hover:text-white disabled:opacity-30 transition-colors"
                  >
                    <ChevronUp className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveStage(idx, 'down')}
                    disabled={idx === form.stages.length - 1}
                    aria-label="Descendre l'étape"
                    className="rounded p-1 text-gray-500 hover:text-white disabled:opacity-30 transition-colors"
                  >
                    <ChevronDown className="h-3.5 w-3.5" />
                  </button>
                  {form.stages.length > 2 && (
                    <button
                      type="button"
                      onClick={() => removeStage(idx)}
                      aria-label="Supprimer l'étape"
                      className="rounded p-1 text-red-400/70 hover:text-red-300 transition-colors"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
              {/* Description de l'étape */}
              <input
                type="text"
                value={stage.description}
                onChange={(e) => updateStage(idx, 'description', e.target.value)}
                className="w-full border-b border-white/10 bg-transparent px-1 py-0.5 text-xs text-gray-400 placeholder:text-gray-600 focus:border-cyan-400/50 focus:outline-none transition-colors"
                placeholder="Description…"
              />
            </div>
          ))}
        </div>
      </CockpitPanel>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onSave}
          disabled={saving || form.stages.length < 2 || !form.name.trim()}
          className="rounded-xl bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-500 disabled:opacity-50 transition-colors"
        >
          {saving ? 'Sauvegarde…' : 'Sauvegarder'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-medium text-gray-300 hover:bg-white/[0.06] transition-colors"
        >
          Annuler
        </button>
      </div>
    </div>
  )
}

// ============================================================
// Composant principal — liste des templates
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
        stages: template.stages.map((s: Stage) => ({
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

  /* ── Vue formulaire ── */
  if (editing) {
    return (
      <EditorForm
        editing={editing}
        saving={saving}
        onCancel={() => setEditing(null)}
        onSave={handleSave}
        onChange={(form) => setEditing({ ...editing, form })}
      />
    )
  }

  /* ── Vue liste ── */
  return (
    <CockpitPanel
      title="Templates Parcours Lab"
      badge={(templates ?? []).filter((t) => t.isActive).length}
      badgeTone="cyan"
      linkText="+ Nouveau template"
    >
      {/* Bouton "Nouveau" dans un conteneur séparé (le linkText du panel est pour les liens href) */}
      <div className="flex justify-end px-3 pt-3">
        <button
          type="button"
          onClick={openNew}
          className="inline-flex items-center gap-1.5 rounded-xl border border-cyan-400/20 bg-cyan-400/10 px-3 py-1.5 text-xs font-medium text-cyan-300 hover:bg-cyan-400/20 transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          Nouveau template
        </button>
      </div>

      {/* État chargement */}
      {isPending && (
        <div className="space-y-2 p-3">
          {[1, 2, 3].map((i) => <RowSkeleton key={i} />)}
        </div>
      )}

      {/* État erreur */}
      {error && (
        <div className="p-3">
          <CockpitCallout tone="red">Erreur de chargement des templates</CockpitCallout>
        </div>
      )}

      {/* État vide */}
      {!isPending && !error && (templates ?? []).length === 0 && (
        <div className="mx-3 mb-3 flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-white/10 py-10">
          <LayoutTemplate className="h-8 w-8 text-gray-600" />
          <p className="text-sm text-gray-500">Aucun template — créez-en un pour commencer</p>
        </div>
      )}

      {/* Table des templates */}
      {!isPending && !error && (templates ?? []).length > 0 && (
        <div className="overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                <th className="px-4 py-2.5 text-left text-[0.7rem] font-semibold uppercase tracking-wider text-gray-500">Nom</th>
                <th className="px-4 py-2.5 text-left text-[0.7rem] font-semibold uppercase tracking-wider text-gray-500">Étapes</th>
                <th className="px-4 py-2.5 text-left text-[0.7rem] font-semibold uppercase tracking-wider text-gray-500">Clients</th>
                <th className="hidden px-4 py-2.5 text-left text-[0.7rem] font-semibold uppercase tracking-wider text-gray-500 sm:table-cell">Modifié</th>
                <th className="px-4 py-2.5 text-left text-[0.7rem] font-semibold uppercase tracking-wider text-gray-500">Statut</th>
                <th className="px-4 py-2.5 text-right text-[0.7rem] font-semibold uppercase tracking-wider text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(templates ?? []).map((tmpl) => (
                <tr
                  key={tmpl.id}
                  className="border-t border-white/[0.05] hover:bg-white/[0.02] transition-colors"
                >
                  <td className="px-4 py-3 font-medium text-white">{tmpl.name}</td>
                  <td className="px-4 py-3 tabular-nums text-gray-400">{tmpl.stages.length}</td>
                  <td className="px-4 py-3 tabular-nums text-gray-400">{tmpl.clientCount}</td>
                  <td className="hidden px-4 py-3 text-xs text-gray-500 sm:table-cell">
                    {new Date(tmpl.updatedAt).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[0.7rem] font-medium ${
                        tmpl.isActive
                          ? 'bg-emerald-400/10 text-emerald-300 ring-1 ring-emerald-400/25'
                          : 'bg-white/5 text-gray-500 ring-1 ring-white/10'
                      }`}
                    >
                      {tmpl.isActive ? 'Actif' : 'Archivé'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-3">
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
                          className="text-xs text-red-400/70 hover:text-red-300 transition-colors"
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
    </CockpitPanel>
  )
}
