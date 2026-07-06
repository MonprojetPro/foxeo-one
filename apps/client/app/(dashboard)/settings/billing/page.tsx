import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { MODE_TOGGLE_COOKIE } from '@monprojetpro/ui'
import { resolveClientMode } from '@monprojetpro/utils'
import {
  SubscriptionCard,
  BillingSummary,
  InvoicesList,
} from '@monprojetpro/modules-facturation'

export const metadata = { title: 'Mes factures | MonprojetPro' }

// ── Paramètres → Mes factures ──────────────────────────────────────────────────
// Vision One v2 (2026-06-24) : « Comptabilité » sort du socle One. L'aspect réel
// (factures d'ABONNEMENT MPP émises par MiKL au client, synchro Pennylane → billing_sync)
// est rapatrié ici. On RÉUTILISE les composants existants du module facturation
// (SubscriptionCard / BillingSummary / InvoicesList) — aucune logique réécrite.
//
// RLS : billing_sync_select_merged (is_operator() OR client propriétaire) garantit que
// le client ne voit que ses lignes.
// Réservé au mode One (un client en mode Lab n'a pas d'abonnement MPP à afficher ici).
export default async function SettingsBillingPage() {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: client } = await supabase
    .from('clients')
    .select('id, client_configs(dashboard_type, lab_mode_available, one_mode_available)')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  if (!client) redirect('/login')

  const configRelation = client.client_configs
  const clientConfig = Array.isArray(configRelation) ? configRelation[0] : configRelation

  const cookieStore = await cookies()
  const { activeMode } = resolveClientMode({
    dashboardType: clientConfig?.dashboard_type,
    labModeAvailable: clientConfig?.lab_mode_available ?? false,
    oneModeAvailable: clientConfig?.one_mode_available ?? false,
    cookieMode: cookieStore.get(MODE_TOGGLE_COOKIE)?.value,
  })

  // Section réservée au mode One — en mode Lab, retour aux paramètres.
  if (activeMode !== 'one') {
    redirect('/settings')
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Mes factures</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Votre abonnement MonprojetPro et l&apos;historique de vos factures
        </p>
      </div>

      {/* Abonnement MPP en cours */}
      <SubscriptionCard clientId={client.id} />

      {/* Résumé financier (payé / en attente / prochain prélèvement) */}
      <BillingSummary clientId={client.id} />

      {/* Historique des factures d'abonnement */}
      <InvoicesList clientId={client.id} showRefreshButton />
    </div>
  )
}
