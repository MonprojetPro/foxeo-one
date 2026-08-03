'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Home,
  Search,
  Download,
  RefreshCw,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  BadgeCheck,
  Loader2,
} from 'lucide-react'
import { Button, Input, toast } from '@monprojetpro/ui'
import { useHouseholds } from '../hooks/use-households'
import { getAllHouseholds } from '../actions/households'
import { HouseholdDetailDialog } from './household-detail-dialog'
import { PAGE_SIZE } from '../utils/query'
import { num, shortDate, fullDate, relativeDate, toCsv, downloadCsv } from '../utils/format'
import type {
  ActivityFilter,
  HouseholdListItem,
  HouseholdSort,
  HouseholdStatus,
  SortOrder,
} from '../types'

// ---------------------------------------------------------------------------
// Constantes d'affichage
// ---------------------------------------------------------------------------

const ACTIVITY_FILTERS: { key: ActivityFilter; label: string }[] = [
  { key: 'all', label: 'Tous' },
  { key: '7d', label: 'Actifs 7 j' },
  { key: '30d', label: 'Actifs 30 j' },
  { key: 'dormant', label: 'Dormants' },
]

const STATUS_STYLE: Record<HouseholdStatus, { label: string; cls: string; dot: string }> = {
  active: {
    label: 'Actif',
    cls: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300',
    dot: 'bg-emerald-400',
  },
  dormant: {
    label: 'Dormant',
    cls: 'border-amber-400/30 bg-amber-400/10 text-amber-200',
    dot: 'bg-amber-400',
  },
  banned: {
    label: 'Banni',
    cls: 'border-red-400/30 bg-red-400/10 text-red-300',
    dot: 'bg-red-400',
  },
}

/** Colonnes du tableau. `sort` absent = colonne non triable côté guichet. */
const COLUMNS: {
  key: string
  label: string
  sort?: HouseholdSort
  align?: 'right'
  hideBelow?: 'lg' | 'xl'
}[] = [
  { key: 'name', label: 'Foyer', sort: 'name' },
  { key: 'members_count', label: 'Membres', sort: 'members_count', align: 'right' },
  { key: 'recipes_count', label: 'Recettes', sort: 'recipes_count', align: 'right' },
  { key: 'planned_meals_count', label: 'Repas planifiés', align: 'right', hideBelow: 'lg' },
  { key: 'friendships_count', label: 'Amitiés', align: 'right', hideBelow: 'xl' },
  { key: 'created_at', label: 'Créé le', sort: 'created_at', hideBelow: 'lg' },
  { key: 'last_activity_at', label: 'Dernière activité', sort: 'last_activity_at' },
  { key: 'status', label: 'Statut' },
]

// ---------------------------------------------------------------------------
// Sous-composants
// ---------------------------------------------------------------------------

function StatusPill({ status }: { status: HouseholdStatus }) {
  const s = STATUS_STYLE[status] ?? STATUS_STYLE.active
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-[0.7rem] font-medium ${s.cls}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  )
}

function OfficialBadge() {
  return (
    <span
      title="Foyer officiel"
      className="inline-flex items-center gap-1 rounded-md border border-cyan-400/25 bg-cyan-400/10 px-1.5 py-0.5 text-[0.65rem] font-medium text-cyan-300"
    >
      <BadgeCheck className="h-3 w-3" />
      Officiel
    </span>
  )
}

function FilterPill({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
        active
          ? 'border-cyan-400/40 bg-cyan-400/10 text-cyan-200'
          : 'border-white/10 bg-white/[0.02] text-gray-400 hover:bg-white/5 hover:text-gray-200'
      }`}
    >
      {children}
    </button>
  )
}

function SkeletonRows({ rows = 6 }: { rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <tr key={i} className="border-b border-white/5 last:border-0">
          <td colSpan={COLUMNS.length} className="px-4 py-3.5">
            <div className="h-4 animate-pulse rounded bg-white/5" />
          </td>
        </tr>
      ))}
    </>
  )
}

/** Carte mobile — le tableau est illisible sous 1024 px. */
function HouseholdCard({ h, onOpen }: { h: HouseholdListItem; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full rounded-xl border border-white/10 bg-white/[0.02] p-4 text-left transition-colors hover:border-white/20 hover:bg-white/[0.04]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-medium text-white">{h.name}</p>
          <p className="mt-0.5 text-xs text-gray-500" title={fullDate(h.last_activity_at)}>
            Activité : {relativeDate(h.last_activity_at)}
          </p>
        </div>
        <StatusPill status={h.status} />
      </div>
      {h.is_official && (
        <div className="mt-2">
          <OfficialBadge />
        </div>
      )}
      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs sm:grid-cols-4">
        {[
          ['Membres', num(h.members_count)],
          ['Recettes', num(h.recipes_count)],
          ['Repas planifiés', num(h.planned_meals_count)],
          ['Amitiés', num(h.friendships_count)],
        ].map(([label, value]) => (
          <div key={label}>
            <dt className="text-gray-500">{label}</dt>
            <dd className="tabular-nums text-gray-200">{value}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 text-[0.7rem] text-gray-500">Créé le {shortDate(h.created_at)}</p>
    </button>
  )
}

// ---------------------------------------------------------------------------
// Onglet Foyers
// ---------------------------------------------------------------------------

export function HouseholdsTab() {
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [activity, setActivity] = useState<ActivityFilter>('all')
  const [officialOnly, setOfficialOnly] = useState(false)
  const [sort, setSort] = useState<HouseholdSort>('last_activity_at')
  const [order, setOrder] = useState<SortOrder>('desc')
  const [page, setPage] = useState(0)
  const [exporting, setExporting] = useState(false)
  const [openId, setOpenId] = useState<string | null>(null)

  // Debounce de la recherche : une frappe ne déclenche pas un appel guichet.
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 350)
    return () => clearTimeout(t)
  }, [searchInput])

  // Tout changement de critère ramène à la première page — sinon on atterrit
  // sur une page 4 qui n'existe plus dans le résultat filtré.
  useEffect(() => {
    setPage(0)
  }, [search, activity, officialOnly, sort, order])

  const query = useMemo(
    () => ({
      limit: PAGE_SIZE,
      offset: page * PAGE_SIZE,
      search: search || undefined,
      sort,
      order,
      activity,
      official: officialOnly ? true : undefined,
    }),
    [page, search, sort, order, activity, officialOnly],
  )

  const { data, isLoading, isFetching, error, refetch } = useHouseholds(query)

  const items = data?.items ?? []
  const total = data?.total ?? 0
  const from = total === 0 ? 0 : page * PAGE_SIZE + 1
  const to = Math.min(total, page * PAGE_SIZE + items.length)
  const hasPrev = page > 0
  const hasNext = to < total

  const toggleSort = (col?: HouseholdSort) => {
    if (!col) return
    if (col === sort) {
      setOrder((o) => (o === 'desc' ? 'asc' : 'desc'))
    } else {
      setSort(col)
      setOrder(col === 'name' ? 'asc' : 'desc')
    }
  }

  const onExport = async () => {
    setExporting(true)
    try {
      const res = await getAllHouseholds({ search: search || undefined, sort, order, activity, official: officialOnly ? true : undefined })
      if (res.error || !res.data) {
        toast.error(res.error?.message ?? "L'export a échoué")
        return
      }
      const csv = toCsv(
        [
          'Foyer',
          'Membres',
          'Recettes',
          'Repas planifiés',
          'Amitiés',
          'Créé le',
          'Dernière activité',
          'Officiel',
          'Statut',
        ],
        res.data.items.map((h) => [
          h.name,
          h.members_count,
          h.recipes_count,
          h.planned_meals_count,
          h.friendships_count,
          shortDate(h.created_at),
          shortDate(h.last_activity_at),
          h.is_official ? 'oui' : 'non',
          STATUS_STYLE[h.status]?.label ?? h.status,
        ]),
      )
      const stamp = new Date().toISOString().slice(0, 10)
      downloadCsv(`menufacile-foyers-${stamp}.csv`, csv)

      if (res.data.truncated) {
        toast.warning(
          `Export limité aux ${res.data.items.length} premiers foyers sur ${res.data.total}.`,
        )
      } else {
        toast.success(`${res.data.items.length} foyer(s) exporté(s)`)
      }
    } finally {
      setExporting(false)
    }
  }

  // ── Erreur guichet ────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="rounded-2xl border border-red-400/30 bg-red-400/5 p-8 text-center">
        <p className="text-sm text-red-400">Impossible de charger les foyers</p>
        <p className="mt-1 text-xs text-gray-500">{(error as Error).message}</p>
        <button
          onClick={() => refetch()}
          className="mt-4 inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-gray-300 transition-colors hover:bg-white/5"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Réessayer
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* En-tête onglet */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-cyan-400/25 bg-cyan-400/10 text-cyan-300">
            <Home className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white">Foyers</h2>
            <p className="text-xs text-gray-500">
              {isLoading ? 'Chargement…' : `${num(total)} foyer${total > 1 ? 's' : ''} au total`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onExport} disabled={exporting || total === 0}>
            {exporting ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Download className="mr-1.5 h-3.5 w-3.5" />
            )}
            {exporting ? 'Export…' : 'Exporter CSV'}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
        </div>
      </div>

      {/* Barre de filtres */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[14rem] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Rechercher un foyer ou un email…"
            aria-label="Rechercher un foyer"
            className="pl-9"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {ACTIVITY_FILTERS.map((f) => (
            <FilterPill key={f.key} active={activity === f.key} onClick={() => setActivity(f.key)}>
              {f.label}
            </FilterPill>
          ))}
          <FilterPill active={officialOnly} onClick={() => setOfficialOnly((v) => !v)}>
            Officiels
          </FilterPill>
        </div>
      </div>

      {/* Tableau (desktop) */}
      <div className="hidden overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02] lg:block">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left text-xs text-gray-400">
                {COLUMNS.map((c) => {
                  const isSorted = c.sort && c.sort === sort
                  const hide =
                    c.hideBelow === 'xl' ? 'hidden xl:table-cell' : c.hideBelow === 'lg' ? 'hidden lg:table-cell' : ''
                  return (
                    <th
                      key={c.key}
                      scope="col"
                      aria-sort={isSorted ? (order === 'asc' ? 'ascending' : 'descending') : undefined}
                      className={`px-4 py-2.5 font-medium ${c.align === 'right' ? 'text-right' : ''} ${hide}`}
                    >
                      {c.sort ? (
                        <button
                          type="button"
                          onClick={() => toggleSort(c.sort)}
                          className={`inline-flex items-center gap-1 transition-colors hover:text-gray-200 ${
                            isSorted ? 'text-cyan-300' : ''
                          }`}
                        >
                          {c.label}
                          {isSorted &&
                            (order === 'asc' ? (
                              <ArrowUp className="h-3 w-3" />
                            ) : (
                              <ArrowDown className="h-3 w-3" />
                            ))}
                        </button>
                      ) : (
                        c.label
                      )}
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <SkeletonRows />
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={COLUMNS.length} className="px-4 py-12 text-center text-xs text-gray-500">
                    {search || activity !== 'all' || officialOnly
                      ? 'Aucun foyer ne correspond à ces critères.'
                      : 'Aucun foyer pour l’instant.'}
                  </td>
                </tr>
              ) : (
                items.map((h) => (
                  <tr
                    key={h.id}
                    tabIndex={0}
                    role="button"
                    aria-label={`Ouvrir la fiche du foyer ${h.name}`}
                    onClick={() => setOpenId(h.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        setOpenId(h.id)
                      }
                    }}
                    className="cursor-pointer border-b border-white/5 transition-colors last:border-0 hover:bg-white/[0.03] focus:bg-white/[0.05] focus:outline-none focus-visible:ring-1 focus-visible:ring-cyan-400/50"
                  >
                    <td className="px-4 py-3 text-white">
                      <span className="flex items-center gap-2">
                        <span className="truncate">{h.name}</span>
                        {h.is_official && <OfficialBadge />}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-gray-300">
                      {num(h.members_count)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-gray-300">
                      {num(h.recipes_count)}
                    </td>
                    <td className="hidden px-4 py-3 text-right tabular-nums text-gray-300 lg:table-cell">
                      {num(h.planned_meals_count)}
                    </td>
                    <td className="hidden px-4 py-3 text-right tabular-nums text-gray-300 xl:table-cell">
                      {num(h.friendships_count)}
                    </td>
                    <td className="hidden whitespace-nowrap px-4 py-3 text-gray-400 lg:table-cell">
                      {shortDate(h.created_at)}
                    </td>
                    <td
                      className="whitespace-nowrap px-4 py-3 text-gray-300"
                      title={fullDate(h.last_activity_at)}
                    >
                      {relativeDate(h.last_activity_at)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusPill status={h.status} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Cartes (mobile / tablette) */}
      <div className="space-y-3 lg:hidden">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-xl bg-white/5" />
          ))
        ) : items.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-8 text-center text-xs text-gray-500">
            {search || activity !== 'all' || officialOnly
              ? 'Aucun foyer ne correspond à ces critères.'
              : 'Aucun foyer pour l’instant.'}
          </div>
        ) : (
          items.map((h) => <HouseholdCard key={h.id} h={h} onOpen={() => setOpenId(h.id)} />)
        )}
      </div>

      {/* Pagination */}
      {total > 0 && (
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-gray-500 tabular-nums">
            {from}–{to} sur {num(total)}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={!hasPrev || isFetching}
            >
              <ChevronLeft className="mr-1 h-3.5 w-3.5" />
              Précédent
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => p + 1)}
              disabled={!hasNext || isFetching}
            >
              Suivant
              <ChevronRight className="ml-1 h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* Fiche foyer */}
      <HouseholdDetailDialog householdId={openId} onClose={() => setOpenId(null)} />
    </div>
  )
}
