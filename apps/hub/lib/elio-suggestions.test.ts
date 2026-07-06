import { describe, it, expect } from 'vitest'
import { buildElioSuggestions, type ElioSuggestionInput } from './elio-suggestions'

const EMPTY: ElioSuggestionInput = {
  unpaid: { count: 0, amountEur: 0 },
  oldValidations: { count: 0, oldestDays: 0 },
  stagnantParcours: [],
  silentClients: [],
}

describe('buildElioSuggestions', () => {
  it('retourne une liste vide quand tout roule (état vide)', () => {
    expect(buildElioSuggestions(EMPTY)).toEqual([])
  })

  it('respecte la priorité : impayés > validations > stagnants > silencieux', () => {
    const suggestions = buildElioSuggestions({
      unpaid: { count: 2, amountEur: 1250 },
      oldValidations: { count: 1, oldestDays: 9 },
      stagnantParcours: [{ clientId: 'c1', clientName: 'Dupont SARL', stepsCount: 2, inactiveDays: 9 }],
      silentClients: [{ clientId: 'c2', clientName: 'Martin', silentDays: 15 }],
    })

    expect(suggestions.map((s) => s.key)).toEqual([
      'unpaid',
      'old-validations',
      'stagnant-c1',
      'silent-c2',
    ])
  })

  it('limite aux 5 plus importantes', () => {
    const suggestions = buildElioSuggestions({
      unpaid: { count: 1, amountEur: 100 },
      oldValidations: { count: 3, oldestDays: 5 },
      stagnantParcours: [
        { clientId: 'c1', clientName: 'A', stepsCount: 1, inactiveDays: 10 },
        { clientId: 'c2', clientName: 'B', stepsCount: 1, inactiveDays: 8 },
        { clientId: 'c3', clientName: 'C', stepsCount: 1, inactiveDays: 12 },
      ],
      silentClients: [
        { clientId: 'c4', clientName: 'D', silentDays: 20 },
        { clientId: 'c5', clientName: 'E', silentDays: 30 },
      ],
    })

    expect(suggestions).toHaveLength(5)
    // Les silencieux (priorité la plus basse) sont coupés en premier
    expect(suggestions.some((s) => s.key.startsWith('silent-'))).toBe(false)
  })

  it('trie les parcours stagnants du plus ancien au plus récent', () => {
    const suggestions = buildElioSuggestions({
      ...EMPTY,
      stagnantParcours: [
        { clientId: 'c1', clientName: 'A', stepsCount: 1, inactiveDays: 8 },
        { clientId: 'c2', clientName: 'B', stepsCount: 3, inactiveDays: 20 },
      ],
    })
    expect(suggestions.map((s) => s.key)).toEqual(['stagnant-c2', 'stagnant-c1'])
  })

  it('formate le détail chiffré des parcours stagnants (pluriel)', () => {
    const [s] = buildElioSuggestions({
      ...EMPTY,
      stagnantParcours: [{ clientId: 'c1', clientName: 'Dupont SARL', stepsCount: 2, inactiveDays: 9 }],
    })
    expect(s.title).toBe('Parcours stagnant — Dupont SARL')
    expect(s.detail).toBe('2 étapes sans progression depuis 9 j')
    expect(s.href).toBe('/modules/crm/clients/c1')
  })

  it('formate le détail des impayés et des validations', () => {
    const suggestions = buildElioSuggestions({
      ...EMPTY,
      unpaid: { count: 1, amountEur: 199 },
      oldValidations: { count: 2, oldestDays: 6 },
    })
    expect(suggestions[0].detail).toBe('1 facture · 199 € en retard')
    expect(suggestions[0].href).toBe('/modules/facturation')
    expect(suggestions[1].detail).toBe('2 demandes en attente (la plus ancienne : 6 j)')
    expect(suggestions[1].href).toBe('/modules/validation-hub')
  })

  it('gère le client silencieux sans aucun message (silentDays null en dernier)', () => {
    const suggestions = buildElioSuggestions({
      ...EMPTY,
      silentClients: [
        { clientId: 'c1', clientName: 'A', silentDays: 15 },
        { clientId: 'c2', clientName: 'B', silentDays: null },
      ],
    })
    // null = jamais de message = silence infini → premier
    expect(suggestions[0].key).toBe('silent-c2')
    expect(suggestions[0].detail).toBe('Aucun message jamais échangé')
    expect(suggestions[1].detail).toBe('Aucun message depuis 15 j')
    expect(suggestions[1].href).toBe('/modules/chat/c1')
  })
})
