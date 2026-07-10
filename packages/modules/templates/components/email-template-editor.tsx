'use client'

import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Mail, Eye, EyeOff, RotateCcw } from 'lucide-react'
import {
  showSuccess,
  showError,
  CockpitPanel,
  CockpitCallout,
  SectionTitle,
  RowSkeleton,
} from '@monprojetpro/ui'
import { useEmailTemplates } from '../hooks/use-email-templates'
import { saveEmailTemplate, resetEmailTemplate, type EmailTemplate } from '../actions/save-email-template'

// ============================================================
// Données statiques
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
// Helpers (logique inchangée)
// ============================================================

function escapeForPreview(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function renderPreview(body: string) {
  return escapeForPreview(body)
    .replace(/\n/g, '<br />')
    .replace(/\{prenom\}/g, '<strong>Jean-Pierre</strong>')
    .replace(/\{entreprise\}/g, '<strong>MonprojetPro SAS</strong>')
    .replace(/\{titre_brief\}/g, '<em>Stratégie marketing</em>')
    .replace(/\{commentaire\}/g, '<em>Excellent travail !</em>')
    .replace(/\{lien\}/g, '<a href="#" style="color:#06b6d4;">https://lab.monprojet-pro.com</a>')
    .replace(/\{montant\}/g, '<strong>199 €</strong>')
}

// ============================================================
// Composant principal
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

  /* Classe champ texte cockpit */
  const inputCls =
    'w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:border-cyan-400/50 focus:outline-none transition-colors'

  return (
    <div className="flex gap-4 min-h-[500px]">

      {/* ── Liste des templates (colonne gauche) ── */}
      <aside className="w-52 shrink-0">
        <CockpitPanel title="Templates">
          <div className="p-2 space-y-0.5">

            {/* Chargement */}
            {isPending && (
              <div className="space-y-1 p-1">
                {[1, 2, 3, 4, 5].map((i) => <RowSkeleton key={i} />)}
              </div>
            )}

            {/* Erreur */}
            {error && (
              <div className="p-2">
                <CockpitCallout tone="red">Erreur de chargement</CockpitCallout>
              </div>
            )}

            {/* Liste des boutons de sélection */}
            {!isPending && (templates ?? []).map((tmpl) => (
              <button
                key={tmpl.id}
                type="button"
                onClick={() => selectTemplate(tmpl)}
                className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                  selected?.id === tmpl.id
                    ? 'bg-cyan-400/10 text-cyan-300 ring-1 ring-cyan-400/25'
                    : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
                }`}
              >
                {TEMPLATE_LABELS[tmpl.templateKey] ?? tmpl.templateKey}
              </button>
            ))}
          </div>
        </CockpitPanel>
      </aside>

      {/* ── Éditeur (zone droite) ── */}
      <div className="flex-1 min-w-0">

        {/* État vide — aucun template sélectionné */}
        {!selected && (
          <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-white/10">
            <div className="text-center">
              <Mail className="mx-auto mb-3 h-8 w-8 text-gray-600" />
              <p className="text-sm text-gray-500">Sélectionne un template pour l&apos;éditer</p>
            </div>
          </div>
        )}

        {/* Éditeur actif */}
        {selected && (
          <CockpitPanel
            title={TEMPLATE_LABELS[selected.templateKey] ?? selected.templateKey}
          >
            <div className="space-y-4 p-4">

              {/* Barre d'actions du template */}
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowPreview(!showPreview)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-gray-300 hover:bg-white/[0.06] transition-colors"
                >
                  {showPreview ? (
                    <><EyeOff className="h-3.5 w-3.5" /> Éditer</>
                  ) : (
                    <><Eye className="h-3.5 w-3.5" /> Aperçu</>
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-amber-400/20 bg-amber-400/10 px-3 py-1.5 text-xs font-medium text-amber-300 hover:bg-amber-400/20 transition-colors"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Réinitialiser
                </button>
              </div>

              {/* ── Mode édition ── */}
              {!showPreview && (
                <>
                  <div className="space-y-1">
                    <label className="block text-[0.7rem] font-semibold uppercase tracking-wider text-gray-500">
                      Sujet
                    </label>
                    <input
                      type="text"
                      value={editSubject}
                      onChange={(e) => setEditSubject(e.target.value)}
                      className={inputCls}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[0.7rem] font-semibold uppercase tracking-wider text-gray-500">
                      Corps
                    </label>
                    <textarea
                      value={editBody}
                      onChange={(e) => setEditBody(e.target.value)}
                      rows={10}
                      className={`${inputCls} font-mono text-xs leading-relaxed`}
                    />
                  </div>

                  {/* Boutons variables */}
                  <div className="space-y-2">
                    <p className="text-[0.7rem] font-semibold uppercase tracking-wider text-gray-500">
                      Variables
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {AVAILABLE_VARIABLES.map((v) => (
                        <button
                          key={v.key}
                          type="button"
                          onClick={() => insertVariable(v.key)}
                          title={v.label}
                          className="rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1 text-xs text-gray-300 hover:bg-white/[0.06] hover:text-white transition-colors"
                        >
                          {v.key}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving || !editSubject.trim() || !editBody.trim()}
                    className="rounded-xl bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-500 disabled:opacity-50 transition-colors"
                  >
                    {saving ? 'Sauvegarde…' : 'Sauvegarder'}
                  </button>
                </>
              )}

              {/* ── Mode aperçu — fond blanc simulant un vrai email ── */}
              {showPreview && (
                <div className="rounded-xl border border-white/10 bg-white p-6 text-gray-800">
                  <div className="mb-1 font-mono text-xs text-gray-500">
                    Sujet : {editSubject}
                  </div>
                  <hr className="my-3 border-gray-200" />
                  <div
                    className="text-sm leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: renderPreview(editBody) }}
                  />
                </div>
              )}

            </div>
          </CockpitPanel>
        )}

      </div>
    </div>
  )
}
