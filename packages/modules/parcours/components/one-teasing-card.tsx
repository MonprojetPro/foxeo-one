'use client'

import { Rocket } from 'lucide-react'

interface OneTeasingCardProps {
  message?: string | null
}

export function OneTeasingCard({ message }: OneTeasingCardProps) {
  if (!message) return null

  return (
    <div className="rounded-xl bg-gradient-to-r from-purple-900/50 to-green-900/50 border border-purple-600/50 mt-8 p-5">
      <div className="flex items-center gap-2 mb-3">
        <Rocket className="w-5 h-5 text-purple-400 shrink-0" aria-hidden="true" />
        <h3 className="text-base font-semibold text-foreground">Aperçu MonprojetPro One</h3>
      </div>
      <p className="text-sm text-purple-200 leading-relaxed">{message}</p>
    </div>
  )
}
