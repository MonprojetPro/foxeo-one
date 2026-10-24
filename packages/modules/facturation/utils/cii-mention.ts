// ============================================================
// cii-mention — T-062a
//
// Mention CII a apposer sur un devis/facture, EN PLUS du texte libre existant
// (pdf_invoice_free_text) — jamais en ecrasement, exactement comme [FOXEO_LAB]
// ou [LAB_DEDUCTION:...]. Texte repris tel quel de CONSIGNES-CII-HUB.md
// (sections 4 et 5) : aucune generation IA ici, c'est une mention legale fixe.
// ============================================================

/** Seuil de pertinence economique (CONSIGNES-CII-HUB.md §2.4) — informatif, jamais bloquant. */
export const CII_RELEVANCE_THRESHOLD_HT = 25000

export const CII_AGREMENT_LINE =
  "Agrément CII n°32894818 délivré par la DRIEETS Île-de-France le 20/10/2026."

/** Mention a inserer dans les notes publiques d'une FACTURE (section 4). */
export function buildCiiInvoiceMention(): string {
  return [
    "INFORMATION CRÉDIT D'IMPÔT INNOVATION (CII)",
    'Cette prestation entre dans le cadre du Crédit d’Impôt Innovation.',
    CII_AGREMENT_LINE,
    "Validation définitive de l'éligibilité par l'expert-comptable du client.",
  ].join('\n')
}

/** Mention a inserer dans les notes publiques d'un DEVIS (section 5). */
export function buildCiiQuoteMention(): string {
  return [
    "INFORMATION CRÉDIT D'IMPÔT INNOVATION (CII)",
    "Cette prestation est potentiellement éligible au Crédit d'Impôt Innovation.",
    CII_AGREMENT_LINE,
    "Avantage potentiel à chiffrer avec votre expert-comptable.",
    "Validation définitive de l'éligibilité et du montant par votre expert-comptable.",
  ].join('\n')
}

/**
 * Ajoute la mention aux notes existantes SANS jamais les ecraser — meme regle
 * que composePublicNotes (billing-recipients.ts). Pas d'insertion en double si
 * la mention est deja presente (bouton cliquable plusieurs fois sans consequence).
 */
export function appendCiiMention(currentNotes: string | null | undefined, mention: string): string {
  const notes = typeof currentNotes === 'string' ? currentNotes : ''
  if (notes.includes(mention)) return notes
  const trimmed = notes.trim()
  return trimmed === '' ? mention : `${trimmed}\n\n${mention}`
}
