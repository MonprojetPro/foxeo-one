import { describe, it, expect, vi, beforeEach } from 'vitest'

// F-049 — contrat côté Hub des corrections de rayon. Le guichet est mocké : ce
// qui est vérifié ici, c'est le chemin appelé et la forme du corps envoyé, pas le
// comportement du guichet. Même montage que notifications.test.ts (mock exposé
// directement, sans enveloppe, pour que les rejets restent la même instance).
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
  getAisleCorrections,
  promoteAisleCorrection,
  revokeAisleCorrection,
  dismissAisleCorrection,
  restoreAisleCorrection,
} = await import('./aisle-corrections')

beforeEach(() => {
  callMenuFacileAdmin.mockReset()
})

describe('getAisleCorrections', () => {
  it('appelle le bon chemin et rend la liste', async () => {
    callMenuFacileAdmin.mockResolvedValue([
      { ingredient_key: 'oeuf', ingredient_label: 'Œufs', aisle: 'Épicerie' },
    ])
    const res = await getAisleCorrections()
    expect(callMenuFacileAdmin).toHaveBeenCalledWith('/aisle-corrections')
    expect(res.data).toHaveLength(1)
  })

  it('rend une liste vide, jamais undefined, quand le guichet ne renvoie rien', async () => {
    // Sans ce repli, l'écran du Hub planterait sur `.filter` au premier rendu.
    callMenuFacileAdmin.mockResolvedValue(null)
    const res = await getAisleCorrections()
    expect(res.data).toEqual([])
  })

  it('transporte le code HTTP du guichet dans le code d’erreur', async () => {
    const { MenuFacileAdminError } = await import('./admin-client')
    callMenuFacileAdmin.mockRejectedValue(new MenuFacileAdminError('indisponible', 503))
    const res = await getAisleCorrections()
    expect(res.error?.code).toBe('MENUFACILE_HTTP_503')
  })
})

describe('promoteAisleCorrection', () => {
  it('envoie la CLÉ de l’ingrédient, pas son libellé — c’est elle qui est promue', async () => {
    callMenuFacileAdmin.mockResolvedValue({ ok: true })
    await promoteAisleCorrection({
      ingredientKey: 'oeuf',
      ingredientLabel: 'Œufs',
      aisle: 'Épicerie',
      householdId: 'h1',
    })
    const [path, init] = callMenuFacileAdmin.mock.calls[0]
    expect(path).toBe('/aisle-corrections/promote')
    expect(JSON.parse((init as RequestInit).body as string)).toEqual({
      ingredient_key: 'oeuf',
      ingredient_label: 'Œufs',
      aisle: 'Épicerie',
      household_id: 'h1',
    })
  })

  it('envoie household_id à null quand l’origine n’est pas connue', async () => {
    callMenuFacileAdmin.mockResolvedValue({ ok: true })
    await promoteAisleCorrection({
      ingredientKey: 'oeuf',
      ingredientLabel: 'Œufs',
      aisle: 'Épicerie',
    })
    const [, init] = callMenuFacileAdmin.mock.calls[0]
    expect(JSON.parse((init as RequestInit).body as string).household_id).toBeNull()
  })
})

describe('revokeAisleCorrection', () => {
  it('appelle le chemin de retrait avec la seule clé', async () => {
    callMenuFacileAdmin.mockResolvedValue({ ok: true })
    const res = await revokeAisleCorrection({ ingredientKey: 'oeuf' })
    const [path, init] = callMenuFacileAdmin.mock.calls[0]
    expect(path).toBe('/aisle-corrections/revoke')
    expect(JSON.parse((init as RequestInit).body as string)).toEqual({ ingredient_key: 'oeuf' })
    expect(res.data).toBe(true)
  })
})

// ── F-049a — ecarter / remettre a l'etude ───────────────────────────────────
// Ce qui est verifie ici n'est pas que l'appel part, mais QUEL COUPLE il vise.
// dismiss et restore portent sur (foyer, ingredient), contrairement a promote
// et revoke qui portent sur l'ingredient seul : envoyer la mauvaise cle
// ecarterait le choix de TOUS les foyers d'un coup, en silence.
describe('dismissAisleCorrection / restoreAisleCorrection', () => {
  it('dismiss vise le couple (foyer, ingredient), pas l’ingredient seul', async () => {
    callMenuFacileAdmin.mockResolvedValue({ ok: true })
    await dismissAisleCorrection({ householdId: 'h1', ingredientKey: 'boeuf hache' })
    const [path, init] = callMenuFacileAdmin.mock.calls[0]
    expect(path).toBe('/aisle-corrections/dismiss')
    expect(JSON.parse((init as RequestInit).body as string)).toEqual({
      household_id: 'h1',
      ingredient_key: 'boeuf hache',
    })
  })

  it('restore vise le meme couple, sur son propre chemin', async () => {
    callMenuFacileAdmin.mockResolvedValue({ ok: true })
    const res = await restoreAisleCorrection({ householdId: 'h1', ingredientKey: 'boeuf hache' })
    const [path, init] = callMenuFacileAdmin.mock.calls[0]
    expect(path).toBe('/aisle-corrections/restore')
    expect(JSON.parse((init as RequestInit).body as string)).toEqual({
      household_id: 'h1',
      ingredient_key: 'boeuf hache',
    })
    expect(res.data).toBe(true)
  })

  it('remonte l’erreur du guichet au lieu de faire croire a un succes', async () => {
    const { MenuFacileAdminError } = await import('./admin-client')
    callMenuFacileAdmin.mockRejectedValue(new MenuFacileAdminError('indisponible', 503))
    const res = await dismissAisleCorrection({ householdId: 'h1', ingredientKey: 'x' })
    expect(res.error?.code).toBe('MENUFACILE_HTTP_503')
    // `errorResponse` du projet pose `data: null` — ce qui compte est qu'aucune
    // donnee ne soit rendue, pas la forme exacte du vide.
    expect(res.data).toBeNull()
  })
})
