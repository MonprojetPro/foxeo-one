'use server'

/**
 * Boucle agent Élio Hub (Contrat 4 — chantier Élio Hub 2026-07-06).
 *
 * La boucle tourne côté Next.js avec la SESSION DE MIKL (RLS naturelle, env
 * MenuFacile disponible) — PAS dans l'Edge Function. Elle appelle l'Edge
 * Function `elio-chat` v2 (multi-provider + tools) en mode agent (blocs
 * Anthropic natifs), exécute les outils, et reboucle jusqu'à une réponse
 * finale. Max 8 tours d'outils, timeout global ~55 s (la page qui héberge le
 * chat exporte maxDuration = 60).
 *
 * Garde-fou : les outils d'action créent une proposition `pending` dans
 * elio_hub_actions (validée via confirmElioHubAction), SAUF si le LLM a mis
 * skip_confirmation:true (autorisé uniquement quand MiKL l'a explicitement
 * demandé dans son message courant — règle gravée dans le system prompt).
 */

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { successResponse, errorResponse, type ActionResponse } from '@monprojetpro/types'
import { buildHubAgentPrompt, ELIO_FORMATTING_INSTRUCTION } from '../config/system-prompts'
import { getLlmConfig } from './llm-config'
import { DEFAULT_LLM_CONFIG } from '../types/llm-config.types'
import { logTokenUsage } from './log-token-usage'
import { HUB_AGENT_TOOLS } from './hub-tools/tool-definitions'
import { runHubReadTool } from './hub-tools/read-tools'
import { prepareHubAction, executeHubAction } from './hub-tools/action-tools'
import {
  isHubReadTool,
  isHubActionTool,
  type AnthropicMessage,
  type AnthropicContentBlock,
  type AnthropicToolResultBlock,
  type ElioChatUnifiedResponse,
  type ElioHubAction,
  type HubAgentPendingAction,
  type HubAgentResult,
} from '../types/elio-hub-agent.types'

const MAX_TOOL_TURNS = 8
const GLOBAL_TIMEOUT_MS = 55_000
/** Marge minimale pour tenter un tour LLM supplémentaire. */
const MIN_REMAINING_MS = 4_000
const HISTORY_LIMIT = 30

type Supa = Awaited<ReturnType<typeof createServerSupabaseClient>>

interface OperatorContext {
  supabase: Supa
  operatorId: string
}

/** Session opérateur obligatoire — refuse sinon (le Hub est réservé à MiKL). */
async function requireOperator(): Promise<
  { ok: true; ctx: OperatorContext } | { ok: false; error: ActionResponse<never> }
> {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { ok: false, error: errorResponse('Non authentifié', 'UNAUTHORIZED') }
  }

  const { data: operator } = await supabase
    .from('operators')
    .select('id')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  const operatorId = (operator as { id: string } | null)?.id
  if (!operatorId) {
    return { ok: false, error: errorResponse("Accès réservé à l'opérateur", 'FORBIDDEN') }
  }

  return { ok: true, ctx: { supabase, operatorId } }
}

/**
 * Charge l'historique de la conversation (elio_messages) et le convertit en
 * messages Anthropic. Le composant chat persiste le message user AVANT
 * d'appeler l'agent : on dédoublonne le dernier message pour ne pas l'envoyer 2×.
 */
async function buildConversationMessages(
  supabase: Supa,
  conversationId: string,
  currentMessage: string,
): Promise<AnthropicMessage[]> {
  const { data: rows } = await supabase
    .from('elio_messages')
    .select('role, content')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
    .limit(HISTORY_LIMIT)

  const history = ((rows ?? []) as { role: string; content: string }[])
    .filter((m) => m.content.trim().length > 0)
    .map<AnthropicMessage>((m) => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: m.content,
    }))

  const last = history[history.length - 1]
  if (!(last && last.role === 'user' && last.content === currentMessage)) {
    history.push({ role: 'user', content: currentMessage })
  }
  return history
}

/**
 * Mapping manuel snake_case → camelCase. On n'utilise PAS toCamelCase ici :
 * il transformerait aussi les clés du JSONB tool_input (_resolved_client_id
 * deviendrait ResolvedClientId) et casserait l'exécution différée.
 */
function rowToHubAction(row: Record<string, unknown>): ElioHubAction {
  return {
    id: row.id as string,
    operatorId: row.operator_id as string,
    conversationId: (row.conversation_id as string | null) ?? null,
    toolName: row.tool_name as string,
    toolInput: (row.tool_input as Record<string, unknown>) ?? {},
    summary: row.summary as string,
    status: row.status as ElioHubAction['status'],
    result: (row.result as Record<string, unknown> | null) ?? null,
    error: (row.error as string | null) ?? null,
    createdAt: row.created_at as string,
    decidedAt: (row.decided_at as string | null) ?? null,
    executedAt: (row.executed_at as string | null) ?? null,
  }
}

/**
 * Traite un tool_call d'ACTION : prépare (résolution client + summary), puis
 * selon skip_confirmation : exécute immédiatement (auto_executed) ou enregistre
 * une proposition pending. Retourne le texte du tool_result + l'action créée.
 */
async function handleActionToolCall(
  ctx: OperatorContext,
  conversationId: string,
  call: { id: string; name: string; input: Record<string, unknown> },
  pendingActions: HubAgentPendingAction[],
): Promise<AnthropicToolResultBlock> {
  const toolName = call.name
  if (!isHubActionTool(toolName)) {
    return { type: 'tool_result', tool_use_id: call.id, content: `Outil inconnu : ${toolName}`, is_error: true }
  }

  const prepared = await prepareHubAction(ctx.supabase, toolName, call.input)

  if (prepared.status === 'info') {
    return { type: 'tool_result', tool_use_id: call.id, content: JSON.stringify(prepared.payload) }
  }
  if (prepared.status === 'error') {
    return {
      type: 'tool_result',
      tool_use_id: call.id,
      content: JSON.stringify({ error: prepared.message, candidates: prepared.candidates ?? undefined }),
      is_error: true,
    }
  }

  const skip = call.input.skip_confirmation === true

  if (!skip) {
    // Garde-fou : proposition pending — l'action N'est PAS exécutée.
    const { data: inserted, error: insertError } = await ctx.supabase
      .from('elio_hub_actions')
      .insert({
        operator_id: ctx.operatorId,
        conversation_id: conversationId,
        tool_name: prepared.prepared.toolName,
        tool_input: prepared.prepared.toolInput,
        summary: prepared.prepared.summary,
        status: 'pending',
      })
      .select()
      .single()

    if (insertError || !inserted) {
      return {
        type: 'tool_result',
        tool_use_id: call.id,
        content: `Impossible d'enregistrer la proposition : ${insertError?.message ?? 'erreur inconnue'}`,
        is_error: true,
      }
    }

    const action = rowToHubAction(inserted as Record<string, unknown>)
    pendingActions.push({
      id: action.id,
      toolName: action.toolName,
      summary: action.summary,
      status: 'pending',
      input: action.toolInput,
    })

    return {
      type: 'tool_result',
      tool_use_id: call.id,
      content: `Proposition enregistrée #${action.id} — « ${action.summary} » — en attente de validation de MiKL. L'action N'EST PAS exécutée : une carte de validation s'affiche dans le chat.`,
    }
  }

  // Débrayage explicite : exécution immédiate, tracée en auto_executed.
  const execution = await executeHubAction(ctx.supabase, { operatorId: ctx.operatorId }, toolName, prepared.prepared.toolInput)
  const now = new Date().toISOString()

  const { data: inserted } = await ctx.supabase
    .from('elio_hub_actions')
    .insert({
      operator_id: ctx.operatorId,
      conversation_id: conversationId,
      tool_name: prepared.prepared.toolName,
      tool_input: prepared.prepared.toolInput,
      summary: prepared.prepared.summary,
      status: execution.ok ? 'auto_executed' : 'failed',
      result: execution.ok ? execution.result : null,
      error: execution.ok ? null : execution.error,
      decided_at: now,
      executed_at: execution.ok ? now : null,
    })
    .select()
    .single()

  if (inserted) {
    const action = rowToHubAction(inserted as Record<string, unknown>)
    pendingActions.push({
      id: action.id,
      toolName: action.toolName,
      summary: action.summary,
      status: execution.ok ? 'auto_executed' : 'failed',
      input: action.toolInput,
    })
  }

  if (!execution.ok) {
    return {
      type: 'tool_result',
      tool_use_id: call.id,
      content: `L'action a échoué : ${execution.error}`,
      is_error: true,
    }
  }
  return {
    type: 'tool_result',
    tool_use_id: call.id,
    content: `Action exécutée immédiatement (sans vérification, à la demande de MiKL) : ${JSON.stringify(execution.result)}`,
  }
}

/**
 * Server Action — Envoie un message à l'agent Élio Hub (boucle outils).
 * Session opérateur obligatoire. Retourne { data, error } — jamais throw.
 */
export async function sendToElioHubAgent(params: {
  conversationId: string
  message: string
}): Promise<ActionResponse<HubAgentResult>> {
  const { conversationId, message } = params

  if (!message?.trim()) {
    return errorResponse('Le message ne peut pas être vide', 'VALIDATION_ERROR')
  }
  if (!conversationId) {
    return errorResponse('conversationId requis (mémoire de conversation)', 'VALIDATION_ERROR')
  }

  const auth = await requireOperator()
  if (!auth.ok) return auth.error
  const ctx = auth.ctx

  // Config LLM — profil hubAgent (Contrat 2), fallback défauts Anthropic.
  const { data: llmConfig } = await getLlmConfig()
  const profile = llmConfig?.hubAgent ?? DEFAULT_LLM_CONFIG.hubAgent
  const provider = {
    name: profile.provider,
    ...(profile.baseUrl ? { baseUrl: profile.baseUrl } : {}),
    apiKeyEnv: profile.apiKeyEnv,
  }

  const systemPrompt = buildHubAgentPrompt() + ELIO_FORMATTING_INSTRUCTION
  const messages = await buildConversationMessages(ctx.supabase, conversationId, message.trim())

  const deadline = Date.now() + GLOBAL_TIMEOUT_MS
  const pendingActions: HubAgentPendingAction[] = []
  const toolsUsed: string[] = []
  let finalContent = ''

  try {
    for (let turn = 0; turn < MAX_TOOL_TURNS; turn++) {
      const remaining = deadline - Date.now()
      if (remaining < MIN_REMAINING_MS) {
        finalContent = finalContent ||
          "Je n'ai pas pu terminer dans le temps imparti. Voici où j'en suis — redemande-moi pour continuer."
        break
      }

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), remaining)

      let response: ElioChatUnifiedResponse
      try {
        const { data, error: fnError } = await ctx.supabase.functions.invoke('elio-chat', {
          body: {
            systemPrompt,
            messages,
            tools: HUB_AGENT_TOOLS,
            provider,
            model: profile.model,
            maxTokens: 4096,
            temperature: 0.7,
          },
          signal: controller.signal,
        })
        clearTimeout(timeoutId)

        if (fnError) {
          return errorResponse(
            'Élio est temporairement indisponible. Réessaie dans quelques instants.',
            'LLM_ERROR',
            fnError,
          )
        }
        response = data as ElioChatUnifiedResponse
      } catch (err) {
        clearTimeout(timeoutId)
        const msg = err instanceof Error ? err.message : String(err)
        if (msg.toLowerCase().includes('abort')) {
          return errorResponse('Élio a mis trop de temps à répondre (timeout).', 'TIMEOUT')
        }
        return errorResponse(`Erreur: ${msg}`, 'UNKNOWN', err)
      }

      // Tracking tokens — fire-and-forget à CHAQUE tour de boucle.
      const inputTokens = response?.inputTokens ?? 0
      const outputTokens = response?.outputTokens ?? 0
      if (inputTokens > 0 || outputTokens > 0) {
        logTokenUsage({
          clientId: null,
          elioLabAgentId: null,
          conversationId,
          inputTokens,
          outputTokens,
          model: response?.model ?? profile.model,
        }).catch(() => { /* fire-and-forget */ })
      }

      const toolCalls = response?.toolCalls ?? []
      if (toolCalls.length === 0) {
        finalContent = response?.content ?? ''
        break
      }

      // Rejouer la réponse assistant (texte + tool_use) puis les tool_result.
      const assistantBlocks: AnthropicContentBlock[] = []
      if (response.content) assistantBlocks.push({ type: 'text', text: response.content })
      for (const call of toolCalls) {
        assistantBlocks.push({ type: 'tool_use', id: call.id, name: call.name, input: call.input })
      }
      messages.push({ role: 'assistant', content: assistantBlocks })

      const resultBlocks: AnthropicToolResultBlock[] = []
      for (const call of toolCalls) {
        toolsUsed.push(call.name)

        if (isHubReadTool(call.name)) {
          const result = await runHubReadTool(ctx.supabase, ctx.operatorId, call.name, call.input ?? {})
          resultBlocks.push({
            type: 'tool_result',
            tool_use_id: call.id,
            content: JSON.stringify(result.payload),
            ...(result.ok ? {} : { is_error: true }),
          })
        } else {
          resultBlocks.push(
            await handleActionToolCall(ctx, conversationId, { id: call.id, name: call.name, input: call.input ?? {} }, pendingActions),
          )
        }
      }
      messages.push({ role: 'user', content: resultBlocks })

      // Dernier tour atteint sans réponse finale → on le signale honnêtement.
      if (turn === MAX_TOOL_TURNS - 1) {
        finalContent =
          "J'ai atteint ma limite d'outils pour ce tour. Les résultats déjà obtenus sont pris en compte — redemande-moi pour aller plus loin."
      }
    }

    return successResponse<HubAgentResult>({
      content: finalContent,
      pendingActions,
      toolsUsed: [...new Set(toolsUsed)],
      conversationId,
    })
  } catch (err) {
    console.error('[ELIO:HUB_AGENT] Unexpected error:', err)
    return errorResponse('Une erreur inattendue est survenue', 'INTERNAL_ERROR', {
      message: err instanceof Error ? err.message : String(err),
    })
  }
}

/**
 * Server Action — MiKL valide une proposition : l'outil réel est exécuté.
 * Opérateur uniquement (RLS + check applicatif). Retourne l'action mise à jour.
 */
export async function confirmElioHubAction(actionId: string): Promise<ActionResponse<ElioHubAction>> {
  if (!actionId) return errorResponse('actionId requis', 'VALIDATION_ERROR')

  const auth = await requireOperator()
  if (!auth.ok) return auth.error
  const ctx = auth.ctx

  const { data: row, error: fetchError } = await ctx.supabase
    .from('elio_hub_actions')
    .select('*')
    .eq('id', actionId)
    .maybeSingle()

  if (fetchError) return errorResponse('Erreur lors de la lecture de la proposition', 'DB_ERROR', fetchError)
  if (!row) return errorResponse('Proposition introuvable', 'NOT_FOUND')

  const action = rowToHubAction(row as Record<string, unknown>)
  if (action.status !== 'pending') {
    return errorResponse(`Cette proposition a déjà été traitée (statut : ${action.status})`, 'ALREADY_DECIDED')
  }

  const decidedAt = new Date().toISOString()
  // Marquer confirmed AVANT l'exécution (trace de la décision même si l'exécution plante).
  await ctx.supabase
    .from('elio_hub_actions')
    .update({ status: 'confirmed', decided_at: decidedAt })
    .eq('id', actionId)

  if (!isHubActionTool(action.toolName)) {
    await ctx.supabase
      .from('elio_hub_actions')
      .update({ status: 'failed', error: `Outil inconnu : ${action.toolName}` })
      .eq('id', actionId)
    return errorResponse(`Outil inconnu : ${action.toolName}`, 'UNKNOWN_TOOL')
  }

  const execution = await executeHubAction(ctx.supabase, { operatorId: ctx.operatorId }, action.toolName, action.toolInput)

  const { data: updated, error: updateError } = await ctx.supabase
    .from('elio_hub_actions')
    .update({
      status: execution.ok ? 'executed' : 'failed',
      result: execution.ok ? execution.result : null,
      error: execution.ok ? null : execution.error,
      executed_at: execution.ok ? new Date().toISOString() : null,
    })
    .eq('id', actionId)
    .select()
    .single()

  if (updateError || !updated) {
    return errorResponse('Erreur lors de la mise à jour de la proposition', 'DB_ERROR', updateError)
  }
  if (!execution.ok) {
    return errorResponse(`L'action a échoué : ${execution.error}`, 'EXECUTION_FAILED')
  }
  return successResponse(rowToHubAction(updated as Record<string, unknown>))
}

/**
 * Server Action — MiKL refuse une proposition : marquée rejected, jamais exécutée.
 */
export async function rejectElioHubAction(actionId: string): Promise<ActionResponse<ElioHubAction>> {
  if (!actionId) return errorResponse('actionId requis', 'VALIDATION_ERROR')

  const auth = await requireOperator()
  if (!auth.ok) return auth.error
  const ctx = auth.ctx

  const { data: updated, error: updateError } = await ctx.supabase
    .from('elio_hub_actions')
    .update({ status: 'rejected', decided_at: new Date().toISOString() })
    .eq('id', actionId)
    .eq('status', 'pending')
    .select()
    .maybeSingle()

  if (updateError) return errorResponse('Erreur lors du refus de la proposition', 'DB_ERROR', updateError)
  if (!updated) return errorResponse('Proposition introuvable ou déjà traitée', 'NOT_FOUND')

  return successResponse(rowToHubAction(updated as Record<string, unknown>))
}

/**
 * Server Action — Liste les actions Élio Hub d'une conversation (cartes du chat).
 */
export async function getElioHubActions(conversationId: string): Promise<ActionResponse<ElioHubAction[]>> {
  if (!conversationId) return errorResponse('conversationId requis', 'VALIDATION_ERROR')

  const auth = await requireOperator()
  if (!auth.ok) return auth.error

  const { data, error } = await auth.ctx.supabase
    .from('elio_hub_actions')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })

  if (error) return errorResponse('Erreur lors du chargement des actions', 'DB_ERROR', error)

  return successResponse(((data ?? []) as Record<string, unknown>[]).map(rowToHubAction))
}
