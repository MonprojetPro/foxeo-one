import { describe, it, expect } from 'vitest'
import {
  isInvoiceOverdue,
  getConsecutiveUnpaidCount,
  buildOverdueData,
  buildPaidData,
  shouldSendCriticalAlert,
  isPaidTransition,
  classifyInvoice,
  CONSECUTIVE_UNPAID_THRESHOLD,
} from './billing-sync-overdue-logic'

// ── isInvoiceOverdue ──────────────────────────────────────────────────────────

describe('isInvoiceOverdue', () => {
  const today = '2026-03-07'

  it('returns true when status=unpaid and deadline is before today', () => {
    expect(isInvoiceOverdue('unpaid', '2026-03-01', today)).toBe(true)
  })

  it('returns false when status=unpaid but deadline is today', () => {
    expect(isInvoiceOverdue('unpaid', '2026-03-07', today)).toBe(false)
  })

  it('returns false when status=unpaid but deadline is in the future', () => {
    expect(isInvoiceOverdue('unpaid', '2026-04-01', today)).toBe(false)
  })

  it('returns false when status=paid regardless of deadline', () => {
    expect(isInvoiceOverdue('paid', '2026-01-01', today)).toBe(false)
  })

  it('returns false when deadline is null', () => {
    expect(isInvoiceOverdue('unpaid', null, today)).toBe(false)
  })

  it('returns false when deadline is undefined', () => {
    expect(isInvoiceOverdue('unpaid', undefined, today)).toBe(false)
  })
})

// ── getConsecutiveUnpaidCount ─────────────────────────────────────────────────

describe('getConsecutiveUnpaidCount', () => {
  it('returns the count when it is a number', () => {
    expect(getConsecutiveUnpaidCount({ consecutive_unpaid_count: 3 })).toBe(3)
  })

  it('returns 0 when count is not present', () => {
    expect(getConsecutiveUnpaidCount({})).toBe(0)
  })

  it('returns 0 when count is not a number (string)', () => {
    expect(getConsecutiveUnpaidCount({ consecutive_unpaid_count: '2' })).toBe(0)
  })
})

// ── shouldSendCriticalAlert ───────────────────────────────────────────────────

describe('shouldSendCriticalAlert', () => {
  it(`returns true when count >= ${CONSECUTIVE_UNPAID_THRESHOLD}`, () => {
    expect(shouldSendCriticalAlert(CONSECUTIVE_UNPAID_THRESHOLD)).toBe(true)
    expect(shouldSendCriticalAlert(CONSECUTIVE_UNPAID_THRESHOLD + 1)).toBe(true)
  })

  it(`returns false when count < ${CONSECUTIVE_UNPAID_THRESHOLD}`, () => {
    expect(shouldSendCriticalAlert(CONSECUTIVE_UNPAID_THRESHOLD - 1)).toBe(false)
    expect(shouldSendCriticalAlert(0)).toBe(false)
  })
})

// ── isPaidTransition ──────────────────────────────────────────────────────────

describe('isPaidTransition', () => {
  it('returns true when previous=overdue and pennylane=paid', () => {
    expect(isPaidTransition('overdue', 'paid')).toBe(true)
  })

  it('returns true when previous=unpaid and pennylane=paid', () => {
    expect(isPaidTransition('unpaid', 'paid')).toBe(true)
  })

  it('returns false when pennylane is still unpaid', () => {
    expect(isPaidTransition('overdue', 'unpaid')).toBe(false)
  })

  it('returns false when previous is already paid', () => {
    expect(isPaidTransition('paid', 'paid')).toBe(false)
  })

  it('returns false when previous is undefined (new invoice)', () => {
    expect(isPaidTransition(undefined, 'paid')).toBe(false)
  })
})

// ── buildOverdueData ──────────────────────────────────────────────────────────

describe('buildOverdueData', () => {
  it('merges consecutive_unpaid_count into invoice data', () => {
    const data = { id: 'inv-1', status: 'unpaid', customer_id: 'cust-1' }
    const result = buildOverdueData(data, 2)
    expect(result.consecutive_unpaid_count).toBe(2)
    expect(result.id).toBe('inv-1')
    expect(result.status).toBe('unpaid')
  })
})

// ── buildPaidData ─────────────────────────────────────────────────────────────

describe('buildPaidData', () => {
  it('resets consecutive_unpaid_count to 0', () => {
    const data = { id: 'inv-1', consecutive_unpaid_count: 3 }
    const result = buildPaidData(data)
    expect(result.consecutive_unpaid_count).toBe(0)
    expect(result.id).toBe('inv-1')
  })
})

// ── classifyInvoice ───────────────────────────────────────────────────────────

describe('classifyInvoice', () => {
  const today = '2026-03-07'

  it('detects newly overdue invoice (unpaid + deadline passed, not yet in DB as overdue)', () => {
    const result = classifyInvoice(
      'unpaid',
      '2026-03-01',
      today,
      { pennylane_id: 'inv-1', status: 'unpaid', data: {} }
    )
    expect(result.isNewlyOverdue).toBe(true)
    expect(result.wasAlreadyOverdue).toBe(false)
    expect(result.isPaidFromOverdue).toBe(false)
    expect(result.newConsecutiveCount).toBe(1)
  })

  it('increments consecutive count for already-overdue invoice', () => {
    const result = classifyInvoice(
      'unpaid',
      '2026-03-01',
      today,
      { pennylane_id: 'inv-1', status: 'overdue', data: { consecutive_unpaid_count: 2 } }
    )
    expect(result.isNewlyOverdue).toBe(false)
    expect(result.wasAlreadyOverdue).toBe(true)
    expect(result.newConsecutiveCount).toBe(3)
  })

  it('detects paid transition from overdue', () => {
    const result = classifyInvoice(
      'paid',
      '2026-03-01',
      today,
      { pennylane_id: 'inv-1', status: 'overdue', data: { consecutive_unpaid_count: 2 } }
    )
    expect(result.isPaidFromOverdue).toBe(true)
    expect(result.isNewlyOverdue).toBe(false)
    expect(result.newConsecutiveCount).toBe(0)
  })

  it('returns no action for invoice not yet overdue', () => {
    const result = classifyInvoice(
      'unpaid',
      '2026-04-01',
      today,
      { pennylane_id: 'inv-1', status: 'unpaid', data: {} }
    )
    expect(result.isNewlyOverdue).toBe(false)
    expect(result.wasAlreadyOverdue).toBe(false)
    expect(result.isPaidFromOverdue).toBe(false)
    expect(result.newConsecutiveCount).toBe(0)
  })

  it('returns no action for new invoice (no existing state)', () => {
    const result = classifyInvoice('unpaid', '2026-04-01', today, undefined)
    expect(result.isNewlyOverdue).toBe(false)
    expect(result.isPaidFromOverdue).toBe(false)
  })

  it('detects critical alert threshold on third consecutive', () => {
    const result = classifyInvoice(
      'unpaid',
      '2026-02-01',
      today,
      { pennylane_id: 'inv-1', status: 'overdue', data: { consecutive_unpaid_count: 2 } }
    )
    expect(shouldSendCriticalAlert(result.newConsecutiveCount)).toBe(true)
  })

  it('does not flag normal paid invoice as paid transition', () => {
    const result = classifyInvoice(
      'paid',
      '2026-04-01',
      today,
      { pennylane_id: 'inv-1', status: 'paid', data: {} }
    )
    expect(result.isPaidFromOverdue).toBe(false)
  })

  it('handles invoice with no existing DB entry gracefully', () => {
    const result = classifyInvoice('unpaid', '2026-02-01', today, undefined)
    expect(result.isNewlyOverdue).toBe(true)
    expect(result.newConsecutiveCount).toBe(1)
  })
})
