/**
 * Presets pour EmptyState — états vides réutilisables
 * Uses i18n translations
 * NOTE: Presets are getter functions to avoid race conditions with message loading
 */

import { t } from '@monprojetpro/utils'
// Ensure messages are loaded
import '../messages/init'

export type EmptyStatePreset = {
  title: string
  description?: string
}

// Use getters to evaluate translations lazily and avoid race conditions
export const EMPTY_SEARCH = (): EmptyStatePreset => ({
  title: t('emptyState.search.title'),
  description: t('emptyState.search.description'),
})

export const EMPTY_LIST = (): EmptyStatePreset => ({
  title: t('emptyState.list.title'),
  description: t('emptyState.list.description'),
})

export const EMPTY_ERROR = (): EmptyStatePreset => ({
  title: t('emptyState.error.title'),
  description: t('emptyState.error.description'),
})
