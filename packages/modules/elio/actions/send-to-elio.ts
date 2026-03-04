'use server'

import { createServerSupabaseClient } from '@foxeo/supabase'
import { successResponse, errorResponse, type ActionResponse } from '@foxeo/types'
import { buildSystemPrompt } from '../config/system-prompts'
import { getElioConfig } from './get-elio-config'
import { searchClientInfo } from './search-client-info'
import { detectIntent } from '../utils/detect-intent'
import type { DashboardType, ElioMessage } from '../types/elio.types'

const ELIO_TIMEOUT_MS = 60_000 // NFR-I2 : 60 secondes max

function makeMessageId(): string {
  return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

/**
 * Détermine le type d'erreur et retourne un message user-facing.
 * Log les erreurs inattendues avec le format [ELIO:ERROR].
 */
function handleElioError(err: unknown): { message: string; code: string; details?: unknown } {
  if (err instanceof Error) {
    const msg = err.message.toLowerCase()

    if (msg.includes('timeout') || msg.includes('aborted') || msg.includes('timed out')) {
      return {
        message: 'Élio est temporairement indisponible. Réessayez dans quelques instants.',
        code: 'TIMEOUT',
      }
    }

    if (
      msg.includes('fetch failed') ||
      msg.includes('network') ||
      msg.includes('econnrefused') ||
      msg.includes('enotfound')
    ) {
      return {
        message: 'Problème de connexion. Vérifiez votre connexion internet.',
        code: 'NETWORK_ERROR',
      }
    }

    if (
      msg.includes('rate limit') ||
      msg.includes('500') ||
      msg.includes('503') ||
      msg.includes('overloaded')
    ) {
      return {
        message: 'Élio est surchargé. Réessayez dans quelques minutes.',
        code: 'LLM_ERROR',
      }
    }
  }

  console.error(`[ELIO:ERROR] UNKNOWN: ${String(err)}`)
  return {
    message: 'Une erreur inattendue est survenue.',
    code: 'UNKNOWN',
    details: err,
  }
}

/**
 * Server Action — Envoie un message à Élio via Supabase Edge Function.
 * Gère le timeout à 60s (NFR-I2), les erreurs réseau, LLM et inattendues.
 * Retourne toujours { data, error } — jamais throw.
 */
export async function sendToElio(
  dashboardType: DashboardType,
  message: string,
  clientId?: string
): Promise<ActionResponse<ElioMessage>> {
  if (!message.trim()) {
    return errorResponse('Le message ne peut pas être vide', 'VALIDATION_ERROR')
  }

  const supabase = await createServerSupabaseClient()

  // 1. Charger la config Élio
  const { data: elioConfig, error: configError } = await getElioConfig(
    dashboardType === 'hub' ? undefined : clientId
  )

  if (configError) {
    return errorResponse('Erreur de configuration Élio', 'CONFIG_ERROR', configError)
  }

  // 2. Construire le system prompt selon le dashboardType
  // Note: communicationProfile et tier seront injectés quand getElioConfig
  // sera enrichi en Story 8.2+ (profil stocké séparément dans communication_profiles)
  let systemPrompt = buildSystemPrompt({
    dashboardType,
    customInstructions: elioConfig?.customInstructions,
  })

  // 2b. Hub uniquement : détecter intention search_client et enrichir le contexte LLM (AC3, AC4)
  if (dashboardType === 'hub') {
    const intent = detectIntent(message)

    if (intent.action === 'search_client' && intent.query) {
      const { data: clientInfo, error: searchError } = await searchClientInfo(intent.query)

      if (searchError) {
        return errorResponse(
          `Je n'ai trouvé aucun client correspondant à "${intent.query}". Tu veux vérifier l'orthographe ?`,
          'NOT_FOUND',
          searchError
        )
      }

      // Réinjecter les résultats dans le contexte LLM
      systemPrompt += `\n\n# Résultats de recherche client\n${JSON.stringify(clientInfo, null, 2)}\n\nFormule une réponse claire avec ces informations.`
    }
  }

  // 3. Appeler Supabase Edge Function avec timeout
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), ELIO_TIMEOUT_MS)

  try {
    const { data, error: fnError } = await supabase.functions.invoke('elio-chat', {
      body: {
        systemPrompt,
        message,
        dashboardType,
        model: elioConfig?.model ?? 'claude-sonnet-4-20250514',
        maxTokens: elioConfig?.maxTokens ?? 1500,
        temperature: elioConfig?.temperature ?? 1.0,
      },
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (fnError) {
      const errorInfo = handleElioError(fnError)
      return errorResponse(errorInfo.message, errorInfo.code, errorInfo.details)
    }

    const elioMessage: ElioMessage = {
      id: makeMessageId(),
      role: 'assistant',
      content: (data as { content?: string })?.content ?? '',
      createdAt: new Date().toISOString(),
      dashboardType,
    }

    return successResponse(elioMessage)
  } catch (err) {
    clearTimeout(timeoutId)
    const errorInfo = handleElioError(err)
    return errorResponse(errorInfo.message, errorInfo.code, errorInfo.details)
  }
}
