// rebuild: chat-markdown-renderer
import { notFound, redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createServerSupabaseClient, hasIaConsent } from '@monprojetpro/supabase'
import { MODE_TOGGLE_COOKIE } from '@monprojetpro/ui'
import { resolveClientMode } from '@monprojetpro/utils'
import { ParcoursPageClient } from './parcours-page-client'
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

  // Accès Lab du client gradué (ADR-01) : on affiche TOUJOURS le parcours entier.
  // Quand Élio Lab n'est pas réactivé, il est simplement grisé / en pause
  // (agentsPaused ci-dessous) — étapes cliquables (conversations + docs consultables),
  // bouton « Générer » masqué, réouverture d'une étape réservée à MiKL depuis le Hub.
  // (L'ancien raccourci « consultation historique » du Lot 3 a été retiré — régression signalée.)

  // Agents du parcours coupés par l'opérateur (client Lab natif ou gradué). L'état « en pause » n'est
  // plus une bannière séparée : il est porté par le bandeau UNIQUE d'Élio le Concierge,
  // seule voix qui s'adresse au client sur cette page.
  const labAgentsOff = !(cfg?.elio_lab_enabled ?? false)

  // Consentement IA — le Concierge (pop-up de chat) ne peut répondre que si accordé.
  const iaConsentGranted = await hasIaConsent(client.id)

  return (
    <div className="flex flex-col gap-6 p-6">
      <ParcoursPageClient
        clientId={client.id}
        clientFirstName={client.first_name}
        agentsPaused={labAgentsOff}
        iaConsentGranted={iaConsentGranted}
      />
    </div>
  )
}
// rebuild Tue, May  5, 2026  4:58:53 PM

// rebuild-doc-client-name-scrollbar