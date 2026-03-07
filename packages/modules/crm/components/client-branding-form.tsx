'use client'

import { useState, useRef, useEffect } from 'react'
import { Button, Card, CardContent, CardHeader, CardTitle, Input, showSuccess, showError } from '@foxeo/ui'
import type { CustomBranding } from '@foxeo/types'
import { updateClientBranding } from '../actions/update-client-branding'
import { uploadClientLogo } from '../actions/upload-client-logo'

interface ClientBrandingFormProps {
  clientId: string
  initialBranding?: CustomBranding | null
  clientCompanyName?: string
}

const DEFAULT_ACCENT = '#F7931E'

export function ClientBrandingForm({ clientId, initialBranding, clientCompanyName }: ClientBrandingFormProps) {
  const [displayName, setDisplayName] = useState(initialBranding?.displayName ?? '')
  const [accentColor, setAccentColor] = useState(initialBranding?.accentColor ?? DEFAULT_ACCENT)
  const [logoUrl, setLogoUrl] = useState(initialBranding?.logoUrl ?? '')
  const [logoPreview, setLogoPreview] = useState<string | null>(initialBranding?.logoUrl ?? null)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Revoke object URL on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      if (logoPreview && logoPreview.startsWith('blob:')) {
        URL.revokeObjectURL(logoPreview)
      }
    }
  }, [logoPreview])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!['image/png', 'image/svg+xml'].includes(file.type)) {
      showError('Format non supporté. Utilisez PNG ou SVG.')
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      showError('Le fichier dépasse 2 Mo.')
      return
    }

    // Revoke previous object URL to prevent memory leak
    if (logoPreview && logoPreview.startsWith('blob:')) {
      URL.revokeObjectURL(logoPreview)
    }

    setLogoFile(file)
    setLogoPreview(URL.createObjectURL(file))
  }

  const HEX_REGEX = /^#[0-9A-Fa-f]{6}$/

  const handleSave = async () => {
    if (accentColor && !HEX_REGEX.test(accentColor)) {
      showError('Couleur d\'accent invalide. Format attendu : #RRGGBB (ex: #F7931E)')
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

  const handleReset = async () => {
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
        showSuccess('Branding réinitialisé aux valeurs par défaut')
      }
    } finally {
      setSaving(false)
    }
  }

  const previewName = displayName || clientCompanyName || 'Foxeo One'
  const previewColor = accentColor || DEFAULT_ACCENT

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Personnalisation du branding</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Logo upload */}
          <div>
            <label className="block text-sm font-medium mb-1">Logo</label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/svg+xml"
              onChange={handleFileChange}
              className="block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-accent/10 file:text-accent-foreground hover:file:bg-accent/20"
            />
            <p className="text-xs text-muted-foreground mt-1">PNG ou SVG, max 2 Mo</p>
            {logoPreview && (
              <div className="mt-2">
                <img
                  src={logoPreview}
                  alt="Aperçu logo"
                  className="h-12 w-auto rounded border border-border"
                />
              </div>
            )}
          </div>

          {/* Display name */}
          <div>
            <label className="block text-sm font-medium mb-1">Nom affiché</label>
            <Input
              value={displayName}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDisplayName(e.target.value)}
              placeholder={clientCompanyName || 'Nom de l\'entreprise'}
              maxLength={50}
            />
            <p className="text-xs text-muted-foreground mt-1">Remplace &quot;Foxeo One&quot; dans le header du dashboard</p>
          </div>

          {/* Accent color */}
          <div>
            <label className="block text-sm font-medium mb-1">Couleur d&apos;accent</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={previewColor}
                onChange={(e) => setAccentColor(e.target.value)}
                className="h-10 w-14 cursor-pointer rounded border border-border"
              />
              <Input
                value={accentColor}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAccentColor(e.target.value)}
                placeholder="#F7931E"
                className="w-32"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Sauvegarde...' : 'Sauvegarder'}
            </Button>
            <Button variant="outline" onClick={handleReset} disabled={saving}>
              Réinitialiser
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Mini preview */}
      <Card>
        <CardHeader>
          <CardTitle>Aperçu</CardTitle>
        </CardHeader>
        <CardContent>
          <div
            className="rounded-lg border border-border p-4"
            style={{ '--preview-accent': previewColor } as React.CSSProperties}
          >
            <div
              className="flex items-center gap-3 rounded-md px-4 py-3"
              style={{ backgroundColor: previewColor }}
            >
              {logoPreview ? (
                <img src={logoPreview} alt="Logo" className="h-8 w-auto" />
              ) : (
                <div className="h-8 w-8 rounded bg-white/20" />
              )}
              <span className="font-semibold text-white">{previewName}</span>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2">
              <div className="h-4 rounded bg-muted" />
              <div className="h-4 rounded bg-muted" />
              <div className="h-4 rounded bg-muted" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
