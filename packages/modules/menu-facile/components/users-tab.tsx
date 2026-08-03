'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Users,
  Search,
  RefreshCw,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  MailCheck,
  MailWarning,
  Ban,
  Home,
} from 'lucide-react'
import { Button, Input } from '@monprojetpro/ui'
import { useUsers } from '../hooks/use-users'
import { PAGE_SIZE } from '../utils/query'
import { num, shortDate, fullDate, relativeDate } from '../utils/format'
import { HouseholdDetailDialog } from './household-detail-dialog'
import type { SortOrder, UserListItem, UserSort, UserStatusFilter } from '../types'

const STATUS_FILTERS: { key: UserStatusFilter; label: string }[] = [
  { key: 'all', label: 'Tous' },
  { key: 'active', label: 'Actifs' },
  { key: 'banned', label: 'Bannis' },
]

const COLUMNS: {
  key: string
  label: string
  sort?: UserSort
  align?: 'right'
  hideBelow?: 'lg' | 'xl'
}[] = [
  { key: 'email', label: 'Utilisateur', sort: 'email' },
  { key: 'household', label: 'Foyer' },
  { key: 'recipes_count', label: 'Recettes', sort: 'recipes_count', align: 'right' },
  { key: 'activity_30d', label: 'Activité 30 j', align: 'right', hideBelow: 'xl' },
  { key: 'created_at', label: 'Inscrit le', sort: 'created_at', hideBelow: 'lg' },
  { key: 'last_sign_in_at', label: 'Dernière connexion', sort: 'last_sign_in_at' },
  { key: 'status', label: 'Statut' },
]

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

/** Pastille email vérifié. `null` = le guichet ne le dit pas → rien d'affiché. */
function VerifiedMark({ verified }: { verified: boolean | null | undefined }) {
  if (verified === null || verified === undefined) return null
  return verified ? (
    <span title="Email vérifié">
      <MailCheck className="h-3.5 w-3.5 shrink-0 text-emerald-400/80" />
    </span>
  ) : (
    <span title="Email non vérifié — cet utilisateur ne recevra aucun email">
      <MailWarning className="h-3.5 w-3.5 shrink-0 text-amber-400/90" />
    </span>
  )
}

function StatusPill({ banned }: { banned: boolean }) {
  return banned ? (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-red-400/30 bg-red-400/10 px-2.5 py-1 text-[0.7rem] font-medium text-red-300">
      <Ban className="h-3 w-3" />
      Banni
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-1 text-[0.7rem] font-medium text-emerald-300">
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
      Actif
    </span>
  )
}

/**
 * Activité sur 30 jours. Le guichet renvoie `sign_ins_30d` (aujourd'hui `null` :
 * l'historique des connexions n'est pas conservé) et `active_days_30d`. On
 * affiche celui qui existe, en disant lequel c'est plutôt qu'un chiffre nu.
 */
function Activity30d({ u }: { u: UserListItem }) {
  if (u.sign_ins_30d !== null && u.sign_ins_30d !== undefined) {
    return (
      <span title="Connexions sur les 30 derniers jours">{num(u.sign_ins_30d)} conn.</span>
    )
  }
  if (u.active_days_30d !== null && u.active_days_30d !== undefined) {
    return (
      <span title="Jours distincts avec au moins une action, sur 30 jours">
        {num(u.active_days_30d)} j actifs
      </span>
    )
  }
  return <span title="Donnée non fournie par le guichet">—</span>
}

function UserCard({ u, onOpenHousehold }: { u: UserListItem; onOpenHousehold: () => void }) {
  const name = u.display_name?.trim() || u.email || 'Utilisateur sans nom'
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 truncate font-medium text-white">
            {name}
            <VerifiedMark verified={u.email_verified} />
          </p>
          {u.display_name && u.email && (
            <p className="truncate text-xs text-gray-500">{u.email}</p>
          )}
        </div>
        <StatusPill banned={u.is_banned} />
      </div>

      {u.household_id && (
        <button
          type="button"
          onClick={onOpenHousehold}
          className="mt-2 inline-flex items-center gap-1.5 rounded-md border border-white/10 px-2 py-1 text-xs text-gray-300 transition-colors hover:border-cyan-400/30 hover:text-cyan-200"
        >
          <Home className="h-3 w-3" />
          {u.household_name ?? 'Foyer'}
        </button>
      )}

      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
        <div>
          <dt className="text-gray-500">Recettes</dt>
          <dd className="tabular-nums text-gray-200">{num(u.recipes_count)}</dd>
        </div>
        <div>
          <dt className="text-gray-500">Activité 30 j</dt>
          <dd className="tabular-nums text-gray-200">
            <Activity30d u={u} />
          </dd>
        </div>
        <div>
          <dt className="text-gray-500">Inscrit le</dt>
          <dd className="text-gray-200">{shortDate(u.created_at)}</dd>
        </div>
        <div>
          <dt className="text-gray-500">Dernière connexion</dt>
          <dd className="text-gray-200" title={fullDate(u.last_sign_in_at)}>
            {relativeDate(u.last_sign_in_at)}
          </dd>
        </div>
      </dl>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Onglet Utilisateurs
// ---------------------------------------------------------------------------

export function UsersTab() {
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<UserStatusFilter>('all')
  const [verifiedOnly, setVerifiedOnly] = useState(false)
  const [sort, setSort] = useState<UserSort>('last_sign_in_at')
  const [order, setOrder] = useState<SortOrder>('desc')
  const [page, setPage] = useState(0)
  const [openHouseholdId, setOpenHouseholdId] = useState<string | null>(null)

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 350)
    return () => clearTimeout(t)
  }, [searchInput])

  useEffect(() => {
    setPage(0)
  }, [search, status, verifiedOnly, sort, order])

  const query = useMemo(
    () => ({
      limit: PAGE_SIZE,
      offset: page * PAGE_SIZE,
      search: search || undefined,
      sort,
      order,
      status,
      verified: verifiedOnly ? false : undefined,
    }),
    [page, search, sort, order, status, verifiedOnly],
  )

  const { data, isLoading, isFetching, error, refetch } = useUsers(query)

  const items = data?.items ?? []
  const total = data?.total ?? 0
  const from = total === 0 ? 0 : page * PAGE_SIZE + 1
  const to = Math.min(total, page * PAGE_SIZE + items.length)

  const toggleSort = (col?: UserSort) => {
    if (!col) return
    if (col === sort) {
      setOrder((o) => (o === 'desc' ? 'asc' : 'desc'))
    } else {
      setSort(col)
      setOrder(col === 'email' ? 'asc' : 'desc')
    }
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-400/30 bg-red-400/5 p-8 text-center">
        <p className="text-sm text-red-400">Impossible de charger les utilisateurs</p>
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

  const emptyLabel =
    search || status !== 'all' || verifiedOnly
      ? 'Aucun utilisateur ne correspond à ces critères.'
      : 'Aucun utilisateur pour l’instant.'

  return (
    <div className="space-y-5">
      {/* En-tête */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-cyan-400/25 bg-cyan-400/10 text-cyan-300">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white">Utilisateurs</h2>
            <p className="text-xs text-gray-500">
              {isLoading
                ? 'Chargement…'
                : `${num(total)} utilisateur${total > 1 ? 's' : ''} au total`}
            </p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
          Actualiser
        </Button>
      </div>

      {/* Filtres */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[14rem] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Rechercher un email ou un pseudo…"
            aria-label="Rechercher un utilisateur"
            className="pl-9"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {STATUS_FILTERS.map((f) => (
            <FilterPill key={f.key} active={status === f.key} onClick={() => setStatus(f.key)}>
              {f.label}
            </FilterPill>
          ))}
          <FilterPill active={verifiedOnly} onClick={() => setVerifiedOnly((v) => !v)}>
            Email non vérifié
          </FilterPill>
        </div>
      </div>

      {/* Tableau desktop */}
      <div className="hidden overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02] lg:block">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left text-xs text-gray-400">
                {COLUMNS.map((c) => {
                  const isSorted = c.sort && c.sort === sort
                  const hide =
                    c.hideBelow === 'xl'
                      ? 'hidden xl:table-cell'
                      : c.hideBelow === 'lg'
                        ? 'hidden lg:table-cell'
                        : ''
                  return (
                    <th
                      key={c.key}
                      scope="col"
                      aria-sort={
                        isSorted ? (order === 'asc' ? 'ascending' : 'descending') : undefined
                      }
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
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="border-b border-white/5 last:border-0">
                    <td colSpan={COLUMNS.length} className="px-4 py-3.5">
                      <div className="h-4 animate-pulse rounded bg-white/5" />
                    </td>
                  </tr>
                ))
              ) : items.length === 0 ? (
                <tr>
                  <td
                    colSpan={COLUMNS.length}
                    className="px-4 py-12 text-center text-xs text-gray-500"
                  >
                    {emptyLabel}
                  </td>
                </tr>
              ) : (
                items.map((u) => (
                  <tr
                    key={u.id}
                    className="border-b border-white/5 transition-colors last:border-0 hover:bg-white/[0.03]"
                  >
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1.5">
                        <span className="truncate text-white">
                          {u.display_name?.trim() || u.email || '—'}
                        </span>
                        <VerifiedMark verified={u.email_verified} />
                      </span>
                      {u.display_name && u.email && (
                        <span className="block truncate text-xs text-gray-500">{u.email}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {u.household_id ? (
                        <button
                          type="button"
                          onClick={() => setOpenHouseholdId(u.household_id)}
                          className="inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5 text-gray-300 transition-colors hover:bg-cyan-400/10 hover:text-cyan-200"
                          title="Ouvrir la fiche du foyer"
                        >
                          <Home className="h-3 w-3 shrink-0" />
                          <span className="truncate">{u.household_name ?? 'Foyer'}</span>
                        </button>
                      ) : (
                        <span className="text-gray-600">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-gray-300">
                      {num(u.recipes_count)}
                    </td>
                    <td className="hidden whitespace-nowrap px-4 py-3 text-right tabular-nums text-gray-300 xl:table-cell">
                      <Activity30d u={u} />
                    </td>
                    <td className="hidden whitespace-nowrap px-4 py-3 text-gray-400 lg:table-cell">
                      {shortDate(u.created_at)}
                    </td>
                    <td
                      className="whitespace-nowrap px-4 py-3 text-gray-300"
                      title={fullDate(u.last_sign_in_at)}
                    >
                      {relativeDate(u.last_sign_in_at)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusPill banned={u.is_banned} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Cartes mobile */}
      <div className="space-y-3 lg:hidden">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-36 animate-pulse rounded-xl bg-white/5" />
          ))
        ) : items.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-8 text-center text-xs text-gray-500">
            {emptyLabel}
          </div>
        ) : (
          items.map((u) => (
            <UserCard
              key={u.id}
              u={u}
              onOpenHousehold={() => u.household_id && setOpenHouseholdId(u.household_id)}
            />
          ))
        )}
      </div>

      {/* Pagination */}
      {total > 0 && (
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs tabular-nums text-gray-500">
            {from}–{to} sur {num(total)}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0 || isFetching}
            >
              <ChevronLeft className="mr-1 h-3.5 w-3.5" />
              Précédent
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => p + 1)}
              disabled={to >= total || isFetching}
            >
              Suivant
              <ChevronRight className="ml-1 h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* Fiche du foyer, ouverte depuis la colonne Foyer */}
      <HouseholdDetailDialog
        householdId={openHouseholdId}
        onClose={() => setOpenHouseholdId(null)}
      />
    </div>
  )
}
