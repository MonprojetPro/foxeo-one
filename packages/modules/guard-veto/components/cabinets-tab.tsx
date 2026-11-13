'use client'

import { Building2, ExternalLink, Users, Wallet } from 'lucide-react'
import { CockpitPanel, EmptyRow, RowSkeleton } from '@monprojetpro/ui'
import type { CabinetGuardVeto, RappelAbonnement } from '../types'
import { formatEuros, formatJour, libelleEquipe, libellePeriode } from '../utils/format'

export interface CabinetsTabProps {
  cabinets: CabinetGuardVeto[]
  isLoading: boolean
  rappels?: Record<string, RappelAbonnement>
  lienComptabilite?: string
  onVoirComptes: (cabinetId: string) => void
}

/**
 * Onglet 2 — un cabinet par carte, avec son rappel d'abonnement EN LECTURE
 * SEULE et un raccourci vers la Comptabilité (demande de MiKL du 11/11 :
 * « un rappel spécifique à GuardVeto ici en lecture seule avec possibilité
 * d'aller voir avec un raccourci dans l'onglet Comptabilité »).
 *
 * 🔑 RIEN NE S'ÉDITE ICI. La facturation se pilote dans la Comptabilité, à un
 * seul endroit. Deux écrans qui modifient la même chose finissent par ne plus
 * dire la même chose — et sur de l'argent, ça ne se rattrape pas.
 */
export function CabinetsTab({
  cabinets,
  isLoading,
  rappels,
  lienComptabilite,
  onVoirComptes,
}: CabinetsTabProps) {
  if (isLoading) {
    return (
      <div className="flex flex-col gap-3">
        <RowSkeleton />
        <RowSkeleton />
        <RowSkeleton />
      </div>
    )
  }

  if (cabinets.length === 0) {
    return <EmptyRow icon={Building2}>Aucun cabinet renvoyé par le guichet</EmptyRow>
  }

  return (
    <div className="flex flex-col gap-4">
      {cabinets.map((c) => {
        const rappel = rappels?.[c.id]
        return (
          <CockpitPanel key={c.id} title={c.nom}>
            <div className="grid gap-4 lg:grid-cols-2">
              {/* ── Le cabinet ────────────────────────────────────────── */}
              <div className="flex flex-col gap-1.5 text-sm">
                <p className="text-gray-400">
                  {c.ville ?? 'Ville non renseignée'}
                  {c.bacASable && ' · bac à sable'}
                  {!c.actif && ' · désactivé'}
                </p>
                <p className="text-gray-400">{libelleEquipe(c.equipe)}</p>
                <p className="text-gray-400">
                  Garde en cours : <span className="text-white">{libellePeriode(c.periodes.enCours)}</span>
                </p>
                <p className="text-gray-400">
                  Prochaine : <span className="text-white">{libellePeriode(c.periodes.prochaine)}</span>
                </p>
                <p className="text-gray-400">
                  Dernière connexion : <span className="text-white">{formatJour(c.derniereConnexion)}</span>
                </p>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => onVoirComptes(c.id)}
                    className="inline-flex items-center gap-1.5 rounded-md border border-white/15 px-3 py-1.5 text-xs text-gray-200 hover:bg-white/10"
                  >
                    <Users className="h-3.5 w-3.5" />
                    Voir les comptes
                  </button>
                </div>
              </div>

              {/* ── Le rappel d'abonnement ────────────────────────────── */}
              <div className="rounded-lg border border-white/10 bg-white/[0.02] p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-gray-400">
                    <Wallet className="h-3.5 w-3.5" />
                    Abonnement
                  </p>
                  {lienComptabilite && (
                    <a
                      href={lienComptabilite}
                      className="inline-flex items-center gap-1 text-xs text-cyan-300 hover:underline"
                    >
                      Comptabilité
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>

                {!rappel ? (
                  /* Pas de rattachement = on le DIT. Un encart vide laisserait
                     croire à un client sans facture, alors que c'est le lien
                     cabinet ↔ client du Hub qui n'a pas été fait. */
                  <p className="mt-3 text-sm text-gray-500">
                    Ce cabinet n&apos;est rattaché à aucun client du Hub — rien à afficher.
                  </p>
                ) : (
                  <div className="mt-3 flex flex-col gap-1.5 text-sm">
                    <p className="text-gray-400">
                      Client : <span className="text-white">{rappel.clientNom ?? '—'}</span>
                    </p>
                    <p className="text-gray-400">
                      Offre : <span className="text-white">{rappel.offre ?? '—'}</span>
                    </p>
                    <p className="text-gray-400">
                      En attente de paiement :{' '}
                      <span className={rappel.montantEnAttenteCents > 0 ? 'text-amber-300' : 'text-white'}>
                        {formatEuros(rappel.montantEnAttenteCents)}
                      </span>
                      {rappel.facturesEnAttente > 0 && (
                        <span className="text-gray-500"> · {rappel.facturesEnAttente} facture(s)</span>
                      )}
                    </p>
                    <p className="text-gray-400">
                      Dernière facture : <span className="text-white">{formatJour(rappel.derniereFactureLe)}</span>
                    </p>
                    {rappel.sansAbonnement && (
                      <p className="pt-1 text-xs text-gray-500">
                        Aucun abonnement récurrent enregistré pour ce client.
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </CockpitPanel>
        )
      })}
    </div>
  )
}
