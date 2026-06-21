'use client'

import { useState, useEffect } from 'react'
import { Button, Card, CardContent, CardHeader, CardTitle, Input, showSuccess, showError } from '@monprojetpro/ui'
import type { CustomBranding } from '@monprojetpro/types'
import type { ActionResponse } from '@monprojetpro/types'

// ─────────────────────────────────────────────────────────────────────────────
// ClientBrandingForm — composant partagé Hub + client One
//
// Depuis la décision MiKL (2026-06-21) : abandon de l'upload de logo image.
// Le header affiche désormais : symbole MPP fixe (/logos/logo-symbol.png) + nom
// d'entreprise en texte. Ce composant gère uniquement :
//   • Nom affiché (displayName)
//   • Couleur d'accent
//   • Preview fidèle du header (symbole + nom + couleur)
//
// Les actions sont injectées en props pour découpler la logique d'autorisation :
//   • Hub (opérateur) → passe updateClientBranding
//   • Client One      → passe updateOwnBranding
// ─────────────────────────────────────────────────────────────────────────────

type BrandingPayload = Partial<Omit<CustomBranding, 'updatedAt'>>

interface ClientBrandingFormProps {
  clientId: string
  initialBranding?: CustomBranding | null
  clientCompanyName?: string
  /** Action de mise à jour du branding — injectée par le parent selon le contexte (Hub ou client) */
  onUpdateBranding: (clientId: string, branding: BrandingPayload) => Promise<ActionResponse<CustomBranding>>
  /** Message de succès personnalisé — par défaut "Branding mis à jour" */
  successMessage?: string
}

// Valeur par défaut : vert One (et non l'orange #F7931E qui était la couleur incorrecte)
const DEFAULT_ACCENT = '#16a34a'
const HEX_REGEX = /^#[0-9A-Fa-f]{6}$/

/** Calcule le ratio de contraste approximatif entre un HEX et le blanc (#ffffff).
 *  Retourne true si le texte blanc sera lisible (ratio ≥ 3.0 — seuil WCAG AA large). */
function hasGoodContrastWithWhite(hex: string): boolean {
  if (!HEX_REGEX.test(hex)) return true // valeur invalide → pas d'avertissement
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  // Luminance relative (sRGB → linéaire)
  const toLinear = (c: number) => c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  const lum = 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b)
  // Contraste vs blanc (lum 1.0)
  const contrast = (1 + 0.05) / (lum + 0.05)
  return contrast >= 3.0
}

export function ClientBrandingForm({
  clientId,
  initialBranding,
  clientCompanyName,
  onUpdateBranding,
  successMessage,
}: ClientBrandingFormProps) {
  const [displayName, setDisplayName] = useState(initialBranding?.displayName ?? '')
  const [accentColor, setAccentColor] = useState(initialBranding?.accentColor ?? DEFAULT_ACCENT)
  const [saving, setSaving] = useState(false)
  const [showResetConfirm, setShowResetConfirm] = useState(false)

  // Sync si initialBranding change (ex: Hub charge les données en async)
  useEffect(() => {
    setDisplayName(initialBranding?.displayName ?? '')
    setAccentColor(initialBranding?.accentColor ?? DEFAULT_ACCENT)
  }, [initialBranding])

  const handleSave = async () => {
    if (accentColor && !HEX_REGEX.test(accentColor)) {
      showError('Couleur d\'accent invalide. Format attendu : #RRGGBB (ex: #16a34a)')
      return
    }

    setSaving(true)
    try {
      const result = await onUpdateBranding(clientId, {
        displayName: displayName || null,
        accentColor: accentColor || null,
      })

      if (result.error) {
        showError(result.error.message)
      } else {
        showSuccess(successMessage ?? `Branding mis à jour pour ${clientCompanyName ?? 'le client'}`)
      }
    } finally {
      setSaving(false)
    }
  }

  const handleResetConfirmed = async () => {
    setShowResetConfirm(false)
    setSaving(true)
    try {
      const result = await onUpdateBranding(clientId, {
        displayName: null,
        accentColor: null,
      })

      if (result.error) {
        showError(result.error.message)
      } else {
        setDisplayName('')
        setAccentColor(DEFAULT_ACCENT)
        showSuccess('Branding réinitialisé — nom et couleur rétablis aux valeurs par défaut')
      }
    } finally {
      setSaving(false)
    }
  }

  const previewName = displayName || clientCompanyName || 'MonprojetPro One'
  const previewColor = HEX_REGEX.test(accentColor) ? accentColor : DEFAULT_ACCENT
  const contrastOk = hasGoodContrastWithWhite(previewColor)

  return (
    <div className="space-y-6">
      {/* Formulaire */}
      <Card>
        <CardHeader>
          <CardTitle>Personnalisation du branding</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">

          {/* ─── Nom affiché ──────────────────────────────────────────────── */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium">Nom d&apos;entreprise</label>
            <Input
              value={displayName}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDisplayName(e.target.value)}
              placeholder={clientCompanyName || 'Nom de l\'entreprise'}
              maxLength={50}
            />
            <p className="text-xs text-muted-foreground">
              Affiché à côté du symbole MonprojetPro dans le header de votre dashboard.
              {displayName && (
                <span className="ml-1 text-green-400">— visible dans l&apos;aperçu ci-dessous</span>
              )}
            </p>
          </div>

          {/* ─── Couleur d'accent ─────────────────────────────────────────── */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium">Couleur d&apos;accent</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={previewColor}
                onChange={(e) => setAccentColor(e.target.value)}
                className="h-10 w-14 cursor-pointer rounded border border-border bg-transparent"
                aria-label="Sélecteur de couleur"
              />
              <Input
                value={accentColor}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAccentColor(e.target.value)}
                placeholder={DEFAULT_ACCENT}
                className="w-32 font-mono"
                maxLength={7}
              />
              {/* Indicateur de contraste */}
              {HEX_REGEX.test(accentColor) && (
                <div className={['flex items-center gap-1.5 text-xs px-2 py-1 rounded-full', contrastOk ? 'bg-green-500/10 text-green-400' : 'bg-amber-500/10 text-amber-400'].join(' ')}>
                  <span aria-hidden="true">{contrastOk ? '✓' : '⚠'}</span>
                  <span>{contrastOk ? 'Contraste OK' : 'Texte blanc peu lisible'}</span>
                </div>
              )}
            </div>
            {!contrastOk && HEX_REGEX.test(accentColor) && (
              <p className="text-xs text-amber-400">
                Cette couleur claire risque de rendre le texte blanc peu lisible. Choisissez une teinte plus sombre.
              </p>
            )}
            <p className="text-xs text-muted-foreground">Format HEX requis — ex&nbsp;: {DEFAULT_ACCENT}</p>
          </div>

          {/* ─── Actions ──────────────────────────────────────────────────── */}
          <div className="flex flex-wrap gap-3 pt-2">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Sauvegarde...' : 'Sauvegarder'}
            </Button>
            {showResetConfirm ? (
              <div className="flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-1.5">
                <span className="text-xs text-destructive">Réinitialiser le nom et la couleur ?</span>
                <button
                  type="button"
                  className="text-xs font-semibold text-destructive hover:underline"
                  onClick={handleResetConfirmed}
                  disabled={saving}
                >
                  Confirmer
                </button>
                <button
                  type="button"
                  className="text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => setShowResetConfirm(false)}
                >
                  Annuler
                </button>
              </div>
            ) : (
              <Button
                variant="outline"
                onClick={() => setShowResetConfirm(true)}
                disabled={saving}
              >
                Réinitialiser
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ─── Aperçu fidèle du header One ──────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>Aperçu du dashboard</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground mb-3">
            Rendu approximatif du header du dashboard One avec vos réglages actuels.
          </p>
          {/* Simulation header dashboard One (fond sombre, symbole + nom gauche, toggle centre) */}
          <div className="rounded-xl border border-border overflow-hidden">
            {/* Barre header */}
            <div className="bg-[#020402] px-4 py-3 flex items-center justify-between">
              {/* Gauche : symbole MPP + nom */}
              <div className="flex items-center gap-2" style={{ width: 200 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/logos/logo-symbol.png"
                  alt="MonprojetPro"
                  className="w-auto object-contain shrink-0"
                  style={{ height: '28px' }}
                />
                {displayName ? (
                  <span
                    className="font-bold text-white truncate max-w-[120px]"
                    style={{ fontFamily: 'Poppins, sans-serif', fontSize: '0.875rem', lineHeight: 1.2 }}
                  >
                    {displayName}
                  </span>
                ) : (
                  <span className="text-[11px] text-white/40 italic">Votre nom ici</span>
                )}
              </div>

              {/* Centre : badge mode */}
              <div className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1">
                <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: previewColor }} />
                <span className="text-[11px] font-medium text-white/60">One</span>
              </div>

              {/* Droite : avatar */}
              <div className="flex items-center gap-2" style={{ width: 200, justifyContent: 'flex-end' }}>
                <div
                  className="w-[28px] h-[28px] rounded-full flex items-center justify-center text-white font-bold text-[10px]"
                  style={{ background: `linear-gradient(135deg, ${previewColor}, color-mix(in srgb, ${previewColor} 60%, white))` }}
                >
                  CL
                </div>
              </div>
            </div>

            {/* Body : simulation contenu avec card module */}
            <div className="bg-[#0a0a0a] px-4 py-4 space-y-3">
              <div className="text-[12px] font-bold text-white/80">Bonjour {previewName} !</div>
              <div
                className="h-[56px] rounded-xl flex items-center justify-center text-[12px] font-semibold text-white"
                style={{
                  background: `color-mix(in srgb, ${previewColor} 5%, transparent)`,
                  border: `1px solid ${previewColor}`,
                  color: `color-mix(in srgb, ${previewColor} 80%, white)`,
                }}
              >
                Module actif →
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
