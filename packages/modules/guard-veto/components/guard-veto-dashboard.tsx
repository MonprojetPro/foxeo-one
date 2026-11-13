'use client'

import { useState } from 'react'
import { LayoutDashboard, Building2, Users, ShieldCheck, type LucideIcon } from 'lucide-react'
import { CockpitHeader, PillTabs, StatusPill, type PillTab } from '@monprojetpro/ui'
import { useGuardVetoCabinets } from '../hooks/use-guard-veto'
import { TableauDeBordTab } from './tableau-de-bord-tab'
import { CabinetsTab } from './cabinets-tab'
import { UtilisateursTab } from './utilisateurs-tab'
import type { RappelAbonnement } from '../types'

type TabKey = 'tableau-de-bord' | 'cabinets' | 'utilisateurs'

const TABS: { key: TabKey; label: string; icon: LucideIcon }[] = [
  { key: 'tableau-de-bord', label: 'Tableau de bord', icon: LayoutDashboard },
  { key: 'cabinets', label: 'Cabinets', icon: Building2 },
  { key: 'utilisateurs', label: 'Utilisateurs', icon: Users },
]

export interface GuardVetoDashboardProps {
  /**
   * Rappel d'abonnement par cabinet, calculé CÔTÉ HUB et injecté ici.
   *
   * 🔑 Ce module ne le calcule pas lui-même : la formule financière unique vit
   * dans le module `facturation`, et un module ne peut pas en importer un
   * autre. C'est donc la page `apps/hub` qui lit la Comptabilité et passe le
   * résultat. Recopier la formule ici en ferait une seconde vérité — la
   * Comptabilité du Hub a déjà payé ce défaut une fois.
   */
  rappels?: Record<string, RappelAbonnement>
  /** Lien vers l'onglet Comptabilité, fourni par l'app (le module n'invente pas de route). */
  lienComptabilite?: string
}

/**
 * Cockpit GuardVeto — page unique à onglets (T-082).
 *
 * Toute la donnée passe par les Server Actions → guichet `/api/hub/*` de
 * GuardVeto. Le Hub ne touche jamais la base de GuardVeto.
 */
export function GuardVetoDashboard({ rappels, lienComptabilite }: GuardVetoDashboardProps) {
  const [tab, setTab] = useState<TabKey>('tableau-de-bord')
  const [cabinetChoisi, setCabinetChoisi] = useState<string | null>(null)
  const { data, isLoading, error } = useGuardVetoCabinets()

  const etatGuichet = error ? 'error' : isLoading ? 'loading' : 'connected'
  const libelleGuichet = error
    ? 'Guichet injoignable'
    : isLoading
      ? 'Connexion au guichet…'
      : 'Guichet connecté'

  const cabinets = data?.cabinets ?? []
  const aTraiter = cabinets.reduce((n, c) => n + c.support.aTraiter, 0)

  const tabs: PillTab<TabKey>[] = TABS.map((t) => ({
    ...t,
    count: t.key === 'cabinets' ? cabinets.length : undefined,
  }))

  /** Ouvrir les comptes d'un cabinet depuis l'onglet Cabinets. */
  function ouvrirComptes(cabinetId: string) {
    setCabinetChoisi(cabinetId)
    setTab('utilisateurs')
  }

  return (
    <>
      <CockpitHeader
        icon={ShieldCheck}
        title="GuardVeto"
        subtitle="Cockpit d'administration du produit — piloté via son guichet sécurisé"
        tone="cyan"
        status={<StatusPill state={etatGuichet} label={libelleGuichet} />}
      />

      <PillTabs tabs={tabs} active={tab} onChange={setTab} tone="cyan" />

      {/* Une panne du guichet se DIT, sur chaque onglet. Un cockpit vide sans
          explication fait chercher un bug dans GuardVeto alors que c'est le
          branchement qui manque — typiquement le secret pas encore posé. */}
      {error && (
        <div className="rounded-2xl border border-red-400/25 bg-red-500/[0.06] px-5 py-4">
          <p className="text-sm font-medium text-red-200">Le guichet GuardVeto ne répond pas</p>
          <p className="mt-1 text-xs text-red-200/70">{error.message}</p>
        </div>
      )}

      {tab === 'tableau-de-bord' && (
        <TableauDeBordTab
          cabinets={cabinets}
          isLoading={isLoading}
          comptesLisibles={data?.comptesLisibles ?? false}
          aTraiter={aTraiter}
        />
      )}

      {tab === 'cabinets' && (
        <CabinetsTab
          cabinets={cabinets}
          isLoading={isLoading}
          rappels={rappels}
          lienComptabilite={lienComptabilite}
          onVoirComptes={ouvrirComptes}
        />
      )}

      {tab === 'utilisateurs' && (
        <UtilisateursTab
          cabinets={cabinets}
          cabinetChoisi={cabinetChoisi}
          onChoisirCabinet={setCabinetChoisi}
        />
      )}
    </>
  )
}
