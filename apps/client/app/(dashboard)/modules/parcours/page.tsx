// rebuild: chat-markdown-renderer
import { notFound, redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { MODE_TOGGLE_COOKIE } from '@monprojetpro/ui'
import { resolveClientMode } from '@monprojetpro/utils'
import { ParcoursOverview } from '@monprojetpro/module-parcours'
// rebuild

export default async function ClientParcoursPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) notFound()

  const { data: client } = await supabase
    .from('clients')
    .select('id, first_name, client_configs(dashboard_type, lab_mode_available, one_mode_available)')
    .eq('auth_user_id', user.id)
    .single()

  if (!client) notFound()

  // Garde de mode — le parcours est une page Lab-only. Si le client n'est pas
  // réellement en mode Lab (accès Lab révoqué, même si son cookie de vue est resté
  // sur 'lab'), on le renvoie à sa home One. Résolveur centralisé partagé.
  const cfgRelation = (client as { client_configs?: unknown }).client_configs
  const cfg = (Array.isArray(cfgRelation) ? cfgRelation[0] : cfgRelation) as
    | { dashboard_type?: string; lab_mode_available?: boolean; one_mode_available?: boolean }
    | null
    | undefined
  const { activeMode } = resolveClientMode({
    dashboardType: cfg?.dashboard_type,
    labModeAvailable: cfg?.lab_mode_available ?? false,
    oneModeAvailable: cfg?.one_mode_available ?? false,
    cookieMode: (await cookies()).get(MODE_TOGGLE_COOKIE)?.value,
  })

  if (activeMode !== 'lab') {
    redirect('/')
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <ParcoursOverview clientId={client.id} clientFirstName={client.first_name} />
    </div>
  )
}
// rebuild Tue, May  5, 2026  4:58:53 PM

// rebuild-doc-client-name-scrollbar