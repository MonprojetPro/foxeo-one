/**
 * Détecte si la réponse d'Élio indique une faible confiance.
 * Utilisé pour décider si proposer une escalade vers MiKL (AC5).
 * Story 8.7 — Task 10
 */
export const LOW_CONFIDENCE_PATTERNS: RegExp[] = [
  /je ne suis pas (sûr|certain)/i,
  /peut-être/i,
  /il est possible que/i,
  /je pense que.*mais/i,
  /probablement/i,
  /je ne connais pas/i,
  /je n['']ai pas (accès|les informations)/i,
  /je ne dispose pas/i,
  /hors de mon périmètre/i,
  /je ne suis pas en mesure/i,
]

export function detectLowConfidence(response: string): boolean {
  if (!response.trim()) return false
  return LOW_CONFIDENCE_PATTERNS.some((pattern) => pattern.test(response))
}
