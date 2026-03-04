'use server'

import { createServerSupabaseClient } from '@foxeo/supabase'
import { successResponse, errorResponse, type ActionResponse } from '@foxeo/types'
import { buildSystemPrompt } from '../config/system-prompts'
import { getElioConfig } from './get-elio-config'
import { searchClientInfo } from './search-client-info'
import { correctAndAdaptText } from './correct-and-adapt-text'
import { generateDraft } from './generate-draft'
import { adjustDraft } from './adjust-draft'
import { detectIntent } from '../utils/detect-intent'
import { detectLowConfidence } from '../utils/detect-low-confidence'
import type { DashboardType, ElioMessage, CommunicationProfileFR66 } from '../types/elio.types'
import { DEFAULT_COMMUNICATION_PROFILE_FR66 } from '../types/elio.types'

const ELIO_TIMEOUT_MS = 60_000 // NFR-I2 : 60 secondes max

export interface DraftContext {
  previousDraft: string
  clientName: string
  draftType: 'email' | 'validation_hub' | 'chat'
  currentVersion?: number
}

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
 * Pour le Hub, supporte aussi : correction texte, génération brouillon, ajustement brouillon.
 * Retourne toujours { data, error } — jamais throw.
 */
export async function sendToElio(
  dashboardType: DashboardType,
  message: string,
  clientId?: string,
  draftContext?: DraftContext,
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

  // 2. Hub uniquement : détecter l'intention et router vers la Server Action appropriée
  if (dashboardType === 'hub') {
    const intent = detectIntent(message)

    // 2a. Correction de texte
    if (intent.action === 'correct_text' && intent.clientName && intent.originalText) {
      const { data: correctedText, error: correctionError } = await correctAndAdaptText(
        intent.clientName,
        intent.originalText,
      )

      if (correctionError) {
        return errorResponse(correctionError.message, correctionError.code, correctionError.details)
      }

      return successResponse<ElioMessage>({
        id: makeMessageId(),
        role: 'assistant',
        content: correctedText ?? '',
        createdAt: new Date().toISOString(),
        dashboardType,
      })
    }

    // 2b. Génération de brouillon
    if (intent.action === 'generate_draft' && intent.clientName) {
      const { data: draft, error: draftError } = await generateDraft({
        clientName: intent.clientName,
        draftType: intent.draftType ?? 'chat',
        subject: intent.draftSubject ?? message,
      })

      if (draftError) {
        return errorResponse(draftError.message, draftError.code, draftError.details)
      }

      return successResponse<ElioMessage>({
        id: makeMessageId(),
        role: 'assistant',
        content: draft?.content ?? '',
        createdAt: new Date().toISOString(),
        dashboardType,
        metadata: { draftType: draft?.draftType },
      })
    }

    // 2c. Ajustement de brouillon (nécessite draftContext)
    if (intent.action === 'adjust_draft' && draftContext) {
      const { data: adjusted, error: adjustError } = await adjustDraft({
        previousDraft: draftContext.previousDraft,
        instruction: message,
        clientName: draftContext.clientName,
        draftType: draftContext.draftType,
        currentVersion: draftContext.currentVersion,
      })

      if (adjustError) {
        return errorResponse(adjustError.message, adjustError.code, adjustError.details)
      }

      return successResponse<ElioMessage>({
        id: makeMessageId(),
        role: 'assistant',
        content: adjusted?.content ?? '',
        createdAt: new Date().toISOString(),
        dashboardType,
        metadata: { draftType: adjusted?.draftType },
      })
    }

    // 2d. Recherche client
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
      const systemPrompt =
        buildSystemPrompt({ dashboardType, customInstructions: elioConfig?.customInstructions }) +
        `\n\n# Résultats de recherche client\n${JSON.stringify(clientInfo, null, 2)}\n\nFormule une réponse claire avec ces informations.`

      return callLLM(supabase, systemPrompt, message, dashboardType, elioConfig)
    }
  }

  // 3. Dashboard One : enrichir le system prompt avec le contexte Lab + modules
  if (dashboardType === 'one' && clientId) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: clientConfig } = await (supabase as any)
      .from('client_configs')
      .select('modules_documentation, elio_config')
      .eq('client_id', clientId)
      .maybeSingle() as { data: { modules_documentation: unknown; elio_config: unknown } | null }

    const elioConfigJson = (clientConfig?.elio_config as Record<string, unknown>) ?? {}

    // Profil de communication (stocké dans elio_config.communication_profile)
    const communicationProfile =
      (elioConfigJson.communication_profile as CommunicationProfileFR66 | undefined) ??
      DEFAULT_COMMUNICATION_PROFILE_FR66

    // Tier (stocké dans elio_config.tier)
    const tier = (elioConfigJson.tier as 'one' | 'one_plus' | undefined) ?? 'one'

    // Documentation modules actifs (colonne dédiée, injectée via Story 10.3)
    const modulesDocumentation = clientConfig?.modules_documentation
      ? JSON.stringify(clientConfig.modules_documentation, null, 2)
      : null

    // Contexte parcours Lab (décisions MiKL pendant le Lab)
    const parcoursContext = (elioConfigJson.parcours_context as string | undefined) ?? null

    // Briefs Lab validés — Task 7
    let labBriefsText: string | null = null
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: labBriefs } = await (supabase as any)
      .from('validation_requests')
      .select('title, content')
      .eq('client_id', clientId)
      .eq('type', 'brief_lab')
      .eq('status', 'approved') as { data: Array<{ title: string; content: string }> | null }

    if (labBriefs && labBriefs.length > 0) {
      labBriefsText = labBriefs
        .map((b) => {
          const contentStr = typeof b.content === 'string' ? b.content : JSON.stringify(b.content ?? '')
          return `- **${b.title}** : ${contentStr.substring(0, 200)}...`
        })
        .join('\n')
    }

    const systemPrompt = buildSystemPrompt({
      dashboardType,
      communicationProfile,
      tier,
      activeModulesDocs: modulesDocumentation,
      customInstructions: elioConfig?.customInstructions,
      labBriefs: labBriefsText,
      parcoursContext,
    })

    const response = await callLLM(supabase, systemPrompt, message, dashboardType, elioConfig)

    // Task 10 — Détecter la faible confiance et signaler pour escalade MiKL
    if (response.data && detectLowConfidence(response.data.content)) {
      response.data.metadata = { ...response.data.metadata, needsEscalation: true }
    }

    return response
  }

  // 4. Cas général (Lab, Hub sans intent spécifique) : construire le system prompt et appeler le LLM
  const systemPrompt = buildSystemPrompt({
    dashboardType,
    customInstructions: elioConfig?.customInstructions,
  })

  return callLLM(supabase, systemPrompt, message, dashboardType, elioConfig)
}

/**
 * Appelle la Supabase Edge Function avec timeout et gestion d'erreurs.
 */
async function callLLM(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  systemPrompt: string,
  message: string,
  dashboardType: DashboardType,
  elioConfig: { model?: string; maxTokens?: number; temperature?: number } | null,
): Promise<ActionResponse<ElioMessage>> {
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
