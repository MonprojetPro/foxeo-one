'use client'

/**
 * Section « Personnalisation de la pop-up Élio One » (lot 1 — pilotage Hub).
 *
 * Deux volets, portée « globale + surcharge par client » :
 *  • GLOBAL — le pop-up par défaut de TOUS les clients gradués One.
 *  • SURCHARGE — réglage propre à un client gradué (champ vide = hérite du global).
 *
 * Écriture opérateur only (Server Actions). Ton emerald (thème One).
 */

import { useState } from 'react'
import { Loader2, Plus, Trash2, Save, RotateCcw } from 'lucide-react'
import {
  setOnePopupConfig,
  getOnePopupClientOverride,
  setOnePopupClientOverride,
  MAX_ONE_POPUP_SUGGESTIONS,
  type ElioOnePopupConfig,
  type ElioOnePopupOverride,
  type GraduatedOneClient,
} from '@monprojetpro/module-elio'
import { showSuccess, showError } from '@monprojetpro/ui'

interface OnePopupSectionProps {
  initialConfig: ElioOnePopupConfig
  clients: GraduatedOneClient[]
}

const INPUT_CLASS =
  'w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:ring-1 focus:ring-emerald-500/70'
const BTN_PRIMARY =
  'rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 px-4 py-2 text-sm font-medium text-white transition-colors inline-flex items-center gap-1.5'
const BTN_GHOST =
  'rounded-xl border border-white/10 hover:bg-white/[0.04] disabled:opacity-40 px-4 py-2 text-sm font-medium text-gray-300 transition-colors inline-flex items-center gap-1.5'

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

export function OnePopupSection({ initialConfig, clients }: OnePopupSectionProps) {
  // ── Volet GLOBAL ────────────────────────────────────────────────────────────
  const [greeting, setGreeting] = useState(initialConfig.greeting)
  const [suggestions, setSuggestions] = useState<string[]>(initialConfig.suggestions)
  const [placeholder, setPlaceholder] = useState(initialConfig.placeholder)
  const [savingGlobal, setSavingGlobal] = useState(false)

  async function handleSaveGlobal() {
    if (savingGlobal) return
    setSavingGlobal(true)
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
      setSavingGlobal(false)
    }
  }

  // ── Volet SURCHARGE par client ────────────────────────────────────────────────
  const [selectedClient, setSelectedClient] = useState('')
  const [loadingOverride, setLoadingOverride] = useState(false)
  const [savingOverride, setSavingOverride] = useState(false)
  const [ovGreeting, setOvGreeting] = useState('')
  const [ovPlaceholder, setOvPlaceholder] = useState('')
  const [customSuggestions, setCustomSuggestions] = useState(false)
  const [ovSuggestions, setOvSuggestions] = useState<string[]>([])

  async function handleSelectClient(clientId: string) {
    setSelectedClient(clientId)
    // Réinitialiser le formulaire de surcharge
    setOvGreeting('')
    setOvPlaceholder('')
    setCustomSuggestions(false)
    setOvSuggestions([])
    if (!clientId) return

    setLoadingOverride(true)
    try {
      const { data, error } = await getOnePopupClientOverride(clientId)
      if (error) {
        showError(error.message)
      } else if (data) {
        applyOverride(data)
      }
    } finally {
      setLoadingOverride(false)
    }
  }

  function applyOverride(ov: ElioOnePopupOverride) {
    setOvGreeting(ov.greeting ?? '')
    setOvPlaceholder(ov.placeholder ?? '')
    if (ov.suggestions !== undefined) {
      setCustomSuggestions(true)
      setOvSuggestions(ov.suggestions)
    } else {
      setCustomSuggestions(false)
      setOvSuggestions([])
    }
  }

  async function handleSaveOverride() {
    if (!selectedClient || savingOverride) return
    setSavingOverride(true)
    try {
      // On ne transmet QUE les champs réellement personnalisés (les autres héritent du global).
      const override: ElioOnePopupOverride = {}
      if (ovGreeting.trim()) override.greeting = ovGreeting.trim()
      if (ovPlaceholder.trim()) override.placeholder = ovPlaceholder.trim()
      if (customSuggestions) override.suggestions = cleanSuggestions(ovSuggestions)

      const { data, error } = await setOnePopupClientOverride(selectedClient, override)
      if (error) {
        showError(error.message)
      } else {
        applyOverride(data ?? {})
        showSuccess('Surcharge enregistrée pour ce client.')
      }
    } finally {
      setSavingOverride(false)
    }
  }

  async function handleResetOverride() {
    if (!selectedClient || savingOverride) return
    setSavingOverride(true)
    try {
      const { error } = await setOnePopupClientOverride(selectedClient, {})
      if (error) {
        showError(error.message)
      } else {
        applyOverride({})
        showSuccess('Surcharge retirée — ce client hérite à nouveau du réglage global.')
      }
    } finally {
      setSavingOverride(false)
    }
  }

  return (
    <div className="space-y-10">
      {/* ── Volet GLOBAL ──────────────────────────────────────────────────── */}
      <section className="space-y-4" aria-labelledby="one-popup-global-title">
        <div>
          <h3
            id="one-popup-global-title"
            className="text-[0.7rem] font-semibold uppercase tracking-wider text-gray-500"
          >
            Pop-up par défaut — tous les clients gradués
          </h3>
          <p className="mt-0.5 text-xs text-gray-400">
            Message d&apos;accueil, suggestions de démarrage et invite de saisie affichés à
            l&apos;ouverture d&apos;Élio One, pour tous les clients gradués (sauf surcharge ci-dessous).
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
              onClick={() => void handleSaveGlobal()}
              disabled={savingGlobal || !greeting.trim() || !placeholder.trim()}
              className={BTN_PRIMARY}
            >
              {savingGlobal ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Enregistrer le réglage global
            </button>
          </div>
        </div>
      </section>

      {/* ── Volet SURCHARGE par client ─────────────────────────────────────── */}
      <section className="space-y-4 border-t border-white/5 pt-8" aria-labelledby="one-popup-override-title">
        <div>
          <h3
            id="one-popup-override-title"
            className="text-[0.7rem] font-semibold uppercase tracking-wider text-gray-500"
          >
            Surcharge par client gradué
          </h3>
          <p className="mt-0.5 text-xs text-gray-400">
            Personnalise la pop-up d&apos;un client précis. Laisse un champ vide pour qu&apos;il
            hérite du réglage global.
          </p>
        </div>

        {clients.length === 0 ? (
          <p className="text-sm text-gray-500 italic rounded-2xl border border-dashed border-white/10 px-4 py-6 text-center">
            Aucun client gradué (dashboard One) pour l&apos;instant.
          </p>
        ) : (
          <div className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.02] p-5">
            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-gray-300">Client</span>
              <select
                value={selectedClient}
                onChange={(e) => void handleSelectClient(e.target.value)}
                className={INPUT_CLASS}
                aria-label="Choisir un client gradué"
              >
                <option value="">— Choisir un client gradué —</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>

            {selectedClient && loadingOverride && (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Loader2 className="h-4 w-4 animate-spin" /> Chargement de la surcharge…
              </div>
            )}

            {selectedClient && !loadingOverride && (
              <div className="space-y-4">
                <label className="block space-y-1.5">
                  <span className="text-xs font-medium text-gray-300">
                    Message d&apos;accueil{' '}
                    <span className="text-gray-600">(vide = global)</span>
                  </span>
                  <textarea
                    value={ovGreeting}
                    onChange={(e) => setOvGreeting(e.target.value)}
                    rows={2}
                    maxLength={400}
                    placeholder={initialConfig.greeting}
                    className={`${INPUT_CLASS} resize-none`}
                  />
                </label>

                <div className="space-y-1.5">
                  <label className="flex items-center gap-2 text-xs font-medium text-gray-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={customSuggestions}
                      onChange={(e) => {
                        setCustomSuggestions(e.target.checked)
                        if (e.target.checked && ovSuggestions.length === 0) {
                          setOvSuggestions(initialConfig.suggestions)
                        }
                      }}
                      className="accent-emerald-500"
                    />
                    Suggestions personnalisées pour ce client
                  </label>
                  {customSuggestions ? (
                    <SuggestionsEditor suggestions={ovSuggestions} onChange={setOvSuggestions} />
                  ) : (
                    <p className="text-[11px] text-gray-600 pl-6">
                      Hérite des suggestions globales.
                    </p>
                  )}
                </div>

                <label className="block space-y-1.5">
                  <span className="text-xs font-medium text-gray-300">
                    Invite de saisie{' '}
                    <span className="text-gray-600">(vide = global)</span>
                  </span>
                  <input
                    type="text"
                    value={ovPlaceholder}
                    onChange={(e) => setOvPlaceholder(e.target.value)}
                    maxLength={120}
                    placeholder={initialConfig.placeholder}
                    className={INPUT_CLASS}
                  />
                </label>

                <div className="flex justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => void handleResetOverride()}
                    disabled={savingOverride}
                    className={BTN_GHOST}
                    title="Retirer toute surcharge — le client hérite du global"
                  >
                    <RotateCcw className="h-4 w-4" />
                    Réinitialiser
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleSaveOverride()}
                    disabled={savingOverride}
                    className={BTN_PRIMARY}
                  >
                    {savingOverride ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Enregistrer la surcharge
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  )
}
