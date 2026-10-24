'use client'

// ============================================================
// CiiMentionFields — T-062a
//
// Panneau CII, partage par le formulaire de DEVIS et celui de FACTURE : case
// « Projet innovant CII » (par document) + badge seuil de pertinence (25 000 €,
// informatif) + bouton qui insere la mention legale dans les notes publiques.
// Ne s'affiche que si le CLIENT selectionne est marque eligible PME (coche sur
// sa fiche, T-062a) — sans quoi mentionner le CII n'a pas de sens.
// Composant presentationnel pur, comme CommercialGestureFields : pas de
// react-hook-form, juste des callbacks, pour pouvoir etre branche sur les deux
// formulaires sans adherence.
// ============================================================

import { useState } from 'react'
import { appendCiiMention, CII_RELEVANCE_THRESHOLD_HT } from '../utils/cii-mention'

type CiiMentionFieldsProps = {
  /** Le client selectionne est-il marque « Éligible CII (PME) » sur sa fiche ? */
  clientPmeEligible: boolean
  /** Total HT du document — compare au seuil de pertinence. */
  totalHt: number
  /** Notes publiques actuelles du formulaire (texte libre, jamais ecrase). */
  publicNotesValue: string
  onPublicNotesChange: (value: string) => void
  /** Texte legal a inserer — different devis/facture (buildCiiQuoteMention/buildCiiInvoiceMention). */
  mention: string
  /** Mot employe dans les textes : « facture » ou « devis » */
  documentWord: string
}

function euros(value: number): string {
  return value.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })
}

export function CiiMentionFields({
  clientPmeEligible,
  totalHt,
  publicNotesValue,
  onPublicNotesChange,
  mention,
  documentWord,
}: CiiMentionFieldsProps) {
  // Case par DOCUMENT — l'eligibilite du projet n'est pas celle du client. Etat
  // local uniquement : ce qui doit survivre, c'est la mention une fois ajoutee
  // aux notes publiques (persistees), pas cette case elle-meme (voir zone
  // d'ombre #2 du cadrage T-062a).
  const [projectEligible, setProjectEligible] = useState(false)

  if (!clientPmeEligible) return null

  const mentionAlreadyAdded = publicNotesValue.includes(mention)
  const aboveThreshold = totalHt > CII_RELEVANCE_THRESHOLD_HT

  return (
    <div
      className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.02] p-5"
      data-testid="cii-mention-panel"
    >
      <div>
        <h3 className="text-sm font-semibold">Crédit d&apos;Impôt Innovation (CII)</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Ce client est marqué éligible PME. Coche si CE projet remplit aussi le filtre
          d&apos;éligibilité (CONSIGNES-CII-HUB.md §2.2) avant d&apos;ajouter la mention — jamais
          l&apos;inverse.
        </p>
      </div>

      <label htmlFor="cii-project-eligible" className="flex items-center gap-2 text-sm">
        <input
          id="cii-project-eligible"
          type="checkbox"
          checked={projectEligible}
          onChange={(e) => setProjectEligible(e.target.checked)}
          data-testid="cii-project-eligible"
          className="h-4 w-4 rounded border-border bg-background accent-primary"
        />
        Projet innovant CII
      </label>

      {projectEligible && (
        <>
          {aboveThreshold && (
            <p
              className="rounded-md border border-cyan-400/25 bg-cyan-400/5 px-3 py-2 text-xs text-cyan-200/90"
              data-testid="cii-threshold-badge"
            >
              Au-dessus du seuil de pertinence CII ({euros(CII_RELEVANCE_THRESHOLD_HT)}) — simple
              repère, pas un critère légal.
            </p>
          )}

          <button
            type="button"
            disabled={mentionAlreadyAdded}
            onClick={() => onPublicNotesChange(appendCiiMention(publicNotesValue, mention))}
            data-testid="cii-add-mention"
            className="self-start rounded-md bg-primary px-3 py-1.5 text-xs text-primary-foreground disabled:opacity-50"
          >
            {mentionAlreadyAdded ? 'Mention CII déjà ajoutée' : 'Ajouter la mention CII'}
          </button>
          <p className="text-xs text-muted-foreground">
            Insère le texte légal dans les notes publiques ci-dessous, sans effacer ce qui y est
            déjà — relis-les avant d&apos;émettre {documentWord === 'devis' ? 'le' : 'la'}{' '}
            {documentWord}.
          </p>
        </>
      )}
    </div>
  )
}
