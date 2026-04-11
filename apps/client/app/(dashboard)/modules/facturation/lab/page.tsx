import { notFound } from 'next/navigation'
import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { DocumentsList } from '@monprojetpro/modules-facturation'

export const metadata = { title: 'Comptabilité | MonprojetPro Lab' }

// ── Page "Comptabilité" — Vue client Lab (lecture seule via RLS)
// RLS policy billing_sync_select_owner garantit que le client ne voit que ses données

export default async function ClientLabFacturationPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) notFound()

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
        <h1 className="text-2xl font-semibold">Comptabilité</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Consultez vos devis et factures MonprojetPro
        </p>
      </div>

      {/* Teasing One — abonnement non encore actif */}
      <div className="rounded-lg border border-dashed border-border bg-muted/30 p-4">
        <p className="text-sm text-muted-foreground">
          Votre abonnement One sera visible ici après la graduation
        </p>
      </div>

      {/* Liste unifiée devis + factures */}
      <DocumentsList clientId={client.id} />
    </div>
  )
}
