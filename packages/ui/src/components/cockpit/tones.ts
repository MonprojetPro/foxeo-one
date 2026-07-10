/**
 * Palette de tons du "cockpit" MonprojetPro — signature visuelle issue de l'onglet MenuFacile,
 * généralisée à l'ensemble du Hub (style Minimal Futuriste, accent cyan par défaut).
 *
 * Les classes sont écrites en toutes lettres (pas de concaténation dynamique) pour que
 * Tailwind les détecte au scan du contenu du package `ui`.
 */

export type CockpitTone =
  | 'cyan'
  | 'violet'
  | 'emerald'
  | 'amber'
  | 'red'
  | 'blue'
  | 'gray'

export interface ToneClasses {
  /** Pastille d'icône : bordure + fond + texte. */
  chip: string
  /** Halo décoratif (blur) derrière la carte. */
  glow: string
  /** Bordure au survol de la carte. */
  hoverBorder: string
  /** Anneau fin (ring) pour compteurs / badges. */
  ring: string
  /** Couleur de texte accent. */
  text: string
  /** Fond doux pour bandeaux / états. */
  softBg: string
  /** Bordure douce pour bandeaux / états. */
  softBorder: string
  /** Fond de badge/pastille compteur. */
  badgeBg: string
}

export const COCKPIT_TONES: Record<CockpitTone, ToneClasses> = {
  cyan: {
    chip: 'border-cyan-400/25 bg-cyan-400/10 text-cyan-300',
    glow: 'bg-cyan-400/10',
    hoverBorder: 'hover:border-cyan-400/30',
    ring: 'ring-cyan-400/30',
    text: 'text-cyan-300',
    softBg: 'bg-cyan-400/[0.06]',
    softBorder: 'border-cyan-400/25',
    badgeBg: 'bg-cyan-400/20 text-cyan-100',
  },
  violet: {
    chip: 'border-violet-400/25 bg-violet-400/10 text-violet-300',
    glow: 'bg-violet-400/10',
    hoverBorder: 'hover:border-violet-400/30',
    ring: 'ring-violet-400/30',
    text: 'text-violet-300',
    softBg: 'bg-violet-400/[0.06]',
    softBorder: 'border-violet-400/25',
    badgeBg: 'bg-violet-400/20 text-violet-100',
  },
  emerald: {
    chip: 'border-emerald-400/25 bg-emerald-400/10 text-emerald-300',
    glow: 'bg-emerald-400/10',
    hoverBorder: 'hover:border-emerald-400/30',
    ring: 'ring-emerald-400/30',
    text: 'text-emerald-300',
    softBg: 'bg-emerald-400/[0.06]',
    softBorder: 'border-emerald-400/25',
    badgeBg: 'bg-emerald-400/20 text-emerald-100',
  },
  amber: {
    chip: 'border-amber-400/25 bg-amber-400/10 text-amber-300',
    glow: 'bg-amber-400/10',
    hoverBorder: 'hover:border-amber-400/30',
    ring: 'ring-amber-400/30',
    text: 'text-amber-300',
    softBg: 'bg-amber-400/[0.06]',
    softBorder: 'border-amber-400/25',
    badgeBg: 'bg-amber-400/20 text-amber-100',
  },
  red: {
    chip: 'border-red-400/25 bg-red-400/10 text-red-300',
    glow: 'bg-red-400/10',
    hoverBorder: 'hover:border-red-400/30',
    ring: 'ring-red-400/30',
    text: 'text-red-300',
    softBg: 'bg-red-400/[0.06]',
    softBorder: 'border-red-400/25',
    badgeBg: 'bg-red-400/20 text-red-100',
  },
  blue: {
    chip: 'border-blue-400/25 bg-blue-400/10 text-blue-300',
    glow: 'bg-blue-400/10',
    hoverBorder: 'hover:border-blue-400/30',
    ring: 'ring-blue-400/30',
    text: 'text-blue-300',
    softBg: 'bg-blue-400/[0.06]',
    softBorder: 'border-blue-400/25',
    badgeBg: 'bg-blue-400/20 text-blue-100',
  },
  gray: {
    chip: 'border-white/15 bg-white/[0.04] text-gray-300',
    glow: 'bg-white/5',
    hoverBorder: 'hover:border-white/20',
    ring: 'ring-white/15',
    text: 'text-gray-300',
    softBg: 'bg-white/[0.03]',
    softBorder: 'border-white/10',
    badgeBg: 'bg-white/10 text-gray-200',
  },
}
