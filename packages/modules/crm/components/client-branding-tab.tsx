'use client'

import { useEffect, useState } from 'react'
import { showError } from '@monprojetpro/ui'
import { CockpitCallout, BlockSkeleton } from '@monprojetpro/ui'
import { AlertCircle } from 'lucide-react'
import type { CustomBranding } from '@monprojetpro/types'
import { getClientBranding } from '../actions/get-client-branding'
import { updateClientBranding } from '../actions/update-client-branding'
import { ClientBrandingForm } from './client-branding-form'

// ─────────────────────────────────────────────────────────────────────────────
// ClientBrandingTab — utilisé dans le Hub (côté opérateur)
// Passe l'action opérateur updateClientBranding à ClientBrandingForm via la
// prop onUpdateBranding. L'upload de logo a été abandonné (2026-06-21) au
// profit du modèle symbole MPP + nom d'entreprise en texte.
// ─────────────────────────────────────────────────────────────────────────────

interface ClientBrandingTabProps {
  clientId: string
  clientCompanyName?: string
}

type LoadState = 'loading' | 'loaded' | 'error'

export function ClientBrandingTab({ clientId, clientCompanyName }: ClientBrandingTabProps) {
  const [branding, setBranding] = useState<CustomBranding | null>(null)
  const [loadState, setLoadState] = useState<LoadState>('loading')

  useEffect(() => {
    getClientBranding(clientId).then((result) => {
      if (result.error) {
        showError('Impossible de charger le branding')
        setLoadState('error')
      } else {
        setBranding(result.data ?? null)
        setLoadState('loaded')
      }
    })
  }, [clientId])

  if (loadState === 'loading') {
    return (
      <div className="mt-4 space-y-3">
        <BlockSkeleton className="h-9 w-48" />
        <BlockSkeleton className="h-32 w-full" />
        <BlockSkeleton className="h-32 w-full" />
      </div>
    )
  }

  if (loadState === 'error') {
    return (
      <div className="mt-4">
        <CockpitCallout tone="red" icon={AlertCircle} title="Erreur de chargement">
          Impossible de charger le branding. Rechargez la page.
        </CockpitCallout>
      </div>
    )
  }

  return (
    <ClientBrandingForm
      clientId={clientId}
      initialBranding={branding}
      clientCompanyName={clientCompanyName}
      onUpdateBranding={updateClientBranding}
    />
  )
}
