import { describe, it, expect, vi, beforeEach } from 'vitest'

// Même montage que `notifications.test.ts` : le client du guichet est mocké, et
// exposé directement plutôt qu'enveloppé — sinon la promesse rejetée du mock et
// celle que voit le code testé ne sont pas la même instance, et Vitest signale
// un rejet non géré sur un test pourtant correct.
const { callMenuFacileAdmin } = vi.hoisted(() => ({
  callMenuFacileAdmin: vi.fn(),
}))

vi.mock('./admin-client', () => ({
  callMenuFacileAdmin,
  MenuFacileAdminError: class MenuFacileAdminError extends Error {
    constructor(
      message: string,
      readonly status: number,
    ) {
      super(message)
    }
  },
}))

const { openContactThread } = await import('./contact-messages')

const USER = '11111111-2222-3333-4444-555555555555'

describe('openContactThread — refus AVANT tout appel réseau', () => {
  beforeEach(() => {
    callMenuFacileAdmin.mockReset()
    callMenuFacileAdmin.mockResolvedValue({ ok: true, id: 'fil-1', emailed: true })
  })

  it('refuse un message vide', async () => {
    const res = await openContactThread({ userId: USER, body: '' })
    expect(res.error?.code).toBe('MENUFACILE_EMPTY_BODY')
    expect(callMenuFacileAdmin).not.toHaveBeenCalled()
  })

  it('refuse un message fait de blancs', async () => {
    const res = await openContactThread({ userId: USER, body: '   \n\t ' })
    expect(res.error?.code).toBe('MENUFACILE_EMPTY_BODY')
    expect(callMenuFacileAdmin).not.toHaveBeenCalled()
  })

  it('refuse au-delà de 5000 caractères — la borne de la base', async () => {
    const res = await openContactThread({ userId: USER, body: 'a'.repeat(5001) })
    expect(res.error?.code).toBe('MENUFACILE_BODY_TOO_LONG')
    expect(callMenuFacileAdmin).not.toHaveBeenCalled()
  })

  // `ActionResponse` porte `error: null` en cas de succès — pas `undefined`.
  // C'est la convention de `@monprojetpro/types`, et ces tests s'y tiennent.
  it('accepte exactement 5000 caractères', async () => {
    const res = await openContactThread({ userId: USER, body: 'a'.repeat(5000) })
    expect(res.error).toBeNull()
    expect(callMenuFacileAdmin).toHaveBeenCalledOnce()
  })

  it('refuse un destinataire manquant', async () => {
    const res = await openContactThread({ userId: '', body: 'Bonjour' })
    expect(res.error?.code).toBe('MENUFACILE_NO_RECIPIENT')
    expect(callMenuFacileAdmin).not.toHaveBeenCalled()
  })
})

describe('openContactThread — ce qui part et ce qui revient', () => {
  beforeEach(() => {
    callMenuFacileAdmin.mockReset()
    callMenuFacileAdmin.mockResolvedValue({ ok: true, id: 'fil-1', emailed: true })
  })

  it('appelle la bonne route avec user_id et le corps DÉTOURÉ', async () => {
    await openContactThread({ userId: USER, body: '  Bonjour Lucie  ' })

    expect(callMenuFacileAdmin).toHaveBeenCalledWith('/contact-messages/open', {
      method: 'POST',
      body: JSON.stringify({ user_id: USER, body: 'Bonjour Lucie' }),
    })
  })

  it('remonte `emailed` tel quel quand l\'e-mail est parti', async () => {
    const res = await openContactThread({ userId: USER, body: 'Bonjour' })
    expect(res.data).toEqual({ ok: true, id: 'fil-1', emailed: true })
  })

  // Le cas qui compte : le fil est bien créé, mais personne n'a été prévenu par
  // e-mail. Si l'action transformait ça en succès muet, l'opérateur croirait
  // avoir joint quelqu'un qui n'a rien reçu.
  it('remonte `emailed: false` SANS le travestir en erreur', async () => {
    callMenuFacileAdmin.mockResolvedValue({ ok: true, id: 'fil-2', emailed: false })

    const res = await openContactThread({ userId: USER, body: 'Bonjour' })

    expect(res.error).toBeNull()
    expect(res.data?.emailed).toBe(false)
    expect(res.data?.id).toBe('fil-2')
  })

  it('traduit un refus du guichet en erreur portant son code HTTP', async () => {
    const { MenuFacileAdminError } = await import('./admin-client')
    callMenuFacileAdmin.mockRejectedValue(new MenuFacileAdminError('Destinataire inconnu.', 404))

    const res = await openContactThread({ userId: USER, body: 'Bonjour' })

    expect(res.data).toBeNull()
    expect(res.error?.code).toBe('MENUFACILE_HTTP_404')
    expect(res.error?.message).toBe('Destinataire inconnu.')
  })
})
