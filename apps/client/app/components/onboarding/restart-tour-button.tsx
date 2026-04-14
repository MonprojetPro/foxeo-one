'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@monprojetpro/ui'

export function RestartTourButton() {
  const router = useRouter()

  function handleRestart() {
    // Supprimer le flag localStorage pour permettre de relancer le tour
    if (typeof window !== 'undefined') {
      localStorage.removeItem('monprojetpro-onboarding-tour-completed')
    }
    // Rediriger vers la page du tour (sans toucher onboarding_completed en DB)
    router.push('/onboarding/tour')
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleRestart}
      className="w-full sm:w-auto"
    >
      Revoir le tutoriel
    </Button>
  )
}
