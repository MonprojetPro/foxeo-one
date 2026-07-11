import { describe, it, expect } from 'vitest'
import {
  aggregateOneActivity,
  extractClientIdFromEscalationLink,
  type GraduatedClientBase,
  type RawEscalation,
  type RawEvolutionRequest,
  type RawTokenRow,
} from '../types/one-activity.types'

const CLIENT_A = 'aaaaaaaa-1111-2222-3333-444444444444'
const CLIENT_B = 'bbbbbbbb-1111-2222-3333-444444444444'

const graduated: GraduatedClientBase[] = [
  { id: CLIENT_A, name: 'Alice SAS' },
  { id: CLIENT_B, name: 'Bob SARL' },
]

describe('extractClientIdFromEscalationLink', () => {
  it('extrait le clientId du lien standard d’escalade', () => {
    expect(
      extractClientIdFromEscalationLink(`/modules/crm/clients/${CLIENT_A}?tab=echanges`),
    ).toBe(CLIENT_A)
  })

  it('retourne null pour un lien nul ou hors pattern', () => {
    expect(extractClientIdFromEscalationLink(null)).toBeNull()
    expect(extractClientIdFromEscalationLink('/modules/validation-hub')).toBeNull()
  })
})

describe('aggregateOneActivity', () => {
  it('initialise une ligne par client gradué même sans activité (compteurs à 0)', () => {
    const rows = aggregateOneActivity(graduated, [], [], [])
    expect(rows).toHaveLength(2)
    for (const row of rows) {
      expect(row.escalations).toBe(0)
      expect(row.evolutionRequests).toBe(0)
      expect(row.inputTokens).toBe(0)
      expect(row.outputTokens).toBe(0)
      expect(row.costEur).toBe(0)
    }
  })

  it('compte les escalades via le clientId extrait du link', () => {
    const escalations: RawEscalation[] = [
      { link: `/modules/crm/clients/${CLIENT_A}?tab=echanges` },
      { link: `/modules/crm/clients/${CLIENT_A}?tab=echanges` },
      { link: `/modules/crm/clients/${CLIENT_B}?tab=echanges` },
      { link: null }, // ignorée
    ]
    const rows = aggregateOneActivity(graduated, escalations, [], [])
    const a = rows.find((r) => r.clientId === CLIENT_A)!
    const b = rows.find((r) => r.clientId === CLIENT_B)!
    expect(a.escalations).toBe(2)
    expect(b.escalations).toBe(1)
  })

  it('compte les demandes d’évolution par client', () => {
    const evolutions: RawEvolutionRequest[] = [
      { client_id: CLIENT_A },
      { client_id: CLIENT_B },
      { client_id: CLIENT_B },
      { client_id: null }, // ignorée
    ]
    const rows = aggregateOneActivity(graduated, [], evolutions, [])
    expect(rows.find((r) => r.clientId === CLIENT_A)!.evolutionRequests).toBe(1)
    expect(rows.find((r) => r.clientId === CLIENT_B)!.evolutionRequests).toBe(2)
  })

  it('somme les tokens et le coût par client', () => {
    const tokens: RawTokenRow[] = [
      { client_id: CLIENT_A, input_tokens: 100, output_tokens: 50, cost_eur: 0.01 },
      { client_id: CLIENT_A, input_tokens: 200, output_tokens: 80, cost_eur: 0.02 },
      { client_id: CLIENT_B, input_tokens: 10, output_tokens: 5, cost_eur: 0.001 },
    ]
    const rows = aggregateOneActivity(graduated, [], [], tokens)
    const a = rows.find((r) => r.clientId === CLIENT_A)!
    expect(a.inputTokens).toBe(300)
    expect(a.outputTokens).toBe(130)
    expect(a.costEur).toBeCloseTo(0.03, 6)
  })

  it('ignore les activités rattachées à un client non gradué', () => {
    const tokens: RawTokenRow[] = [
      { client_id: 'zzzzzzzz-9999-9999-9999-999999999999', input_tokens: 999, output_tokens: 999, cost_eur: 9 },
    ]
    const rows = aggregateOneActivity(graduated, [], [], tokens)
    expect(rows).toHaveLength(2)
    expect(rows.every((r) => r.inputTokens === 0)).toBe(true)
  })

  it('trie les clients les plus actifs en premier', () => {
    const escalations: RawEscalation[] = [{ link: `/modules/crm/clients/${CLIENT_B}?tab=echanges` }]
    const tokens: RawTokenRow[] = [
      { client_id: CLIENT_B, input_tokens: 500, output_tokens: 500, cost_eur: 0.1 },
    ]
    const rows = aggregateOneActivity(graduated, escalations, [], tokens)
    expect(rows[0]!.clientId).toBe(CLIENT_B) // plus actif → en tête
    expect(rows[1]!.clientId).toBe(CLIENT_A)
  })
})
