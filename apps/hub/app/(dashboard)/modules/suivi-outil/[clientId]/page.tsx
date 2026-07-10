import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { notFound } from 'next/navigation'
import { ToolPostComposer, ToolPostsFeed } from '@monprojetpro/module-suivi-outil'
import { Hammer } from 'lucide-react'
import { CockpitHeader } from '@monprojetpro/ui'

interface PageProps {
  params: Promise<{ clientId: string }>
}

export default async function HubSuiviOutilPage({ params }: PageProps) {
  const { clientId } = await params
  const supabase = await createServerSupabaseClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) notFound()

  /* Vérifie que l'opérateur a accès à ce client */
  const { data: operator } = await supabase
    .from('operators')
    .select('id')
    .eq('auth_user_id', user.id)
    .single()
  if (!operator) notFound()

  const { data: client } = await supabase
    .from('clients')
    .select('id, first_name, company')
    .eq('id', clientId)
    .eq('operator_id', operator.id)
    .single()
  if (!client) notFound()

  const clientName = client.first_name ?? client.company ?? 'Ce client'

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* ── En-tête cockpit avec nom du client ── */}
      <CockpitHeader
        icon={Hammer}
        title={`Suivi de l'outil — ${clientName}`}
        subtitle="Publiez des mises à jour sur l'avancement du développement."
        tone="cyan"
      />

      {/* Compositeur de mise à jour (inchangé — logique formulaire) */}
      <ToolPostComposer clientId={clientId} operatorId={operator.id} />

      {/* Fil des publications (inchangé — logique Realtime) */}
      <ToolPostsFeed clientId={clientId} isOperator={true} operatorId={operator.id} />
    </div>
  )
}
