'use client'

import { useMemo, useState } from 'react'
import {
  ArrowDownToLine,
  Check,
  Loader2,
  Undo2,
  XCircle,
  RotateCcw,
  Users,
  AlertTriangle,
  Info,
} from 'lucide-react'
import { Button, toast, useConfirmDialog } from '@monprojetpro/ui'
import { useAisleCorrections, useAisleCorrectionActions } from '../hooks/use-aisle-corrections'
import type { MenuFacileAisleCorrection } from '../types'
import { fullDate, relativeDate } from '../utils/format'

/**
 * F-049 — RANGEMENT DES ALIMENTS
 *
 * Ce que cet écran sert à faire, et pourquoi il existe : dans MenuFacile, chaque
 * ingrédient de la liste de courses tombe dans un rayon déduit d'un référentiel.
 * Quand il se trompe, l'utilisateur pouvait seulement nous le signaler et
 * attendre. Il peut maintenant le ranger lui-même — et c'est ici que la
 * correction arrive, pour qu'on la valide pour tout le monde si elle est juste.
 *
 * Valider écrit dans le référentiel partagé, en base : l'effet est immédiat pour
 * tous les foyers, sans déploiement.
 *
 * Les corrections NON validées ne sont pas des problèmes en attente : chaque
 * foyer a déjà son rangement correct. C'est une file de propositions, pas une
 * file d'incidents — d'où l'absence de compteur d'alerte sur l'onglet.
 */

type Filter = 'todo' | 'validated' | 'dismissed' | 'all'

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'todo', label: 'À arbitrer' },
  { key: 'validated', label: 'Validées' },
  { key: 'dismissed', label: 'Écartées' },
  { key: 'all', label: 'Toutes' },
]

/** Validée : le rayon choisi par ce foyer est celui qui fait référence pour tous. */
function isValidated(c: MenuFacileAisleCorrection): boolean {
  return c.global_aisle === c.aisle
}

/** Écartée : l'équipe a dit non. La liste du foyer, elle, n'a pas bougé. */
function isDismissed(c: MenuFacileAisleCorrection): boolean {
  return c.dismissed_at != null && !isValidated(c)
}

/**
 * À arbitrer : ni validée, ni écartée. Les trois états sont exclusifs, et c'est
 * ce qui permet aux compteurs de s'additionner jusqu'au total — sans ça, une
 * ligne écartée resterait comptée « à arbitrer » et la file ne se viderait
 * jamais, qui est précisément le défaut que F-049a corrige.
 */
function isPending(c: MenuFacileAisleCorrection): boolean {
  return !isValidated(c) && !isDismissed(c)
}

export function AislesTab() {
  const { data, isLoading, error } = useAisleCorrections()
  const { promote, revoke, dismiss, restore } = useAisleCorrectionActions()
  const { confirm, ConfirmDialog } = useConfirmDialog()
  const [filter, setFilter] = useState<Filter>('todo')
  const [busyKey, setBusyKey] = useState<string | null>(null)

  // `data ?? []` créerait un tableau neuf à chaque rendu : les deux useMemo
  // ci-dessous se recalculeraient toujours, ce qui vide le mémo de son intérêt.
  const corrections = useMemo(() => data ?? [], [data])

  const counts = useMemo(
    () => ({
      todo: corrections.filter(isPending).length,
      validated: corrections.filter(isValidated).length,
      dismissed: corrections.filter(isDismissed).length,
      all: corrections.length,
    }),
    [corrections],
  )

  const visible = useMemo(() => {
    if (filter === 'todo') return corrections.filter(isPending)
    if (filter === 'validated') return corrections.filter(isValidated)
    if (filter === 'dismissed') return corrections.filter(isDismissed)
    return corrections
  }, [corrections, filter])

  async function handlePromote(c: MenuFacileAisleCorrection) {
    const ok = await confirm({
      title: `Ranger « ${c.ingredient_label} » en ${c.aisle} pour tous ?`,
      description:
        'Tous les foyers qui n’ont pas choisi eux-mêmes verront ce rangement, immédiatement. Les foyers qui ont fait leur propre choix gardent le leur.',
      confirmLabel: 'Valider pour tous',
    })
    if (!ok) return
    setBusyKey(c.ingredient_key)
    try {
      await promote.mutateAsync({
        ingredientKey: c.ingredient_key,
        ingredientLabel: c.ingredient_label,
        aisle: c.aisle,
        householdId: c.household_id,
      })
      toast.success(`« ${c.ingredient_label} » est rangé en ${c.aisle} pour tous.`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'La validation a échoué.')
    } finally {
      setBusyKey(null)
    }
  }

  /**
   * F-049a — écarter. Le libellé du dialogue insiste sur ce que l'action NE
   * fait PAS : sans cette phrase, « écarter » se lit naturellement comme
   * « annuler », et on hésiterait à cliquer de peur de défaire le rangement
   * d'un utilisateur.
   */
  async function handleDismiss(c: MenuFacileAisleCorrection) {
    const ok = await confirm({
      title: `Écarter « ${c.ingredient_label} » en ${c.aisle} ?`,
      description:
        'La proposition quitte la file d’arbitrage. ' +
        `${c.household_name} garde ce rangement dans sa propre liste de courses : rien ne change pour ce foyer. ` +
        'Si le foyer choisit plus tard un autre rayon, la nouvelle proposition reviendra d’elle-même.',
      confirmLabel: 'Écarter',
    })
    if (!ok) return
    setBusyKey(c.ingredient_key)
    try {
      await dismiss.mutateAsync({ householdId: c.household_id, ingredientKey: c.ingredient_key })
      toast.success('Proposition écartée. La liste du foyer n’a pas changé.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'La mise à l’écart a échoué.')
    } finally {
      setBusyKey(null)
    }
  }

  async function handleRestore(c: MenuFacileAisleCorrection) {
    setBusyKey(c.ingredient_key)
    try {
      await restore.mutateAsync({ householdId: c.household_id, ingredientKey: c.ingredient_key })
      toast.success('Proposition remise à l’étude.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'La remise à l’étude a échoué.')
    } finally {
      setBusyKey(null)
    }
  }

  async function handleRevoke(c: MenuFacileAisleCorrection) {
    const ok = await confirm({
      title: `Retirer la validation de « ${c.ingredient_label} » ?`,
      description:
        'Le référentiel d’origine reprend la main pour les foyers qui n’ont rien choisi. Les corrections locales des foyers ne sont pas touchées.',
      confirmLabel: 'Retirer',
    })
    if (!ok) return
    setBusyKey(c.ingredient_key)
    try {
      await revoke.mutateAsync({ ingredientKey: c.ingredient_key })
      toast.success('Validation retirée.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Le retrait a échoué.')
    } finally {
      setBusyKey(null)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 p-6 text-sm text-gray-400">
        <Loader2 className="h-4 w-4 animate-spin" />
        Chargement des corrections…
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-start gap-3 rounded-2xl border border-amber-400/30 bg-amber-400/[0.06] p-5 text-sm text-amber-200">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <div>
          <div className="font-medium">Les corrections n’ont pas pu être chargées.</div>
          <div className="mt-1 text-amber-200/70">
            {error instanceof Error ? error.message : 'Erreur inconnue.'}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <ConfirmDialog />

      <div className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.02] p-5">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-sky-300" />
        <div className="text-sm text-gray-300">
          <div className="font-medium text-gray-200">Rangement des aliments</div>
          <p className="mt-1 text-gray-400">
            Quand un utilisateur remet un aliment dans le bon rayon, sa correction arrive ici. Elle
            vaut déjà pour son foyer : rien n’est cassé en attendant. La valider l’applique à tous
            les foyers qui n’ont pas fait leur propre choix.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition ${
              filter === f.key
                ? 'border-emerald-400/40 bg-emerald-400/15 text-emerald-200'
                : 'border-white/10 bg-white/[0.02] text-gray-400 hover:text-gray-200'
            }`}
          >
            {f.label}
            <span className="ml-1.5 tabular-nums text-gray-500">{counts[f.key]}</span>
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-8 text-center text-sm text-gray-400">
          {filter === 'todo'
            ? 'Aucune correction en attente d’arbitrage.'
            : filter === 'dismissed'
              ? 'Aucune proposition écartée.'
              : 'Rien à afficher ici.'}
        </div>
      ) : (
        <div className="space-y-2">
          {visible.map((c) => {
            const pending = isPending(c)
            const dismissed = isDismissed(c)
            const busy = busyKey === c.ingredient_key
            return (
              <div
                key={`${c.household_id}-${c.ingredient_key}`}
                className="rounded-xl border border-white/10 bg-white/[0.02] p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-gray-100">{c.ingredient_label}</span>
                      <span className="text-gray-500">→</span>
                      <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-0.5 text-xs font-medium text-emerald-200">
                        {c.aisle}
                      </span>
                      {isValidated(c) && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-sky-400/30 bg-sky-400/10 px-2.5 py-0.5 text-xs font-medium text-sky-200">
                          <Check className="h-3 w-3" />
                          validé pour tous
                        </span>
                      )}
                      {dismissed && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/[0.04] px-2.5 py-0.5 text-xs font-medium text-gray-400">
                          <XCircle className="h-3 w-3" />
                          écartée — le foyer garde son rangement
                        </span>
                      )}
                      {/*
                        Cas à ne pas confondre avec « pas encore arbitré » : un
                        rangement global EXISTE mais diffère de ce que ce foyer a
                        choisi. C'est un désaccord, pas une attente — et ça se voit.
                      */}
                      {pending && c.global_aisle && (
                        <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-2.5 py-0.5 text-xs font-medium text-amber-200">
                          validé ailleurs en {c.global_aisle}
                        </span>
                      )}
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
                      <span>{c.household_name}</span>
                      <span title={fullDate(c.updated_at)}>{relativeDate(c.updated_at)}</span>
                      {c.same_choice_count > 1 && (
                        <span className="inline-flex items-center gap-1 text-gray-400">
                          <Users className="h-3 w-3" />
                          {c.same_choice_count} foyers du même avis
                        </span>
                      )}
                    </div>
                  </div>

                  {/*
                    Trois états, trois jeux d'actions. « Valider » reste en
                    premier et en plein : c'est l'issue attendue d'une
                    proposition juste. « Écarter » est en retrait — un refus ne
                    doit pas se cliquer aussi vite qu'un accord.
                  */}
                  <div className="flex shrink-0 gap-2">
                    {pending && (
                      <>
                        <Button size="sm" onClick={() => handlePromote(c)} disabled={busy}>
                          {busy ? (
                            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <ArrowDownToLine className="mr-1.5 h-3.5 w-3.5" />
                          )}
                          Valider pour tous
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDismiss(c)}
                          disabled={busy}
                          className="text-gray-400 hover:text-gray-200"
                        >
                          <XCircle className="mr-1.5 h-3.5 w-3.5" />
                          Écarter
                        </Button>
                      </>
                    )}

                    {dismissed && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRestore(c)}
                        disabled={busy}
                      >
                        {busy ? (
                          <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                        )}
                        Remettre à l’étude
                      </Button>
                    )}

                    {isValidated(c) && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRevoke(c)}
                        disabled={busy}
                      >
                        {busy ? (
                          <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Undo2 className="mr-1.5 h-3.5 w-3.5" />
                        )}
                        Retirer
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
