'use client'

import { useRouter } from 'next/navigation'
import type { ReactNode } from 'react'
import type { ClientConfig } from '@monprojetpro/types'
import { LabTeasingCard } from './lab-teasing-card'

interface CoreDashboardProps {
  clientConfig: ClientConfig
  clientName: string
  showTeasing?: boolean
  /**
   * Slot d'en-tête (corps de l'accueil). L'app y place le bandeau Élio One et le cockpit
   * d'activités. Garde le module agnostique de ces briques (qui vivent au niveau app pour
   * pouvoir croiser plusieurs modules — règle d'archi).
   */
  headerSlot?: ReactNode
}

function formatDateFR(): string {
  return new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date())
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

/**
 * CoreDashboard — Accueil One : en-tête (greeting) + slot app (bandeau Élio One + cockpit).
 *
 * Vision One v2 (refonte 2026-06-25) : la console de pilotage, resserrée.
 * - L'ancien empilement de blocs redondants (2e message construction, bloc Élio coquille
 *   vide, activité statique) avait déjà été retiré.
 * - La grille « Accès rapide » (cartes de modules) est SUPPRIMÉE : la sidebar gauche assure
 *   déjà la navigation entre modules — la dupliquer en cartes n'apportait rien.
 *
 * Il ne reste donc que : greeting → `headerSlot` (bandeau Élio One + cockpit) → teasing Lab.
 */
export function CoreDashboard({ clientConfig, clientName, showTeasing = false, headerSlot }: CoreDashboardProps) {
  const router = useRouter()

  if (!clientConfig) return null

  const { customBranding } = clientConfig

  const logoUrl = customBranding?.logoUrl
  const greeting = clientName ? `Bonjour ${clientName} !` : 'Bonjour !'
  const dateFR = capitalize(formatDateFR())

  return (
    <div className="space-y-7">
      {/* Header */}
      <div className="flex items-end justify-between gap-5">
        <div>
          <h1 className="text-[24px] font-bold text-[#f9fafb] tracking-[-0.02em]">{greeting}</h1>
          <p className="text-[13px] text-[#9ca3af] mt-1.5" suppressHydrationWarning>{dateFR}</p>
        </div>
        {logoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt="Logo" className="h-9 w-auto object-contain" />
        )}
      </div>

      {/* Slot app — bandeau Élio One + cockpit d'activités réelles */}
      {headerSlot}

      {/* Teasing Lab — nouveau parcours */}
      <LabTeasingCard
        show={showTeasing}
        onCTAClick={() =>
          router.push(
            '/modules/chat?message=' +
              encodeURIComponent('Je souhaite lancer un nouveau parcours Lab')
          )
        }
      />
    </div>
  )
}
