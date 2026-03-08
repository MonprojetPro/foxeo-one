'use client'

import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { showSuccess, showError } from '@foxeo/ui'
import { useEmailTemplates } from '../hooks/use-email-templates'
import { saveEmailTemplate, resetEmailTemplate, type EmailTemplate } from '../actions/save-email-template'

// ============================================================
// Variable buttons
// ============================================================

const AVAILABLE_VARIABLES = [
  { key: '{prenom}', label: 'Prénom client' },
  { key: '{entreprise}', label: 'Entreprise' },
  { key: '{titre_brief}', label: 'Titre du brief' },
  { key: '{commentaire}', label: 'Commentaire MiKL' },
  { key: '{lien}', label: 'Lien plateforme' },
  { key: '{montant}', label: 'Montant' },
]

const TEMPLATE_LABELS: Record<string, string> = {
  bienvenue_lab: 'Bienvenue Lab',
  brief_valide: 'Brief validé',
  brief_refuse: 'Brief refusé',
  graduation: 'Graduation Lab → One',
  facture_envoyee: 'Facture envoyée',
  echec_paiement: 'Paiement échoué',
  rappel_parcours: 'Rappel inactivité',
  welcome_lab: 'Bienvenue Lab (legacy)',
  welcome_one: 'Bienvenue One',
  invoice_paid: 'Facture réglée',
  invoice_overdue: 'Facture en retard',
  credit_note_issued: 'Avoir émis',
}

// ============================================================
// Main component
// ============================================================

export function EmailTemplateEditor() {
  const queryClient = useQueryClient()
  const { data: templates, isPending, error } = useEmailTemplates()
  const [selected, setSelected] = useState<EmailTemplate | null>(null)
  const [editSubject, setEditSubject] = useState('')
  const [editBody, setEditBody] = useState('')
  const [showPreview, setShowPreview] = useState(false)
  const [saving, setSaving] = useState(false)

  function selectTemplate(tmpl: EmailTemplate) {
    setSelected(tmpl)
    setEditSubject(tmpl.subject)
    setEditBody(tmpl.body)
    setShowPreview(false)
  }

  function insertVariable(varKey: string) {
    setEditBody((prev) => prev + varKey)
  }

  function escapeForPreview(str: string): string {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
  }

  function renderPreview(body: string) {
    return escapeForPreview(body)
      .replace(/\n/g, '<br />')
      .replace(/\{prenom\}/g, '<strong>Jean-Pierre</strong>')
      .replace(/\{entreprise\}/g, '<strong>Foxeo SAS</strong>')
      .replace(/\{titre_brief\}/g, '<em>Stratégie marketing</em>')
      .replace(/\{commentaire\}/g, '<em>Excellent travail !</em>')
      .replace(/\{lien\}/g, '<a href="#" style="color:#06b6d4;">https://lab.foxeo.io</a>')
      .replace(/\{montant\}/g, '<strong>199 €</strong>')
  }

  async function handleSave() {
    if (!selected) return
    setSaving(true)
    try {
      const result = await saveEmailTemplate({
        templateKey: selected.templateKey,
        subject: editSubject,
        body: editBody,
      })
      if (result.error) {
        showError(result.error.message)
      } else {
        showSuccess('Template email sauvegardé')
        queryClient.invalidateQueries({ queryKey: ['email-templates'] })
        setSelected(result.data)
      }
    } finally {
      setSaving(false)
    }
  }

  async function handleReset() {
    if (!selected) return
    const result = await resetEmailTemplate(selected.templateKey)
    if (result.error) {
      showError(result.error.message)
    } else {
      showSuccess('Template réinitialisé')
      setEditSubject(result.data?.subject ?? '')
      setEditBody(result.data?.body ?? '')
      queryClient.invalidateQueries({ queryKey: ['email-templates'] })
      setSelected(result.data ?? null)
    }
  }

  return (
    <div className="flex gap-6 h-full min-h-[500px]">
      {/* Left: template list */}
      <div className="w-56 flex-shrink-0 space-y-1">
        <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">Templates</p>

        {isPending && (
          <div className="space-y-1">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-9 bg-white/5 rounded animate-pulse" />
            ))}
          </div>
        )}

        {error && <div className="text-xs text-red-400">Erreur de chargement</div>}

        {!isPending && (templates ?? []).map((tmpl) => (
          <button
            key={tmpl.id}
            type="button"
            onClick={() => selectTemplate(tmpl)}
            className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${
              selected?.id === tmpl.id
                ? 'bg-cyan-600/20 text-cyan-400 border border-cyan-400/20'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            {TEMPLATE_LABELS[tmpl.templateKey] ?? tmpl.templateKey}
          </button>
        ))}
      </div>

      {/* Right: editor */}
      {!selected && (
        <div className="flex-1 flex items-center justify-center text-sm text-gray-500">
          Sélectionne un template pour l'éditer
        </div>
      )}

      {selected && (
        <div className="flex-1 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-white">
              {TEMPLATE_LABELS[selected.templateKey] ?? selected.templateKey}
            </h3>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowPreview(!showPreview)}
                className="text-xs text-gray-400 hover:text-white transition-colors"
              >
                {showPreview ? 'Éditer' : 'Aperçu'}
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="text-xs text-amber-400 hover:text-amber-300 transition-colors"
              >
                Réinitialiser
              </button>
            </div>
          </div>

          {!showPreview && (
            <>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Sujet</label>
                <input
                  type="text"
                  value={editSubject}
                  onChange={(e) => setEditSubject(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1">Corps</label>
                <textarea
                  value={editBody}
                  onChange={(e) => setEditBody(e.target.value)}
                  rows={10}
                  className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-400 font-mono"
                />
              </div>

              {/* Variable buttons */}
              <div>
                <p className="text-xs text-gray-500 mb-2">Variables :</p>
                <div className="flex flex-wrap gap-2">
                  {AVAILABLE_VARIABLES.map((v) => (
                    <button
                      key={v.key}
                      type="button"
                      onClick={() => insertVariable(v.key)}
                      className="text-xs px-2 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded text-gray-300 transition-colors"
                    >
                      {v.key}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {showPreview && (
            <div className="bg-white rounded p-6 text-gray-800">
              <div className="text-xs text-gray-500 mb-1 font-mono">Sujet : {editSubject}</div>
              <hr className="my-3" />
              <div
                className="text-sm leading-relaxed"
                dangerouslySetInnerHTML={{ __html: renderPreview(editBody) }}
              />
            </div>
          )}

          {!showPreview && (
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !editSubject.trim() || !editBody.trim()}
              className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-sm rounded transition-colors"
            >
              {saving ? 'Sauvegarde...' : 'Sauvegarder'}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
