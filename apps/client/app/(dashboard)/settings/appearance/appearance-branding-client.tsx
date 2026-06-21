'use client'

// ─────────────────────────────────────────────────────────────────────────────
// AppearanceBrandingClient — wrapper client pour la page Apparence (mode One)
//
// Ce composant existe pour respecter la frontière use client / use server :
//   • La page `appearance/page.tsx` est un Server Component → ne peut PAS
//     passer des Server Actions comme props JSX directement.
//   • On importe les Server Actions ici (côté 'use client') : Next.js crée
//     automatiquement les endpoints Server Action (pattern officiel Next.js).
//
// Adaptateur :
//   • updateOwnBranding n'accepte pas clientId (résolu par auth.uid() côté RPC)
//   On enveloppe pour satisfaire la signature de ClientBrandingForm.
//
// Sécurité garantie par :
//   • updateOwnBranding → RPC update_own_branding (SECURITY DEFINER, custom_branding only)
//
// Note : L'upload de logo a été abandonné (2026-06-21). Le header affiche
// désormais le symbole MPP fixe + nom d'entreprise en texte.
// ─────────────────────────────────────────────────────────────────────────────

import { ClientBrandingForm, updateOwnBranding } from '@monprojetpro/modules-crm'
import type { CustomBranding } from '@monprojetpro/types'

interface AppearanceBrandingClientProps {
  clientId: string
  initialBranding?: CustomBranding | null
  clientCompanyName?: string
}

/** updateOwnBranding ignore clientId — il le résout depuis auth.uid() via la RPC */
function updateOwnBrandingAdapter(
  _clientId: string,
  branding: Partial<Omit<CustomBranding, 'updatedAt'>>,
) {
  return updateOwnBranding(branding)
}

export function AppearanceBrandingClient({
  clientId,
  initialBranding,
  clientCompanyName,
}: AppearanceBrandingClientProps) {
  return (
    <ClientBrandingForm
      clientId={clientId}
      initialBranding={initialBranding}
      clientCompanyName={clientCompanyName}
      onUpdateBranding={updateOwnBrandingAdapter}
      successMessage="Votre apparence a été mise à jour ! Les changements sont visibles immédiatement."
    />
  )
}
