import type { ActionError } from '@monprojetpro/types'
import type { LineItem } from '../types/billing.types'

// ============================================================
// commercial-gesture — T-037
//
// Deux gestes commerciaux, CUMULABLES, appliques aux lignes AVANT envoi a
// Pennylane. Brique partagee : la mecanique est identique pour une facture et
// pour un devis, « puisque c'est censé etre le prolongement de la facture »
// (MiKL, 06-10). Elle ne vit donc pas dans l'une des deux actions.
//
//   1. LIGNE OFFERTE — la prestation garde son prix catalogue a l'affichage,
//      et une contre-ligne « Offert — <label> » la ramene a zero.
//   2. REMISE GLOBALE — on saisit le prix final voulu, la remise est calculee
//      et posee en une ligne negative.
//
// 🔑 POURQUOI DES CONTRE-LIGNES, ET PAS UN PRIX A ZERO : le besoin est que la
// VALEUR OFFERTE RESTE LISIBLE sur le document — c'est l'argument commercial
// lui-meme. Mettre la ligne a 0 € ferait disparaitre les 2 200 € offerts du
// PDF, donc le geste avec.
//
// Le mecanisme (prix unitaire negatif) est celui de la deduction Lab
// (`create-quote.ts`), seul precedent du depot. ⚠️ Il n'a jamais ete prouve en
// reel contre l'API Pennylane — voir T-037 au board.
// ============================================================

/** Libelle par defaut : volontairement generique, il resservira a d autres clients. */
export const DEFAULT_GESTURE_LABEL = 'Geste commercial'

/** Prefixe des contre-lignes d une prestation offerte. */
export const OFFERED_PREFIX = 'Offert'

export type CommercialGestureOptions = {
  /**
   * Prix final HT voulu, toutes lignes confondues. `null`/absent = aucune
   * remise globale (les lignes offertes s appliquent quand meme).
   */
  targetTotalHt?: number | null
  /** Libelle imprime sur le document. Defaut : « Geste commercial ». */
  label?: string | null
  /** Ajoute « -97 % » a la description de la remise globale. Defaut : true. */
  showPercentage?: boolean
}

export type CommercialGestureResult = {
  /** Lignes finales, contre-lignes incluses, pretes pour Pennylane */
  lineItems: LineItem[]
  /** Total HT au tarif catalogue, avant tout geste */
  catalogTotalHt: number
  /** Valeur HT des prestations offertes */
  offeredTotalHt: number
  /** Montant HT de la remise globale appliquee (0 si aucune) */
  discountHt: number
  /** Total HT reellement du */
  finalTotalHt: number
  /** Pourcentage d economie sur le tarif catalogue, arrondi a l entier */
  savingsPercentage: number
}

export type ReconstructedGesture = {
  /** Lignes de saisie, contre-lignes retirees et marqueurs `offered` reposes */
  lineItems: LineItem[]
  /** Prix final HT du document, a pre-remplir dans le champ. null si aucune remise */
  targetTotalHt: number | null
  /** Libelle de la remise globale retrouve sur le document. null si aucune */
  label: string | null
}

/**
 * Operation INVERSE de `applyCommercialGesture`, pour la REPRISE EN EDITION.
 *
 * 🔑 POURQUOI ELLE EXISTE : un document deja emis revient de Pennylane avec ses
 * contre-lignes a prix NEGATIF, melangees aux prestations. Sans cette fonction,
 * rouvrir un devis remisé echouait sur « Prix >= 0 » — un refus incomprehensible
 * devant une ligne que personne n a saisie — et, s il etait reenregistre, le
 * geste se serait applique UNE SECONDE FOIS par-dessus les contre-lignes
 * existantes, doublant silencieusement la remise.
 *
 * Regle de reconnaissance : toute ligne a montant negatif est une ligne de
 * geste. Celles prefixees « Offert — » reposent le marqueur sur leur prestation
 * (retrouvee par son libelle) ; les autres sont des remises globales, dont le
 * cumul redonne le prix final. Le libelle du geste n est PAS un critere : il
 * est personnalisable, donc il ne peut pas servir a l identifier.
 */
export function reconstructGestureFromLines(lineItems: LineItem[]): ReconstructedGesture {
  if (!lineItems || lineItems.length === 0) {
    return { lineItems: [], targetTotalHt: null, label: null }
  }

  const positives: LineItem[] = []
  const offeredLabels = new Set<string>()
  let globalDiscount = 0
  let label: string | null = null

  const offeredMarker = `${OFFERED_PREFIX} — `

  for (const line of lineItems) {
    const amount = roundCents(line.quantity * line.unitPrice)

    if (amount >= 0) {
      positives.push(line)
      continue
    }

    if (line.label.startsWith(offeredMarker)) {
      offeredLabels.add(line.label.slice(offeredMarker.length))
    } else {
      globalDiscount = roundCents(globalDiscount + Math.abs(amount))
      // Le premier libelle de remise rencontre est celui a re-proposer
      if (label === null) label = line.label
    }
  }

  const restored = positives.map((line) =>
    offeredLabels.has(line.label) ? { ...line, offered: true } : line
  )

  const catalogTotal = roundCents(restored.reduce((sum, li) => sum + lineTotal(li), 0))
  const offeredTotal = roundCents(
    restored.filter((li) => li.offered === true).reduce((sum, li) => sum + lineTotal(li), 0)
  )

  return {
    lineItems: restored,
    targetTotalHt: globalDiscount > 0 ? roundCents(catalogTotal - offeredTotal - globalDiscount) : null,
    label,
  }
}

/** Arrondi au centime — evite les 0.1 + 0.2 qui trainent dans les totaux. */
function roundCents(value: number): number {
  return Math.round(value * 100) / 100
}

/**
 * Montant en euros, AU FORMAT FRANCAIS — T-037a.
 *
 * 🔑 Pourquoi pas `toFixed(2)` : il ne connait pas la locale et imprimait
 * « 11991.00 € » sur la premiere facture reelle (F-2026-101), au milieu d'un
 * document ou Pennylane formate tout le reste en « 11 991,00 € ». L'incoherence
 * tombait pile sur la ligne qui porte l'argument commercial.
 */
function euros(value: number): string {
  return value.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function lineTotal(line: LineItem): number {
  return roundCents(line.quantity * line.unitPrice)
}

/**
 * Applique les gestes commerciaux a un jeu de lignes.
 *
 * Retourne une erreur plutot que de deviner quand le resultat serait
 * ambigu ou faux : prix cible negatif, prix cible superieur au total, ou
 * taux de TVA heterogenes sur les lignes a remiser (la remise globale ne peut
 * alors pas porter un taux unique sans fausser la TVA).
 */
export function applyCommercialGesture(
  lineItems: LineItem[],
  options: CommercialGestureOptions = {}
): { data: CommercialGestureResult | null; error: ActionError | null } {
  if (!lineItems || lineItems.length === 0) {
    return {
      data: null,
      error: { message: 'Aucune ligne à facturer', code: 'VALIDATION_ERROR' },
    }
  }

  const label = options.label?.trim() || DEFAULT_GESTURE_LABEL
  const showPercentage = options.showPercentage !== false

  const catalogTotalHt = roundCents(lineItems.reduce((sum, li) => sum + lineTotal(li), 0))

  // ── 1. Lignes offertes ──────────────────────────────────────────────────
  // La contre-ligne suit IMMEDIATEMENT sa prestation : sur le PDF, le lecteur
  // voit « Dashboard 2 200 € » puis « Offert — Dashboard -2 200 € ».
  const withOffers: LineItem[] = []
  let offeredTotalHt = 0

  for (const line of lineItems) {
    withOffers.push({ ...line, offered: undefined })
    if (line.offered === true) {
      const amount = lineTotal(line)
      if (amount === 0) continue // offrir ce qui est deja gratuit n apporte rien
      offeredTotalHt = roundCents(offeredTotalHt + amount)
      withOffers.push({
        label: `${OFFERED_PREFIX} — ${line.label}`,
        description: line.description ? `${line.description} — offert` : 'Prestation offerte',
        quantity: 1,
        unit: 'u',
        unitPrice: -amount,
        vatRate: line.vatRate,
        total: -amount,
      })
    }
  }

  const afterOffersHt = roundCents(catalogTotalHt - offeredTotalHt)

  // ── 2. Remise globale ───────────────────────────────────────────────────
  let discountHt = 0
  const target = options.targetTotalHt

  if (target != null) {
    if (!Number.isFinite(target)) {
      return {
        data: null,
        error: { message: 'Prix final voulu invalide', code: 'VALIDATION_ERROR' },
      }
    }
    if (target < 0) {
      return {
        data: null,
        error: { message: 'Le prix final ne peut pas être négatif', code: 'VALIDATION_ERROR' },
      }
    }

    const rounded = roundCents(target)
    if (rounded > afterOffersHt) {
      return {
        data: null,
        error: {
          message: `Le prix final (${euros(rounded)} €) dépasse le total après prestations offertes (${euros(afterOffersHt)} €) — ce serait une majoration, pas un geste commercial`,
          code: 'VALIDATION_ERROR',
        },
      }
    }

    discountHt = roundCents(afterOffersHt - rounded)

    if (discountHt > 0) {
      // La remise doit porter UN taux de TVA. S il y en a plusieurs parmi les
      // lignes encore payantes, aucun choix n est juste : on refuse au lieu de
      // repartir au hasard et de fausser la TVA du document.
      const payingRates = new Set(
        lineItems.filter((li) => li.offered !== true && lineTotal(li) > 0).map((li) => li.vatRate)
      )

      if (payingRates.size > 1) {
        return {
          data: null,
          error: {
            message: `Remise globale impossible : les lignes portent ${payingRates.size} taux de TVA différents (${[...payingRates].join(', ')}). Offre les lignes une par une, ou aligne les taux.`,
            code: 'MIXED_VAT_RATES',
          },
        }
      }

      const vatRate = [...payingRates][0] ?? lineItems[0].vatRate
      const percentage =
        catalogTotalHt > 0 ? Math.round(((catalogTotalHt - rounded) / catalogTotalHt) * 100) : 0

      withOffers.push({
        label,
        description: showPercentage
          ? `Remise de ${euros(discountHt)} € HT sur un tarif catalogue de ${euros(catalogTotalHt)} € HT (-${percentage} %)`
          : `Remise de ${euros(discountHt)} € HT`,
        quantity: 1,
        unit: 'u',
        unitPrice: -discountHt,
        vatRate,
        total: -discountHt,
      })
    }
  }

  const finalTotalHt = roundCents(afterOffersHt - discountHt)
  const savingsPercentage =
    catalogTotalHt > 0 ? Math.round(((catalogTotalHt - finalTotalHt) / catalogTotalHt) * 100) : 0

  return {
    data: {
      lineItems: withOffers,
      catalogTotalHt,
      offeredTotalHt,
      discountHt,
      finalTotalHt,
      savingsPercentage,
    },
    error: null,
  }
}
