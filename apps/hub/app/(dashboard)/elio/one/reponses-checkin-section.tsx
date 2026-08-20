'use client'

/**
 * Section « Réponses aux prises de nouvelles » (2026-08-20 — pilotage Hub).
 *
 * Depuis que le mot de prise de nouvelles pose une vraie question (oui / non), un client peut
 * répondre « Non, pas trop » puis ne pas aller au bout du chat. Sans cette vue, ce signal
 * n'arriverait nulle part : Élio ne prévient MiKL qu'avec l'accord explicite du client, et
 * c'est volontaire — mais MiKL doit au moins pouvoir CONSTATER qu'un client a levé la main.
 *
 * Lecture seule, portée globale (30 dernières prises de nouvelles, tous clients One).
 * Les « Pas top » sont remontés en tête : c'est la seule ligne qui appelle une action humaine.
 */

import { Inbox, Check, AlertTriangle, Clock } from 'lucide-react'
import type { CheckinAnswerRow } from '@monprojetpro/module-elio'

interface ReponsesCheckinSectionProps {
  rows: CheckinAnswerRow[]
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export function ReponsesCheckinSection({ rows }: ReponsesCheckinSectionProps) {
  // Les « pas top » d'abord (ordre d'urgence), puis les sans-réponse, puis les OK.
  // À l'intérieur de chaque groupe, l'ordre chronologique de la requête est conservé.
  const weight = (row: CheckinAnswerRow) =>
    row.answerChoice === 'not_ok' ? 0 : row.answerChoice === null ? 1 : 2
  const sorted = [...rows].sort((a, b) => weight(a) - weight(b))

  const notOkCount = rows.filter((r) => r.answerChoice === 'not_ok').length
  const pendingCount = rows.filter((r) => r.answerChoice === null).length

  return (
    <section className="space-y-4" aria-labelledby="checkin-answers-title">
      <div>
        <h3
          id="checkin-answers-title"
          className="text-[0.7rem] font-semibold uppercase tracking-wider text-gray-500"
        >
          Réponses aux prises de nouvelles
        </h3>
        <p className="mt-0.5 text-xs text-gray-400">
          Ce que tes clients ont répondu quand Élio a pris de leurs nouvelles.{' '}
          {notOkCount > 0 ? (
            <span className="text-amber-400">
              {notOkCount} client{notOkCount > 1 ? 's ont' : ' a'} signalé que ça n&apos;allait pas.
            </span>
          ) : (
            <span>Aucun signalement négatif.</span>
          )}{' '}
          {pendingCount > 0 && (
            <span className="text-gray-500">{pendingCount} sans réponse pour l&apos;instant.</span>
          )}
        </p>
      </div>

      {sorted.length === 0 ? (
        <p className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-white/10 px-4 py-6 text-center text-sm italic text-gray-500">
          <Inbox className="h-4 w-4" /> Aucune prise de nouvelles envoyée pour l&apos;instant.
        </p>
      ) : (
        <ul className="space-y-2">
          {sorted.map((row) => (
            <li
              key={row.id}
              className="rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-white">{row.clientName}</p>
                  <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-gray-400">
                    {row.body}
                  </p>
                </div>

                <div className="shrink-0 text-right">
                  {row.answerChoice === 'not_ok' && (
                    <span className="inline-flex items-center gap-1 rounded-lg bg-amber-500/10 px-2 py-1 text-[11px] font-medium text-amber-400">
                      <AlertTriangle className="h-3 w-3" /> Pas top
                    </span>
                  )}
                  {row.answerChoice === 'ok' && (
                    <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-500/10 px-2 py-1 text-[11px] font-medium text-emerald-400">
                      <Check className="h-3 w-3" /> Tout va bien
                    </span>
                  )}
                  {row.answerChoice === null && (
                    <span className="inline-flex items-center gap-1 rounded-lg bg-white/5 px-2 py-1 text-[11px] font-medium text-gray-400">
                      <Clock className="h-3 w-3" /> Sans réponse
                    </span>
                  )}
                  <p className="mt-1 text-[11px] tabular-nums text-gray-600">
                    Envoyé le {formatDate(row.sentAt)}
                    {row.answeredAt && ` · répondu le ${formatDate(row.answeredAt)}`}
                  </p>
                </div>
              </div>

              {row.answerChoice === 'not_ok' && (
                <a
                  href={`/modules/crm/clients/${row.clientId}?tab=echanges`}
                  className="mt-2 inline-block text-[11px] text-emerald-400 hover:underline"
                >
                  Ouvrir la conversation →
                </a>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
