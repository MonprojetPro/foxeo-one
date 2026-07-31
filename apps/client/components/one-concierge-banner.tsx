'use client'

import { Sparkles } from 'lucide-react'
import type { ConciergeWord } from '@monprojetpro/module-elio'
import { useClientReadOnly } from '@monprojetpro/ui'
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

  // Abonnement terminé — Élio est le porteur UNIQUE du message côté One, comme le
  // Concierge l'est côté Lab (ElioParcoursPanel). Le bandeau ambre global du layout ne
  // s'affiche donc plus sur cette page : il répétait ce qu'Élio dit déjà, en double.
  const frozen = useClientReadOnly()

  const greeting = `Bonjour${clientFirstName ? `, ${clientFirstName}` : ''} ! 👋`

  // Priorité : abonnement terminé (état définitif) > mot d'Élio vivant > accueil par défaut.
  // `frozen` passe AVANT le mot d'Élio volontairement : un mot généré avant la résiliation
  // (« je te tiens au courant à chaque avancée ») serait ré-affiché tel quel alors que plus
  // rien n'avance. On ne le supprime pas — il redeviendra valable si MiKL réactive le
  // client — on cesse simplement de l'afficher. (Même règle que le Lab.)
  const message = frozen
    ? "Ton abonnement est terminé, alors ton espace passe en consultation. Tout ce qu'on a construit reste à toi : tes documents, nos échanges et le suivi de ton outil restent accessibles et téléchargeables autant que tu veux. Si un jour tu souhaites reprendre, parles-en à MiKL — et en attendant, je reste là pour tes questions."
    : word?.body?.trim() ||
      'Bienvenue dans ton espace One : ta console de pilotage et ton lien direct avec MiKL. ' +
        'Je suis là pour t’aider à t’y retrouver — pose-moi une question quand tu veux.'

  // Palette ambre quand l'abonnement est terminé : information, pas erreur — même code
  // couleur que le Lab et que l'ancien ReadOnlyBanner, pour que l'état reste lisible d'un
  // coup d'œil sans le vert « tout va bien » du One actif.
  const accent = frozen ? '#f59e0b' : 'var(--brand-accent, #16a34a)'
  const accentLight = frozen ? '#fbbf24' : 'var(--brand-accent, #4ade80)'

  return (
    <section aria-label="Élio One — ton assistant">
      <div
        className="relative overflow-hidden rounded-2xl border p-5"
        style={{
          borderColor: `color-mix(in srgb, ${accent} 30%, transparent)`,
          background: `linear-gradient(135deg, color-mix(in srgb, ${accent} 10%, #141414), #141414)`,
        }}
      >
        {/* Glow subtil */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full blur-3xl"
          style={{ background: `color-mix(in srgb, ${accent} 22%, transparent)` }}
        />

        <div className="relative flex items-start justify-between gap-4">
          {/* GAUCHE — identité + mot d'Élio */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <Sparkles
                className="h-4 w-4 shrink-0"
                style={{ color: accentLight }}
                aria-hidden="true"
              />
              <p
                className="text-[15px] font-semibold tracking-[0.01em] leading-tight"
                style={{ color: `color-mix(in srgb, ${accentLight} 85%, white)` }}
              >
                Élio One
              </p>
            </div>
            <p className="text-[12px] text-[#9ca3af] leading-tight mt-0.5">Ton assistant One</p>

            <div
              className="mt-3 rounded-xl p-4 text-sm leading-relaxed"
              style={{
                background: `color-mix(in srgb, ${accent} 8%, transparent)`,
                border: `1px solid color-mix(in srgb, ${accent} 22%, transparent)`,
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
              className={
                frozen
                  ? 'h-24 w-24 object-contain drop-shadow-[0_0_12px_rgba(245,158,11,0.3)]'
                  : 'h-24 w-24 object-contain drop-shadow-[0_0_12px_rgba(22,163,74,0.3)]'
              }
            />
            <button
              type="button"
              onClick={onAskConcierge}
              className="w-full rounded-lg border px-3 py-2 text-[13px] font-medium transition-colors hover:bg-white/5"
              style={{
                borderColor: `color-mix(in srgb, ${accent} 55%, transparent)`,
                color: `color-mix(in srgb, ${accentLight} 85%, white)`,
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
