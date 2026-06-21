import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { MODE_TOGGLE_COOKIE } from '@monprojetpro/ui'
import { resolveClientMode } from '@monprojetpro/utils'
import type { CustomBranding } from '@monprojetpro/types'
import { AppearanceBrandingClient } from './appearance-branding-client'

export const metadata = {
  title: 'Apparence — MonprojetPro One',
  description: 'Personnalisez le logo, le nom affiché et la couleur de votre dashboard',
}

// ─────────────────────────────────────────────────────────────────────────────
// Page Réglages → Apparence — visible en mode One uniquement
//
// Sécurité :
//   • Auth obligatoire (redirect /login sinon)
//   • Mode One vérifié ici (redirect /settings si mode Lab actif)
//   • Les mutations passent par updateOwnBranding (RPC SECURITY DEFINER)
//   • Aucune donnée d'un autre client n'est lisible ou modifiable ici
//
// Note : L'upload de logo a été abandonné (2026-06-21). Le form gère uniquement
// le nom d'entreprise et la couleur d'accent.
// ─────────────────────────────────────────────────────────────────────────────

export default async function AppearancePage() {
  const supabase = await createServerSupabaseClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: clientRow } = await supabase
    .from('clients')
    .select('id, name, client_configs(dashboard_type, custom_branding, lab_mode_available, one_mode_available)')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  if (!clientRow) {
    redirect('/login')
  }

  // Normalize joined relation (array or object — Supabase peut renvoyer les deux)
  const configRelation = clientRow.client_configs
  const clientConfig = Array.isArray(configRelation) ? configRelation[0] : configRelation

  // Résoudre le mode actif via le cookie + les flags DB (source unique de vérité)
  const cookieStore = await cookies()
  const { activeMode } = resolveClientMode({
    dashboardType: clientConfig?.dashboard_type,
    labModeAvailable: clientConfig?.lab_mode_available ?? false,
    oneModeAvailable: clientConfig?.one_mode_available ?? false,
    cookieMode: cookieStore.get(MODE_TOGGLE_COOKIE)?.value,
  })

  // Apparence = One uniquement — redirect si mode Lab actif
  if (activeMode !== 'one') {
    redirect('/settings')
  }

  const clientId = clientRow.id
  const companyName = clientRow.name ?? undefined
  const initialBranding = (clientConfig?.custom_branding ?? null) as CustomBranding | null

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Apparence</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Personnalisez le logo, le nom affiché et la couleur d&apos;accent de votre dashboard.
          Ces réglages sont visibles uniquement sur votre espace.
        </p>
      </div>

      {/* Composant client — injecte l'action updateOwnBranding */}
      <AppearanceBrandingClient
        clientId={clientId}
        initialBranding={initialBranding}
        clientCompanyName={companyName}
      />
    </div>
  )
}
