import Link from 'next/link'
import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { RestartTourButton } from '../../components/onboarding/restart-tour-button'
import { ParcoursSettingsSection } from './parcours-settings-section'
import { DataExportSection } from './data-export-section'

export default async function SettingsPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  let clientId: string | null = null
  if (user) {
    const { data: client } = await supabase
      .from('clients')
      .select('id')
      .eq('auth_user_id', user.id)
      .maybeSingle()
    clientId = client?.id ?? null
  }

  return (
    <div className="space-y-4">
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
