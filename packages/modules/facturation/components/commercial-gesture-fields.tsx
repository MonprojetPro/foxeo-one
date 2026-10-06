'use client'

// ============================================================
// CommercialGestureFields — T-037
//
// Panneau de geste commercial, partage par le formulaire de FACTURE et celui
// de DEVIS : « c'est censé etre le prolongement de la facture » (MiKL, 06-10).
// Composant presentationnel pur — il ne connait ni react-hook-form ni l action
// appelee, pour pouvoir etre branche sur les deux formulaires sans adherence.
// ============================================================

type CommercialGestureFieldsProps = {
  /** Total HT au tarif catalogue, lignes offertes comprises */
  catalogTotalHt: number
  /** Valeur HT des prestations marquees « offert » */
  offeredTotalHt: number
  /** Prix final HT voulu. Chaine vide = aucune remise globale. */
  targetValue: string
  onTargetChange: (value: string) => void
  /** Libelle imprime sur le document */
  labelValue: string
  onLabelChange: (value: string) => void
  /** Place-reserve du libelle (le defaut applique cote serveur) */
  labelPlaceholder: string
  /** Mot employe dans les textes : « facture » ou « devis » */
  documentWord: string
}

function euros(value: number): string {
  return value.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })
}

export function CommercialGestureFields({
  catalogTotalHt,
  offeredTotalHt,
  targetValue,
  onTargetChange,
  labelValue,
  onLabelChange,
  labelPlaceholder,
  documentWord,
}: CommercialGestureFieldsProps) {
  const afterOffers = Math.round((catalogTotalHt - offeredTotalHt) * 100) / 100

  const parsedTarget = targetValue.trim() === '' ? null : Number(targetValue)
  const targetIsNumber = parsedTarget !== null && Number.isFinite(parsedTarget)

  const discount = targetIsNumber ? Math.round((afterOffers - parsedTarget) * 100) / 100 : 0
  const finalTotal = targetIsNumber ? parsedTarget : afterOffers
  const granted = Math.round((catalogTotalHt - finalTotal) * 100) / 100
  const savings = catalogTotalHt > 0 ? Math.round((granted / catalogTotalHt) * 100) : 0

  // Les memes refus que la brique serveur, annonces AVANT de cliquer plutot
  // qu'en retour d'erreur : le prix cible ne peut pas majorer la facture.
  const targetTooHigh = targetIsNumber && parsedTarget > afterOffers
  const targetNegative = targetIsNumber && parsedTarget < 0
  const targetInvalid = parsedTarget !== null && !Number.isFinite(parsedTarget)

  return (
    <div
      className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/[0.02] p-5"
      data-testid="commercial-gesture-panel"
    >
      <div>
        <h3 className="text-sm font-semibold">Geste commercial</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Le tarif catalogue reste imprimé ligne par ligne sur {documentWord === 'devis' ? 'le' : 'la'}{' '}
          {documentWord} : c&apos;est la valeur offerte qui fait l&apos;argument. Coche « Offert » sur une
          prestation, et/ou saisis le prix final voulu.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="gesture-target" className="text-sm font-medium">
            Prix final HT voulu
          </label>
          <input
            id="gesture-target"
            type="number"
            min="0"
            step="0.01"
            value={targetValue}
            onChange={(e) => onTargetChange(e.target.value)}
            placeholder={`Laisser vide = ${euros(afterOffers)}`}
            data-testid="gesture-target"
            className="rounded-md border border-border bg-background px-3 py-2 text-sm"
          />
          <span className="text-xs text-muted-foreground">
            La remise est calculée et ajoutée en une ligne.
          </span>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="gesture-label" className="text-sm font-medium">
            Libellé imprimé
          </label>
          <input
            id="gesture-label"
            type="text"
            value={labelValue}
            onChange={(e) => onLabelChange(e.target.value)}
            placeholder={labelPlaceholder}
            data-testid="gesture-label"
            className="rounded-md border border-border bg-background px-3 py-2 text-sm"
          />
          <span className="text-xs text-muted-foreground">
            Par défaut « {labelPlaceholder} ». À personnaliser selon le client.
          </span>
        </div>
      </div>

      {/* Refus annonces avant soumission */}
      {targetInvalid && (
        <p className="text-xs text-destructive" data-testid="gesture-error">
          Prix final invalide.
        </p>
      )}
      {targetNegative && (
        <p className="text-xs text-destructive" data-testid="gesture-error">
          Le prix final ne peut pas être négatif.
        </p>
      )}
      {targetTooHigh && (
        <p className="text-xs text-destructive" data-testid="gesture-error">
          Le prix final ({euros(parsedTarget)}) dépasse le total après prestations offertes (
          {euros(afterOffers)}) — ce serait une majoration, pas un geste commercial.
        </p>
      )}

      {/* Recapitulatif — ce que le client lira */}
      <div className="grid grid-cols-3 gap-3 rounded-xl border border-white/10 bg-black/20 p-4">
        <div className="flex flex-col gap-0.5">
          <span className="text-xs text-muted-foreground">Tarif catalogue</span>
          <span className="text-sm font-semibold" data-testid="gesture-catalog">
            {euros(catalogTotalHt)} HT
          </span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-xs text-muted-foreground">Prix final</span>
          <span className="text-sm font-semibold text-cyan-300" data-testid="gesture-final">
            {euros(finalTotal)} HT
          </span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-xs text-muted-foreground">Économie client</span>
          <span className="text-sm font-semibold text-green-400" data-testid="gesture-savings">
            {granted > 0 ? `-${savings} % (${euros(granted)} offerts)` : '—'}
          </span>
        </div>
      </div>

      {(offeredTotalHt > 0 || discount > 0) && (
        <ul className="flex flex-col gap-1 text-xs text-muted-foreground">
          {offeredTotalHt > 0 && (
            <li data-testid="gesture-detail-offered">
              Prestations offertes : {euros(offeredTotalHt)} HT
            </li>
          )}
          {discount > 0 && (
            <li data-testid="gesture-detail-discount">
              Remise globale ajoutée en ligne : {euros(discount)} HT
            </li>
          )}
        </ul>
      )}
    </div>
  )
}
