'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { ReactNode } from 'react'
import type { ClientConfig } from '@monprojetpro/types'
import { LabTeasingCard } from './lab-teasing-card'

interface CoreDashboardProps {
  clientConfig: ClientConfig
  clientName: string
  showTeasing?: boolean
  /**
   * Slot d'en-tête (au-dessus de la grille des modules). L'app y place le bandeau Élio
   * Concierge One et le cockpit d'activités. Garde le module agnostique de ces briques
   * (qui vivent au niveau app pour pouvoir croiser plusieurs modules — règle d'archi).
   */
  headerSlot?: ReactNode
}

function formatDateFR(): string {
  return new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date())
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

const MODULE_META: Record<string, { label: string; icon: string; href: string; desc: string }> = {
  documents: { label: 'Documents', icon: '📁', href: '/modules/documents', desc: 'Fichiers & livrables' },
  visio: { label: 'Visio', icon: '🎥', href: '/modules/visio', desc: 'Rendez-vous vidéo' },
  chat: { label: 'Chat', icon: '💬', href: '/modules/chat', desc: 'Messagerie MiKL' },
  elio: { label: 'Élio', icon: '✨', href: '/modules/elio', desc: 'Votre assistant IA' },
  'suivi-outil': { label: 'Suivi de l’outil', icon: '📣', href: '/modules/suivi-outil', desc: 'Où en est ton outil' },
  support: { label: 'Support', icon: '🛟', href: '/modules/support', desc: 'Aide & assistance' },
  notifications: { label: 'Notifications', icon: '🔔', href: '/modules/notifications', desc: 'Alertes & rappels' },
}

/**
 * CoreDashboard — Accueil One : en-tête (greeting) + slot app (bandeau Concierge + cockpit)
 * + grille des modules du socle.
 *
 * Vision One v2 (2026-06-24) : la console de pilotage. L'ancien empilement de blocs
 * redondants (2e message construction, bloc Élio coquille vide, activité statique) a été
 * retiré — les vraies briques (Concierge Realtime + cockpit d'activités réelles) sont
 * injectées par l'app via `headerSlot`.
 */
export function CoreDashboard({ clientConfig, clientName, showTeasing = false, headerSlot }: CoreDashboardProps) {
  const router = useRouter()

  if (!clientConfig) return null

  const { activeModules, customBranding } = clientConfig

  const logoUrl = customBranding?.logoUrl
  const greeting = clientName ? `Bonjour ${clientName} !` : 'Bonjour !'
  const dateFR = capitalize(formatDateFR())

  const activeNonCore = activeModules.filter((id) => id !== 'core-dashboard')

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

      {/* Slot app — bandeau Élio Concierge One + cockpit d'activités réelles */}
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

      {/* Accès aux modules du socle */}
      <section aria-label="Accès à tes modules">
        <div className="flex items-baseline justify-between mb-3.5">
          <h2 className="text-[15px] font-semibold text-[#f9fafb]">Accès rapide</h2>
          <Link href="/modules" className="text-[12px] text-[#9ca3af] hover:text-[#f9fafb] transition-colors">
            Gérer les modules →
          </Link>
        </div>
        {activeNonCore.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3.5">
            {activeNonCore.map((moduleId) => (
              <ModuleCard key={moduleId} moduleId={moduleId} />
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-[#374151] bg-[#111] p-8 text-center opacity-70">
            <p className="text-[13px] text-[#6b7280]">
              Aucun module activé. Contactez MiKL pour configurer votre espace.
            </p>
          </div>
        )}
      </section>
    </div>
  )
}

function ModuleCard({ moduleId }: { moduleId: string }) {
  const meta = MODULE_META[moduleId]
  if (!meta) {
    if (process.env.NODE_ENV === 'development') {
      console.warn(`[CoreDashboard] Module "${moduleId}" inconnu dans MODULE_META — ajouter une entrée.`)
    }
    return (
      <div className="h-[140px] rounded-2xl border border-dashed border-[#374151] bg-[#111] flex flex-col items-center justify-center gap-2.5 opacity-50">
        <span className="text-3xl" aria-hidden="true">⬜</span>
        <span className="text-[13.5px] text-[#6b7280]">{moduleId}</span>
      </div>
    )
  }

  return (
    <Link href={meta.href} className="block group" aria-label={`Ouvrir le module ${meta.label}`}>
      <div
        className="h-[140px] rounded-2xl flex flex-col items-center justify-center gap-2.5 px-3 text-center transition-transform group-hover:-translate-y-0.5 group-focus-visible:ring-2 group-focus-visible:ring-offset-1"
        style={{
          background: 'color-mix(in srgb, var(--brand-accent, #16a34a) 6%, transparent)',
          border: '1px solid color-mix(in srgb, var(--brand-accent, #16a34a) 45%, transparent)',
        }}
      >
        <span className="text-3xl" aria-hidden="true">{meta.icon}</span>
        <span className="text-[13.5px] font-semibold" style={{ color: 'color-mix(in srgb, var(--brand-accent, #4ade80) 80%, white)' }}>{meta.label}</span>
        <span className="text-[11px] text-[#9ca3af]">{meta.desc}</span>
      </div>
    </Link>
  )
}
