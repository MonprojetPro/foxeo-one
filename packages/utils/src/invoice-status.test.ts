import { describe, it, expect } from 'vitest'
import {
  isInvoiceAwaitingPayment,
  isInvoicePastDue,
  PAST_DUE_STATUS_LIST,
  SETTLED_STATUS_SQL_LIST,
} from './invoice-status'

// T-083a — le Hub cherchait `unpaid`, Pennylane V2 dit `late`. Aucune alerte de
// retard n'est jamais partie, et le client ne voyait plus son bouton « Payer ».
describe('isInvoicePastDue (T-083a)', () => {
  it('reconnait le mot de Pennylane V2', () => {
    expect(isInvoicePastDue('late')).toBe(true)
  })

  it('reconnait aussi notre marqueur et l ancien mot', () => {
    expect(isInvoicePastDue('overdue')).toBe(true)
    expect(isInvoicePastDue('unpaid')).toBe(true)
  })

  it("ne compte PAS une facture emise mais pas encore echue", () => {
    expect(isInvoicePastDue('upcoming')).toBe(false)
  })

  it('ne compte pas ce qui est solde ou annule', () => {
    for (const s of ['paid', 'draft', 'cancelled', 'archived', 'deleted']) {
      expect(isInvoicePastDue(s)).toBe(false)
    }
  })
})

describe('isInvoiceAwaitingPayment', () => {
  it('compte tout ce qui est emis et non encaisse', () => {
    for (const s of ['upcoming', 'late', 'unpaid', 'overdue', 'partially_paid']) {
      expect(isInvoiceAwaitingPayment(s)).toBe(true)
    }
  })

  it("exclut ce qui n'est pas du", () => {
    for (const s of ['paid', 'draft', 'cancelled', 'archived', 'deleted']) {
      expect(isInvoiceAwaitingPayment(s)).toBe(false)
    }
  })

  // Le coeur du defaut : un mot inconnu doit etre compte comme du, pas ignore.
  it('compte un statut INCONNU plutot que de l ignorer en silence', () => {
    expect(isInvoiceAwaitingPayment('un_mot_que_pennylane_inventera')).toBe(true)
  })
})

describe('listes pour les requetes', () => {
  it('la liste « en retard » couvre les trois mots', () => {
    expect([...PAST_DUE_STATUS_LIST].sort()).toEqual(['late', 'overdue', 'unpaid'])
  })

  // Forme PostgREST : valeurs entre guillemets, comme `start-handoff.ts`.
  // Sans les guillemets le filtre est accepte mais ne filtre pas ce qu'on croit.
  it('le filtre negatif enumere exactement les statuts soldes', () => {
    expect(SETTLED_STATUS_SQL_LIST).toBe('("paid","draft","cancelled","archived","deleted")')
  })

  // Verrou : les deux definitions doivent rester d'accord entre elles.
  it('tout statut « en retard » est aussi « en attente de paiement »', () => {
    for (const s of PAST_DUE_STATUS_LIST) {
      expect(isInvoiceAwaitingPayment(s)).toBe(true)
    }
  })
})
