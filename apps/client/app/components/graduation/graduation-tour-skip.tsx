'use client'

import { useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { markGraduationScreenShown } from '../../graduation/actions/mark-graduation-screen-shown'

export function GraduationTourSkip() {
  const router = useRouter()
  const [, startTransition] = useTransition()

  useEffect(() => {
    startTransition(async () => {
      await markGraduationScreenShown()
      toast.success('Bienvenue dans MonprojetPro One 🚀')
      router.push('/')
    })
  }, [router, startTransition])

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-emerald-950 to-emerald-900 text-white">
      <p className="text-lg text-green-200">Redirection vers votre dashboard...</p>
    </div>
  )
}
