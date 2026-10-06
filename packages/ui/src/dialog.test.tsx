import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Dialog, DialogContent, DialogTitle } from './dialog'

/**
 * Verrou du 2026-10-06 : une pop-up plus haute que l'écran débordait en haut et
 * en bas, sans défilement possible. Huit appelants compensaient déjà à la main.
 * Ces tests empêchent le défaut de disparaître à nouveau de la brique.
 */
describe('DialogContent — hauteur et défilement', () => {
  it('limite sa hauteur à la fenêtre et défile par défaut', () => {
    render(
      <Dialog open>
        <DialogContent>
          <DialogTitle>Titre</DialogTitle>
        </DialogContent>
      </Dialog>
    )

    const content = screen.getByRole('dialog')
    expect(content.className).toContain('max-h-[calc(100dvh-2rem)]')
    expect(content.className).toContain('overflow-y-auto')
  })

  it("laisse l'appelant imposer sa propre hauteur et son propre overflow", () => {
    render(
      <Dialog open>
        <DialogContent className="max-h-[85vh] overflow-hidden">
          <DialogTitle>Titre</DialogTitle>
        </DialogContent>
      </Dialog>
    )

    const content = screen.getByRole('dialog')
    // tailwind-merge doit retirer les valeurs par défaut, sans quoi deux règles
    // du même groupe cohabiteraient et le résultat dépendrait de l'ordre du CSS.
    expect(content.className).toContain('max-h-[85vh]')
    expect(content.className).not.toContain('max-h-[calc(100dvh-2rem)]')
    expect(content.className).toContain('overflow-hidden')
    expect(content.className).not.toContain('overflow-y-auto')
  })
})
