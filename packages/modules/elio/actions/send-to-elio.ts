'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { successResponse, errorResponse, type ActionResponse } from '@monprojetpro/types'
import { buildSystemPrompt, UPSELL_ONE_PLUS_MESSAGE } from '../config/system-prompts'
import { getElioConfig } from './get-elio-config'
import { DEFAULT_ELIO_CONFIG } from '../types/elio-config.types'
import { searchClientInfo } from './search-client-info'
import { correctAndAdaptText } from './correct-and-adapt-text'
import { generateDraft } from './generate-draft'
import { adjustDraft } from './adjust-draft'
import { detectIntent } from '../utils/detect-intent'
import { detectLowConfidence } from '../utils/detect-low-confidence'
import { checkIfFeatureExists } from '../utils/detect-existing-feature'
import { checkModuleActive, buildModuleNotActiveMessage } from '../utils/check-module-active'
import { getCollectionStatus } from '../utils/document-collection'
import { generateDocument } from './generate-document'
import type { DashboardType, ElioMessage, CommunicationProfileFR66, DraftContext } from '../types/elio.types'
import { DEFAULT_COMMUNICATION_PROFILE_FR66 } from '../types/elio.types'
import type { ElioModuleDoc } from '@monprojetpro/types'
import { loadModuleDocumentation } from './load-module-documentation'

const ELIO_TIMEOUT_MS = 60_000 // NFR-I2 : 60 secondes max

/**
 * Formate les docs de modules Élio injectées par MiKL en texte compact pour le system prompt.
 * Format : ## moduleId\ndescription\n### FAQ\n- Q: ...\n  R: ...\n### Problèmes courants\n- P: ...\n  D: ...
 */
function buildElioModuleDocsPrompt(elioModuleDocs: unknown): string | null {
  if (!elioModuleDocs || !Array.isArray(elioModuleDocs) || elioModuleDocs.length === 0) {
    return null
  }

  const docs = elioModuleDocs as ElioModuleDoc[]
  const sections = docs.map((doc) => {
    let section = `## ${doc.moduleId}\n${doc.description}`

    if (doc.faq && doc.faq.length > 0) {
      section += '\n### FAQ'
      for (const item of doc.faq) {
        section += `\n- Q: ${item.question}\n  R: ${item.answer}`
      }
    }

    if (doc.commonIssues && doc.commonIssues.length > 0) {
      section += '\n### Problèmes courants'
      for (const issue of doc.commonIssues) {
        section += `\n- P: ${issue.problem}\n  D: ${issue.diagnostic}\n  E: ${issue.escalation}`
      }
    }

    return section
  })

  return sections.join('\n\n')
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
    message: `Erreur: ${String(err)}`,
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
  systemPromptOverride?: string,
): Promise<ActionResponse<ElioMessage>> {
  if (!message.trim()) {
    return errorResponse('Le message ne peut pas être vide', 'VALIDATION_ERROR')
  }

  const supabase = await createServerSupabaseClient()

  // 1. Charger la config Élio
  // Hub : MiKL est opérateur (pas client) → pas de config client, on utilise les defaults
  let elioConfig = DEFAULT_ELIO_CONFIG
  if (dashboardType !== 'hub') {
    const { data: cfg, error: configError } = await getElioConfig(clientId)
    if (configError) {
      return errorResponse('Erreur de configuration Élio', 'CONFIG_ERROR', configError)
    }
    if (cfg) elioConfig = cfg
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
      .select('elio_module_docs, elio_config, elio_tier, active_modules')
      .eq('client_id', clientId)
      .maybeSingle() as {
        data: {
          elio_module_docs: unknown
          elio_config: unknown
          elio_tier: 'one' | 'one_plus' | null
          active_modules: string[] | null
        } | null
      }

    const elioConfigJson = (clientConfig?.elio_config as Record<string, unknown>) ?? {}

    // Profil de communication (stocké dans elio_config.communication_profile)
    const communicationProfile =
      (elioConfigJson.communication_profile as CommunicationProfileFR66 | undefined) ??
      DEFAULT_COMMUNICATION_PROFILE_FR66

    // Tier — colonne dédiée client_configs.elio_tier (Task 2.1, AC1)
    // Fallback sur elio_config.tier pour compatibilité ascendante
    const tier: 'one' | 'one_plus' =
      clientConfig?.elio_tier ??
      (elioConfigJson.tier as 'one' | 'one_plus' | undefined) ??
      'one'

    // Modules actifs du client
    const activeModules: string[] = clientConfig?.active_modules ?? []

    // Documentation modules actifs — injectée par MiKL via Story 10.3
    // Format compact pour minimiser les tokens : ## moduleId\ndesc\n### FAQ\n- Q: ...\n  R: ...
    const modulesDocumentation = buildElioModuleDocsPrompt(clientConfig?.elio_module_docs)

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

    // Détecter l'intention avant l'appel LLM (Tasks 2, 3, 7, 8)
    const oneIntent = detectIntent(message)

    // Story 8.9b — Task 4 : génération de documents (One+ uniquement)
    if (oneIntent.action === 'generate_document' && oneIntent.documentType) {
      if (tier !== 'one_plus') {
        return successResponse<ElioMessage>({
          id: makeMessageId(),
          role: 'assistant',
          content: UPSELL_ONE_PLUS_MESSAGE,
          createdAt: new Date().toISOString(),
          dashboardType,
        })
      }

      // Vérifier si des informations sont manquantes (collecte)
      const collectionStatus = getCollectionStatus(
        oneIntent.documentType,
        {
          type: oneIntent.documentType,
          beneficiary: oneIntent.documentBeneficiary,
          period: oneIntent.documentPeriod,
        },
        communicationProfile
      )

      if (collectionStatus.state === 'collecting' && collectionStatus.nextQuestion) {
        // Poser la prochaine question pour collecter les infos manquantes
        return successResponse<ElioMessage>({
          id: makeMessageId(),
          role: 'assistant',
          content: collectionStatus.nextQuestion,
          createdAt: new Date().toISOString(),
          dashboardType,
          metadata: {
            documentCollecting: true,
            documentType: oneIntent.documentType,
            missingFields: collectionStatus.missingFields,
          },
        })
      }

      // Toutes les infos sont disponibles → générer le document
      const { data: generatedContent, error: genError } = await generateDocument(
        clientId,
        oneIntent.documentType,
        {
          beneficiary: oneIntent.documentBeneficiary,
          period: oneIntent.documentPeriod,
        }
      )

      if (genError) {
        return errorResponse(genError.message, genError.code, genError.details)
      }

      return successResponse<ElioMessage>({
        id: makeMessageId(),
        role: 'assistant',
        content: generatedContent ?? '',
        createdAt: new Date().toISOString(),
        dashboardType,
        metadata: {
          generatedDocument: true,
          documentType: oneIntent.documentType,
          documentName: `${oneIntent.documentType.replace('_', ' ')} — ${oneIntent.documentPeriod ?? new Date().toLocaleDateString('fr-FR')}`,
        },
      })
    }

    // Story 8.9a — Task 2.3/2.4 : bloquer les actions One+ si tier = 'one'
    if (oneIntent.action === 'module_action') {
      if (tier !== 'one_plus') {
        // Client One tente une action One+ → message upsell (AC1, Task 2.4)
        return successResponse<ElioMessage>({
          id: makeMessageId(),
          role: 'assistant',
          content: UPSELL_ONE_PLUS_MESSAGE,
          createdAt: new Date().toISOString(),
          dashboardType,
        })
      }

      // Client One+ : vérifier que le module est actif (AC3, Task 7)
      const moduleTarget = oneIntent.moduleTarget ?? 'unknown'
      if (moduleTarget !== 'unknown' && !checkModuleActive(activeModules, moduleTarget)) {
        return successResponse<ElioMessage>({
          id: makeMessageId(),
          role: 'assistant',
          content: buildModuleNotActiveMessage(moduleTarget),
          createdAt: new Date().toISOString(),
          dashboardType,
        })
      }

      // Module actif → appel LLM avec contexte action, retourner avec pendingAction (AC2, Task 4)
      // Inclure la documentation markdown des modules actifs (Story 12.8)
      const actionMarkdownDocs = loadModuleDocumentation(activeModules, message)
      const actionSystemPrompt = buildSystemPrompt({
        dashboardType,
        communicationProfile,
        tier,
        activeModulesDocs: modulesDocumentation,
        customInstructions: elioConfig?.customInstructions,
        labBriefs: labBriefsText,
        parcoursContext,
      }) + (actionMarkdownDocs ? `\n\n${actionMarkdownDocs}` : '')

      const actionResponse = await callLLM(supabase, actionSystemPrompt, message, dashboardType, elioConfig)

      if (actionResponse.data) {
        actionResponse.data.metadata = {
          ...actionResponse.data.metadata,
          requiresConfirmation: true,
          pendingAction: {
            module: moduleTarget,
            verb: oneIntent.moduleActionVerb ?? 'send',
            target: String(oneIntent.moduleActionParams?.target ?? ''),
            params: oneIntent.moduleActionParams,
            requiresDoubleConfirm: oneIntent.moduleActionVerb === 'delete',
          },
        }
      }

      return actionResponse
    }

    // Story 8.8 — Task 7 : détecter intention évolution avant appel LLM
    if (oneIntent.action === 'request_evolution' && oneIntent.initialRequest) {
      // Task 6 : vérifier si la fonctionnalité existe déjà dans les modules actifs
      const featureCheck = checkIfFeatureExists(oneIntent.initialRequest, modulesDocumentation ?? '')
      if (featureCheck.exists) {
        return successResponse<ElioMessage>({
          id: makeMessageId(),
          role: 'assistant',
          content: featureCheck.instructions ?? '',
          createdAt: new Date().toISOString(),
          dashboardType,
          metadata: { existingFeatureInstructions: featureCheck.instructions },
        })
      }

      // Fonctionnalité non existante → signaler au client pour lancer la collecte
      return successResponse<ElioMessage>({
        id: makeMessageId(),
        role: 'assistant',
        content: '',
        createdAt: new Date().toISOString(),
        dashboardType,
        metadata: {
          evolutionDetected: true,
          evolutionInitialRequest: oneIntent.initialRequest,
        },
      })
    }

    // Documentation markdown des modules actifs (guide + FAQ) injectée sélectivement
    const markdownDocs = loadModuleDocumentation(activeModules, message)

    const systemPrompt = buildSystemPrompt({
      dashboardType,
      communicationProfile,
      tier,
      activeModulesDocs: modulesDocumentation,
      customInstructions: elioConfig?.customInstructions,
      labBriefs: labBriefsText,
      parcoursContext,
    }) + (markdownDocs ? `\n\n${markdownDocs}` : '')

    const response = await callLLM(supabase, systemPrompt, message, dashboardType, elioConfig)

    // Task 10 — Détecter la faible confiance et signaler pour escalade MiKL
    if (response.data && detectLowConfidence(response.data.content)) {
      response.data.metadata = { ...response.data.metadata, needsEscalation: true }
    }

    return response
  }

  // 3bis. Guard Élio Lab — MiKL peut désactiver elio_lab_enabled après graduation (ADR-01 Révision 2)
  if (dashboardType === 'lab' && clientId) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: labConfig } = await (supabase as any)
      .from('client_configs')
      .select('elio_lab_enabled')
      .eq('client_id', clientId)
      .maybeSingle() as { data: { elio_lab_enabled: boolean | null } | null }

    if (labConfig && labConfig.elio_lab_enabled === false) {
      return errorResponse(
        'Élio Lab est désactivé pour ce client. Contactez MiKL pour le réactiver.',
        'ELIO_LAB_DISABLED'
      )
    }
  }

  // 4. Cas général (Lab, Hub sans intent spécifique) : construire le system prompt et appeler le LLM
  // Un systemPromptOverride peut être fourni pour les chats spécifiques (ex: StepElioChat, Story 14.4)
  const systemPrompt = systemPromptOverride ?? buildSystemPrompt({
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
        maxTokens: elioConfig?.maxTokens ?? 8192,
        temperature: elioConfig?.temperature ?? 1.0,
      },
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (fnError) {
      // Extraire le body réel de l'Edge Function pour debug
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const ctx = (fnError as any).context
        if (ctx && typeof ctx.json === 'function') {
          const body = await ctx.json()
          console.error('[ELIO] Edge Function error body:', JSON.stringify(body))
        }
      } catch (_) { /* ignore */ }
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
