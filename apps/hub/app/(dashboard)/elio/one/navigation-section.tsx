'use client'

/**
 * Section « Navigation & deep-links Élio One » (lot 3 — pilotage Hub).
 *
 * Portée GLOBALE (tous les clients gradués One). Deux volets :
 *  • DESTINATIONS — liste des 8 clés goto (issues de GOTO_ROUTES) avec un toggle
 *    Actif/Désactivé chacune (piloté par `disabledRoutes`). Désactiver une destination
 *    coupe le lien correspondant (Élio cesse d'émettre le jeton) pour tous les clients One.
 *  • CONSIGNE — une note de navigation additionnelle injectée dans le prompt One.
 *
 * Écriture opérateur only (Server Action setOneNavigationConfig). Ton emerald (thème One).
 */

import { useState } from 'react'
import { Loader2, Save } from 'lucide-react'
import {
  setOneNavigationConfig,
  GOTO_ROUTES,
  EXTRA_NAVIGATION_NOTE_MAX,
  type OneNavigationConfig,
} from '@monprojetpro/module-elio'
import { showSuccess, showError } from '@monprojetpro/ui'

interface NavigationSectionProps {
  initialConfig: OneNavigationConfig
}

const INPUT_CLASS =
  'w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:ring-1 focus:ring-emerald-500/70'
const BTN_PRIMARY =
  'rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 px-4 py-2 text-sm font-medium text-white transition-colors inline-flex items-center gap-1.5'

/** Libellés lisibles des clés goto (fallback = la clé brute si non listée). */
const ROUTE_LABELS: Record<string, string> = {
  'tableau-de-bord': 'Tableau de bord',
  chat: 'Chat MiKL',
  documents: 'Documents',
  visio: 'Visio',
  'suivi-outil': "Suivi de l'outil",
  support: 'Support',
  parametres: 'Paramètres',
  facturation: 'Mes factures',
}

/** Toutes les clés goto pilotables (source de vérité : GOTO_ROUTES). */
const GOTO_KEYS = Object.keys(GOTO_ROUTES)

export function NavigationSection({ initialConfig }: NavigationSectionProps) {
  // On ne garde en `disabled` que les clés réellement connues (une clé obsolète en base est ignorée).
  const [disabled, setDisabled] = useState<Set<string>>(
    () => new Set(initialConfig.disabledRoutes.filter((k) => GOTO_KEYS.includes(k))),
  )
  const [note, setNote] = useState(initialConfig.extraNavigationNote)
  const [saving, setSaving] = useState(false)

  function toggleRoute(key: string) {
    setDisabled((prev) => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }

  async function handleSave() {
    if (saving) return
    setSaving(true)
    try {
      const { data, error } = await setOneNavigationConfig({
        disabledRoutes: [...disabled],
        extraNavigationNote: note.trim(),
      })
      if (error) {
        showError(error.message)
      } else if (data) {
        setDisabled(new Set(data.disabledRoutes.filter((k) => GOTO_KEYS.includes(k))))
        setNote(data.extraNavigationNote)
        showSuccess('Navigation Élio One mise à jour pour tous les clients gradués.')
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-10">
      {/* ── Volet DESTINATIONS ─────────────────────────────────────────────── */}
      <section className="space-y-4" aria-labelledby="one-nav-routes-title">
        <div>
          <h3
            id="one-nav-routes-title"
            className="text-[0.7rem] font-semibold uppercase tracking-wider text-gray-500"
          >
            Destinations deep-link — tous les clients gradués
          </h3>
          <p className="mt-0.5 text-xs text-gray-400">
            Les onglets vers lesquels Élio One peut orienter le client via un lien cliquable.
            Désactive une destination pour couper temporairement le lien correspondant (Élio
            cesse de le proposer).
          </p>
        </div>

        <ul className="space-y-2 rounded-2xl border border-white/10 bg-white/[0.02] p-5">
          {GOTO_KEYS.map((key) => {
            const isActive = !disabled.has(key)
            return (
              <li
                key={key}
                className="flex items-center justify-between gap-3 rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2.5"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-white">
                    {ROUTE_LABELS[key] ?? key}
                  </p>
                  <p className="truncate text-[11px] text-gray-500">
                    <span className="font-mono">{key}</span>
                    <span className="text-gray-600"> · {GOTO_ROUTES[key]}</span>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => toggleRoute(key)}
                  aria-pressed={isActive}
                  aria-label={`${isActive ? 'Désactiver' : 'Activer'} la destination ${ROUTE_LABELS[key] ?? key}`}
                  className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25'
                      : 'bg-white/[0.04] text-gray-500 hover:bg-white/[0.08]'
                  }`}
                >
                  {isActive ? 'Actif' : 'Désactivé'}
                </button>
              </li>
            )
          })}
        </ul>
      </section>

      {/* ── Volet CONSIGNE ─────────────────────────────────────────────────── */}
      <section className="space-y-4 border-t border-white/5 pt-8" aria-labelledby="one-nav-note-title">
        <div>
          <h3
            id="one-nav-note-title"
            className="text-[0.7rem] font-semibold uppercase tracking-wider text-gray-500"
          >
            Consigne de navigation additionnelle
          </h3>
          <p className="mt-0.5 text-xs text-gray-400">
            Une consigne libre injectée dans le cerveau d&apos;Élio One, à la suite de la carte de
            navigation (ex. « privilégie l&apos;onglet Suivi de l&apos;outil ce mois-ci »). Laisse
            vide si tu n&apos;as rien de particulier à ajouter.
          </p>
        </div>

        <div className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.02] p-5">
          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-gray-300">
              Consigne{' '}
              <span className="tabular-nums text-gray-600">
                {note.trim().length}/{EXTRA_NAVIGATION_NOTE_MAX}
              </span>
            </span>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={4}
              maxLength={EXTRA_NAVIGATION_NOTE_MAX}
              placeholder="Ex : ce mois-ci, oriente en priorité vers l'onglet Suivi de l'outil."
              className={`${INPUT_CLASS} resize-none`}
            />
          </label>
        </div>
      </section>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={saving}
          className={BTN_PRIMARY}
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Enregistrer la navigation
        </button>
      </div>
    </div>
  )
}
