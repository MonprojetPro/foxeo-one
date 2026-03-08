import { notFound } from 'next/navigation'
import { createServerSupabaseClient } from '@foxeo/supabase'
import { InvoicesList, BillingSummary } from '@foxeo/modules-facturation'

// ── Page "Mes factures" — Vue client One (lecture seule via RLS)
// RLS policy billing_sync_select_owner garantit que le client ne voit que ses factures

export default async function ClientFacturationPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) notFound()

  // Récupérer le client courant
  const { data: client } = await supabase
    .from('clients')
    .select('id')
    .eq('auth_user_id', user.id)
    .single()

  if (!client) notFound()

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold">Mes factures</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Consultez vos factures et l&apos;état de vos paiements
        </p>
      </div>

      {/* Résumé financier */}
      <BillingSummary clientId={client.id} />

      {/* Liste des factures */}
      <InvoicesList clientId={client.id} showRefreshButton />
    </div>
  )
}
