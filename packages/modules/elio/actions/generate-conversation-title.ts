'use server'

import { createServerSupabaseClient } from '@foxeo/supabase'
import { successResponse, errorResponse, type ActionResponse } from '@foxeo/types'

const ELIO_TIMEOUT_MS = 15_000 // appel léger, 15s suffisent

/**
 * Server Action — Génère automatiquement le titre d'une conversation via LLM.
 * Déclenchée après le 3ème message utilisateur (AC5).
 * Retourne toujours { data, error } — jamais throw.
 */
export async function generateConversationTitle(
  conversationId: string,
  firstMessages: string[]
): Promise<ActionResponse<string>> {
  if (!conversationId || firstMessages.length === 0) {
    return errorResponse('conversationId et messages requis', 'VALIDATION_ERROR')
  }

  const supabase = await createServerSupabaseClient()

  const prompt = `Résume cette conversation en 5 mots maximum (titre court et descriptif) :\n${firstMessages.slice(0, 3).join('\n')}`

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), ELIO_TIMEOUT_MS)

  try {
    const { data, error: fnError } = await supabase.functions.invoke('elio-chat', {
      body: {
        systemPrompt: 'Tu es un assistant qui génère des titres courts (5 mots max) pour des conversations.',
        message: prompt,
        dashboardType: 'hub',
        model: 'claude-haiku-4-5-20251001',
        maxTokens: 20,
        temperature: 0.3,
      },
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (fnError) {
      return errorResponse('Erreur LLM lors de la génération du titre', 'LLM_ERROR', fnError)
    }

    const title = ((data as { content?: string })?.content ?? '').trim().slice(0, 100)
    if (!title) {
      return errorResponse('Titre vide retourné par le LLM', 'LLM_ERROR')
    }

    // Mettre à jour le titre en base
    const { error: updateError } = await supabase
      .from('elio_conversations')
      .update({ title })
      .eq('id', conversationId)

    if (updateError) {
      return errorResponse('Erreur lors de la mise à jour du titre', 'DB_ERROR', updateError)
    }

    return successResponse(title)
  } catch (err) {
    clearTimeout(timeoutId)
    return errorResponse('Erreur lors de la génération du titre', 'UNKNOWN', err)
  }
}
