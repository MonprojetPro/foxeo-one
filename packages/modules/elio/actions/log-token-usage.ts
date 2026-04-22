'use server'

import { createServiceRoleSupabaseClient } from '@monprojetpro/supabase'
import { calculateCostEur } from '../utils/token-cost-calculator'

export interface LogTokenUsageInput {
  clientId?: string | null
  elioLabAgentId?: string | null
  conversationId?: string | null
  inputTokens: number
  outputTokens: number
  model: string
}

/**
 * Enregistre une utilisation de tokens dans elio_token_usage.
 * Appelée en fire-and-forget après chaque réponse Élio — ne doit jamais bloquer le flux chat.
 * Ne retourne pas ActionResponse — les erreurs sont loguées silencieusement.
 */
export async function logTokenUsage(input: LogTokenUsageInput): Promise<void> {
  try {
    const { clientId, elioLabAgentId, conversationId, inputTokens, outputTokens, model } = input

    if (inputTokens === 0 && outputTokens === 0) return

    const costEur = calculateCostEur(model, inputTokens, outputTokens)

    // SERVICE_ROLE requis : contourne RLS pour l'écriture de monitoring interne
    // Les logs tokens sont insérés depuis le serveur pour TOUS les utilisateurs (clients + opérateur)
    const supabase = createServiceRoleSupabaseClient()

    const { error } = await supabase.from('elio_token_usage').insert({
      client_id: clientId ?? null,
      elio_lab_agent_id: elioLabAgentId ?? null,
      conversation_id: conversationId ?? null,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      model,
      cost_eur: costEur,
    })

    if (error) {
      console.error('[ELIO:TOKEN_LOG] Insert error:', error.message)
    }
  } catch (err) {
    console.error('[ELIO:TOKEN_LOG] Unexpected error:', String(err))
  }
}
