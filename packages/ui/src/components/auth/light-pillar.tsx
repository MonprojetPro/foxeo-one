import { cn } from '@monprojetpro/utils'

export interface LightPillarProps {
  /** Couleur du haut du faisceau. Défaut : violet Lab. */
  topColor?: string
  /** Couleur du bas du faisceau. Défaut : vert One. */
  bottomColor?: string
  /** Multiplicateur de luminosité (1 = nominal). */
  intensity?: number
  /** Inclinaison du faisceau, en degrés. */
  pillarRotation?: number
  /** Largeur du faisceau, en unités CSS (défaut `46vmax`). */
  pillarWidth?: string
  className?: string
}

/**
 * Fond décoratif de la page de connexion : un faisceau de lumière incliné qui
 * passe du violet (espace Lab) au vert (espace One) — les deux destinations
 * possibles derrière l'entrée unique.
 *
 * Rendu en CSS et non en WebGL : une page de connexion doit s'afficher
 * instantanément partout, et un canvas au premier écran ajoute un point de panne
 * (contexte refusé, GPU désactivé) pour un élément purement décoratif. Les
 * réglages du composant d'origine qui n'ont de sens qu'en shader —
 * `noiseIntensity`, `quality`, `interactive` — n'ont donc pas d'équivalent ici.
 *
 * Purement décoratif : `aria-hidden`, jamais annoncé aux lecteurs d'écran.
 */
export function LightPillar({
  topColor = '#935fee',
  bottomColor = '#09e159',
  intensity = 1.5,
  pillarRotation = 206,
  pillarWidth = '46vmax',
  className,
}: LightPillarProps) {
  return (
    <div
      aria-hidden
      className={cn('mpp-pillar', className)}
      style={
        {
          '--mpp-pillar-top': topColor,
          '--mpp-pillar-bottom': bottomColor,
          '--mpp-pillar-intensity': intensity,
          '--mpp-pillar-rotation': `${pillarRotation}deg`,
          '--mpp-pillar-width': pillarWidth,
        } as React.CSSProperties
      }
    >
      <div className="mpp-pillar__beam" />
      <div className="mpp-pillar__core" />
      <div className="mpp-pillar__veil" />
    </div>
  )
}
