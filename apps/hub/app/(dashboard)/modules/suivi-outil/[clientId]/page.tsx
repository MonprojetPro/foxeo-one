import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { notFound } from 'next/navigation'
import { ToolPostComposer, ToolPostsFeed } from '@monprojetpro/module-suivi-outil'

interface PageProps {
  params: Promise<{ clientId: string }>
}

export default async function HubSuiviOutilPage({ params }: PageProps) {
  const { clientId } = await params
  const supabase = await createServerSupabaseClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) notFound()

  // Vérifie que l'opérateur a accès à ce client
  const { data: operator } = await supabase
    .from('operators')
    .select('id')
    .eq('auth_user_id', user.id)
    .single()
  if (!operator) notFound()

  const { data: client } = await supabase
    .from('clients')
    .select('id, first_name, company_name')
    .eq('id', clientId)
    .eq('operator_id', operator.id)
    .single()
  if (!client) notFound()

  const clientName = client.first_name ?? client.company_name ?? 'Ce client'

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">Suivi de l'outil — {clientName}</h1>
        <p className="text-sm text-muted-foreground">
          Publiez des mises à jour sur l'avancement du développement.
        </p>
      </div>
      <ToolPostComposer clientId={clientId} operatorId={operator.id} />
      <ToolPostsFeed clientId={clientId} isOperator={true} operatorId={operator.id} />
    </div>
  )
}
