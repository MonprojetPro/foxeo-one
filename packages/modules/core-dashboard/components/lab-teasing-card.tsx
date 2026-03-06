'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@foxeo/ui'

interface LabTeasingCardProps {
  show: boolean
  onCTAClick: () => void
}

export function LabTeasingCard({ show, onCTAClick }: LabTeasingCardProps) {
  if (!show) return null

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Un nouveau projet en tête ?</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          Relancez un parcours Lab pour structurer votre prochain projet avec Elio et MiKL.
        </p>
        <button
          type="button"
          onClick={onCTAClick}
          className="shrink-0 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          En savoir plus
        </button>
      </CardContent>
    </Card>
  )
}
