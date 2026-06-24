import Link from 'next/link'

/**
 * OneConstructionBanner — bandeau "outil en chantier" du dashboard One.
 *
 * Vision v2 (cycle « en chantier → livré ») : tant que `one_status = 'construction'`,
 * le One affiche ce bandeau premium en tête du shell. Les onglets du socle restent
 * IDENTIQUES — c'est purement visuel, aucune restriction d'accès.
 *
 * Server Component pur (aucun état interne) : esthétique « Minimal Futuriste », thème
 * One vert via var(--brand-accent), dark mode, glow subtil. Renvoie vers Suivi de l'outil
 * pour que le client suive l'avancement de son développement.
 */
export function OneConstructionBanner() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="relative overflow-hidden rounded-xl border px-5 py-4 mb-6"
      style={{
        borderColor: 'color-mix(in srgb, var(--brand-accent, #16a34a) 35%, transparent)',
        background:
          'linear-gradient(120deg, color-mix(in srgb, var(--brand-accent, #16a34a) 12%, transparent), color-mix(in srgb, var(--brand-accent, #16a34a) 4%, transparent))',
      }}
    >
      {/* Glow subtil en arrière-plan (décoratif) */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-10 -top-16 h-40 w-40 rounded-full blur-3xl"
        style={{ background: 'color-mix(in srgb, var(--brand-accent, #16a34a) 30%, transparent)' }}
      />

      <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3.5 min-w-0">
          {/* Pastille animée — pulse doux, respecte prefers-reduced-motion via Tailwind */}
          <div
            className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg motion-safe:animate-pulse"
            style={{
              background: 'color-mix(in srgb, var(--brand-accent, #16a34a) 18%, transparent)',
              border: '1px solid color-mix(in srgb, var(--brand-accent, #16a34a) 40%, transparent)',
            }}
            aria-hidden="true"
          >
            🚧
          </div>
          <div className="min-w-0">
            <p
              className="text-sm font-semibold tracking-[0.01em]"
              style={{ color: 'color-mix(in srgb, var(--brand-accent, #4ade80) 85%, white)' }}
            >
              Ton outil est en cours de construction
            </p>
            <p className="mt-1 text-[13px] leading-[1.5] text-[#9ca3af]">
              MiKL développe ton outil sur-mesure. Tout ton espace est déjà là — suis
              l&apos;avancement dans Suivi de l&apos;outil.
            </p>
          </div>
        </div>

        <Link
          href="/modules/suivi-outil"
          className="inline-flex shrink-0 items-center gap-2 self-start rounded-xl px-4 py-2.5 text-[13px] font-semibold text-white transition-opacity hover:opacity-90 sm:self-center"
          style={{ backgroundColor: 'var(--brand-accent, #16a34a)' }}
        >
          Voir l&apos;avancement
          <span aria-hidden="true">→</span>
        </Link>
      </div>
    </div>
  )
}
