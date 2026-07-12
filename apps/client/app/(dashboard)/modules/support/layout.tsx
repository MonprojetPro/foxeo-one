import type { ReactNode } from 'react'
import { requireActiveModule } from '../require-active-module'

/**
 * La page Support est un Client Component ('use client') : on ne peut pas y appeler le garde
 * serveur directement. Ce layout serveur ferme donc l'accès URL direct au module désactivé.
 */
export default async function SupportLayout({ children }: { children: ReactNode }) {
  await requireActiveModule('support')
  return <>{children}</>
}
