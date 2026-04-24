'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { ClientConfig } from '@monprojetpro/types'
import { LabTeasingCard } from './lab-teasing-card'

interface CoreDashboardProps {
  clientConfig: ClientConfig
  clientName: string
  showTeasing?: boolean
}

function formatDateFR(): string {
  return new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date())
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

const MODULE_META: Record<string, { label: string; icon: string; href: string; desc: string }> = {
  documents: { label: 'Documents', icon: '📁', href: '/modules/documents', desc: 'Fichiers & livrables' },
  facturation: { label: 'Comptabilité', icon: '€', href: '/modules/facturation', desc: 'Devis & factures' },
  visio: { label: 'Visio', icon: '🎥', href: '/modules/visio', desc: 'Rendez-vous vidéo' },
  chat: { label: 'Chat', icon: '💬', href: '/modules/chat', desc: 'Messagerie MiKL' },
  elio: { label: 'Élio', icon: '✨', href: '/modules/elio', desc: 'Votre assistant IA' },
  parcours: { label: 'Parcours', icon: '🎓', href: '/modules/parcours', desc: 'Mon incubation Lab' },
  notifications: { label: 'Notifications', icon: '🔔', href: '/modules/notifications', desc: 'Alertes & rappels' },
  support: { label: 'Support', icon: '🛟', href: '/modules/support', desc: 'Aide & assistance' },
}

/**
 * CoreDashboard — Page d'accueil One (et Lab).
 * Layout Claude Design : header, modules actifs, Élio suggestion, activité récente.
 */
export function CoreDashboard({ clientConfig, clientName, showTeasing = false }: CoreDashboardProps) {
  const router = useRouter()

  if (!clientConfig) return null

  const { activeModules, customBranding } = clientConfig

  const logoUrl = customBranding?.logoUrl
  const greeting = clientName ? `Bonjour ${clientName} !` : 'Bonjour !'
  const dateFR = capitalize(formatDateFR())

  const activeNonCore = activeModules.filter((id) => id !== 'core-dashboard')
  const hasElio = activeModules.includes('elio')

  return (
    <div className="space-y-7 max-w-[1280px]">
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

      {/* Modules actifs */}
      <section aria-label="Vos modules actifs">
        <div className="flex items-baseline justify-between mb-3.5">
          <h2 className="text-[15px] font-semibold text-[#f9fafb]">Vos modules actifs</h2>
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

      {/* Élio suggestion */}
      {hasElio && (
        <section aria-label="Élio — suggestion">
          <div className="bg-[#141414] border border-[#2d2d2d] rounded-xl p-5 flex gap-4 items-start">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#16a34a] to-[#4ade80] flex items-center justify-center text-white font-bold text-[15px] shrink-0">
              E
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[12.5px] text-[#4ade80] font-semibold tracking-[0.02em] mb-2.5">
                Élio — Votre assistant
              </p>
              <div className="bg-[rgba(22,163,74,0.1)] border border-[rgba(22,163,74,0.3)] rounded-xl px-3.5 py-3 text-[13.5px] text-[#e5e7eb] leading-[1.55]">
                Bonjour{clientName ? <> <strong className="text-[#4ade80]">{clientName}</strong></> : ''}&nbsp;! Je suis votre assistant IA. Je peux vous aider à gérer votre activité, rédiger des documents ou répondre à vos questions.
              </div>
              <div className="mt-3.5">
                <Link
                  href="/modules/elio"
                  className="inline-flex items-center gap-2 rounded-xl bg-[#16a34a] hover:bg-[#15b866] text-white text-[13px] font-semibold px-[18px] py-2.5 transition-colors"
                >
                  Parler à Élio
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Activité récente */}
      <section aria-label="Activité récente">
        <h2 className="text-[15px] font-semibold text-[#f9fafb] mb-3.5">Activité récente</h2>
        <div className="bg-[#141414] border border-[#2d2d2d] rounded-xl p-5">
          <ActivityFeed activeModules={activeModules} />
        </div>
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
        <span className="text-[11px] text-[#6b7280]">Bientôt disponible</span>
      </div>
    )
  }

  return (
    <Link href={meta.href} className="block group" aria-label={`Ouvrir le module ${meta.label}`}>
      <div className="h-[140px] rounded-2xl bg-[rgba(22,163,74,0.05)] border border-[#16a34a] flex flex-col items-center justify-center gap-2.5 transition-transform group-hover:-translate-y-0.5 group-focus-visible:ring-2 group-focus-visible:ring-[#4ade80] group-focus-visible:ring-offset-1">
        <span className="text-3xl" aria-hidden="true">{meta.icon}</span>
        <span className="text-[13.5px] font-semibold text-[#4ade80]">{meta.label}</span>
        <span className="text-[11px] text-[#4ade80]">Ouvrir →</span>
      </div>
    </Link>
  )
}

function ActivityFeed({ activeModules }: { activeModules: string[] }) {
  // Raccourcis vers les modules actifs (les vraies données d'activité seront ajoutées via TanStack Query)
  const shortcuts = activeModules
    .filter((id) => id !== 'core-dashboard' && MODULE_META[id])
    .map((id) => MODULE_META[id])

  if (shortcuts.length === 0) {
    return (
      <p className="text-[12.5px] text-[#6b7280]">Activez des modules pour accéder à vos données.</p>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {shortcuts.map((meta) => (
        <Link key={meta.href} href={meta.href} className="flex items-start gap-2.5 group">
          <span className="w-1.5 h-1.5 rounded-full mt-[5px] shrink-0 bg-[#3d3d3d]" aria-hidden="true" />
          <p className="text-[12.5px] leading-[1.5] text-[#9ca3af] group-hover:text-[#f9fafb] transition-colors">
            <span className="font-medium">{meta.label}</span>
            <span className="text-[#6b7280]"> — {meta.desc}</span>
          </p>
        </Link>
      ))}
    </div>
  )
}
