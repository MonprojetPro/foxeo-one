'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { successResponse, errorResponse, type ActionResponse } from '@monprojetpro/types'

const ELIO_TIMEOUT_MS = 60_000

/**
 * Ajuste un brouillon de réponse au support MenuFacile via le cerveau Élio
 * (edge function `elio-chat` du Hub). Réutilise l'IA de reformulation déjà en
 * place — pas d'accès à la base de MenuFacile.
 */
export async function adjustContactReply(input: {
  draft: string
  userMessage?: string
  topic?: string
}): Promise<ActionResponse<string>> {
  if (!input.draft.trim()) {
    return errorResponse('Le brouillon de réponse est vide', 'VALIDATION_ERROR')
  }

  const supabase = await createServerSupabaseClient()

  // ⚠️ La fonction elio-chat EXIGE un systemPrompt ET un message non vides
  // (sinon 400). Les consignes vont donc dans systemPrompt, le contenu dans message.
  const systemPrompt = `Tu es un agent du support de MenuFacile (application de recettes).
Ta tâche : reformuler et améliorer un brouillon de réponse destiné à un utilisateur.

Consignes :
- Ton chaleureux, bienveillant et professionnel, en français, tutoiement.
- Clair et concis. Corrige l'orthographe, la grammaire et la ponctuation.
- N'invente aucune information ni promesse absente du brouillon.
- Réponds UNIQUEMENT avec le texte final de la réponse (aucun préambule, aucun guillemet).`

  const message = `${input.topic ? `Sujet du message : ${input.topic}\n` : ''}${
    input.userMessage ? `Message de l'utilisateur :\n${input.userMessage}\n\n` : ''
  }Brouillon à améliorer :
${input.draft}`

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), ELIO_TIMEOUT_MS)

  try {
    const { data, error } = await supabase.functions.invoke('elio-chat', {
      body: { systemPrompt, message, dashboardType: 'hub' },
      signal: controller.signal,
    })
    clearTimeout(timeoutId)

    if (error) return errorResponse('Erreur IA lors de l\'ajustement', 'LLM_ERROR', error)

    const text = (data as { content?: string })?.content ?? ''
    if (!text.trim()) return errorResponse('L\'IA a renvoyé une réponse vide', 'LLM_ERROR')
    return successResponse(text.trim())
  } catch (err) {
    clearTimeout(timeoutId)
    return errorResponse('Erreur inattendue lors de l\'ajustement IA', 'LLM_ERROR', err)
  }
}
