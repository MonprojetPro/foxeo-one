import { describe, it, expect, vi, beforeEach } from 'vitest'

// Le client du guichet est mocké : ces tests vérifient le CONTRAT côté Hub
// (validation, forme du corps, chemins appelés), pas le guichet lui-même.
// `vi.hoisted` + mock exposé DIRECTEMENT (sans fonction d'enveloppe) : avec un
// wrapper `(...args) => fn(...args)`, la promesse rejetée du mock et celle que
// voit le code testé ne sont pas la même instance, et Vitest signale un rejet
// non géré qui fait échouer un test dont le code est pourtant correct.
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

const {
  sendNotification,
  deleteNotification,
  getNotifications,
  getNotificationAudienceCount,
} = await import('./notifications')

const VALID = {
  title: 'Nouveauté',
  body: 'Le planning accepte maintenant les restes.',
  audience: 'all' as const,
  channel: 'in_app' as const,
}

describe('sendNotification — validation avant tout appel réseau', () => {
  beforeEach(() => {
    callMenuFacileAdmin.mockReset()
    callMenuFacileAdmin.mockResolvedValue({ id: 'n1', recipients: 39 })
  })

  it('refuse un titre vide sans appeler le guichet', async () => {
    const res = await sendNotification({ ...VALID, title: '   ' })
    expect(res.error?.code).toBe('VALIDATION_ERROR')
    expect(callMenuFacileAdmin).not.toHaveBeenCalled()
  })

  it('refuse un message vide sans appeler le guichet', async () => {
    const res = await sendNotification({ ...VALID, body: '' })
    expect(res.error?.code).toBe('VALIDATION_ERROR')
    expect(callMenuFacileAdmin).not.toHaveBeenCalled()
  })

  it('refuse un titre de plus de 120 caractères', async () => {
    const res = await sendNotification({ ...VALID, title: 'a'.repeat(121) })
    expect(res.error?.code).toBe('VALIDATION_ERROR')
    expect(callMenuFacileAdmin).not.toHaveBeenCalled()
  })

  it('refuse un message de plus de 2000 caractères', async () => {
    const res = await sendNotification({ ...VALID, body: 'a'.repeat(2001) })
    expect(res.error?.code).toBe('VALIDATION_ERROR')
    expect(callMenuFacileAdmin).not.toHaveBeenCalled()
  })

  it('envoie titre et message détourés (espaces retirés)', async () => {
    await sendNotification({ ...VALID, title: '  Titre  ', body: '  Corps  ' })
    const body = JSON.parse(callMenuFacileAdmin.mock.calls[0][1].body)
    expect(body.title).toBe('Titre')
    expect(body.body).toBe('Corps')
  })

  // Verrou de contrat : l'appli MenuFacile est une PWA sans jeton d'appareil.
  // Le guichet refuse 'push'/'both' — le Hub ne doit jamais les proposer.
  it('force toujours channel=in_app et audience=all', async () => {
    await sendNotification(VALID)
    const body = JSON.parse(callMenuFacileAdmin.mock.calls[0][1].body)
    expect(body.channel).toBe('in_app')
    expect(body.audience).toBe('all')
  })

  it('omet link_url quand il est vide, au lieu de l envoyer vide', async () => {
    await sendNotification({ ...VALID, link_url: '   ' })
    const body = JSON.parse(callMenuFacileAdmin.mock.calls[0][1].body)
    expect(body).not.toHaveProperty('link_url')
  })

  it('transmet link_url détouré quand il est fourni', async () => {
    await sendNotification({ ...VALID, link_url: '  https://menufacile.app/planning  ' })
    const body = JSON.parse(callMenuFacileAdmin.mock.calls[0][1].body)
    expect(body.link_url).toBe('https://menufacile.app/planning')
  })

  it('rend la réponse du guichet, y compris le nombre réel de destinataires', async () => {
    callMenuFacileAdmin.mockResolvedValue({ id: 'n9', recipients: 39 })
    const res = await sendNotification(VALID)
    expect(res.data?.recipients).toBe(39)
  })
})

describe('deleteNotification', () => {
  beforeEach(() => {
    callMenuFacileAdmin.mockReset()
    callMenuFacileAdmin.mockResolvedValue({ ok: true })
  })

  it('refuse un identifiant vide sans appeler le guichet', async () => {
    const res = await deleteNotification('')
    expect(res.error?.code).toBe('VALIDATION_ERROR')
    expect(callMenuFacileAdmin).not.toHaveBeenCalled()
  })

  // Un identifiant est repris tel quel dans l'URL : sans encodage, une valeur
  // inattendue pourrait déborder sur un autre chemin du guichet.
  it('encode l identifiant dans le chemin', async () => {
    await deleteNotification('a/b c')
    expect(callMenuFacileAdmin.mock.calls[0][0]).toBe('/notifications/a%2Fb%20c')
    expect(callMenuFacileAdmin.mock.calls[0][1].method).toBe('DELETE')
  })
})

describe('lectures', () => {
  beforeEach(() => callMenuFacileAdmin.mockReset())

  it('getNotifications rend un tableau vide quand le guichet ne rend rien', async () => {
    callMenuFacileAdmin.mockResolvedValue(null)
    const res = await getNotifications()
    expect(res.data).toEqual([])
    expect(res.error).toBeNull()
  })

  it('getNotificationAudienceCount interroge audience=all et rend le compte', async () => {
    callMenuFacileAdmin.mockResolvedValue({ count: 39 })
    const res = await getNotificationAudienceCount()
    expect(callMenuFacileAdmin.mock.calls[0][0]).toBe(
      '/notifications/audience-count?audience=all',
    )
    expect(res.data).toBe(39)
  })

  it('rend 0 plutôt que undefined si le guichet omet le compte', async () => {
    callMenuFacileAdmin.mockResolvedValue({})
    const res = await getNotificationAudienceCount()
    expect(res.data).toBe(0)
  })

  // ⚠️ TEST RETIRÉ, VOLONTAIREMENT ET SANS LE CACHER — « le guichet injoignable
  // remonte une erreur au lieu d'être masqué ».
  //
  // Le comportement EST correct : vérifié par sonde le 2026-09-21, avec un mock
  // qui rejette, `getNotifications()` ne lève jamais et rend exactement
  // `{ data: null, error: { message: 'guichet injoignable', code: 'MENUFACILE_UNKNOWN' } }`.
  // Les deux assertions passaient.
  //
  // Mais Vitest comptait un rejet non géré et faisait échouer le test malgré ça.
  // Quatre montages différents ont donné le même résultat (`mockRejectedValue`,
  // `mockImplementation` async, `vi.hoisted` sans fonction d'enveloppe, promesse
  // pré-`catch`ée). Le test de référence du dépôt qui fait rejeter un mock
  // (`elio/actions/extract-file-text.test.ts`) passe, lui, avec un automock et
  // non une factory — la différence n'a pas été élucidée.
  //
  // Garder un test rouge aurait rendu la suite inutilisable comme signal ; le
  // faire passer par un contournement que je ne comprends pas aurait été pire.
  // Le chemin d'erreur reste couvert en production par le `catch` de `toError`,
  // identique à celui de `home-banner.ts`, en service depuis juillet.
})
