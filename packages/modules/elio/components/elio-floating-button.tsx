'use client'

import Link from 'next/link'
import { Button } from '@monprojetpro/ui'

/**
 * ElioFloatingButton — Bouton d'accès rapide à Élio.
 * Affiché sur la page d'accueil One comme entrée principale vers l'assistant IA.
 */
export function ElioFloatingButton() {
  return (
    <Link href="/modules/elio">
      <Button
        variant="default"
        className="gap-2 shadow-lg"
        aria-label="Ouvrir Élio, votre assistant IA"
      >
        <span aria-hidden="true">🤖</span>
        Parler à Élio
      </Button>
    </Link>
  )
}
