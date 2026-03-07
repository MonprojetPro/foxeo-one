'use client'

import { useEffect, useState } from 'react'
import { Skeleton, showError } from '@foxeo/ui'
import type { CustomBranding } from '@foxeo/types'
import { getClientBranding } from '../actions/get-client-branding'
import { ClientBrandingForm } from './client-branding-form'

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
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    )
  }

  if (loadState === 'error') {
    return (
      <div className="p-4 text-sm text-muted-foreground">
        Erreur lors du chargement du branding. Rechargez la page.
      </div>
    )
  }

  return (
    <ClientBrandingForm
      clientId={clientId}
      initialBranding={branding}
      clientCompanyName={clientCompanyName}
    />
  )
}
