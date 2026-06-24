import Link from 'next/link'
import { cookies } from 'next/headers'
import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { MODE_TOGGLE_COOKIE } from '@monprojetpro/ui'
import { resolveClientMode } from '@monprojetpro/utils'
import { RestartTourButton } from '../../components/onboarding/restart-tour-button'
import { ParcoursSettingsSection } from './parcours-settings-section'
import { DataExportSection } from './data-export-section'

export default async function SettingsPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  let clientId: string | null = null
  let isOneMode = false

  if (user) {
    const { data: client } = await supabase
      .from('clients')
      .select('id, client_configs(dashboard_type, lab_mode_available, one_mode_available)')
      .eq('auth_user_id', user.id)
      .maybeSingle()

    clientId = client?.id ?? null

    // Détecter le mode actif pour afficher conditionnellement la section Apparence
    if (client) {
      const configRelation = client.client_configs
      const clientConfig = Array.isArray(configRelation) ? configRelation[0] : configRelation
      const cookieStore = await cookies()
      const { activeMode } = resolveClientMode({
        dashboardType: clientConfig?.dashboard_type,
        labModeAvailable: clientConfig?.lab_mode_available ?? false,
        oneModeAvailable: clientConfig?.one_mode_available ?? false,
        cookieMode: cookieStore.get(MODE_TOGGLE_COOKIE)?.value,
      })
      isOneMode = activeMode === 'one'
    }
  }

  return (
    <div className="space-y-4">

      {/* Apparence — visible en mode One uniquement (branding personnalisé) */}
      {isOneMode && (
        <Link
          href="/settings/appearance"
          className="flex items-center justify-between rounded-lg border border-border bg-card p-4 transition-colors hover:bg-accent"
        >
          <div>
            <h2 className="text-base font-medium text-foreground">Apparence</h2>
            <p className="text-sm text-muted-foreground">
              Personnalisez votre logo, nom affiché et couleur d&apos;accent
            </p>
          </div>
          <span className="text-muted-foreground">&rarr;</span>
        </Link>
      )}

      {/* Mes factures — abonnement MPP (vision v2 : rapatrié depuis le module Comptabilité).
          Visible en mode One uniquement (un client Lab n'a pas d'abonnement à afficher ici). */}
      {isOneMode && (
        <Link
          href="/settings/billing"
          className="flex items-center justify-between rounded-lg border border-border bg-card p-4 transition-colors hover:bg-accent"
        >
          <div>
            <h2 className="text-base font-medium text-foreground">Mes factures</h2>
            <p className="text-sm text-muted-foreground">
              Votre abonnement MonprojetPro et l&apos;historique de vos factures
            </p>
          </div>
          <span className="text-muted-foreground">&rarr;</span>
        </Link>
      )}

      <Link
        href="/settings/sessions"
        className="flex items-center justify-between rounded-lg border border-border bg-card p-4 transition-colors hover:bg-accent"
      >
        <div>
          <h2 className="text-base font-medium text-foreground">Sessions actives</h2>
          <p className="text-sm text-muted-foreground">
            Gérez vos sessions et appareils connectés
          </p>
        </div>
        <span className="text-muted-foreground">&rarr;</span>
      </Link>

      <Link
        href="/settings/consents"
        className="flex items-center justify-between rounded-lg border border-border bg-card p-4 transition-colors hover:bg-accent"
      >
        <div>
          <h2 className="text-base font-medium text-foreground">Consentements</h2>
          <p className="text-sm text-muted-foreground">
            Gérez vos consentements CGU et traitement IA
          </p>
        </div>
        <span className="text-muted-foreground">&rarr;</span>
      </Link>

      {/* AC6 — Revoir le tutoriel */}
      <div className="flex items-center justify-between rounded-lg border border-border bg-card p-4">
        <div>
          <h2 className="text-base font-medium text-foreground">Tutoriel interactif</h2>
          <p className="text-sm text-muted-foreground">
            Relancez le tutoriel de découverte de votre espace Lab
          </p>
        </div>
        <RestartTourButton />
      </div>

      {/* Story 13.3 — Historique support */}
      <Link
        href="/settings/support-history"
        className="flex items-center justify-between rounded-lg border border-border bg-card p-4 transition-colors hover:bg-accent"
      >
        <div>
          <h2 className="text-base font-medium text-foreground">Historique support</h2>
          <p className="text-sm text-muted-foreground">
            Consultez les sessions de support technique effectuées sur votre compte
          </p>
        </div>
        <span className="text-muted-foreground">&rarr;</span>
      </Link>

      {/* Story 9.3 — Section Mon parcours Lab */}
      <ParcoursSettingsSection clientId={clientId ?? undefined} />

      {/* Story 9.5a — Section Mes données RGPD */}
      {clientId && <DataExportSection clientId={clientId} />}
    </div>
  )
}
