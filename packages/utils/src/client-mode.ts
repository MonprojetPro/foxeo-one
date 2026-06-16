/**
 * Résolution centralisée du mode client (Lab / One) — ADR-01 Révision 2.
 *
 * UNE seule source de vérité pour « quel mode afficher » et « quels modes sont
 * verrouillés ». Avant ce module, la logique était dupliquée dans le layout, la
 * home, la page parcours et la page Élio — avec des divergences qui ont causé des
 * bugs (un consumer laissait passer un mode qu'un autre verrouillait).
 *
 * Matrice d'accès conditionnelle (saas-b2b-specific-requirements.md) :
 *   • Lab actif (non gradué)  : labModeAvailable=true,  oneModeAvailable=false
 *   • Gradué Lab→One          : labModeAvailable=true,  oneModeAvailable=true
 *   • Direct One              : labModeAvailable=false, oneModeAvailable=true
 */

export type ClientMode = 'lab' | 'one'

export interface ClientModeInput {
  /** Statut canonique = mode par défaut au login. */
  dashboardType: string | null | undefined
  /** Le client peut entrer en Mode Lab (Lab natif ou gradué qui garde l'accès). */
  labModeAvailable: boolean
  /** Le Mode One est débloqué (gradué ou One direct). */
  oneModeAvailable: boolean
  /** Préférence de vue stockée dans le cookie navigateur (mpp_active_view). */
  cookieMode?: string | null
}

export interface ResolvedClientMode {
  /** Mode réellement actif, déjà « clampé » à ce qui est autorisé. */
  activeMode: ClientMode
  labModeAvailable: boolean
  oneModeAvailable: boolean
  /** Le toggle (2 boutons) doit-il être visible ? (client ayant une relation au Lab) */
  canSwitch: boolean
  /** Clic sur « Mode Lab » doit afficher un message au lieu d'entrer. */
  labLocked: boolean
  /** Clic sur « Mode One » doit afficher un message au lieu d'entrer. */
  oneLocked: boolean
}

/**
 * Calcule le mode actif et les verrous, à partir des flags DB + cookie de vue.
 * Le cookie ne peut activer un mode que si ce mode est réellement disponible —
 * sinon on retombe sur le mode par défaut (dashboardType).
 */
export function resolveClientMode({
  dashboardType,
  labModeAvailable,
  oneModeAvailable,
  cookieMode,
}: ClientModeInput): ResolvedClientMode {
  const defaultMode: ClientMode = dashboardType === 'one' ? 'one' : 'lab'
  const cookie: ClientMode | null =
    cookieMode === 'lab' || cookieMode === 'one' ? cookieMode : null

  const activeMode: ClientMode =
    cookie === 'lab' && labModeAvailable
      ? 'lab'
      : cookie === 'one' && oneModeAvailable
        ? 'one'
        : defaultMode

  return {
    activeMode,
    labModeAvailable,
    oneModeAvailable,
    // Le toggle s'affiche dès que le client a accès au Lab (natif ou gradué).
    // Un One direct pur (jamais de Lab) n'a pas de toggle.
    canSwitch: labModeAvailable,
    labLocked: !labModeAvailable,
    oneLocked: !oneModeAvailable,
  }
}
