/**
 * `active_modules` par défaut selon le mode activé — Lab ou One.
 *
 * T-079b — jusqu'ici dupliqué dans `pennylane-paid-handlers.ts` (seul chemin qui les
 * posait correctement, parcours + elio inclus) pendant que les chemins d'activation
 * MANUELLE (`activate-lab-free.ts`, `toggle-access.ts`) ne touchaient jamais
 * `active_modules` : un client activé gratuitement héritait du défaut générique posé à
 * la création (`create-client.ts`, sans `parcours` ni `elio`) et se retrouvait en mode
 * Lab sans jamais pouvoir accéder à son propre parcours (repli dégradé vers la home One,
 * cf. `apps/client/app/(dashboard)/page.tsx`) — constat MiKL du 10-11 en testant le
 * toggle Lab/One. Un module ne peut pas en importer un autre (CLAUDE.md) : ces listes
 * vivent ici pour être partagées par `crm` ET `facturation` sans dupliquer la dérive.
 */
export const LAB_DEFAULT_MODULES = [
  'core-dashboard',
  'parcours',
  'documents',
  'chat',
  'elio',
  'visio',
]

export const ONE_DEFAULT_MODULES = ['core-dashboard', 'chat', 'documents', 'elio']
