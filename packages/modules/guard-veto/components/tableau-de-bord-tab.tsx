'use client'

import { Building2, Users, LifeBuoy, CalendarRange } from 'lucide-react'
import { HeroStat, HeroStatSkeleton, CockpitPanel, EmptyRow, StatCard } from '@monprojetpro/ui'
import type { CabinetGuardVeto } from '../types'
import { formatJour, libelleEquipe } from '../utils/format'

export interface TableauDeBordTabProps {
  cabinets: CabinetGuardVeto[]
  isLoading: boolean
  comptesLisibles: boolean
  aTraiter: number
}

/**
 * Onglet 1 — l'état de GuardVeto en un coup d'œil.
 *
 * 🔑 CE QUI N'EST PAS SU N'EST PAS CHIFFRÉ. Quand l'API Auth de GuardVeto est
 * illisible, le guichet renvoie `equipe: null`. On affiche alors « — » et on
 * le dit, au lieu d'additionner des absences en un « 0 compte actif » que MiKL
 * croirait.
 */
export function TableauDeBordTab({
  cabinets,
  isLoading,
  comptesLisibles,
  aTraiter,
}: TableauDeBordTabProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <HeroStatSkeleton />
        <HeroStatSkeleton />
        <HeroStatSkeleton />
        <HeroStatSkeleton />
      </div>
    )
  }

  const actifs = cabinets.filter((c) => c.actif && !c.bacASable)
  const comptesActifs = comptesLisibles
    ? cabinets.reduce((n, c) => n + (c.equipe?.comptesActifs ?? 0), 0)
    : null
  const enAttente = comptesLisibles
    ? cabinets.reduce((n, c) => n + (c.equipe?.invitationsEnAttente ?? 0), 0)
    : null
  const gardesEnCours = cabinets.filter((c) => c.periodes.enCours).length
  const generations30j = cabinets.reduce((n, c) => n + c.generations.nb30j, 0)

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <HeroStat
          icon={Building2}
          label="Cabinets clients"
          value={actifs.length}
          sub={`${cabinets.length} au total, bac à sable compris`}
          tone="cyan"
        />
        <HeroStat
          icon={Users}
          label="Comptes actifs"
          value={comptesActifs ?? '—'}
          sub={
            comptesActifs === null
              ? 'Comptes illisibles — API Auth de GuardVeto muette'
              : `${enAttente ?? 0} invitation(s) en attente`
          }
          tone="violet"
        />
        <HeroStat
          icon={CalendarRange}
          label="Gardes en cours"
          value={gardesEnCours}
          sub={`${generations30j} génération(s) sur 30 jours`}
          tone="emerald"
        />
        <HeroStat
          icon={LifeBuoy}
          label="Support à traiter"
          value={aTraiter}
          sub={aTraiter > 0 ? 'Demandes reçues ou en cours' : 'Rien en attente'}
          tone={aTraiter > 0 ? 'amber' : 'cyan'}
        />
      </div>

      <CockpitPanel title="Cabinets" badge={cabinets.length}>
        {cabinets.length === 0 ? (
          <EmptyRow icon={Building2}>Aucun cabinet renvoyé par le guichet</EmptyRow>
        ) : (
          <div className="flex flex-col gap-2">
            {cabinets.map((c) => (
              <div
                key={c.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.02] px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-white">
                    {c.nom}
                    {c.bacASable && (
                      <span className="ml-2 rounded-md border border-violet-400/25 px-1.5 py-0.5 text-[0.7rem] text-violet-200">
                        bac à sable
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-gray-500">
                    {libelleEquipe(c.equipe)} · dernière connexion {formatJour(c.derniereConnexion)}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <StatCard
                    label="Garde en cours"
                    value={c.periodes.enCours ? 'Oui' : 'Non'}
                    tone={c.periodes.enCours ? 'emerald' : 'cyan'}
                  />
                  <StatCard label="Support" value={c.support.aTraiter} tone={c.support.aTraiter > 0 ? 'amber' : 'cyan'} />
                  <StatCard label="Générations 30 j" value={c.generations.nb30j} />
                </div>
              </div>
            ))}
          </div>
        )}
      </CockpitPanel>
    </div>
  )
}
