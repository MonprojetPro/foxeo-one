'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { errorResponse, successResponse, type ActionResponse } from '@monprojetpro/types'

interface ClientSummary {
  name: string
  email: string
  company: string | null
}

interface ClientDetail {
  id: string
  name: string
  email: string
  company: string | null
  client_type: string
  status: string
  operator_id: string
  created_at: string
}

interface ParcoursInfo {
  id: string
  client_id: string
  current_step: number
  total_steps: number
  status: string
}

interface ValidationRequestInfo {
  id: string
  client_id: string
  type: string
  title: string
  status: string
  created_at: string
}

interface ClientInfoMultiple {
  multiple: true
  clients: ClientSummary[]
}

interface ClientInfoSingle {
  multiple?: false
  client: ClientDetail
  parcours: ParcoursInfo | null
  validationRequests: ValidationRequestInfo[]
  recentMessages: Record<string, unknown>[]
}

export type ClientInfo = ClientInfoMultiple | ClientInfoSingle

/**
 * Server Action — Recherche un client par nom, email ou entreprise.
 * Retourne les détails complets : parcours, demandes de validation, messages récents.
 * RLS appliqué via createServerSupabaseClient (opérateur voit uniquement ses clients).
 * Retourne toujours { data, error } — jamais throw.
 */
export async function searchClientInfo(query: string): Promise<ActionResponse<ClientInfo>> {
  if (!query.trim()) {
    return errorResponse('La recherche ne peut pas être vide', 'VALIDATION_ERROR')
  }

  const supabase = await createServerSupabaseClient()

  // 1. Rechercher le client par nom, email ou entreprise
  // Échapper les caractères SQL wildcard pour éviter des résultats non intentionnels
  const sanitized = query.trim().replace(/[%_\\]/g, '\\$&')
  const { data: clients, error: clientError } = await supabase
    .from('clients')
    .select('*')
    .or(`name.ilike.%${sanitized}%,email.ilike.%${sanitized}%,company.ilike.%${sanitized}%`)
    .limit(5)

  if (clientError) {
    return errorResponse('Erreur lors de la recherche client', 'DB_ERROR', clientError)
  }

  if (!clients || clients.length === 0) {
    return errorResponse(`Aucun client trouvé pour "${query}"`, 'NOT_FOUND')
  }

  // Plusieurs résultats → retourner la liste
  if (clients.length > 1) {
    return successResponse({
      multiple: true as const,
      clients: clients.map((c) => ({
        name: c.name as string,
        email: c.email as string,
        company: c.company as string | null,
      })),
    })
  }

  const client = clients[0]!

  // 2. Fetch parcours si le client a accès au mode Lab
  // Utilise client_configs.dashboard_type (source de vérité depuis ADR-01 Révision 2)
  // plutôt que clients.client_type (informatif uniquement).
  // Parcours existe pour les clients Lab ET pour les gradués avec lab_mode_available = true
  // (ils peuvent revisiter leur parcours passé).
  let parcours = null
  const { data: clientConfig } = await supabase
    .from('client_configs')
    .select('dashboard_type, lab_mode_available')
    .eq('client_id', client.id)
    .maybeSingle()

  const hasLabAccess =
    clientConfig?.dashboard_type === 'lab' || clientConfig?.lab_mode_available === true

  if (hasLabAccess) {
    const { data } = await supabase
      .from('parcours')
      .select('*')
      .eq('client_id', client.id)
      .single()
    parcours = data
  }

  // 3. Fetch dernières demandes de validation (max 3)
  const { data: validationRequests } = await supabase
    .from('validation_requests')
    .select('*')
    .eq('client_id', client.id)
    .order('created_at', { ascending: false })
    .limit(3)

  // 4. Fetch derniers messages Élio (max 5)
  const { data: recentMessages } = await supabase
    .from('elio_messages')
    .select('*, elio_conversations!inner(user_id)')
    .eq('elio_conversations.user_id', client.id)
    .order('created_at', { ascending: false })
    .limit(5)

  return successResponse({
    client: client as unknown as ClientDetail,
    parcours: parcours as unknown as ParcoursInfo | null,
    validationRequests: (validationRequests ?? []) as unknown as ValidationRequestInfo[],
    recentMessages: (recentMessages ?? []) as Record<string, unknown>[],
  })
}
