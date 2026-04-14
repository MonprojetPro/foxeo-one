'use server'

import { z } from 'zod'
import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { type ActionResponse, successResponse, errorResponse } from '@monprojetpro/types'
import {
  type ElioConfig,
  type ElioConfigDB,
  ELIO_MODELS,
  toElioConfig,
} from '../types/elio-config.types'

const updateElioConfigSchema = z.object({
  model: z.enum(ELIO_MODELS),
  temperature: z.number().min(0).max(2),
  maxTokens: z.number().int().min(100).max(8000),
  customInstructions: z.string().optional(),
  enabledFeatures: z.record(z.string(), z.boolean()).optional(),
})

export async function updateElioConfig(
  input: unknown
): Promise<ActionResponse<ElioConfig>> {
  const parsed = updateElioConfigSchema.safeParse(input)
  if (!parsed.success) {
    return errorResponse(
      'Paramètres invalides : ' + parsed.error.issues.map((i) => i.message).join(', '),
      'VALIDATION_ERROR',
      parsed.error.flatten()
    )
  }

  const validInput = parsed.data
  const supabase = await createServerSupabaseClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return errorResponse('Non authentifié', 'UNAUTHORIZED')
  }

  const { data: client, error: clientError } = await supabase
    .from('clients')
    .select('id')
    .eq('auth_user_id', user.id)
    .single()

  if (clientError || !client) {
    return errorResponse('Client non trouvé', 'NOT_FOUND', clientError)
  }

  const upsertData = {
    client_id: client.id,
    model: validInput.model,
    temperature: validInput.temperature,
    max_tokens: validInput.maxTokens,
    custom_instructions: validInput.customInstructions ?? null,
    enabled_features: validInput.enabledFeatures ?? {},
  }

  const { data: config, error: upsertError } = await supabase
    .from('elio_configs')
    .upsert(upsertData, { onConflict: 'client_id' })
    .select()
    .single()

  if (upsertError || !config) {
    console.error('[ELIO:UPDATE_CONFIG] Error:', upsertError)
    return errorResponse('Erreur mise à jour config', 'DB_ERROR', upsertError)
  }

  console.log('[ELIO:UPDATE_CONFIG] Config mise à jour pour client:', client.id)

  return successResponse(toElioConfig(config as ElioConfigDB))
}
