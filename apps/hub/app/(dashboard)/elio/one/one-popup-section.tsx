'use client'

/**
 * Section « Personnalisation de la pop-up Élio One » (lot 1 — pilotage Hub).
 *
 * Portée GLOBALE uniquement : le message d'accueil, les suggestions de démarrage et
 * l'invite de saisie affichés à l'ouverture d'Élio One, pour TOUS les clients gradués.
 *
 * ⚠️ Ce réglage ne pilote QUE l'écran d'accueil figé DANS la pop-up de chat (avant que le
 * client tape) — pas le bandeau d'accueil de la home (mot d'Élio dynamique) ni les réponses
 * d'Élio (générées en temps réel). Décision MiKL 2026-07-12 : suppression de la surcharge
 * par client (complexité inutile).
 *
 * Écriture opérateur only (Server Action). Ton emerald (thème One).
 */

import { useState } from 'react'
import { Loader2, Plus, Trash2, Save } from 'lucide-react'
import {
  setOnePopupConfig,
  MAX_ONE_POPUP_SUGGESTIONS,
  type ElioOnePopupConfig,
} from '@monprojetpro/module-elio'
import { showSuccess, showError } from '@monprojetpro/ui'

interface OnePopupSectionProps {
  initialConfig: ElioOnePopupConfig
}

const INPUT_CLASS =
  'w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:ring-1 focus:ring-emerald-500/70'
const BTN_PRIMARY =
  'rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 px-4 py-2 text-sm font-medium text-white transition-colors inline-flex items-center gap-1.5'

/** Éditeur de suggestions (liste d'inputs + ajout/suppression, plafonné). */
function SuggestionsEditor({
  suggestions,
  onChange,
  disabled,
}: {
  suggestions: string[]
  onChange: (next: string[]) => void
  disabled?: boolean
}) {
  return (
    <div className="space-y-2">
      {suggestions.map((sugg, i) => (
        <div key={i} className="flex items-center gap-2">
          <input
            type="text"
            value={sugg}
            maxLength={120}
            disabled={disabled}
            onChange={(e) => {
              const next = [...suggestions]
              next[i] = e.target.value
              onChange(next)
            }}
            placeholder="Ex: Où en est mon outil ?"
            aria-label={`Suggestion ${i + 1}`}
            className={INPUT_CLASS}
          />
          <button
            type="button"
            onClick={() => onChange(suggestions.filter((_, j) => j !== i))}
            disabled={disabled}
            title="Retirer cette suggestion"
            aria-label={`Retirer la suggestion ${i + 1}`}
            className="shrink-0 rounded-lg p-2 text-gray-600 hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-40 cursor-pointer"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ))}
      {suggestions.length < MAX_ONE_POPUP_SUGGESTIONS && (
        <button
          type="button"
          onClick={() => onChange([...suggestions, ''])}
          disabled={disabled}
          className="text-xs text-emerald-400 hover:text-emerald-300 inline-flex items-center gap-1 disabled:opacity-40 cursor-pointer"
        >
          <Plus className="h-3.5 w-3.5" /> Ajouter une suggestion
        </button>
      )}
    </div>
  )
}

/** Nettoie une liste de suggestions (retire les vides + trim). */
function cleanSuggestions(list: string[]): string[] {
  return list.map((s) => s.trim()).filter((s) => s.length > 0)
}

export function OnePopupSection({ initialConfig }: OnePopupSectionProps) {
  const [greeting, setGreeting] = useState(initialConfig.greeting)
  const [suggestions, setSuggestions] = useState<string[]>(initialConfig.suggestions)
  const [placeholder, setPlaceholder] = useState(initialConfig.placeholder)
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (saving) return
    setSaving(true)
    try {
      const { data, error } = await setOnePopupConfig({
        greeting: greeting.trim(),
        suggestions: cleanSuggestions(suggestions),
        placeholder: placeholder.trim(),
      })
      if (error) {
        showError(error.message)
      } else if (data) {
        setGreeting(data.greeting)
        setSuggestions(data.suggestions)
        setPlaceholder(data.placeholder)
        showSuccess('Pop-up Élio One mise à jour pour tous les clients gradués.')
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="space-y-4" aria-labelledby="one-popup-global-title">
      <div>
        <h3
          id="one-popup-global-title"
          className="text-[0.7rem] font-semibold uppercase tracking-wider text-gray-500"
        >
          Écran d&apos;accueil de la pop-up — tous les clients gradués
        </h3>
        <p className="mt-0.5 text-xs text-gray-400">
          Message d&apos;accueil, suggestions de démarrage et invite de saisie affichés à
          l&apos;ouverture de la pop-up Élio One. Purement cosmétique&nbsp;: ne change pas les
          réponses d&apos;Élio (générées en temps réel) ni le bandeau de la home.
        </p>
      </div>

      <div className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.02] p-5">
        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-gray-300">Message d&apos;accueil</span>
          <textarea
            value={greeting}
            onChange={(e) => setGreeting(e.target.value)}
            rows={2}
            maxLength={400}
            placeholder="Bonjour ! Je suis Élio, votre assistant…"
            className={`${INPUT_CLASS} resize-none`}
          />
        </label>

        <div className="space-y-1.5">
          <span className="text-xs font-medium text-gray-300">
            Suggestions de démarrage{' '}
            <span className="tabular-nums text-gray-600">
              {cleanSuggestions(suggestions).length}/{MAX_ONE_POPUP_SUGGESTIONS}
            </span>
          </span>
          <SuggestionsEditor suggestions={suggestions} onChange={setSuggestions} />
        </div>

        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-gray-300">Invite de saisie (placeholder)</span>
          <input
            type="text"
            value={placeholder}
            onChange={(e) => setPlaceholder(e.target.value)}
            maxLength={120}
            placeholder="Comment puis-je vous aider aujourd’hui ?"
            className={INPUT_CLASS}
          />
        </label>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving || !greeting.trim() || !placeholder.trim()}
            className={BTN_PRIMARY}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Enregistrer
          </button>
        </div>
      </div>
    </section>
  )
}
