import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Dialog, DialogContent, DialogTitle } from './dialog'

/**
 * Verrou du 2026-10-06, posé APRÈS une tentative ratée le même jour.
 *
 * On avait rendu `DialogContent` défilant pour qu'une pop-up trop haute puisse
 * être parcourue. Constaté sur capture : le liseré de `.mpp-popup-frame`, dessiné
 * par des pseudo-éléments en `position: absolute; inset: 0`, défile avec le
 * contenu — le cadre cyan s'arrêtait au milieu du formulaire.
 *
 * La boîte qui porte le cadre ne doit donc jamais défiler : c'est le contenu
 * (formulaire, liste) qui porte sa propre hauteur et son propre défilement.
 */
describe('DialogContent — le cadre ne doit pas défiler', () => {
  it('ne rend pas la pop-up défilante par défaut', () => {
    render(
      <Dialog open>
        <DialogContent>
          <DialogTitle>Titre</DialogTitle>
        </DialogContent>
      </Dialog>
    )

    const content = screen.getByRole('dialog')
    expect(content.className).not.toContain('overflow-y-auto')
    expect(content.className).not.toContain('max-h-[calc(100dvh-2rem)]')
  })

  it("laisse malgré tout l'appelant décider pour sa propre pop-up", () => {
    // Plusieurs pop-ups anciennes gèrent leur hauteur elles-mêmes et assument
    // l'effet sur le cadre : la brique ne doit pas les en empêcher.
    render(
      <Dialog open>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogTitle>Titre</DialogTitle>
        </DialogContent>
      </Dialog>
    )

    const content = screen.getByRole('dialog')
    expect(content.className).toContain('max-h-[85vh]')
    expect(content.className).toContain('overflow-y-auto')
  })
})
