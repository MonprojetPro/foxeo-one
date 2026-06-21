'use client'

import { useState, useRef, useEffect, useCallback, DragEvent } from 'react'
import { Button, Card, CardContent, CardHeader, CardTitle, Input, showSuccess, showError } from '@monprojetpro/ui'
import type { CustomBranding } from '@monprojetpro/types'
import { updateClientBranding } from '../actions/update-client-branding'
import { uploadClientLogo } from '../actions/upload-client-logo'

interface ClientBrandingFormProps {
  clientId: string
  initialBranding?: CustomBranding | null
  clientCompanyName?: string
}

// Valeur par défaut : vert One (et non l'orange #F7931E qui était la couleur incorrecte)
const DEFAULT_ACCENT = '#16a34a'
const HEX_REGEX = /^#[0-9A-Fa-f]{6}$/
const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024 // 2 Mo (aligné côté client et serveur dans le message)
const ALLOWED_TYPES = ['image/png', 'image/svg+xml']

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

export function ClientBrandingForm({ clientId, initialBranding, clientCompanyName }: ClientBrandingFormProps) {
  const [displayName, setDisplayName] = useState(initialBranding?.displayName ?? '')
  const [accentColor, setAccentColor] = useState(initialBranding?.accentColor ?? DEFAULT_ACCENT)
  const [logoUrl, setLogoUrl] = useState(initialBranding?.logoUrl ?? '')
  const [logoPreview, setLogoPreview] = useState<string | null>(initialBranding?.logoUrl ?? null)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [isDragOver, setIsDragOver] = useState(false)
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Revoke object URL on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      if (logoPreview && logoPreview.startsWith('blob:')) {
        URL.revokeObjectURL(logoPreview)
      }
    }
  }, [logoPreview])

  const processFile = useCallback((file: File) => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      showError('Format non supporté. Utilisez PNG ou SVG.')
      return
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      showError('Le fichier dépasse 2 Mo.')
      return
    }

    // Revoke previous object URL to prevent memory leak
    if (logoPreview && logoPreview.startsWith('blob:')) {
      URL.revokeObjectURL(logoPreview)
    }

    setLogoFile(file)
    setLogoPreview(URL.createObjectURL(file))
  }, [logoPreview])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) processFile(file)
  }

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragOver(false)
  }

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) processFile(file)
  }

  const handleSave = async () => {
    if (accentColor && !HEX_REGEX.test(accentColor)) {
      showError('Couleur d\'accent invalide. Format attendu : #RRGGBB (ex: #16a34a)')
      return
    }

    setSaving(true)
    try {
      let finalLogoUrl = logoUrl

      // Upload logo if new file selected
      if (logoFile) {
        const formData = new FormData()
        formData.append('file', logoFile)
        const uploadResult = await uploadClientLogo(clientId, formData)
        if (uploadResult.error) {
          showError(uploadResult.error.message)
          return
        }
        finalLogoUrl = uploadResult.data?.logoUrl ?? ''
      }

      const result = await updateClientBranding(clientId, {
        logoUrl: finalLogoUrl || null,
        displayName: displayName || null,
        accentColor: accentColor || null,
      })

      if (result.error) {
        showError(result.error.message)
      } else {
        setLogoUrl(finalLogoUrl)
        setLogoFile(null)
        showSuccess(`Branding mis à jour pour ${clientCompanyName ?? 'le client'}`)
      }
    } finally {
      setSaving(false)
    }
  }

  const handleResetConfirmed = async () => {
    setShowResetConfirm(false)
    setSaving(true)
    try {
      const result = await updateClientBranding(clientId, {
        logoUrl: null,
        displayName: null,
        accentColor: null,
      })

      if (result.error) {
        showError(result.error.message)
      } else {
        setDisplayName('')
        setAccentColor(DEFAULT_ACCENT)
        setLogoUrl('')
        setLogoPreview(null)
        setLogoFile(null)
        if (fileInputRef.current) fileInputRef.current.value = ''
        showSuccess('Branding réinitialisé — logo, nom et couleur rétablis aux valeurs par défaut')
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

          {/* ─── Logo upload ─────────────────────────────────────────────── */}
          <div className="space-y-3">
            <label className="block text-sm font-medium">Logo</label>

            {/* Zone drag & drop */}
            <div
              role="button"
              tabIndex={0}
              aria-label="Zone de dépôt du logo — cliquer ou glisser-déposer un fichier PNG ou SVG"
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click() }}
              className={[
                'flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-8 cursor-pointer transition-colors select-none',
                isDragOver
                  ? 'border-accent bg-accent/10'
                  : 'border-border hover:border-accent/50 hover:bg-accent/5',
              ].join(' ')}
            >
              <svg className="h-8 w-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              <p className="text-sm text-muted-foreground text-center">
                <span className="font-semibold text-foreground">Cliquez</span> ou glissez-déposez votre logo ici
              </p>
              <p className="text-xs text-muted-foreground">PNG ou SVG — max 2 Mo</p>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/svg+xml"
              onChange={handleFileChange}
              className="hidden"
              aria-hidden="true"
              tabIndex={-1}
            />

            {/* Preview logo (actuel ou nouveau) */}
            {logoPreview && (
              <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/20 p-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={logoPreview}
                  alt="Aperçu logo"
                  className="h-12 w-auto max-w-[120px] rounded object-contain"
                />
                <div className="flex-1 min-w-0">
                  {logoFile ? (
                    <>
                      <p className="text-xs font-medium truncate">{logoFile.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(logoFile.size / 1024).toFixed(0)} Ko — <span className="text-amber-400">Non sauvegardé</span>
                      </p>
                    </>
                  ) : (
                    <p className="text-xs text-muted-foreground">Logo actuel</p>
                  )}
                </div>
                <button
                  type="button"
                  aria-label="Supprimer le logo"
                  className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
                  onClick={(e) => {
                    e.stopPropagation()
                    if (logoPreview.startsWith('blob:')) URL.revokeObjectURL(logoPreview)
                    setLogoPreview(null)
                    setLogoFile(null)
                    setLogoUrl('')
                    if (fileInputRef.current) fileInputRef.current.value = ''
                  }}
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}
          </div>

          {/* ─── Nom affiché ──────────────────────────────────────────────── */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium">Nom affiché</label>
            <Input
              value={displayName}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDisplayName(e.target.value)}
              placeholder={clientCompanyName || 'Nom de l\'entreprise'}
              maxLength={50}
            />
            <p className="text-xs text-muted-foreground">
              Remplace &quot;MonprojetPro One&quot; dans le header du dashboard
              {displayName && !logoPreview && (
                <span className="ml-1 text-green-400">— sera affiché à côté du logo par défaut</span>
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
                <span className="text-xs text-destructive">Réinitialiser logo, nom et couleur ?</span>
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
          {/* Simulation header dashboard One (fond sombre, logo gauche, nom, toggle centre) */}
          <div className="rounded-xl border border-border overflow-hidden">
            {/* Barre header */}
            <div className="bg-[#020402] px-4 py-3 flex items-center justify-between">
              {/* Gauche : logo + nom */}
              <div className="flex items-center gap-2" style={{ width: 180 }}>
                {logoPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={logoPreview} alt="Logo" className="h-7 w-auto max-w-[90px] object-contain" />
                ) : (
                  <div className="h-7 w-7 rounded bg-white/10 flex items-center justify-center">
                    <svg className="h-4 w-4 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14" />
                    </svg>
                  </div>
                )}
                {displayName && !logoPreview && (
                  <span className="text-sm font-semibold text-white truncate max-w-[100px]">{displayName}</span>
                )}
              </div>

              {/* Centre : badge mode */}
              <div className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1">
                <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: previewColor }} />
                <span className="text-[11px] font-medium text-white/60">One</span>
              </div>

              {/* Droite : avatar */}
              <div className="flex items-center gap-2" style={{ width: 180, justifyContent: 'flex-end' }}>
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
