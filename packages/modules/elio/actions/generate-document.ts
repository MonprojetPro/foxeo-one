'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { successResponse, errorResponse, type ActionResponse } from '@monprojetpro/types'
import { DOCUMENT_TEMPLATES, buildDocumentPrompt, type DocumentTemplateKey } from '../config/document-templates'

const ELIO_TIMEOUT_MS = 60_000

/**
 * Story 8.9b — Task 4
 * Server Action — Génère le contenu d'un document via le LLM (DeepSeek/Claude).
 * Retourne le contenu structuré (markdown) du document.
 */
export async function generateDocument(
  clientId: string,
  type: DocumentTemplateKey,
  data: Record<string, string | undefined>
): Promise<ActionResponse<string>> {
  if (!clientId) {
    return errorResponse('clientId requis', 'VALIDATION_ERROR')
  }

  const template = DOCUMENT_TEMPLATES[type]
  if (!template) {
    return errorResponse('Type de document inconnu', 'INVALID_TYPE')
  }

  const supabase = await createServerSupabaseClient()

  // Construire le prompt avec les données collectées
  const prompt = buildDocumentPrompt(type, data)

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), ELIO_TIMEOUT_MS)

  try {
    const { data: response, error: fnError } = await supabase.functions.invoke('elio-chat', {
      body: {
        systemPrompt: 'Tu es un assistant de génération de documents professionnels. Génère un document formel et structuré selon le format demandé.',
        message: prompt,
        dashboardType: 'one',
        model: 'claude-sonnet-4-20250514',
        maxTokens: 2000,
        temperature: 0.3,
      },
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (fnError) {
      return errorResponse('Erreur lors de la génération du document', 'LLM_ERROR', fnError)
    }

    const content = (response as { content?: string })?.content ?? ''
    if (!content) {
      return errorResponse('Le document généré est vide', 'EMPTY_RESPONSE')
    }

    return successResponse(content)
  } catch (err) {
    clearTimeout(timeoutId)
    if (err instanceof Error && (err.message.includes('aborted') || err.message.includes('timeout'))) {
      return errorResponse('Délai dépassé lors de la génération du document', 'TIMEOUT')
    }
    return errorResponse('Erreur inattendue lors de la génération', 'UNKNOWN', err)
  }
}
