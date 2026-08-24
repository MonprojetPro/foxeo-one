import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'

const FUNCTION_DIR = join(__dirname, '..', 'supabase', 'functions', 'calcom-webhook')

describe('Cal.com Webhook Edge Function', () => {
  it('index.ts exists', () => {
    expect(existsSync(join(FUNCTION_DIR, 'index.ts'))).toBe(true)
  })

  it('uses Supabase client from ESM', () => {
    const content = readFileSync(join(FUNCTION_DIR, 'index.ts'), 'utf-8')
    expect(content).toContain("from 'https://esm.sh/@supabase/supabase-js@2'")
  })

  it('verifies Cal.com webhook signature', () => {
    const content = readFileSync(join(FUNCTION_DIR, 'index.ts'), 'utf-8')
    expect(content).toContain('CALCOM_WEBHOOK_SECRET')
    expect(content).toContain('x-cal-signature-256')
    expect(content).toContain('verifyCalcomSignature')
  })

  it('handles BOOKING_CREATED event', () => {
    const content = readFileSync(join(FUNCTION_DIR, 'index.ts'), 'utf-8')
    expect(content).toContain('BOOKING_CREATED')
  })

  it('creates meeting on booking', () => {
    const content = readFileSync(join(FUNCTION_DIR, 'index.ts'), 'utf-8')
    expect(content).toContain("from('meetings')")
    expect(content).toContain('.insert(')
  })

  // La table meeting_requests a ete supprimee par la migration 00108 : le rendez-vous
  // est desormais enregistre directement dans meetings. Ce cas garde la trace de cette
  // suppression et empechera une reintroduction accidentelle.
  it("n'ecrit plus dans la table supprimee meeting_requests", () => {
    const content = readFileSync(join(FUNCTION_DIR, 'index.ts'), 'utf-8')
    expect(content).not.toContain("from('meeting_requests')")
  })

  it('sends notification to client', () => {
    const content = readFileSync(join(FUNCTION_DIR, 'index.ts'), 'utf-8')
    expect(content).toContain("from('notifications')")
    expect(content).toContain('RDV confirmé')
  })

  it('handles missing metadata gracefully', () => {
    const content = readFileSync(join(FUNCTION_DIR, 'index.ts'), 'utf-8')
    expect(content).toContain('Missing clientId or operatorId')
    expect(content).toContain("'Missing metadata'")
    expect(content).toContain('400')
  })

  it('ignores non-booking events', () => {
    const content = readFileSync(join(FUNCTION_DIR, 'index.ts'), 'utf-8')
    expect(content).toContain('Event ignored')
  })

  it('uses VISIO:CALCOM_WEBHOOK logging prefix', () => {
    const content = readFileSync(join(FUNCTION_DIR, 'index.ts'), 'utf-8')
    expect(content).toContain('[VISIO:CALCOM_WEBHOOK]')
  })
})
