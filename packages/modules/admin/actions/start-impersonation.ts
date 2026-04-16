'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import {
  type ActionResponse,
  successResponse,
  errorResponse,
} from '@monprojetpro/types'
import { z } from 'zod'
import { IMPERSONATION_MAX_DURATION_MS } from '../utils/impersonation-guards'

const StartImpersonationInput = z.object({
  clientId: z.string().uuid(),
})

export interface ImpersonationResult {
  sessionId: string
  clientName: string
  expiresAt: string
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

    // 6. Activity log
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

    // 7. Send notification email to client via Edge Function
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

    // 8. Build redirect URL
    const clientAppUrl = process.env.NEXT_PUBLIC_CLIENT_URL ?? 'http://localhost:3000'
    const redirectUrl = `${clientAppUrl}?impersonation_session=${session.id}`

    const clientName = `${client.first_name ?? ''} ${client.name ?? ''}`.trim() || 'Client'

    return successResponse({
      sessionId: session.id,
      clientName,
      expiresAt,
      redirectUrl,
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
