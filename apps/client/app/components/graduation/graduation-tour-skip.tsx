'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@monprojetpro/ui'
import { markGraduationScreenShown } from '../../graduation/actions/mark-graduation-screen-shown'

export function GraduationTourSkip() {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    startTransition(async () => {
      const { error } = await markGraduationScreenShown()
      if (error) {
        // Ne PAS rediriger : tant que le flag n'est pas posé en base, le
        // middleware renverrait vers /graduation/celebrate en boucle.
        setFailed(true)
        toast.error('Un problème est survenu, réessaie dans un instant.')
        return
      }
      toast.success('Bienvenue dans MonprojetPro One 🚀')
      router.push('/')
    })
  }, [router, startTransition])

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-emerald-950 to-emerald-900 text-white">
      {failed ? (
        <div className="text-center space-y-4">
          <p className="text-lg text-green-200">
            Impossible de finaliser l&apos;accès à votre dashboard pour le moment.
          </p>
          <Button
            onClick={() => window.location.reload()}
            className="bg-green-600 hover:bg-green-500 text-white"
          >
            Réessayer
          </Button>
        </div>
      ) : (
        <p className="text-lg text-green-200">Redirection vers votre dashboard...</p>
      )}
    </div>
  )
}
