'use server'

import { createServerSupabaseClient, hasIaConsent } from '@monprojetpro/supabase'
import { successResponse, errorResponse, type ActionResponse } from '@monprojetpro/types'
import { buildSystemPrompt, UPSELL_ONE_PLUS_MESSAGE, ELIO_FORMATTING_INSTRUCTION } from '../config/system-prompts'
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
import { logTokenUsage } from './log-token-usage'
import { getLabParcoursContext } from './get-lab-parcours-context'
import { getOneContext } from './get-one-context'
import { getLlmConfig } from './llm-config'
import { DEFAULT_LLM_CONFIG } from '../types/llm-config.types'
import { getEscalationConfig } from './escalation-config'
import { getOneNavigationConfig } from './one-navigation-config'
import { DEFAULT_ONE_NAVIGATION_CONFIG } from '../types/one-navigation-config.types'
import { GOTO_ROUTES } from '../utils/parse-goto-links'

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
 *
 * @param clientId — ID du client (utilisé pour le tracking tokens)
 * @param agentOverrides.agentId — ID de l'agent Élio Lab (pour le tracking tokens)
 * @param agentOverrides.conversationId — ID de la conversation (pour le tracking tokens)
 * @param agentOverrides.skipLabEnabledCheck — bypass du guard elio_lab_enabled (usage: step chat parcours)
 */
export async function sendToElio(
  dashboardType: DashboardType,
  message: string,
  clientId?: string,
  draftContext?: DraftContext,
  systemPromptOverride?: string,
  agentOverrides?: { model?: string; temperature?: number; agentId?: string; conversationId?: string; skipLabEnabledCheck?: boolean; history?: Array<{ role: string; content: string }> },
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

  // 1bis. Guard consentement IA (RGPD) — verrou universel : un client qui n'a pas consenti
  // au traitement de ses données par l'IA ne doit JAMAIS voir ses messages envoyés à Claude.
  // S'applique à TOUTES les surfaces client, y compris le chat d'étape du parcours
  // (skipLabEnabledCheck ne bypasse PAS le consentement, à la différence du guard Élio Lab).
  // Le Hub (MiKL opérateur) n'est jamais concerné.
  if (dashboardType !== 'hub' && clientId) {
    const iaConsentGranted = await hasIaConsent(clientId)
    if (!iaConsentGranted) {
      return errorResponse(
        "Élio est en veille : vous n'avez pas activé le traitement de vos données par l'IA. Activez-le dans Paramètres → Consentements pour discuter avec Élio.",
        'IA_CONSENT_REQUIRED'
      )
    }
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

      return callLLM(supabase, systemPrompt, message, dashboardType, elioConfig, agentOverrides, clientId)
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
      // Briefs Lab COMPLETS (Élio One v2) : l'ancienne troncature à 200 caractères coupait
      // les objectifs/décisions au milieu. On garde le brief entier, plafonné par sécurité à
      // ~2000 caractères/brief pour éviter un prompt pathologique sur un brief géant.
      const MAX_BRIEF_CHARS = 2000
      labBriefsText = labBriefs
        .map((b) => {
          const contentStr = typeof b.content === 'string' ? b.content : JSON.stringify(b.content ?? '')
          const trimmed = contentStr.trim()
          const body = trimmed.length > MAX_BRIEF_CHARS ? `${trimmed.slice(0, MAX_BRIEF_CHARS)}…` : trimmed
          return `- **${b.title}** : ${body}`
        })
        .join('\n')
    }

    // État live du dashboard One (modules actifs, tier, cycle de vie de l'outil, suivi-outil,
    // support ouvert) — volet réactif : Élio One « au courant » de l'état réel sans halluciner.
    const oneContextState = await getOneContext(clientId)

    // Navigation deep-links pilotée depuis le Hub (lot 3) : destinations coupées par MiKL +
    // consigne de navigation additionnelle, injectées à la suite de la carte ONE_NAVIGATION_MAP.
    const { data: navCfgData } = await getOneNavigationConfig()
    const navCfg = navCfgData ?? DEFAULT_ONE_NAVIGATION_CONFIG
    const disabledRoutes = navCfg.disabledRoutes.filter((k) => k in GOTO_ROUTES)
    let navExtra = ''
    if (disabledRoutes.length > 0) {
      navExtra += `\n\n## Destinations deep-link DÉSACTIVÉES (ne pas proposer)\nCes destinations sont temporairement coupées par MiKL : n'émets JAMAIS de jeton [[goto:CLE|…]] pour ces CLE et n'oriente pas le client vers l'onglet correspondant : ${disabledRoutes.join(', ')}.`
    }
    if (navCfg.extraNavigationNote.trim()) {
      navExtra += `\n\n## Consigne de navigation additionnelle (MiKL)\n${navCfg.extraNavigationNote.trim()}`
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
        oneContextState,
      }) + (actionMarkdownDocs ? `\n\n${actionMarkdownDocs}` : '') + navExtra

      const actionResponse = await callLLM(supabase, actionSystemPrompt, message, dashboardType, elioConfig, agentOverrides, clientId)

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
      oneContextState,
    }) + (markdownDocs ? `\n\n${markdownDocs}` : '') + navExtra

    const response = await callLLM(supabase, systemPrompt, message, dashboardType, elioConfig, agentOverrides, clientId)

    // Task 10 — Détecter la faible confiance et signaler pour escalade MiKL.
    // Escalade pilotée depuis le Hub (lot 2) : si l'interrupteur global est OFF, Élio One ne
    // propose jamais l'escalade. Sinon on marque needsEscalation + le message perso du bandeau.
    if (response.data && detectLowConfidence(response.data.content)) {
      const { data: escalationConfig } = await getEscalationConfig()
      if (escalationConfig?.enabled !== false) {
        response.data.metadata = {
          ...response.data.metadata,
          needsEscalation: true,
          ...(escalationConfig?.escalationHint ? { escalationHint: escalationConfig.escalationHint } : {}),
        }
      }
    }

    return response
  }

  // 3bis. Guard AGENTS DU PARCOURS — elio_lab_enabled=false met en pause les agents du
  // PARCOURS Lab (chat d'étape), PAS Élio Lab l'assistant (questions sur le dashboard, qui
  // reste disponible). On distingue par `systemPromptOverride` : seul le chat d'étape en
  // passe un (agent de parcours). cf. docs/lab-one-lifecycle.md.
  if (dashboardType === 'lab' && clientId && systemPromptOverride) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: labConfig } = await (supabase as any)
      .from('client_configs')
      .select('elio_lab_enabled')
      .eq('client_id', clientId)
      .maybeSingle() as { data: { elio_lab_enabled: boolean | null } | null }

    if (labConfig && labConfig.elio_lab_enabled === false) {
      return errorResponse(
        'Les agents de ton parcours sont en pause. Contacte MiKL pour les réactiver.',
        'ELIO_LAB_DISABLED'
      )
    }
  }

  // 3ter. Chemin ASSISTANT LAB — Élio, le Concierge (chat libre du dashboard Lab).
  // Identifié par : dashboardType='lab', clientId présent, AUCUN systemPromptOverride
  // (un override = agent de parcours, déjà géré au 3bis). Le Concierge connaît le dash
  // (navigation injectée dans le prompt) + l'état live du parcours du client, et propose
  // une escalade vers MiKL quand sa confiance est basse (comme One — cf. detectLowConfidence).
  if (dashboardType === 'lab' && clientId && !systemPromptOverride) {
    const labParcoursState = await getLabParcoursContext(clientId)

    // Profil de communication du client (tutoiement, ton…) — stocké dans
    // client_configs.elio_config.communication_profile, comme pour le chemin One.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: labClientConfig } = await (supabase as any)
      .from('client_configs')
      .select('elio_config')
      .eq('client_id', clientId)
      .maybeSingle() as { data: { elio_config: unknown } | null }
    const labElioConfigJson = (labClientConfig?.elio_config as Record<string, unknown>) ?? {}
    const labCommunicationProfile =
      (labElioConfigJson.communication_profile as CommunicationProfileFR66 | undefined) ??
      DEFAULT_COMMUNICATION_PROFILE_FR66

    const labSystemPrompt = buildSystemPrompt({
      dashboardType: 'lab',
      communicationProfile: labCommunicationProfile,
      customInstructions: elioConfig?.customInstructions,
      labParcoursState,
    })

    const labResponse = await callLLM(supabase, labSystemPrompt, message, dashboardType, elioConfig, agentOverrides, clientId)

    // Faible confiance → signaler l'escalade vers MiKL (le chat affiche alors le bandeau).
    if (labResponse.data && detectLowConfidence(labResponse.data.content)) {
      labResponse.data.metadata = { ...labResponse.data.metadata, needsEscalation: true }
    }

    return labResponse
  }

  // 4. Cas général (Hub sans intent spécifique, Lab sans clientId) : construire le system prompt et appeler le LLM
  // Un systemPromptOverride peut être fourni pour les chats spécifiques (ex: StepElioChat, Story 14.4)
  const systemPrompt = systemPromptOverride ?? buildSystemPrompt({
    dashboardType,
    customInstructions: elioConfig?.customInstructions,
  })

  return callLLM(supabase, systemPrompt, message, dashboardType, elioConfig, agentOverrides, clientId)
}

/**
 * Appelle la Supabase Edge Function avec timeout et gestion d'erreurs.
 * Enregistre la consommation tokens en fire-and-forget après chaque réponse réussie.
 */
async function callLLM(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  systemPrompt: string,
  message: string,
  dashboardType: DashboardType,
  elioConfig: { model?: string; maxTokens?: number; temperature?: number } | null,
  agentOverrides?: { model?: string; temperature?: number; agentId?: string; conversationId?: string; history?: Array<{ role: string; content: string }> },
  clientId?: string,
): Promise<ActionResponse<ElioMessage>> {
  // Charger l'historique de conversation pour donner de la mémoire à Élio (max 30 messages
  // = 15 tours). Deux sources possibles :
  //  • conversationId → historique persisté en base (chat plein écran, widget sidebar).
  //  • agentOverrides.history → historique inline fourni par l'appelant (chat éphémère de
  //    l'accueil One : pas de conversation persistée, mais Élio se souvient quand même dans
  //    la session ouverte). Ignoré si un conversationId est fourni (la base fait foi).
  let history: Array<{ role: string; content: string }> = []
  if (agentOverrides?.conversationId) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: historyRows } = await (supabase as any)
      .from('elio_messages')
      .select('role, content')
      .eq('conversation_id', agentOverrides.conversationId)
      .order('created_at', { ascending: true })
      .limit(30) as { data: Array<{ role: string; content: string }> | null }
    history = historyRows ?? []
  } else if (agentOverrides?.history?.length) {
    history = agentOverrides.history.slice(-30)
  }

  // Config LLM multi-provider (Contrat 2) — profil `default`, fallback défauts Anthropic.
  // Priorités du modèle : agentOverrides (explicite) > config client (Orpheus, uniquement
  // si provider anthropic — un modèle claude-* n'a pas de sens chez un autre provider) >
  // modèle du profil. Le Hub utilise DEFAULT_ELIO_CONFIG (pas une vraie config client) :
  // la comparaison référentielle l'exclut, il suit donc le profil global.
  const { data: llmConfig } = await getLlmConfig()
  const llmProfile = llmConfig?.default ?? DEFAULT_LLM_CONFIG.default
  const clientConfiguredModel =
    elioConfig && (elioConfig as unknown) !== DEFAULT_ELIO_CONFIG ? elioConfig.model : undefined
  const model =
    agentOverrides?.model ??
    (llmProfile.provider === 'anthropic' ? clientConfiguredModel : undefined) ??
    llmProfile.model
  const provider = {
    name: llmProfile.provider,
    ...(llmProfile.baseUrl ? { baseUrl: llmProfile.baseUrl } : {}),
    apiKeyEnv: llmProfile.apiKeyEnv,
  }
  // Anthropic Claude 4 : temperature strictement dans [0..1]
  const rawTemp = agentOverrides?.temperature ?? elioConfig?.temperature ?? 1.0
  const temperature = Math.min(1.0, Math.max(0, rawTemp))

  // Consigne de formatage UNIVERSELLE : appliquée ici car callLLM est le point de passage
  // unique de TOUS les appels LLM (Hub, One, Lab, agents du catalogue, recherche client).
  const systemPromptWithFormatting = systemPrompt + ELIO_FORMATTING_INSTRUCTION

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), ELIO_TIMEOUT_MS)

  try {
    const { data, error: fnError } = await supabase.functions.invoke('elio-chat', {
      body: {
        systemPrompt: systemPromptWithFormatting,
        message,
        history,
        dashboardType,
        model,
        provider,
        maxTokens: elioConfig?.maxTokens ?? 8192,
        temperature,
      },
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (fnError) {
      const errorInfo = handleElioError(fnError)
      return errorResponse(errorInfo.message, errorInfo.code, errorInfo.details)
    }

    const responseData = data as { content?: string; model?: string; inputTokens?: number; outputTokens?: number }

    // Fire-and-forget : tracking tokens (ne bloque jamais le chat)
    const inputTokens = responseData?.inputTokens ?? 0
    const outputTokens = responseData?.outputTokens ?? 0
    const usedModel = responseData?.model ?? model

    if (inputTokens > 0 || outputTokens > 0) {
      logTokenUsage({
        clientId: clientId ?? null,
        elioLabAgentId: agentOverrides?.agentId ?? null,
        conversationId: agentOverrides?.conversationId ?? null,
        inputTokens,
        outputTokens,
        model: usedModel,
      }).catch(() => { /* fire-and-forget : échec silencieux */ })
    }

    const elioMessage: ElioMessage = {
      id: makeMessageId(),
      role: 'assistant',
      content: responseData?.content ?? '',
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
