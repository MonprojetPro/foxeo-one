'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import {
  type ActionResponse,
  successResponse,
  errorResponse,
} from '@monprojetpro/types'
import { z } from 'zod'
import { IMPERSONATION_MAX_DURATION_MS } from '../utils/impersonation-guards'
import { buildImpersonationLink } from '../utils/build-impersonation-link'

const StartImpersonationInput = z.object({
  clientId: z.string().uuid(),
})

export interface ImpersonationResult {
  sessionId: string
  clientName: string
  expiresAt: string
  /**
   * Lien de connexion à USAGE UNIQUE au compte client (route /auth/impersonation de
   * l'app client). À ouvrir dans un nouvel onglet — c'est lui qui crée réellement la
   * session du client.
   */
  redirectUrl: string
}

export async function startImpersonation(
  input: z.infer<typeof StartImpersonationInput>
): Promise<ActionResponse<ImpersonationResult>> {
  try {
    const parsed = StartImpersonationInput.safeParse(input)
    if (!parsed.success) {
      return errorResponse('ID client invalide', 'VALIDATION_ERROR')
    }

    const supabase = await createServerSupabaseClient()

    // 1. Verify authenticated user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return errorResponse('Non authentifié', 'UNAUTHORIZED')
    }

    // 2. Verify operator
    const { data: operator, error: opError } = await supabase
      .from('operators')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()

    if (opError || !operator) {
      return errorResponse('Accès réservé aux opérateurs', 'FORBIDDEN')
    }

    // 3. Fetch client info
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('id, auth_user_id, name, first_name, email, status')
      .eq('id', parsed.data.clientId)
      .single()

    if (clientError || !client) {
      return errorResponse('Client introuvable', 'NOT_FOUND')
    }

    if (!client.auth_user_id) {
      return errorResponse('Ce client n\'a pas de compte utilisateur', 'VALIDATION_ERROR')
    }

    // 4. Check no active session for this client already
    const { data: existingSession } = await supabase
      .from('impersonation_sessions')
      .select('id')
      .eq('client_id', client.id)
      .eq('status', 'active')
      .maybeSingle()

    if (existingSession) {
      return errorResponse(
        'Une session impersonation est déjà active pour ce client',
        'CONFLICT'
      )
    }

    // 5. Create impersonation session
    const expiresAt = new Date(Date.now() + IMPERSONATION_MAX_DURATION_MS).toISOString()

    const { data: session, error: sessionError } = await supabase
      .from('impersonation_sessions')
      .insert({
        operator_id: operator.id,
        client_id: client.id,
        client_auth_user_id: client.auth_user_id,
        expires_at: expiresAt,
        status: 'active',
      })
      .select('id')
      .single()

    if (sessionError || !session) {
      console.error('[IMPERSONATION:START] Session creation error:', sessionError)
      return errorResponse('Erreur lors de la création de la session', 'DATABASE_ERROR')
    }

    // 6. Générer le lien de connexion RÉELLE au compte client (service role).
    // Fait AVANT le log et l'email : si la génération échoue, on annule la session
    // plutôt que de laisser une session « active » fantôme (qui bloquerait tout
    // nouvel essai via le check CONFLICT de l'étape 4) et de notifier le client
    // pour rien.
    const link = await buildImpersonationLink({
      email: client.email,
      sessionId: session.id,
    })

    if (link.error || !link.url) {
      console.error('[IMPERSONATION:START] Link generation error:', link.error)

      await supabase
        .from('impersonation_sessions')
        .update({ status: 'ended', ended_at: new Date().toISOString() })
        .eq('id', session.id)

      return errorResponse(
        'Impossible de générer la session de connexion client',
        'INTERNAL_ERROR',
        { message: link.error }
      )
    }

    // 7. Activity log
    const { error: logError } = await supabase.from('activity_logs').insert({
      actor_type: 'operator_impersonation',
      actor_id: operator.id,
      action: 'impersonation_started',
      entity_type: 'client',
      entity_id: client.id,
      metadata: {
        client_id: client.id,
        client_name: `${client.first_name ?? ''} ${client.name ?? ''}`.trim(),
        session_id: session.id,
        expires_at: expiresAt,
      },
    })

    if (logError) {
      console.error('[IMPERSONATION:START] Activity log error:', logError)
    }

    // 8. Send notification email to client via Edge Function
    try {
      await supabase.functions.invoke('send-email', {
        body: {
          direct: true,
          to: client.email,
          template: 'operator-impersonation-started',
          data: {
            clientName: client.first_name ?? client.name ?? 'Client',
          },
        },
      })
    } catch (emailError) {
      // Email failure is non-blocking
      console.error('[IMPERSONATION:START] Email notification error:', emailError)
    }

    const clientName = `${client.first_name ?? ''} ${client.name ?? ''}`.trim() || 'Client'

    return successResponse({
      sessionId: session.id,
      clientName,
      expiresAt,
      redirectUrl: link.url,
    })
  } catch (error) {
    console.error('[IMPERSONATION:START] Unexpected error:', error)
    return errorResponse(
      'Une erreur inattendue est survenue',
      'INTERNAL_ERROR',
      { message: error instanceof Error ? error.message : String(error) }
    )
  }
}
