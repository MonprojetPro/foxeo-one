'use client'

import {
  Users,
  CalendarDays,
  Flag,
  Crown,
  Ban,
  BadgeCheck,
  AlertTriangle,
  Loader2,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@monprojetpro/ui'
import { useHousehold } from '../hooks/use-households'
import { num, shortDate, fullDate, relativeDate } from '../utils/format'
import type { HouseholdMember, HouseholdPlanning, MenuFacileReport } from '../types'

// ---------------------------------------------------------------------------
// Sous-blocs
// ---------------------------------------------------------------------------

function Section({
  icon: Icon,
  title,
  count,
  children,
}: {
  icon: typeof Users
  title: string
  count?: number
  children: React.ReactNode
}) {
  return (
    <section className="space-y-2">
      <h3 className="flex items-center gap-2 text-[0.7rem] font-semibold uppercase tracking-wider text-gray-500">
        <Icon className="h-3.5 w-3.5 text-cyan-400/70" />
        {title}
        {count !== undefined && count > 0 && (
          <span className="rounded-full bg-white/5 px-1.5 py-0.5 text-[0.65rem] tabular-nums text-gray-400">
            {count}
          </span>
        )}
      </h3>
      {children}
    </section>
  )
}

/**
 * Section absente du guichet : on le dit explicitement plutôt que d'afficher
 * une liste vide, qui ferait croire à tort que le foyer n'a rien.
 */
function NotProvided({ what }: { what: string }) {
  return (
    <p className="rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2.5 text-xs text-gray-500">
      {what} — donnée non fournie par le guichet MenuFacile.
    </p>
  )
}

function EmptyLine({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2.5 text-xs text-gray-500">
      {children}
    </p>
  )
}

function MemberRow({ m }: { m: HouseholdMember }) {
  const name = m.display_name?.trim() || m.email || 'Membre sans nom'
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2.5">
      <div className="min-w-0">
        <p className="flex items-center gap-1.5 truncate text-sm text-white">
          {name}
          {m.role === 'owner' && (
            <span title="Créateur du foyer">
              <Crown className="h-3.5 w-3.5 shrink-0 text-amber-300" />
            </span>
          )}
          {m.is_banned && (
            <span className="inline-flex items-center gap-1 rounded border border-red-400/30 bg-red-400/10 px-1.5 py-0.5 text-[0.65rem] text-red-300">
              <Ban className="h-3 w-3" />
              Banni
            </span>
          )}
        </p>
        {m.display_name && m.email && (
          <p className="truncate text-xs text-gray-500">{m.email}</p>
        )}
      </div>
      <div className="text-right text-xs">
        <p className="text-gray-300" title={fullDate(m.last_sign_in_at)}>
          Vu {relativeDate(m.last_sign_in_at)}
        </p>
        <p className="text-gray-500">Membre depuis le {shortDate(m.joined_at)}</p>
      </div>
    </div>
  )
}

/** Semaine de planning. `week_start` est une date nue (YYYY-MM-DD). */
function PlanningRow({ p }: { p: HouseholdPlanning }) {
  const start = new Date(`${p.week_start}T00:00:00`)
  const label = Number.isNaN(start.getTime())
    ? p.week_start
    : start.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2">
      <span className="text-sm text-gray-200">Semaine du {label}</span>
      <span className="whitespace-nowrap text-xs tabular-nums text-gray-400">
        {num(p.meals_filled)} repas
      </span>
    </div>
  )
}

function ReportRow({ r }: { r: MenuFacileReport }) {
  const pending = r.status === 'pending'
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2">
      <div className="min-w-0">
        <p className="truncate text-sm text-gray-200">
          {r.recipe?.name ?? `Recette ${r.recipe_id.slice(0, 8)}…`}
        </p>
        <p className="truncate text-xs text-gray-500">{r.reason}</p>
      </div>
      <span
        className={`whitespace-nowrap rounded-full border px-2 py-0.5 text-[0.65rem] ${
          pending
            ? 'border-amber-400/30 bg-amber-400/10 text-amber-200'
            : 'border-white/10 text-gray-400'
        }`}
      >
        {pending ? 'En attente' : 'Traité'}
      </span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Fiche foyer
// ---------------------------------------------------------------------------

export function HouseholdDetailDialog({
  householdId,
  onClose,
}: {
  householdId: string | null
  onClose: () => void
}) {
  const { data, isLoading, error } = useHousehold(householdId)

  const emitted = data?.reports?.emitted ?? []
  const received = data?.reports?.received ?? []

  return (
    <Dialog open={!!householdId} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2">
            {data?.name ?? 'Foyer'}
            {data?.is_official && (
              <span className="inline-flex items-center gap-1 rounded-md border border-cyan-400/25 bg-cyan-400/10 px-1.5 py-0.5 text-[0.65rem] font-medium text-cyan-300">
                <BadgeCheck className="h-3 w-3" />
                Officiel
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        {isLoading && (
          <div className="flex items-center justify-center gap-2 py-12 text-sm text-gray-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Chargement de la fiche…
          </div>
        )}

        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-red-400/30 bg-red-400/5 px-3 py-3 text-sm text-red-300">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{(error as Error).message}</span>
          </div>
        )}

        {data && !isLoading && (
          <div className="space-y-6">
            {/* Résumé chiffré */}
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                ['Membres', num(data.members_count)],
                ['Recettes', num(data.recipes_count)],
                ['Repas planifiés', num(data.planned_meals_count)],
                ['Amitiés', num(data.friendships_count)],
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
                  <p className="text-lg font-semibold tabular-nums text-white">{value}</p>
                  <p className="text-[0.7rem] text-gray-500">{label}</p>
                </div>
              ))}
            </div>

            <p className="text-xs text-gray-500">
              Créé le {shortDate(data.created_at)} · dernière activité{' '}
              <span title={fullDate(data.last_activity_at)}>
                {relativeDate(data.last_activity_at)}
              </span>
            </p>

            {/* Membres */}
            <Section icon={Users} title="Membres" count={data.members?.length}>
              {!data.members ? (
                <NotProvided what="Membres" />
              ) : data.members.length === 0 ? (
                <EmptyLine>Aucun membre rattaché à ce foyer.</EmptyLine>
              ) : (
                <div className="space-y-2">
                  {data.members.map((m) => (
                    <MemberRow key={m.id} m={m} />
                  ))}
                </div>
              )}
            </Section>

            {/* Plannings */}
            <Section
              icon={CalendarDays}
              title="Derniers plannings"
              count={data.recent_plannings?.length}
            >
              {!data.recent_plannings ? (
                <NotProvided what="Plannings" />
              ) : data.recent_plannings.length === 0 ? (
                <EmptyLine>Ce foyer n’a encore planifié aucune semaine.</EmptyLine>
              ) : (
                <div className="space-y-2">
                  {data.recent_plannings.map((p) => (
                    <PlanningRow key={p.week_start} p={p} />
                  ))}
                </div>
              )}
            </Section>

            {/* Signalements */}
            <Section icon={Flag} title="Signalements" count={emitted.length + received.length}>
              {!data.reports ? (
                <NotProvided what="Signalements" />
              ) : emitted.length + received.length === 0 ? (
                <EmptyLine>Aucun signalement lié à ce foyer.</EmptyLine>
              ) : (
                <div className="space-y-3">
                  {received.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs text-gray-500">
                        Visant une recette du foyer ({received.length})
                      </p>
                      {received.map((r) => (
                        <ReportRow key={r.id} r={r} />
                      ))}
                    </div>
                  )}
                  {emitted.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs text-gray-500">
                        Émis par un membre du foyer ({emitted.length})
                      </p>
                      {emitted.map((r) => (
                        <ReportRow key={r.id} r={r} />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </Section>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
