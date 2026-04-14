'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@monprojetpro/ui'
import { hubLogoutAction } from '../(auth)/actions/auth'

export function LogoutButton() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function handleLogout() {
    startTransition(async () => {
      const result = await hubLogoutAction()
      if (!result.error) {
        router.push('/login')
        router.refresh()
      }
    })
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleLogout}
      disabled={isPending}
    >
      {isPending ? 'Deconnexion...' : 'Se deconnecter'}
    </Button>
  )
}
