import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { notFound } from 'next/navigation'
import { EmailToggle, ToolPostsFeed } from '@monprojetpro/module-suivi-outil'
import { requireActiveModule } from '../require-active-module'

export default async function SuiviOutilPage() {
  await requireActiveModule('suivi-outil')
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
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">Suivi de l&apos;outil</h1>
        <p className="text-sm text-muted-foreground">
          Suivez l&apos;avancement du développement de votre outil en temps réel.
        </p>
      </div>
      {/* userId = auth_user_id du client, pour la gestion des préférences de notification */}
      <EmailToggle userId={user.id} />
      <ToolPostsFeed clientId={client.id} isOperator={false} />
    </div>
  )
}
