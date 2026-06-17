// rebuild: chat-markdown-renderer
import { notFound, redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { MODE_TOGGLE_COOKIE } from '@monprojetpro/ui'
import { resolveClientMode } from '@monprojetpro/utils'
import { ParcoursOverview, getParcours } from '@monprojetpro/module-parcours'
import { LabHistoryView } from '@monprojetpro/module-core-dashboard'
// rebuild

export default async function ClientParcoursPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) notFound()

  const { data: client } = await supabase
    .from('clients')
    .select('id, first_name, client_configs(dashboard_type, lab_mode_available, one_mode_available, elio_lab_enabled)')
    .eq('auth_user_id', user.id)
    .single()

  if (!client) notFound()

  // Garde de mode — le parcours est une page Lab-only. Si le client n'est pas
  // réellement en mode Lab (accès Lab révoqué, même si son cookie de vue est resté
  // sur 'lab'), on le renvoie à sa home One. Résolveur centralisé partagé.
  const cfgRelation = (client as { client_configs?: unknown }).client_configs
  const cfg = (Array.isArray(cfgRelation) ? cfgRelation[0] : cfgRelation) as
    | { dashboard_type?: string; lab_mode_available?: boolean; one_mode_available?: boolean; elio_lab_enabled?: boolean }
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

  // Niveau d'accès Lab (ADR-01) : un client gradué (dashboard_type='one') qui n'a PAS
  // Élio Lab réactivé ne voit son Lab qu'en CONSULTATION (historique lecture seule).
  // Élio Lab réactivé OU client Lab natif → parcours entier interactif.
  const isGraduated = cfg?.dashboard_type === 'one'
  const labReadOnly = isGraduated && !(cfg?.elio_lab_enabled ?? false)

  if (labReadOnly) {
    const parcoursRes = await getParcours({ clientId: client.id })
    const p = parcoursRes.data
    const historyParcours = p
      ? {
          id: p.id,
          status: p.status,
          startedAt: p.createdAt,
          completedAt: p.completedAt,
          steps: p.steps.map((s) => ({
            id: s.id,
            name: s.title,
            completedAt: s.completedAt,
            documentId: null,
          })),
        }
      : null

    return (
      <div className="flex flex-col gap-6 p-6">
        <LabHistoryView parcours={historyParcours} />
      </div>
    )
  }

  // Agents du parcours coupés par l'opérateur (client Lab natif). L'état « en pause » n'est
  // plus une bannière séparée : il est porté par le bandeau UNIQUE d'Élio le Concierge
  // (dans ParcoursOverview), seule voix qui s'adresse au client sur cette page.
  const labAgentsOff = !(cfg?.elio_lab_enabled ?? false)

  return (
    <div className="flex flex-col gap-6 p-6">
      <ParcoursOverview clientId={client.id} clientFirstName={client.first_name} agentsPaused={labAgentsOff} />
    </div>
  )
}
// rebuild Tue, May  5, 2026  4:58:53 PM

// rebuild-doc-client-name-scrollbar