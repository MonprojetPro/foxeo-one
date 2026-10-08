// ============================================================
// zero-amount-lines — T-043
//
// Une ligne a 0,00 € s est imprimee sur F-2026-103 : « Maintenance &
// hebergement » y figure deux fois, dont une vide — une ligne restee en trop a
// la saisie. Rien ne la signalait, et une facture Pennylane est DEFINITIVE :
// l erreur n est plus rattrapable qu en emettant un avoir.
//
// 🔑 POURQUOI ON AVERTIT AU LIEU DE FILTRER : une ligne a zero peut etre
// VOULUE — afficher une prestation offerte au client, par exemple. Un retrait
// silencieux supprimerait donc parfois une intention. On nomme les lignes et on
// laisse trancher ; le serveur refuse par defaut, l appelant peut insister.
//
// ⚠️ A NE PAS CONFONDRE avec les lignes « Offert » de T-037
// (`commercial-gesture.ts`) : celles-la portent un montant NEGATIF, jamais nul,
// precisement pour que la valeur offerte reste lisible sur le PDF. Elles ne
// sont donc jamais signalees ici.
// ============================================================

/** Un demi-centime : en dessous, la ligne s imprime « 0,00 € ». */
const ZERO_THRESHOLD = 0.005

export type ZeroAmountLine = {
  /** Index dans le tableau soumis — sert a retirer la ligne cote formulaire */
  index: number
  /** Numero affiche a l ecran (1-indexe, comme la ligne est numerotee) */
  position: number
  /** Designation saisie, chaine vide si l utilisateur ne l a pas remplie */
  label: string
  /**
   * true quand le montant n est meme pas calculable (quantite ou prix non
   * numerique). Jamais volontaire, contrairement a un vrai zero.
   */
  isUnreadable: boolean
}

/**
 * Forme minimale acceptee : un `LineItem` la satisfait, mais aussi une ligne de
 * FORMULAIRE, dont `quantity` et `unitPrice` sont encore des chaines. Les deux
 * doivent passer par le meme calcul, sinon l avertissement a l ecran et le refus
 * du serveur pourraient diverger — exactement le genre d ecart qui fait dire
 * « pourquoi ca passe ici et pas la ».
 */
export type ZeroAmountCandidate = {
  label?: unknown
  quantity?: unknown
  unitPrice?: unknown
}

/**
 * Recense les lignes dont le montant HT s imprimerait a 0,00 €.
 *
 * Les lignes sans designation remontent EN PREMIER : une ligne a zero ET sans
 * libelle n est jamais une prestation offerte affichee, c est un oubli.
 */
export function findZeroAmountLines(
  lineItems: readonly ZeroAmountCandidate[] | null | undefined
): ZeroAmountLine[] {
  if (!Array.isArray(lineItems)) return []

  const found: ZeroAmountLine[] = []

  lineItems.forEach((item, index) => {
    const quantity = Number(item?.quantity)
    const unitPrice = Number(item?.unitPrice)
    const amount = quantity * unitPrice
    const isUnreadable = !Number.isFinite(amount)

    if (!isUnreadable && Math.abs(amount) >= ZERO_THRESHOLD) return

    const label = typeof item?.label === 'string' ? item.label.trim() : ''
    found.push({ index, position: index + 1, label, isUnreadable })
  })

  // Tri stable : les lignes sans designation d abord, puis l ordre de saisie.
  return found.sort((a, b) => {
    const aNamed = a.label === '' ? 0 : 1
    const bNamed = b.label === '' ? 0 : 1
    if (aNamed !== bNamed) return aNamed - bNamed
    return a.index - b.index
  })
}

/** « Ligne 2 « Maintenance & hébergement » à 0,00 € » */
export function describeZeroAmountLine(line: ZeroAmountLine): string {
  const name = line.label === '' ? '(sans désignation)' : `« ${line.label} »`
  const amount = line.isUnreadable ? 'montant illisible' : '0,00 €'
  return `Ligne ${line.position} ${name} à ${amount}`
}

/**
 * Message pret a afficher — formulaire comme erreur de Server Action.
 *
 * `documentLabel` porte le determinant (« cette facture », « ce devis ») : le
 * genre differe d un document a l autre et un mot seul produirait « sur cette
 * devis ».
 */
export function describeZeroAmountLines(lines: ZeroAmountLine[], documentLabel: string): string {
  if (lines.length === 0) return ''
  const list = lines.map(describeZeroAmountLine).join(' · ')
  const plural = lines.length > 1 ? 's' : ''
  return `${lines.length} ligne${plural} à 0,00 € sur ${documentLabel} : ${list}`
}
