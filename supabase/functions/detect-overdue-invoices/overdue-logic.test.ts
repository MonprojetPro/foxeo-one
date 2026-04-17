import { describe, it, expect } from 'vitest'
import {
  getDaysSince,
  getReminderLevel,
  hasExistingReminder,
  buildReminderPrompt,
  formatCommunicationProfile,
  type ReminderLevel,
} from './overdue-logic'

describe('getDaysSince', () => {
  it('calcule 7 jours', () => {
    expect(getDaysSince('2026-04-01', '2026-04-08')).toBe(7)
  })

  it('calcule 14 jours', () => {
    expect(getDaysSince('2026-04-01', '2026-04-15')).toBe(14)
  })

  it('calcule 30 jours', () => {
    expect(getDaysSince('2026-04-01', '2026-05-01')).toBe(30)
  })

  it('retourne 0 pour le même jour', () => {
    expect(getDaysSince('2026-04-01', '2026-04-01')).toBe(0)
  })
})

describe('getReminderLevel', () => {
  it('retourne 1 dans la fenêtre J+7 ±2 (bord bas)', () => {
    expect(getReminderLevel(5)).toBe(1)
  })

  it('retourne 1 dans la fenêtre J+7 ±2 (cible)', () => {
    expect(getReminderLevel(7)).toBe(1)
  })

  it('retourne 1 dans la fenêtre J+7 ±2 (bord haut)', () => {
    expect(getReminderLevel(9)).toBe(1)
  })

  it('retourne 2 dans la fenêtre J+14 ±2', () => {
    expect(getReminderLevel(12)).toBe(2)
    expect(getReminderLevel(14)).toBe(2)
    expect(getReminderLevel(16)).toBe(2)
  })

  it('retourne 3 dans la fenêtre J+30 ±2', () => {
    expect(getReminderLevel(28)).toBe(3)
    expect(getReminderLevel(30)).toBe(3)
    expect(getReminderLevel(32)).toBe(3)
  })

  it('retourne null hors fenêtres', () => {
    expect(getReminderLevel(0)).toBeNull()
    expect(getReminderLevel(4)).toBeNull()
    expect(getReminderLevel(10)).toBeNull()
    expect(getReminderLevel(11)).toBeNull()
    expect(getReminderLevel(17)).toBeNull()
    expect(getReminderLevel(27)).toBeNull()
    expect(getReminderLevel(33)).toBeNull()
  })
})

describe('hasExistingReminder', () => {
  const existing = [
    { invoice_id: 'inv-1', reminder_level: 1 },
    { invoice_id: 'inv-2', reminder_level: 2 },
  ]

  it('retourne true si relance niveau 1 existante pour inv-1', () => {
    expect(hasExistingReminder(existing, 'inv-1', 1 as ReminderLevel)).toBe(true)
  })

  it('retourne true si relance niveau 2 existante pour inv-2', () => {
    expect(hasExistingReminder(existing, 'inv-2', 2 as ReminderLevel)).toBe(true)
  })

  it('retourne false si niveau différent pour même facture', () => {
    expect(hasExistingReminder(existing, 'inv-1', 2 as ReminderLevel)).toBe(false)
  })

  it('retourne false si facture différente', () => {
    expect(hasExistingReminder(existing, 'inv-3', 1 as ReminderLevel)).toBe(false)
  })

  it('retourne false si liste vide', () => {
    expect(hasExistingReminder([], 'inv-1', 1 as ReminderLevel)).toBe(false)
  })
})

describe('buildReminderPrompt', () => {
  it('génère un prompt avec profil communication', () => {
    const { systemPrompt, message } = buildReminderPrompt({
      firstName: 'Marie',
      communicationProfile: 'Direct et concis',
      level: 1 as ReminderLevel,
      daysOverdue: 7,
      invoiceNumber: 'F-2026-001',
      amount: 1500,
      invoiceDate: '2026-04-01',
    })

    expect(systemPrompt).toContain('Marie')
    expect(systemPrompt).toContain('Direct et concis')
    expect(systemPrompt).toContain('Niveau 1')
    expect(systemPrompt).toContain('7 jours de retard')
    expect(systemPrompt).toContain('F-2026-001')
    expect(systemPrompt).toContain('1500€')
    expect(message).toContain('niveau 1')
    expect(message).toContain('Marie')
  })

  it('utilise un profil standard si communication_profile est null', () => {
    const { systemPrompt } = buildReminderPrompt({
      firstName: 'Jean',
      communicationProfile: null,
      level: 3 as ReminderLevel,
      daysOverdue: 30,
      invoiceNumber: 'F-2026-002',
      amount: 500,
      invoiceDate: '2026-03-15',
    })

    expect(systemPrompt).toContain('Standard, professionnel')
    expect(systemPrompt).toContain('Niveau 3')
    expect(systemPrompt).toContain('30 jours de retard')
  })

  it('inclut le niveau 2 dans le prompt', () => {
    const { systemPrompt } = buildReminderPrompt({
      firstName: 'Paul',
      communicationProfile: null,
      level: 2 as ReminderLevel,
      daysOverdue: 14,
      invoiceNumber: 'F-2026-003',
      amount: 800,
      invoiceDate: '2026-04-03',
    })

    expect(systemPrompt).toContain('Niveau 2')
  })
})

describe('formatCommunicationProfile', () => {
  it('formate le profil avec traduction française', () => {
    const result = formatCommunicationProfile({
      preferred_tone: 'formal',
      preferred_length: 'concise',
      interaction_style: 'directive',
    })
    expect(result).toBe('Ton formel, style concis')
  })

  it('retourne null si profil absent', () => {
    expect(formatCommunicationProfile(null)).toBeNull()
  })

  it('formate un profil amical détaillé', () => {
    const result = formatCommunicationProfile({
      preferred_tone: 'friendly',
      preferred_length: 'detailed',
      interaction_style: 'collaborative',
    })
    expect(result).toBe('Ton amical, style détaillé')
  })
})
