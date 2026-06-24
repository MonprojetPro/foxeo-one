'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { ClientConfig } from '@monprojetpro/types'
import { LabTeasingCard } from './lab-teasing-card'

interface CoreDashboardProps {
  clientConfig: ClientConfig
  clientName: string
  showTeasing?: boolean
  /**
   * Vision v2 — cycle de vie visuel du One. `true` tant que l'outil sur-mesure
   * n'est pas livré (one_status = 'construction') : l'accueil affiche un hero
   * "cockpits à venir". Purement visuel — le socle reste pleinement accessible.
   */
  oneInConstruction?: boolean
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
export function CoreDashboard({ clientConfig, clientName, showTeasing = false, oneInConstruction = false }: CoreDashboardProps) {
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

      {/* Hero "en chantier" — visible tant que l'outil sur-mesure n'est pas livré (vision v2).
          Purement visuel : tout le socle ci-dessous reste accessible. */}
      {oneInConstruction && <ConstructionHero clientName={clientName} />}

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
          <h2 className="text-[15px] font-semibold text-[#f9fafb]">
            {oneInConstruction ? 'Ton espace, déjà prêt' : 'Vos modules actifs'}
          </h2>
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
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-[15px] shrink-0"
              style={{ background: 'linear-gradient(135deg, var(--brand-accent, #16a34a), color-mix(in srgb, var(--brand-accent, #16a34a) 60%, white))' }}
            >
              E
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[12.5px] font-semibold tracking-[0.02em] mb-2.5" style={{ color: 'color-mix(in srgb, var(--brand-accent, #4ade80) 80%, white)' }}>
                Élio — Votre assistant
              </p>
              <div className="rounded-xl px-3.5 py-3 text-[13.5px] text-[#e5e7eb] leading-[1.55]" style={{ background: 'color-mix(in srgb, var(--brand-accent, #16a34a) 10%, transparent)', border: '1px solid color-mix(in srgb, var(--brand-accent, #16a34a) 30%, transparent)' }}>
                Bonjour{clientName ? <> <strong style={{ color: 'color-mix(in srgb, var(--brand-accent, #4ade80) 80%, white)' }}>{clientName}</strong></> : ''}&nbsp;! Je suis votre assistant IA. Je peux vous aider à gérer votre activité, rédiger des documents ou répondre à vos questions.
              </div>
              <div className="mt-3.5">
                <Link
                  href="/modules/elio"
                  className="inline-flex items-center gap-2 rounded-xl text-white text-[13px] font-semibold px-[18px] py-2.5 transition-opacity hover:opacity-90"
                  style={{ backgroundColor: 'var(--brand-accent, #16a34a)' }}
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

/**
 * ConstructionHero — hero d'accueil "outil en chantier" (vision v2).
 * Thème One vert via var(--brand-accent), glow subtil, lien vers Suivi de l'outil.
 * Les "cockpits sur-mesure" sont annoncés comme à venir (ils s'allumeront à la livraison).
 */
function ConstructionHero({ clientName }: { clientName: string }) {
  return (
    <section aria-label="Outil en cours de construction">
      <div
        className="relative overflow-hidden rounded-2xl border p-6"
        style={{
          borderColor: 'color-mix(in srgb, var(--brand-accent, #16a34a) 35%, transparent)',
          background:
            'linear-gradient(135deg, color-mix(in srgb, var(--brand-accent, #16a34a) 14%, transparent), color-mix(in srgb, var(--brand-accent, #16a34a) 4%, transparent))',
        }}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-12 -top-20 h-52 w-52 rounded-full blur-3xl"
          style={{ background: 'color-mix(in srgb, var(--brand-accent, #16a34a) 28%, transparent)' }}
        />
        <div className="relative flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div
              className="flex h-11 w-11 items-center justify-center rounded-full text-xl motion-safe:animate-pulse"
              style={{
                background: 'color-mix(in srgb, var(--brand-accent, #16a34a) 18%, transparent)',
                border: '1px solid color-mix(in srgb, var(--brand-accent, #16a34a) 40%, transparent)',
              }}
              aria-hidden="true"
            >
              🚧
            </div>
            <div>
              <p
                className="text-[16px] font-bold tracking-[-0.01em]"
                style={{ color: 'color-mix(in srgb, var(--brand-accent, #4ade80) 85%, white)' }}
              >
                {clientName ? `${clientName}, ton outil arrive` : 'Ton outil arrive'}
              </p>
              <p className="text-[13px] text-[#9ca3af] mt-0.5">
                MiKL développe ton outil sur-mesure. Ses cockpits s&apos;allumeront ici dès la livraison.
              </p>
            </div>
          </div>

          <p className="text-[13px] leading-[1.55] text-[#cbd5d1] max-w-2xl">
            En attendant, tout ton espace est déjà opérationnel : échange avec MiKL, partage tes
            documents, pose tes questions à Élio. Tu peux suivre l&apos;avancement de ton outil à
            tout moment.
          </p>

          <div className="flex flex-wrap gap-2.5">
            <Link
              href="/modules/suivi-outil"
              className="inline-flex items-center gap-2 rounded-xl px-[18px] py-2.5 text-[13px] font-semibold text-white transition-opacity hover:opacity-90"
              style={{ backgroundColor: 'var(--brand-accent, #16a34a)' }}
            >
              Suivre l&apos;avancement
              <span aria-hidden="true">→</span>
            </Link>
            <Link
              href="/modules/chat"
              className="inline-flex items-center gap-2 rounded-xl border px-[18px] py-2.5 text-[13px] font-semibold transition-colors hover:bg-white/5"
              style={{
                borderColor: 'color-mix(in srgb, var(--brand-accent, #16a34a) 40%, transparent)',
                color: 'color-mix(in srgb, var(--brand-accent, #4ade80) 85%, white)',
              }}
            >
              Parler à MiKL
            </Link>
          </div>
        </div>
      </div>
    </section>
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
      <div
        className="h-[140px] rounded-2xl flex flex-col items-center justify-center gap-2.5 transition-transform group-hover:-translate-y-0.5 group-focus-visible:ring-2 group-focus-visible:ring-offset-1"
        style={{
          background: 'color-mix(in srgb, var(--brand-accent, #16a34a) 5%, transparent)',
          border: '1px solid var(--brand-accent, #16a34a)',
          // ring color for focus-visible via CSS variable
        }}
      >
        <span className="text-3xl" aria-hidden="true">{meta.icon}</span>
        <span className="text-[13.5px] font-semibold" style={{ color: 'color-mix(in srgb, var(--brand-accent, #4ade80) 80%, white)' }}>{meta.label}</span>
        <span className="text-[11px]" style={{ color: 'color-mix(in srgb, var(--brand-accent, #4ade80) 80%, white)' }}>Ouvrir →</span>
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
