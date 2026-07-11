'use client'

/**
 * Section « Activité Élio One » (lot 4 — vue Hub).
 *
 * Agrégats RÉELS par client gradué : escalades, demandes d'évolution, tokens, coût.
 * ⚠️ Le chat Élio One est ÉPHÉMÈRE (aucun message archivé) : cette vue n'affiche NI
 * verbatim NI feedback pour One — seulement l'activité mesurable en base. Un encart
 * d'info le rappelle explicitement (pas d'invention de données).
 *
 * Tableau desktop + cartes mobile. Ton emerald (thème One).
 */

import { Info } from 'lucide-react'
import { formatCostEur, type OneActivityRow } from '@monprojetpro/module-elio'

interface ActiviteSectionProps {
  rows: OneActivityRow[]
}

/** Formate un nombre de tokens (séparateur de milliers FR). */
function formatTokens(n: number): string {
  return n.toLocaleString('fr-FR')
}

/** Encart d'information sur le caractère éphémère du chat One. */
function EphemeralNotice() {
  return (
    <div className="flex items-start gap-2.5 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.04] px-4 py-3 text-xs text-emerald-200/80">
      <Info className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
      <p>
        Le détail des conversations Élio One n&apos;est pas archivé (chat éphémère) — cette vue
        agrège l&apos;activité mesurable&nbsp;: escalades vers toi, demandes d&apos;évolution et
        consommation IA. Il n&apos;y a pas d&apos;historique verbatim ni de feedback côté One.
      </p>
    </div>
  )
}

export function ActiviteSection({ rows }: ActiviteSectionProps) {
  if (rows.length === 0) {
    return (
      <div className="space-y-4">
        <EphemeralNotice />
        <p className="rounded-2xl border border-dashed border-white/10 px-4 py-10 text-center text-sm italic text-gray-500">
          Aucun client gradué.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <EphemeralNotice />

      {/* ── Desktop : tableau ─────────────────────────────────────────────── */}
      <div className="hidden overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02] md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 text-left text-[0.7rem] font-semibold uppercase tracking-wider text-gray-500">
              <th className="px-4 py-3 font-semibold">Client</th>
              <th className="px-4 py-3 text-right font-semibold">Escalades</th>
              <th className="px-4 py-3 text-right font-semibold">Demandes d&apos;évolution</th>
              <th className="px-4 py-3 text-right font-semibold">Tokens</th>
              <th className="px-4 py-3 text-right font-semibold">Coût</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.clientId}
                className="border-b border-white/5 last:border-0 transition-colors hover:bg-white/[0.02]"
              >
                <td className="px-4 py-3 font-medium text-white">{row.clientName}</td>
                <td className="px-4 py-3 text-right tabular-nums text-gray-300">
                  {row.escalations}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-gray-300">
                  {row.evolutionRequests}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-gray-300">
                  {formatTokens(row.inputTokens + row.outputTokens)}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-emerald-300">
                  {formatCostEur(row.costEur)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Mobile : cartes ──────────────────────────────────────────────── */}
      <div className="space-y-3 md:hidden">
        {rows.map((row) => (
          <div
            key={row.clientId}
            className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.02] p-4"
          >
            <p className="font-medium text-white">{row.clientName}</p>
            <dl className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <dt className="text-gray-500">Escalades</dt>
                <dd className="tabular-nums text-gray-200">{row.escalations}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Demandes d&apos;évolution</dt>
                <dd className="tabular-nums text-gray-200">{row.evolutionRequests}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Tokens</dt>
                <dd className="tabular-nums text-gray-200">
                  {formatTokens(row.inputTokens + row.outputTokens)}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500">Coût</dt>
                <dd className="tabular-nums text-emerald-300">{formatCostEur(row.costEur)}</dd>
              </div>
            </dl>
          </div>
        ))}
      </div>
    </div>
  )
}
