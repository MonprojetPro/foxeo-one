'use client'

/**
 * Section « Escalade Élio One → MiKL » (lot 2 — pilotage Hub).
 *
 * Portée GLOBALE (tous les clients gradués One) :
 *  • interrupteur maître (enabled),
 *  • sensibilité d'escalade (low / normal / high),
 *  • phrase personnalisable du bandeau d'escalade (escalationHint, ≤ 300).
 *
 * Puis une vue lecture seule des escalades récentes reçues par MiKL.
 * Écriture opérateur only (Server Action). Ton emerald (thème One) — même style
 * que one-popup-section.tsx.
 */

import { useState } from 'react'
import { Loader2, Save, Inbox } from 'lucide-react'
import {
  setEscalationConfig,
  ESCALATION_HINT_MAX,
  type EscalationConfig,
  type RecentEscalation,
} from '@monprojetpro/module-elio'
import { showSuccess, showError } from '@monprojetpro/ui'

interface EscaladeSectionProps {
  initialConfig: EscalationConfig
  recentEscalations: RecentEscalation[]
}

const INPUT_CLASS =
  'w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:ring-1 focus:ring-emerald-500/70'
const BTN_PRIMARY =
  'rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 px-4 py-2 text-sm font-medium text-white transition-colors inline-flex items-center gap-1.5'

const SENSITIVITY_LABELS: Record<EscalationConfig['sensitivity'], string> = {
  low: 'Basse — Élio escalade rarement (seulement en cas de forte incertitude)',
  normal: 'Normale — équilibre par défaut',
  high: 'Haute — Élio escalade dès le moindre doute',
}

/** Formate une date ISO en date+heure FR (ex: 11 juil. 2026, 14:32). */
function formatDateFR(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** Coupe un corps de notification pour l'aperçu (une ligne). */
function excerpt(body: string, max = 160): string {
  const oneLine = body.replace(/\s+/g, ' ').trim()
  return oneLine.length > max ? `${oneLine.slice(0, max)}…` : oneLine
}

export function EscaladeSection({ initialConfig, recentEscalations }: EscaladeSectionProps) {
  const [enabled, setEnabled] = useState(initialConfig.enabled)
  const [sensitivity, setSensitivity] = useState<EscalationConfig['sensitivity']>(
    initialConfig.sensitivity,
  )
  const [escalationHint, setEscalationHint] = useState(initialConfig.escalationHint ?? '')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (saving) return
    setSaving(true)
    try {
      const hint = escalationHint.trim()
      const { data, error } = await setEscalationConfig({
        enabled,
        sensitivity,
        ...(hint ? { escalationHint: hint } : {}),
      })
      if (error) {
        showError(error.message)
      } else if (data) {
        setEnabled(data.enabled)
        setSensitivity(data.sensitivity)
        setEscalationHint(data.escalationHint ?? '')
        showSuccess('Réglage d’escalade Élio One mis à jour pour tous les clients gradués.')
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-10">
      {/* ── Volet CONFIG globale ────────────────────────────────────────────── */}
      <section className="space-y-4" aria-labelledby="escalade-config-title">
        <div>
          <h3
            id="escalade-config-title"
            className="text-[0.7rem] font-semibold uppercase tracking-wider text-gray-500"
          >
            Escalade vers MiKL — tous les clients gradués
          </h3>
          <p className="mt-0.5 text-xs text-gray-400">
            Contrôle si et comment Élio One propose de te transmettre une question quand il n&apos;est
            pas sûr de sa réponse.
          </p>
        </div>

        <div className="space-y-5 rounded-2xl border border-white/10 bg-white/[0.02] p-5">
          {/* Interrupteur maître */}
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-emerald-500"
              aria-label="Activer l’escalade vers MiKL"
            />
            <span className="space-y-0.5">
              <span className="block text-sm font-medium text-white">
                Autoriser Élio One à proposer l&apos;escalade
              </span>
              <span className="block text-xs text-gray-500">
                Décoché, Élio One ne proposera jamais de transmettre une question à MiKL.
              </span>
            </span>
          </label>

          {/* Sensibilité */}
          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-gray-300">Sensibilité d&apos;escalade</span>
            <select
              value={sensitivity}
              onChange={(e) => setSensitivity(e.target.value as EscalationConfig['sensitivity'])}
              disabled={!enabled}
              className={`${INPUT_CLASS} disabled:opacity-40`}
              aria-label="Sensibilité d’escalade"
            >
              <option value="low" className="bg-neutral-900 text-white">Basse</option>
              <option value="normal" className="bg-neutral-900 text-white">Normale</option>
              <option value="high" className="bg-neutral-900 text-white">Haute</option>
            </select>
            <span className="block text-[11px] text-gray-600">{SENSITIVITY_LABELS[sensitivity]}</span>
          </label>

          {/* Phrase du bandeau */}
          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-gray-300">
              Message du bandeau d&apos;escalade{' '}
              <span className="tabular-nums text-gray-600">
                {escalationHint.trim().length}/{ESCALATION_HINT_MAX}
              </span>
            </span>
            <textarea
              value={escalationHint}
              onChange={(e) => setEscalationHint(e.target.value)}
              rows={2}
              maxLength={ESCALATION_HINT_MAX}
              disabled={!enabled}
              placeholder="Je transmets à MiKL, il te répond vite."
              className={`${INPUT_CLASS} resize-none disabled:opacity-40`}
            />
            <span className="block text-[11px] text-gray-600">
              Vide = message par défaut du chat.
            </span>
          </label>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={saving}
              className={BTN_PRIMARY}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Enregistrer le réglage d&apos;escalade
            </button>
          </div>
        </div>
      </section>

      {/* ── Volet ESCALADES récentes ────────────────────────────────────────── */}
      <section className="space-y-4 border-t border-white/5 pt-8" aria-labelledby="escalade-recent-title">
        <div>
          <h3
            id="escalade-recent-title"
            className="text-[0.7rem] font-semibold uppercase tracking-wider text-gray-500"
          >
            Escalades récentes
          </h3>
          <p className="mt-0.5 text-xs text-gray-400">
            Les dernières questions transmises par Élio One vers toi (lecture seule).
          </p>
        </div>

        {recentEscalations.length === 0 ? (
          <p className="text-sm text-gray-500 italic rounded-2xl border border-dashed border-white/10 px-4 py-6 text-center inline-flex items-center gap-2 justify-center w-full">
            <Inbox className="h-4 w-4" /> Aucune escalade récente.
          </p>
        ) : (
          <ul className="space-y-2">
            {recentEscalations.map((esc) => (
              <li
                key={esc.id}
                className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 space-y-1"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-medium text-white">{esc.title}</p>
                  <time className="shrink-0 text-[11px] tabular-nums text-gray-600">
                    {formatDateFR(esc.createdAt)}
                  </time>
                </div>
                {esc.body && <p className="text-xs text-gray-400">{excerpt(esc.body)}</p>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
