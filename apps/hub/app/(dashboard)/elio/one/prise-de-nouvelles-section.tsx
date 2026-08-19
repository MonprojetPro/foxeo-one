'use client'

/**
 * Section « Prise de nouvelles d'Élio One » (2026-08-19 — pilotage Hub).
 *
 * Portée GLOBALE (tous les clients One actifs). Règle la relance proactive du cron
 * `one-project-checkin` : activation, délai avant relance, délai minimum entre deux mots.
 *
 * Rappel du modèle : Élio prend des nouvelles, mais il ne prévient MiKL QUE si le client
 * accepte — le consentement se joue dans le chat, pas ici.
 *
 * Écriture opérateur only (Server Action). Ton emerald (thème One), aligné sur
 * escalade-section.tsx.
 */

import { useState } from 'react'
import { Loader2, Save } from 'lucide-react'
import {
  setCheckinConfig,
  CHECKIN_MIN_DAYS,
  CHECKIN_MAX_DAYS,
  type CheckinConfig,
} from '@monprojetpro/module-elio'
import { showSuccess, showError } from '@monprojetpro/ui'

interface PriseDeNouvellesSectionProps {
  initialConfig: CheckinConfig
}

const INPUT_CLASS =
  'w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:ring-1 focus:ring-emerald-500/70'
const BTN_PRIMARY =
  'rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 px-4 py-2 text-sm font-medium text-white transition-colors inline-flex items-center gap-1.5'

export function PriseDeNouvellesSection({ initialConfig }: PriseDeNouvellesSectionProps) {
  const [enabled, setEnabled] = useState(initialConfig.enabled)
  const [idleDays, setIdleDays] = useState(String(initialConfig.idleDays))
  const [cooldownDays, setCooldownDays] = useState(String(initialConfig.cooldownDays))
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (saving) return
    setSaving(true)
    try {
      // Champs texte → nombres : NaN si l'opérateur a vidé le champ, la validation Zod
      // côté Server Action renverra alors un message explicite plutôt qu'un 0 silencieux.
      const { data, error } = await setCheckinConfig({
        enabled,
        idleDays: Number.parseInt(idleDays, 10),
        cooldownDays: Number.parseInt(cooldownDays, 10),
      })
      if (error) {
        showError(error.message)
      } else if (data) {
        setEnabled(data.enabled)
        setIdleDays(String(data.idleDays))
        setCooldownDays(String(data.cooldownDays))
        showSuccess('Prise de nouvelles d’Élio One mise à jour pour tous les clients One.')
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="space-y-4" aria-labelledby="checkin-config-title">
      <div>
        <h3
          id="checkin-config-title"
          className="text-[0.7rem] font-semibold uppercase tracking-wider text-gray-500"
        >
          Prise de nouvelles — tous les clients One
        </h3>
        <p className="mt-0.5 text-xs text-gray-400">
          Élio prend spontanément des nouvelles du projet quand le lien s&apos;est distendu. S&apos;il
          apprend que ça ne va pas, il propose au client de te prévenir — et ne le fait qu&apos;avec
          son accord.
        </p>
      </div>

      <div className="space-y-5 rounded-2xl border border-white/10 bg-white/[0.02] p-5">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            className="mt-0.5 h-4 w-4 accent-emerald-500"
            aria-label="Activer la prise de nouvelles proactive"
          />
          <span className="space-y-0.5">
            <span className="block text-sm font-medium text-white">
              Autoriser Élio One à prendre des nouvelles de lui-même
            </span>
            <span className="block text-xs text-gray-500">
              Décoché, Élio reste disponible dans le chat mais n&apos;écrit plus spontanément.
            </span>
          </span>
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-gray-300">
              Prendre des nouvelles après (jours sans échange)
            </span>
            <input
              type="number"
              inputMode="numeric"
              min={CHECKIN_MIN_DAYS}
              max={CHECKIN_MAX_DAYS}
              value={idleDays}
              onChange={(e) => setIdleDays(e.target.value)}
              disabled={!enabled}
              className={`${INPUT_CLASS} disabled:opacity-40`}
              aria-label="Délai avant prise de nouvelles, en jours"
            />
            <span className="block text-[11px] text-gray-600">
              Entre {CHECKIN_MIN_DAYS} et {CHECKIN_MAX_DAYS} jours.
            </span>
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-gray-300">
              Délai minimum entre deux mots d&apos;Élio
            </span>
            <input
              type="number"
              inputMode="numeric"
              min={CHECKIN_MIN_DAYS}
              max={CHECKIN_MAX_DAYS}
              value={cooldownDays}
              onChange={(e) => setCooldownDays(e.target.value)}
              disabled={!enabled}
              className={`${INPUT_CLASS} disabled:opacity-40`}
              aria-label="Délai minimum entre deux mots d’Élio, en jours"
            />
            <span className="block text-[11px] text-gray-600">
              Garde-fou anti-harcèlement : compte aussi les mots envoyés pour une livraison ou
              une évolution.
            </span>
          </label>
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving}
            className={BTN_PRIMARY}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Enregistrer la prise de nouvelles
          </button>
        </div>
      </div>
    </section>
  )
}
