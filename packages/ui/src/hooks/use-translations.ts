/**
 * useTranslations hook — React hook for translations in client components
 *
 * @example
 * const { t } = useTranslations('emptyState')
 * t('search.title') // "Aucun résultat trouvé"
 *
 * @example
 * const { t, locale } = useTranslations()
 * t('emptyState.search.title') // Full key
 */

'use client'

import { useContext } from 'react'
import { t as translateFn } from '@monprojetpro/utils'
import { LocaleContext } from '../providers/locale-provider'

export function useTranslations(namespace?: string) {
  const { locale } = useContext(LocaleContext)

  function t(key: string): string {
    const fullKey = namespace ? `${namespace}.${key}` : key
    return translateFn(fullKey, locale)
  }

  return { t, locale }
}
