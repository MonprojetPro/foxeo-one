import { describe, it, expect } from 'vitest'
import { computeBillingMetrics, type MetricsRow } from './billing-metrics'

// ============================================================
// T-042 — le calcul des compteurs du cockpit Comptabilite.
//
// Jusqu'ici ce calcul vivait dans le `queryFn` d'un hook, donc derriere un
// appel reseau : AUCUN test ne pouvait l'atteindre, et un defaut y est reste
// sans bruit — le compteur « En attente » restait a 0 € alors qu'une facture
// de 478,80 € etait emise.
//
// Le cas de reference est reel : CSE Habitat 77 au 08-10, soit une facture
// annulee par un avoir, plus une facture valide.
// ============================================================

const JANVIER = new Date('2026-01-15T12:00:00Z')

function invoice(
  status: string,
  amountCents: number,
  date = '2026-01-10',
  pennylaneId = 'inv-1'
): MetricsRow {
  return { entity_type: 'invoice', status, amount: amountCents, data: { date }, pennylane_id: pennylaneId }
}

/**
 * T-045 — un avoir porte l'identifiant de la facture qu'il annule. Sans ce
 * rattachement, le calcul ne peut pas savoir si la recette annulee avait ete
 * encaissee — et il ne devine pas.
 */
function creditNote(
  amountCents: number,
  date = '2026-01-12',
  creditedInvoiceId: string | null = 'inv-1'
): MetricsRow {
  return {
    entity_type: 'credit_note',
    status: 'credit_note',
    amount: amountCents,
    data: creditedInvoiceId
      ? { date, credited_invoice_pennylane_id: creditedInvoiceId }
      : { date },
    pennylane_id: 'cn-1',
  }
}

describe('computeBillingMetrics', () => {
  it('rend des compteurs a zero sans aucune piece', () => {
    const m = computeBillingMetrics([], JANVIER)
    expect(m).toEqual({ monthlyRevenue: 0, pendingAmount: 0, pendingQuotesCount: 0, mrr: 0 })
  })

  // ── « En attente » ───────────────────────────────────────────────────────

  it("compte une facture `upcoming` — le defaut d'origine", () => {
    // C'est LE cas qui a motive la correction : Pennylane rend `upcoming`
    // pour une facture emise non echue, et le calcul ne retenait que `unpaid`.
    const m = computeBillingMetrics([invoice('upcoming', 47880)], JANVIER)
    expect(m.pendingAmount).toBe(47880)
  })

  it('compte aussi `unpaid` et `late`', () => {
    const m = computeBillingMetrics(
      [invoice('unpaid', 10000), invoice('late', 5000)],
      JANVIER
    )
    expect(m.pendingAmount).toBe(15000)
  })

  it("n'y compte PAS un brouillon — il n'est pas du", () => {
    const m = computeBillingMetrics([invoice('draft', 99999)], JANVIER)
    expect(m.pendingAmount).toBe(0)
  })

  it("n'y compte PAS une facture payee", () => {
    const m = computeBillingMetrics([invoice('paid', 47880)], JANVIER)
    expect(m.pendingAmount).toBe(0)
  })

  // ── Le cas reel du CSE ───────────────────────────────────────────────────

  it('cas reel CSE Habitat 77 : une facture annulee + une valide = 478,80 €', () => {
    const m = computeBillingMetrics(
      [
        invoice('upcoming', 47880, '2026-01-06', 'F-101'), // annulee, jamais payee
        creditNote(-47880, '2026-01-07', 'F-101'), //        l'avoir qui l'annule
        invoice('upcoming', 47880, '2026-01-08', 'F-103'), // la bonne
      ],
      JANVIER
    )
    // Sans les avoirs, on aurait reclame 957,60 € au client
    expect(m.pendingAmount).toBe(47880)
  })

  it("ne rend JAMAIS un « en attente » negatif", () => {
    // Un avoir superieur aux factures en attente : le client ne doit plus
    // rien, il ne lui est pas du de l'argent.
    const m = computeBillingMetrics([invoice('upcoming', 10000), creditNote(-50000)], JANVIER)
    expect(m.pendingAmount).toBe(0)
  })

  // ── CA mensuel ───────────────────────────────────────────────────────────

  it('ne compte au CA que les factures PAYEES du mois courant', () => {
    const m = computeBillingMetrics(
      [
        invoice('paid', 10000, '2026-01-05'), // mois courant
        invoice('paid', 99999, '2025-12-20'), // mois precedent
        invoice('upcoming', 50000, '2026-01-08'), // pas encaissee
      ],
      JANVIER
    )
    expect(m.monthlyRevenue).toBe(10000)
  })

  it('un avoir sur une facture PAYEE diminue le CA du mois', () => {
    const m = computeBillingMetrics(
      [invoice('paid', 47880, '2026-01-05', 'F-1'), creditNote(-47880, '2026-01-12', 'F-1')],
      JANVIER
    )
    expect(m.monthlyRevenue).toBe(0)
  })

  it('un avoir hors du mois courant ne touche pas le CA du mois', () => {
    const m = computeBillingMetrics(
      [invoice('paid', 47880, '2026-01-05', 'F-1'), creditNote(-47880, '2025-12-20', 'F-1')],
      JANVIER
    )
    expect(m.monthlyRevenue).toBe(47880)
  })

  // ── T-045 — l'asymetrie corrigee ─────────────────────────────────────────
  //
  // Vu par MiKL sur une capture : le Hub affichait « CA mensuel -478,80 € »
  // alors que RIEN n'avait ete encaisse. La facture n'etait jamais entree au CA
  // (jamais payee), mais l'avoir qui l'annule en sortait : on soustrayait une
  // recette jamais additionnee.

  it("cas reel du 09-10 : un avoir sur une facture JAMAIS PAYEE ne rend PAS le CA negatif", () => {
    const m = computeBillingMetrics(
      [
        invoice('upcoming', 47880, '2026-01-06', 'F-101'), // emise, jamais encaissee
        creditNote(-47880, '2026-01-07', 'F-101'), //         son avoir
        invoice('upcoming', 47880, '2026-01-08', 'F-103'),
      ],
      JANVIER
    )
    expect(m.monthlyRevenue).toBe(0)
    // ... et « En attente » reste juste : l'avoir y compense bien la facture due
    expect(m.pendingAmount).toBe(47880)
  })

  it('un avoir dont la facture n est pas identifiable ne touche pas le CA — on ne devine pas', () => {
    const m = computeBillingMetrics(
      [invoice('paid', 47880, '2026-01-05', 'F-1'), creditNote(-47880, '2026-01-12', null)],
      JANVIER
    )
    expect(m.monthlyRevenue).toBe(47880)
  })

  it("un avoir visant une AUTRE facture que la payee ne diminue pas le CA", () => {
    const m = computeBillingMetrics(
      [
        invoice('paid', 47880, '2026-01-05', 'F-1'),
        invoice('upcoming', 30000, '2026-01-06', 'F-2'),
        creditNote(-30000, '2026-01-12', 'F-2'), // annule la NON payee
      ],
      JANVIER
    )
    expect(m.monthlyRevenue).toBe(47880)
  })

  it("deduit du CA du mois de L'AVOIR une facture payee un mois anterieur — on ne rouvre pas un mois clos", () => {
    const m = computeBillingMetrics(
      [invoice('paid', 47880, '2025-12-10', 'F-1'), creditNote(-47880, '2026-01-12', 'F-1')],
      JANVIER
    )
    expect(m.monthlyRevenue).toBe(-47880)
  })

  it('ignore une piece sans date exploitable pour le CA', () => {
    const m = computeBillingMetrics(
      [{ entity_type: 'invoice', status: 'paid', amount: 10000, data: {} }],
      JANVIER
    )
    expect(m.monthlyRevenue).toBe(0)
  })

  it('ignore une date illisible au lieu de planter', () => {
    const m = computeBillingMetrics([invoice('paid', 10000, 'pas-une-date')], JANVIER)
    expect(m.monthlyRevenue).toBe(0)
  })

  // ── Devis et abonnements, comportement inchange ──────────────────────────

  it('compte les devis en attente', () => {
    const m = computeBillingMetrics(
      [
        { entity_type: 'quote', status: 'pending', amount: 1000, data: {} },
        { entity_type: 'quote', status: 'accepted', amount: 2000, data: {} },
      ],
      JANVIER
    )
    expect(m.pendingQuotesCount).toBe(1)
  })

  it('mensualise les abonnements selon leur periodicite', () => {
    const m = computeBillingMetrics(
      [
        { entity_type: 'subscription', status: 'active', amount: 12000, data: { recurring_period: 'monthly' } },
        { entity_type: 'subscription', status: 'active', amount: 30000, data: { recurring_period: 'quarterly' } },
        { entity_type: 'subscription', status: 'active', amount: 120000, data: { recurring_period: 'yearly' } },
        { entity_type: 'subscription', status: 'stopped', amount: 99999, data: { recurring_period: 'monthly' } },
      ],
      JANVIER
    )
    expect(m.mrr).toBe(12000 + 10000 + 10000)
  })

  it('tolere un montant nul', () => {
    const m = computeBillingMetrics(
      [{ entity_type: 'invoice', status: 'upcoming', amount: null, data: {} }],
      JANVIER
    )
    expect(m.pendingAmount).toBe(0)
  })
})
