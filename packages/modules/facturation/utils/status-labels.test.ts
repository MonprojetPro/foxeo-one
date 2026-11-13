import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { INVOICE_STATUS_LABELS, BILLING_STATUS_LABELS } from './status-labels'

// T-083a — un client dont la facture etait en retard lisait « late » en anglais :
// la table de libelles, recopiee dans deux listes, ne connaissait pas ce statut
// et les deux listes retombent sur le statut brut.
describe('libelles de statut (T-083a)', () => {
  it('traduit le mot de Pennylane V2 pour le retard', () => {
    expect(INVOICE_STATUS_LABELS.late).toBe('En retard')
    expect(INVOICE_STATUS_LABELS.overdue).toBe('En retard')
  })

  it('ne laisse aucun libelle vide', () => {
    for (const [status, label] of Object.entries(INVOICE_STATUS_LABELS)) {
      expect(label.trim().length, `libelle vide pour ${status}`).toBeGreaterThan(0)
    }
  })

  it('garde les libelles de devis a cote de ceux des factures', () => {
    expect(BILLING_STATUS_LABELS.accepted).toBe('Accepté')
    expect(BILLING_STATUS_LABELS.paid).toBe('Payée')
  })

  /**
   * Verrou : le type `InvoiceStatus` et la table doivent rester d'accord.
   * TypeScript l'impose deja a la compilation (Record<InvoiceStatus, string>),
   * mais ce test le dit a voix haute si quelqu'un elargit le type sans toucher
   * aux libelles — et surtout il le dit au moment des tests, pas du build.
   */
  it('couvre tous les statuts declares par le type InvoiceStatus', () => {
    const source = readFileSync(join(__dirname, '..', 'types', 'billing.types.ts'), 'utf8')
    const block = source.slice(source.indexOf('export type InvoiceStatus'))
    const declared = [...block.slice(0, block.indexOf('export type Pennylane')).matchAll(/'([a-z_]+)'/g)]
      .map((m) => m[1])

    expect(declared.length).toBeGreaterThan(5)
    const missing = declared.filter((s) => !(s in INVOICE_STATUS_LABELS))
    expect(missing, `statuts sans libelle : ${missing.join(', ')}`).toEqual([])
  })
})
