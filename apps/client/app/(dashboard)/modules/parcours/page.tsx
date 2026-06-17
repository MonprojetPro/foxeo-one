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

  // Agents Lab coupés par l'opérateur (client Lab natif) → bannière de pause au-dessus
  // du parcours. L'espace/historique reste consultable, mais Élio ne répond plus.
  const labAgentsOff = !(cfg?.elio_lab_enabled ?? false)

  return (
    <div className="flex flex-col gap-6 p-6">
      {labAgentsOff && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
          <span className="mt-0.5 text-amber-400" aria-hidden="true">⏸️</span>
          <div>
            <p className="text-sm font-medium text-foreground">Agents de ton parcours en pause</p>
            <p className="text-xs text-muted-foreground">
              MiKL a mis les agents de ton parcours en pause. Tu gardes l&apos;accès à ton parcours
              et à ton historique, mais ils ne répondent pas pour le moment. (Élio reste dispo pour
              tes questions.)
            </p>
          </div>
        </div>
      )}
      <ParcoursOverview clientId={client.id} clientFirstName={client.first_name} agentsPaused={labAgentsOff} />
    </div>
  )
}
// rebuild Tue, May  5, 2026  4:58:53 PM

// rebuild-doc-client-name-scrollbar