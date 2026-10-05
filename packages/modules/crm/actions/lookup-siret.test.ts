import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Opérateur authentifié par défaut — chaque test peut le renverser.
const mockGetUser = vi.fn()
const mockMaybeSingle = vi.fn()

vi.mock('@monprojetpro/supabase', () => ({
  createServerSupabaseClient: vi.fn(() => ({
    auth: { getUser: mockGetUser },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({ maybeSingle: mockMaybeSingle })),
      })),
    })),
  })),
}))

// Réponse réelle de l'API Recherche d'entreprises pour HABITAT 77, réduite aux
// champs que l'on lit (capturée le 2026-10-05).
const HABITAT_77 = {
  results: [
    {
      siren: '400730529',
      nom_complet: 'HABITAT 77',
      nom_raison_sociale: 'HABITAT 77',
      activite_principale: '68.31Z',
      section_activite_principale: 'L',
      siege: {
        siret: '40073052900023',
        adresse: '34 RUE DE MELUN 77930 PERTHES',
        code_postal: '77930',
        libelle_commune: 'PERTHES',
        activite_principale: '68.31Z',
        etat_administratif: 'A',
      },
      matching_etablissements: [
        {
          siret: '40073052900023',
          adresse: '34 RUE DE MELUN 77930 PERTHES',
          code_postal: '77930',
          libelle_commune: 'PERTHES',
          activite_principale: '68.31Z',
          etat_administratif: 'A',
        },
      ],
    },
  ],
}

function mockFetchOnce(payload: unknown, ok = true, status = 200) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok,
      status,
      json: async () => payload,
    })
  )
}

describe('lookupSiret', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({ data: { user: { id: 'auth-1' } } })
    mockMaybeSingle.mockResolvedValue({ data: { id: 'operator-1' } })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('refuse un appel non authentifié avant même de sortir sur Internet', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    mockFetchOnce(HABITAT_77)

    const { lookupSiret } = await import('./lookup-siret')
    const result = await lookupSiret('40073052900023')

    expect(result.error?.code).toBe('UNAUTHORIZED')
    expect(fetch).not.toHaveBeenCalled()
  })

  it('refuse un SIRET mal formé sans appeler l’API', async () => {
    mockFetchOnce(HABITAT_77)

    const { lookupSiret } = await import('./lookup-siret')
    const result = await lookupSiret('400730529')

    expect(result.error?.code).toBe('INVALID_SIRET')
    expect(fetch).not.toHaveBeenCalled()
  })

  it('refuse un SIRET dont la clé de contrôle est fausse', async () => {
    mockFetchOnce(HABITAT_77)

    const { lookupSiret } = await import('./lookup-siret')
    const result = await lookupSiret('40073052900024')

    expect(result.error?.code).toBe('INVALID_SIRET')
    expect(fetch).not.toHaveBeenCalled()
  })

  it('extrait raison sociale, adresse, ville et secteur', async () => {
    mockFetchOnce(HABITAT_77)

    const { lookupSiret } = await import('./lookup-siret')
    const result = await lookupSiret('400 730 529 00023')

    expect(result.error).toBeNull()
    expect(result.data?.companyName).toBe('HABITAT 77')
    // Le code postal et la commune sont retirés de la rue : Pennylane a ses
    // propres champs, on ne veut pas les voir deux fois sur la facture.
    expect(result.data?.address).toBe('34 RUE DE MELUN')
    expect(result.data?.postalCode).toBe('77930')
    expect(result.data?.city).toBe('PERTHES')
    expect(result.data?.nafCode).toBe('68.31Z')
    expect(result.data?.sector).toBe('Activités immobilières')
    expect(result.data?.closed).toBe(false)
  })

  it('ne casse pas sur un nom de commune contenant une parenthèse', async () => {
    mockFetchOnce({
      results: [
        {
          nom_complet: 'ASSOC TEST',
          section_activite_principale: 'S',
          matching_etablissements: [
            {
              siret: '40073052900023',
              adresse: '1 RUE DU TEST 20000 AJACCIO (CORSE)',
              code_postal: '20000',
              libelle_commune: 'AJACCIO (CORSE)',
              etat_administratif: 'A',
            },
          ],
        },
      ],
    })

    const { lookupSiret } = await import('./lookup-siret')
    const result = await lookupSiret('40073052900023')

    expect(result.error).toBeNull()
    expect(result.data?.address).toBe('1 RUE DU TEST')
  })

  it('signale un établissement fermé sans refuser la donnée', async () => {
    mockFetchOnce({
      results: [
        {
          nom_complet: 'ENTREPRISE FERMEE',
          matching_etablissements: [
            { siret: '40073052900023', etat_administratif: 'F', adresse: '1 RUE X 75001 PARIS', code_postal: '75001', libelle_commune: 'PARIS' },
          ],
        },
      ],
    })

    const { lookupSiret } = await import('./lookup-siret')
    const result = await lookupSiret('40073052900023')

    expect(result.data?.closed).toBe(true)
    expect(result.data?.companyName).toBe('ENTREPRISE FERMEE')
  })

  it('rend SIRET_NOT_FOUND quand l’API ne renvoie aucun résultat', async () => {
    mockFetchOnce({ results: [] })

    const { lookupSiret } = await import('./lookup-siret')
    const result = await lookupSiret('40073052900023')

    expect(result.error?.code).toBe('SIRET_NOT_FOUND')
  })

  it('rend LOOKUP_UNAVAILABLE sur une erreur HTTP', async () => {
    mockFetchOnce({}, false, 503)

    const { lookupSiret } = await import('./lookup-siret')
    const result = await lookupSiret('40073052900023')

    expect(result.error?.code).toBe('LOOKUP_UNAVAILABLE')
  })
})
