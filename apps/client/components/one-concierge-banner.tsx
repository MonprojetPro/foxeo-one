'use client'

import { Sparkles } from 'lucide-react'
import type { ConciergeWord } from '@monprojetpro/module-elio'
import { useOneConciergeWord, useOneConciergeRealtime } from './use-one-concierge'

interface OneConciergeBannerProps {
  clientId: string
  clientFirstName?: string | null
  /** Mot d'Élio fetché en SSR (hydratation → pas de flash). Peut être null. */
  initialWord: ConciergeWord | null
  /** Ouvre le chat Élio One. Fourni par l'orchestrateur app (Dialog au niveau page). */
  onAskConcierge: () => void
}

/**
 * Bandeau « Élio One » — l'assistant One, en tête de l'accueil.
 *
 * Personnalisé pour le One (vision v2) : avatar Élio One (`/elio/elio-one.png`), titre
 * « Élio One », sous-titre « Ton assistant One ». Réplique la structure du bandeau Lab
 * (`ElioParcoursPanel`) — identité + contexte à gauche, avatar + bouton « Pose-moi une
 * question » à droite — mais habillé du thème One vert (`var(--brand-accent, #16a34a)` / `#4ade80`).
 *
 * Le « dernier mot d'Élio » est consommé via TanStack (hydraté SSR) + Realtime
 * (canal `one:{clientId}`). Jamais de bandeau vide : un message d'accueil par défaut prend le
 * relais quand aucun mot proactif n'existe encore.
 */
export function OneConciergeBanner({
  clientId,
  clientFirstName,
  initialWord,
  onAskConcierge,
}: OneConciergeBannerProps) {
  // Realtime : invalide la query du mot dès qu'Élio en publie un nouveau.
  useOneConciergeRealtime(clientId)
  const { data: word } = useOneConciergeWord(clientId, initialWord)

  const greeting = `Bonjour${clientFirstName ? `, ${clientFirstName}` : ''} ! 👋`

  // Fallback élégant : message d'accueil par défaut quand aucun mot proactif n'existe.
  const message =
    word?.body?.trim() ||
    'Bienvenue dans ton espace One : ta console de pilotage et ton lien direct avec MiKL. ' +
      'Je suis là pour t’aider à t’y retrouver — pose-moi une question quand tu veux.'

  return (
    <section aria-label="Élio One — ton assistant">
      <div
        className="relative overflow-hidden rounded-2xl border p-5"
        style={{
          borderColor: 'color-mix(in srgb, var(--brand-accent, #16a34a) 30%, transparent)',
          background:
            'linear-gradient(135deg, color-mix(in srgb, var(--brand-accent, #16a34a) 10%, #141414), #141414)',
        }}
      >
        {/* Glow subtil */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full blur-3xl"
          style={{ background: 'color-mix(in srgb, var(--brand-accent, #16a34a) 22%, transparent)' }}
        />

        <div className="relative flex items-start justify-between gap-4">
          {/* GAUCHE — identité + mot d'Élio */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <Sparkles
                className="h-4 w-4 shrink-0"
                style={{ color: 'var(--brand-accent, #4ade80)' }}
                aria-hidden="true"
              />
              <p
                className="text-[15px] font-semibold tracking-[0.01em] leading-tight"
                style={{ color: 'color-mix(in srgb, var(--brand-accent, #4ade80) 85%, white)' }}
              >
                Élio One
              </p>
            </div>
            <p className="text-[12px] text-[#9ca3af] leading-tight mt-0.5">Ton assistant One</p>

            <div
              className="mt-3 rounded-xl p-4 text-sm leading-relaxed"
              style={{
                background: 'color-mix(in srgb, var(--brand-accent, #16a34a) 8%, transparent)',
                border: '1px solid color-mix(in srgb, var(--brand-accent, #16a34a) 22%, transparent)',
              }}
            >
              <p className="text-[15px] font-semibold text-[#f9fafb]">{greeting}</p>
              <p className="mt-2 text-[#e5e7eb]">{message}</p>
            </div>
          </div>

          {/* DROITE — avatar + bouton « Pose-moi une question » */}
          <div className="flex shrink-0 flex-col items-center gap-2 w-[120px]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/elio/elio-one.png"
              alt="Élio One"
              className="h-24 w-24 object-contain drop-shadow-[0_0_12px_rgba(22,163,74,0.3)]"
            />
            <button
              type="button"
              onClick={onAskConcierge}
              className="w-full rounded-lg border px-3 py-2 text-[13px] font-medium transition-colors hover:bg-white/5"
              style={{
                borderColor: 'color-mix(in srgb, var(--brand-accent, #16a34a) 55%, transparent)',
                color: 'color-mix(in srgb, var(--brand-accent, #4ade80) 85%, white)',
              }}
            >
              Poser une question
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
