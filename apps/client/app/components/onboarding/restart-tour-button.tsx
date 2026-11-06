'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@monprojetpro/ui'

/**
 * T-078 — l'ancien tutoriel à 5 étapes (ciblage DOM fragile, jamais vraiment
 * fonctionnel) est remplacé par la page de présentation unique de l'onboarding,
 * revue ici en mode purement informatif (`?replay=1`, n'affecte jamais
 * onboarding_completed).
 */
export function RestartTourButton() {
  const router = useRouter()

  function handleRestart() {
    router.push('/onboarding/welcome?replay=1')
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleRestart}
      className="w-full sm:w-auto"
    >
      Revoir la présentation
    </Button>
  )
}
