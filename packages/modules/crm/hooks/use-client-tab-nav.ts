'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'

/**
 * Navigation d'onglets de la fiche client (param `?tab=`).
 * Source unique (DRY) partagée par `ClientTabs` (barre d'icônes) et le cockpit (raccourcis).
 */
export function useClientTabNav(defaultTab = 'informations') {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const activeTab = searchParams.get('tab') || defaultTab

  function navigateToTab(value: string) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', value)
    router.push(`${pathname}?${params.toString()}`)
  }

  return { activeTab, navigateToTab }
}
