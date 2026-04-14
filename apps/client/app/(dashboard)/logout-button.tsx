'use client'

import { useTransition, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Alert, AlertDescription } from '@monprojetpro/ui'
import { logoutAction } from '../(auth)/actions/auth'

export function LogoutButton() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleLogout() {
    setError(null)
    startTransition(async () => {
      const result = await logoutAction()

      if (result.error) {
        setError(result.error.message)
        return
      }

      router.push('/login')
      router.refresh()
    })
  }

  return (
    <div>
      {error && (
        <Alert variant="destructive" className="mb-2">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <Button
        variant="ghost"
        size="sm"
        onClick={handleLogout}
        disabled={isPending}
      >
        {isPending ? 'Deconnexion...' : 'Se deconnecter'}
      </Button>
    </div>
  )
}
