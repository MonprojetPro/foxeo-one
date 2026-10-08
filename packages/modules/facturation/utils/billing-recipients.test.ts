import { describe, it, expect } from 'vitest'
import {
  resolveRecipients,
  buildAttentionLine,
  composePublicNotes,
  type RecipientContact,
} from './billing-recipients'

// ============================================================
// T-039 — cas reel du CSE Habitat 77 : le secretaire est l'interlocuteur, la
// comptable paie, et elles n'ont pas la meme adresse.
// ============================================================

function contact(partial: Partial<RecipientContact>): RecipientContact {
  return {
    fullName: 'Contact',
    email: null,
    receivesInvoices: false,
    showOnInvoice: false,
    ...partial,
  }
}

const SECRETAIRE = contact({ fullName: 'Alex Rahli', email: 'alex@habitat77.fr', showOnInvoice: true })
const COMPTABLE = contact({ fullName: 'Marie Dupont', email: 'compta@habitat77.fr', receivesInvoices: true })

describe('resolveRecipients — les trois combinaisons voulues par MiKL', () => {
  it('nom du secretaire affiche, facture envoyee a la comptable', () => {
    const r = resolveRecipients([SECRETAIRE, COMPTABLE], 'login@habitat77.fr')
    expect(r.emails).toEqual(['compta@habitat77.fr'])
    expect(r.attentionNames).toEqual(['Alex Rahli'])
    expect(r.usedFallback).toBe(false)
  })

  it('les deux pour la comptable', () => {
    const r = resolveRecipients(
      [contact({ fullName: 'Marie Dupont', email: 'compta@habitat77.fr', receivesInvoices: true, showOnInvoice: true })],
      'login@habitat77.fr'
    )
    expect(r.emails).toEqual(['compta@habitat77.fr'])
    expect(r.attentionNames).toEqual(['Marie Dupont'])
  })

  it('aucun nom, juste une adresse', () => {
    const r = resolveRecipients([COMPTABLE], 'login@habitat77.fr')
    expect(r.emails).toEqual(['compta@habitat77.fr'])
    expect(r.attentionNames).toEqual([])
  })
})

describe('resolveRecipients — repli et bornes', () => {
  it('repli sur l adresse du client quand aucun contact n est coche', () => {
    const r = resolveRecipients([contact({ fullName: 'Paul', email: 'paul@x.fr' })], 'login@habitat77.fr')
    expect(r.emails).toEqual(['login@habitat77.fr'])
    expect(r.usedFallback).toBe(true)
  })

  it('repli aussi quand le carnet est vide, absent ou non tableau', () => {
    expect(resolveRecipients([], 'login@x.fr').emails).toEqual(['login@x.fr'])
    expect(resolveRecipients(null, 'login@x.fr').emails).toEqual(['login@x.fr'])
    expect(resolveRecipients(undefined, 'login@x.fr').usedFallback).toBe(true)
  })

  it('rend une liste VIDE quand il n y a ni contact coche ni adresse client — jamais d adresse inventee', () => {
    const r = resolveRecipients([], null)
    expect(r.emails).toEqual([])
    expect(r.usedFallback).toBe(true)
  })

  it('garde les NOMS a imprimer meme quand on retombe sur le repli', () => {
    const r = resolveRecipients([SECRETAIRE], 'login@habitat77.fr')
    expect(r.emails).toEqual(['login@habitat77.fr'])
    expect(r.attentionNames).toEqual(['Alex Rahli'])
    expect(r.usedFallback).toBe(true)
  })

  it('cumule plusieurs destinataires, dans l ordre du carnet', () => {
    const r = resolveRecipients(
      [COMPTABLE, contact({ fullName: 'Service compta', email: 'facture@habitat77.fr', receivesInvoices: true })],
      'login@x.fr'
    )
    expect(r.emails).toEqual(['compta@habitat77.fr', 'facture@habitat77.fr'])
  })

  it('dedoublonne sans tenir compte de la casse — sinon Pennylane envoie deux fois', () => {
    const r = resolveRecipients(
      [
        contact({ fullName: 'A', email: 'Compta@Habitat77.fr', receivesInvoices: true }),
        contact({ fullName: 'B', email: 'compta@habitat77.fr', receivesInvoices: true }),
      ],
      'login@x.fr'
    )
    expect(r.emails).toEqual(['Compta@Habitat77.fr'])
  })

  it('ignore un destinataire coche SANS adresse au lieu d en faire un envoi fantome', () => {
    const r = resolveRecipients(
      [contact({ fullName: 'Sans adresse', email: '   ', receivesInvoices: true }), COMPTABLE],
      'login@x.fr'
    )
    expect(r.emails).toEqual(['compta@habitat77.fr'])
  })

  it('dedoublonne les noms a imprimer', () => {
    const r = resolveRecipients(
      [
        contact({ fullName: 'Marie Dupont', showOnInvoice: true }),
        contact({ fullName: 'marie dupont', showOnInvoice: true }),
      ],
      'login@x.fr'
    )
    expect(r.attentionNames).toEqual(['Marie Dupont'])
  })
})

describe('buildAttentionLine', () => {
  it('rend null sans nom', () => {
    expect(buildAttentionLine([])).toBeNull()
  })

  it('accorde plusieurs noms sur une seule mention', () => {
    expect(buildAttentionLine(['Marie Dupont', 'Alex Rahli'])).toBe(
      "À l'attention de Marie Dupont, Alex Rahli"
    )
  })
})

describe('composePublicNotes', () => {
  it('place la mention EN TETE sans ecraser les notes de MiKL', () => {
    expect(composePublicNotes(['Marie Dupont'], 'Prestation de septembre')).toBe(
      "À l'attention de Marie Dupont\n\nPrestation de septembre"
    )
  })

  it('rend les notes seules quand aucun nom n est a imprimer', () => {
    expect(composePublicNotes([], 'Prestation de septembre')).toBe('Prestation de septembre')
  })

  it('rend la mention seule quand il n y a pas de notes', () => {
    expect(composePublicNotes(['Marie Dupont'], null)).toBe("À l'attention de Marie Dupont")
    expect(composePublicNotes(['Marie Dupont'], '   ')).toBe("À l'attention de Marie Dupont")
  })

  it('rend null quand il n y a ni mention ni notes — pas une chaine vide', () => {
    expect(composePublicNotes([], null)).toBeNull()
    expect(composePublicNotes([], '  ')).toBeNull()
  })
})
