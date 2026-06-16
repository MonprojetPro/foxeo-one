// rebuild: chat-markdown-renderer
import { notFound, redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { MODE_TOGGLE_COOKIE } from '@monprojetpro/ui'
import { ParcoursOverview } from '@monprojetpro/module-parcours'
// rebuild

export default async function ClientParcoursPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) notFound()

  const { data: client } = await supabase
    .from('clients')
    .select('id, first_name, client_configs(dashboard_type, lab_mode_available)')
    .eq('auth_user_id', user.id)
    .single()

  if (!client) notFound()

  // Garde de mode — le parcours est une page Lab-only. Si le client n'est pas
  // réellement en mode Lab (accès Lab révoqué → lab_mode_available=false, même si
  // son cookie de vue est resté sur 'lab'), on le renvoie à sa home One. Même calcul
  // effectiveMode que layout.tsx / page.tsx / modules/elio/page.tsx.
  const cfgRelation = (client as { client_configs?: unknown }).client_configs
  const cfg = (Array.isArray(cfgRelation) ? cfgRelation[0] : cfgRelation) as
    | { dashboard_type?: string; lab_mode_available?: boolean }
    | null
    | undefined
  const dashboardType: 'lab' | 'one' = cfg?.dashboard_type === 'one' ? 'one' : 'lab'
  const labModeAvailable = cfg?.lab_mode_available ?? false
  const cookieMode = (await cookies()).get(MODE_TOGGLE_COOKIE)?.value
  const effectiveMode: 'lab' | 'one' =
    cookieMode === 'lab' && labModeAvailable
      ? 'lab'
      : cookieMode === 'one' && (dashboardType === 'one' || labModeAvailable)
        ? 'one'
        : dashboardType

  if (effectiveMode !== 'lab') {
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