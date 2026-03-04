/**
 * Message retourné quand un module n'est pas actif pour le client.
 * Le placeholder {nom} doit être remplacé par le nom du module (label lisible).
 */
export const MODULE_NOT_ACTIVE_MESSAGE =
  "Le module {nom} n'est pas activé pour vous. Voulez-vous que je demande à MiKL de l'activer ?"

/** Labels lisibles pour les modules (user-facing). */
const MODULE_DISPLAY_LABELS: Record<string, string> = {
  adhesions: 'Adhésions',
  agenda: 'Agenda',
  sms: 'SMS',
  facturation: 'Facturation',
}

/**
 * Vérifie si un module est actif pour un client donné.
 * Utilisé par Élio One+ avant d'exécuter une action sur un module (AC3 — Story 8.9a).
 */
export function checkModuleActive(activeModules: string[], moduleTarget: string): boolean {
  if (!activeModules || !moduleTarget) return false
  return activeModules.includes(moduleTarget)
}

/**
 * Retourne le message "module non actif" avec le nom lisible du module injecté.
 */
export function buildModuleNotActiveMessage(moduleName: string): string {
  const label = MODULE_DISPLAY_LABELS[moduleName] ?? moduleName
  return MODULE_NOT_ACTIVE_MESSAGE.replace('{nom}', label)
}
