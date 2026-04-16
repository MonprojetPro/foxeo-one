'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient } from '@monprojetpro/supabase'
import {
  type ActionResponse,
  successResponse,
  errorResponse,
} from '@monprojetpro/types'
import { z } from 'zod'

const StartHandoffInputSchema = z.object({
  clientId: z.string().uuid('ID client invalide'),
  handoffType: z.enum(['subscription_cancelled', 'one_shot']),
  slug: z.string().min(1, 'Slug requis').max(50, 'Slug trop long')
    .regex(/^[a-z0-9-]+$/, 'Slug invalide (lettres minuscules, chiffres, tirets)'),
})

export type StartHandoffInput = z.infer<typeof StartHandoffInputSchema>

export async function startHandoff(
  input: StartHandoffInput
): Promise<ActionResponse<{ handoffId: string }>> {
  try {
    const parsed = StartHandoffInputSchema.safeParse(input)
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? 'Données invalides'
      return errorResponse(firstError, 'INVALID_INPUT', parsed.error.issues)
    }

    const supabase = await createServerSupabaseClient()

    // Auth check
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return errorResponse('Non authentifié', 'UNAUTHORIZED')
    }

    // Verify operator owns this client
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('id, operator_id, status, name, slug')
      .eq('id', parsed.data.clientId)
      .single()

    if (clientError || !client) {
      return errorResponse('Client non trouvé', 'NOT_FOUND')
    }

    if (client.operator_id !== user.id) {
      return errorResponse('Accès interdit', 'FORBIDDEN')
    }

    // Check client is eligible for handoff
    if (client.status === 'handed_off') {
      return errorResponse('Client déjà transféré', 'ALREADY_HANDED_OFF')
    }

    if (client.status === 'archived' || client.status === 'deleted') {
      return errorResponse('Client archivé ou supprimé — impossible de lancer un kit de sortie', 'INVALID_STATUS')
    }

    // Check no active handoff already exists
    const { data: existingHandoff } = await supabase
      .from('client_handoffs')
      .select('id, status')
      .eq('client_id', parsed.data.clientId)
      .not('status', 'in', '("completed","failed")')
      .limit(1)
      .maybeSingle()

    if (existingHandoff) {
      return errorResponse(
        `Un kit de sortie est déjà en cours (étape : ${existingHandoff.status})`,
        'HANDOFF_IN_PROGRESS'
      )
    }

    // Create handoff record
    const { data: handoff, error: handoffError } = await supabase
      .from('client_handoffs')
      .insert({
        client_id: parsed.data.clientId,
        handoff_type: parsed.data.handoffType,
        status: 'pending',
      })
      .select('id')
      .single()

    if (handoffError || !handoff) {
      return errorResponse(
        `Erreur création handoff : ${handoffError?.message ?? 'Erreur inconnue'}`,
        'DB_ERROR'
      )
    }

    revalidatePath(`/clients/${parsed.data.clientId}`)

    return successResponse({ handoffId: handoff.id })
  } catch (err) {
    return errorResponse(
      `Erreur inattendue : ${err instanceof Error ? err.message : String(err)}`,
      'INTERNAL_ERROR'
    )
  }
}
