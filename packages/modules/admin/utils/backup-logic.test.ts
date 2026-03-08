import { describe, it, expect } from 'vitest'
import {
  getWeeklyBackupPath,
  parseBackupDateFromPath,
  selectBackupDatesToCleanup,
  buildClientBackupPayload,
  buildBackupEntry,
  updateBackupHistory,
} from './backup-logic'

describe('backup-logic', () => {
  describe('getWeeklyBackupPath', () => {
    it('generates the correct storage path from a date and clientId (no bucket prefix)', () => {
      const date = new Date('2026-03-09T03:00:00Z')
      const path = getWeeklyBackupPath(date, 'client-uuid-123')
      expect(path).toBe('2026-03-09/clients/client-uuid-123.json')
    })

    it('pads month and day with leading zeros', () => {
      const date = new Date('2026-01-05T03:00:00Z')
      const path = getWeeklyBackupPath(date, 'abc')
      expect(path).toBe('2026-01-05/clients/abc.json')
    })
  })

  describe('parseBackupDateFromPath', () => {
    it('returns a Date from a valid date folder name', () => {
      const date = parseBackupDateFromPath('2026-03-09')
      expect(date).not.toBeNull()
      expect(date?.getUTCFullYear()).toBe(2026)
      expect(date?.getUTCMonth()).toBe(2) // March = index 2
      expect(date?.getUTCDate()).toBe(9)
    })

    it('returns a Date from a path starting with a date', () => {
      const date = parseBackupDateFromPath('2026-03-09/clients/client.json')
      expect(date).not.toBeNull()
      expect(date?.getUTCFullYear()).toBe(2026)
    })

    it('returns null for paths that do not match the pattern', () => {
      expect(parseBackupDateFromPath('uploads/2026-03-09/file.json')).toBeNull()
      expect(parseBackupDateFromPath('invalid-date')).toBeNull()
      expect(parseBackupDateFromPath('')).toBeNull()
    })
  })

  describe('selectBackupDatesToCleanup', () => {
    it('returns empty array when below or at the limit', () => {
      const dates = ['2026-01-01', '2026-01-08', '2026-01-15']
      expect(selectBackupDatesToCleanup(dates, 52)).toEqual([])
      expect(selectBackupDatesToCleanup(dates, 3)).toEqual([])
    })

    it('returns the oldest dates to delete when above the limit', () => {
      const dates = ['2026-01-15', '2026-01-01', '2026-01-08', '2026-01-22']
      const toDelete = selectBackupDatesToCleanup(dates, 2)
      // sorted: 2026-01-01, 2026-01-08, 2026-01-15, 2026-01-22
      // keep last 2: 2026-01-15, 2026-01-22 → delete: 2026-01-01, 2026-01-08
      expect(toDelete).toEqual(['2026-01-01', '2026-01-08'])
    })
  })

  describe('buildClientBackupPayload', () => {
    it('returns a payload with clientId and exportedAt timestamp', () => {
      const payload = buildClientBackupPayload('client-abc', { clients: [{ id: 'client-abc' }] })
      expect(payload.clientId).toBe('client-abc')
      expect(payload.tables.clients).toHaveLength(1)
      expect(payload.exportedAt).toBeTruthy()
      expect(new Date(payload.exportedAt).toISOString()).toBe(payload.exportedAt)
    })
  })

  describe('buildBackupEntry', () => {
    it('builds an entry with correct status and defaults to cron trigger', () => {
      const date = new Date('2026-03-09T03:00:00Z')
      const entry = buildBackupEntry(date, 5, 1024)
      expect(entry.status).toBe('success')
      expect(entry.clientsCount).toBe(5)
      expect(entry.sizeBytes).toBe(1024)
      expect(entry.triggeredBy).toBe('cron')
      expect(entry.date).toBe(date.toISOString())
    })

    it('supports manual trigger and custom status', () => {
      const entry = buildBackupEntry(new Date(), 0, 0, 'manual', 'failed')
      expect(entry.triggeredBy).toBe('manual')
      expect(entry.status).toBe('failed')
    })
  })

  describe('updateBackupHistory', () => {
    it('prepends new entry and keeps up to maxEntries', () => {
      const existing = Array.from({ length: 30 }, (_, i) => ({
        date: new Date(2026, 0, i + 1).toISOString(),
        status: 'success' as const,
        clientsCount: 1,
        sizeBytes: 100,
        triggeredBy: 'cron' as const,
      }))
      const newEntry = buildBackupEntry(new Date(), 5, 500)
      const updated = updateBackupHistory(existing, newEntry, 30)
      expect(updated).toHaveLength(30)
      expect(updated[0]).toBe(newEntry)
    })

    it('adds to empty history', () => {
      const entry = buildBackupEntry(new Date(), 2, 200)
      const updated = updateBackupHistory([], entry)
      expect(updated).toHaveLength(1)
      expect(updated[0]).toBe(entry)
    })
  })
})
