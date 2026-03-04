import { describe, it, expect } from 'vitest'
import { HUB_DATABASE_SCHEMAS } from './hub-database-schemas'

describe('HUB_DATABASE_SCHEMAS (Story 8.5 — Task 8)', () => {
  it('Task 8.1 — est une chaîne non vide', () => {
    expect(typeof HUB_DATABASE_SCHEMAS).toBe('string')
    expect(HUB_DATABASE_SCHEMAS.trim().length).toBeGreaterThan(0)
  })

  it('Task 8.2 — contient la table clients avec ses colonnes clés', () => {
    expect(HUB_DATABASE_SCHEMAS).toContain('Table clients')
    expect(HUB_DATABASE_SCHEMAS).toContain('operator_id')
    expect(HUB_DATABASE_SCHEMAS).toContain('client_type')
  })

  it('Task 8.2 — contient la table validation_requests', () => {
    expect(HUB_DATABASE_SCHEMAS).toContain('validation_requests')
    expect(HUB_DATABASE_SCHEMAS).toContain('client_id')
  })

  it('Task 8.2 — contient la table elio_messages', () => {
    expect(HUB_DATABASE_SCHEMAS).toContain('elio_messages')
    expect(HUB_DATABASE_SCHEMAS).toContain('conversation_id')
  })

  it('Task 8.2 — contient la table parcours', () => {
    expect(HUB_DATABASE_SCHEMAS).toContain('Table parcours')
    expect(HUB_DATABASE_SCHEMAS).toContain('current_step')
    expect(HUB_DATABASE_SCHEMAS).toContain('total_steps')
  })
})
