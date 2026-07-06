// elio-chat v2 — Adaptateur multi-provider (Contrat 1 du chantier Élio Hub)
// Fonctions PURES — testables via Vitest (pas de Deno API), même pattern que
// detect-overdue-invoices/overdue-logic.ts.
//
// Principe : les `messages` entrants sont TOUJOURS au format Anthropic natif
// (blocs text / tool_use / tool_result). L'adaptateur openai-compatible convertit
// dans les deux sens ; la sortie est TOUJOURS au format unifié
// { content, toolCalls, stopReason, model, inputTokens, outputTokens }.

// ── Types — format Anthropic natif (entrée) ──────────────────────────────────

export interface AnthropicTextBlock {
  type: 'text'
  text: string
}

export interface AnthropicToolUseBlock {
  type: 'tool_use'
  id: string
  name: string
  input: Record<string, unknown>
}

export interface AnthropicToolResultBlock {
  type: 'tool_result'
  tool_use_id: string
  content?: string | AnthropicTextBlock[]
  is_error?: boolean
}

export type AnthropicContentBlock =
  | AnthropicTextBlock
  | AnthropicToolUseBlock
  | AnthropicToolResultBlock

export interface AnthropicMessage {
  role: 'user' | 'assistant'
  content: string | AnthropicContentBlock[]
}

export interface AnthropicTool {
  name: string
  description?: string
  input_schema: Record<string, unknown>
}

// ── Types — format OpenAI chat/completions (sortie de conversion) ────────────

export interface OpenAiToolCall {
  id: string
  type: 'function'
  function: { name: string; arguments: string }
}

export interface OpenAiMessage {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string | null
  tool_calls?: OpenAiToolCall[]
  tool_call_id?: string
}

export interface OpenAiTool {
  type: 'function'
  function: {
    name: string
    description?: string
    parameters: Record<string, unknown>
  }
}

// ── Types — réponse unifiée (Contrat 1) ──────────────────────────────────────

export interface UnifiedToolCall {
  id: string
  name: string
  input: Record<string, unknown>
}

export interface UnifiedResponse {
  content: string
  toolCalls: UnifiedToolCall[]
  stopReason: string
  model: string
  inputTokens: number
  outputTokens: number
}

export interface ProviderConfig {
  name: 'anthropic' | 'openai-compatible'
  baseUrl?: string
  apiKeyEnv?: string
}

// ── Sécurité clés ─────────────────────────────────────────────────────────────

/**
 * Allowlist des noms de secrets lisibles via Deno.env.get :
 * uniquement des identifiants UPPER_SNAKE_CASE se terminant par `_API_KEY`.
 * Empêche un body malveillant de lire SUPABASE_SERVICE_ROLE_KEY & co.
 */
export function isAllowedApiKeyEnv(name: unknown): name is string {
  return typeof name === 'string' && /^[A-Z][A-Z0-9_]*_API_KEY$/.test(name)
}

// ── Mode legacy — construction des messages Anthropic ────────────────────────

/**
 * Port exact de la logique legacy (dédoublonnage du dernier message user) :
 * le step-chat persiste le message user AVANT d'appeler la fonction, donc
 * l'historique se termine parfois déjà par ce même message — on ne le
 * ré-ajoute pas (sinon le modèle voit la question écrite 2× de suite).
 */
export function buildAnthropicMessagesFromLegacy(
  message: string,
  history: Array<{ role: string; content: string }>,
): AnthropicMessage[] {
  const mapped: AnthropicMessage[] = history.map((msg) => ({
    role: msg.role === 'assistant' ? 'assistant' : 'user',
    content: msg.content,
  }))
  const last = mapped[mapped.length - 1]
  const alreadyAppended = last && last.role === 'user' && last.content === message
  return alreadyAppended ? mapped : [...mapped, { role: 'user', content: message }]
}

// ── Conversion Anthropic → OpenAI ─────────────────────────────────────────────

function textFromBlocks(blocks: AnthropicTextBlock[]): string {
  return blocks.map((b) => b.text).join('\n')
}

function toolResultContentToString(
  content: AnthropicToolResultBlock['content'],
): string {
  if (content === undefined || content === null) return ''
  if (typeof content === 'string') return content
  if (Array.isArray(content)) {
    return content
      .filter((b) => b?.type === 'text')
      .map((b) => b.text)
      .join('\n')
  }
  return JSON.stringify(content)
}

/**
 * Convertit systemPrompt + messages Anthropic natifs vers le format
 * OpenAI chat/completions :
 * - system prompt → message role:system en tête
 * - assistant tool_use → assistant.tool_calls (arguments JSON stringifiés)
 * - user tool_result → messages role:'tool' (émis AVANT le texte du même
 *   message user, car OpenAI exige que les tool messages suivent directement
 *   l'assistant qui a émis les tool_calls)
 */
export function toOpenAiMessages(
  systemPrompt: string,
  messages: AnthropicMessage[],
): OpenAiMessage[] {
  const out: OpenAiMessage[] = [{ role: 'system', content: systemPrompt }]

  for (const msg of messages) {
    if (typeof msg.content === 'string') {
      out.push({ role: msg.role, content: msg.content })
      continue
    }

    if (msg.role === 'assistant') {
      const textBlocks = msg.content.filter(
        (b): b is AnthropicTextBlock => b.type === 'text',
      )
      const toolUseBlocks = msg.content.filter(
        (b): b is AnthropicToolUseBlock => b.type === 'tool_use',
      )
      const assistantMsg: OpenAiMessage = {
        role: 'assistant',
        content: textBlocks.length > 0 ? textFromBlocks(textBlocks) : null,
      }
      if (toolUseBlocks.length > 0) {
        assistantMsg.tool_calls = toolUseBlocks.map((b) => ({
          id: b.id,
          type: 'function' as const,
          function: { name: b.name, arguments: JSON.stringify(b.input ?? {}) },
        }))
      }
      out.push(assistantMsg)
      continue
    }

    // role user : tool_results d'abord (contrainte d'ordre OpenAI), puis le texte
    const toolResults = msg.content.filter(
      (b): b is AnthropicToolResultBlock => b.type === 'tool_result',
    )
    for (const tr of toolResults) {
      out.push({
        role: 'tool',
        tool_call_id: tr.tool_use_id,
        content: toolResultContentToString(tr.content),
      })
    }
    const textBlocks = msg.content.filter(
      (b): b is AnthropicTextBlock => b.type === 'text',
    )
    if (textBlocks.length > 0) {
      out.push({ role: 'user', content: textFromBlocks(textBlocks) })
    }
  }

  return out
}

/** Convertit les tools format Anthropic (input_schema) → OpenAI (parameters). */
export function toOpenAiTools(tools: AnthropicTool[]): OpenAiTool[] {
  return tools.map((t) => ({
    type: 'function' as const,
    function: {
      name: t.name,
      ...(t.description ? { description: t.description } : {}),
      parameters: t.input_schema ?? {},
    },
  }))
}

// ── Conversion réponses → format unifié ──────────────────────────────────────

function safeParseJson(raw: unknown): Record<string, unknown> {
  if (typeof raw !== 'string' || raw.trim() === '') return {}
  try {
    const parsed = JSON.parse(raw)
    return typeof parsed === 'object' && parsed !== null
      ? (parsed as Record<string, unknown>)
      : {}
  } catch {
    return {}
  }
}

/**
 * Réponse Anthropic /v1/messages → format unifié.
 * `content` = concaténation de TOUS les blocs text (compat totale : les
 * réponses legacy n'ont qu'un seul bloc text).
 */
export function fromAnthropicResponse(
  data: {
    content?: Array<Record<string, unknown>>
    stop_reason?: string
    model?: string
    usage?: { input_tokens?: number; output_tokens?: number }
  },
  fallbackModel: string,
): UnifiedResponse {
  const blocks = Array.isArray(data.content) ? data.content : []
  const content = blocks
    .filter((b) => b.type === 'text')
    .map((b) => String(b.text ?? ''))
    .join('')
  const toolCalls: UnifiedToolCall[] = blocks
    .filter((b) => b.type === 'tool_use')
    .map((b) => ({
      id: String(b.id ?? ''),
      name: String(b.name ?? ''),
      input:
        typeof b.input === 'object' && b.input !== null
          ? (b.input as Record<string, unknown>)
          : {},
    }))

  return {
    content,
    toolCalls,
    stopReason: data.stop_reason ?? 'end_turn',
    model: data.model ?? fallbackModel,
    inputTokens: data.usage?.input_tokens ?? 0,
    outputTokens: data.usage?.output_tokens ?? 0,
  }
}

const OPENAI_STOP_REASON_MAP: Record<string, string> = {
  stop: 'end_turn',
  tool_calls: 'tool_use',
  function_call: 'tool_use',
  length: 'max_tokens',
}

/**
 * Réponse OpenAI chat/completions → format unifié.
 * usage openai : prompt_tokens/completion_tokens → inputTokens/outputTokens.
 * finish_reason : stop→end_turn, tool_calls→tool_use, length→max_tokens.
 */
export function fromOpenAiResponse(
  data: {
    choices?: Array<{
      message?: {
        content?: string | Array<{ type?: string; text?: string }> | null
        tool_calls?: Array<{
          id?: string
          function?: { name?: string; arguments?: string }
        }>
      }
      finish_reason?: string
    }>
    model?: string
    usage?: { prompt_tokens?: number; completion_tokens?: number }
  },
  fallbackModel: string,
): UnifiedResponse {
  const choice = data.choices?.[0]
  const rawContent = choice?.message?.content

  // Certains providers renvoient content en tableau de parts {type:'text', text}
  const content = Array.isArray(rawContent)
    ? rawContent
        .filter((p) => p?.type === 'text' || typeof p?.text === 'string')
        .map((p) => p.text ?? '')
        .join('')
    : rawContent ?? ''

  const toolCalls: UnifiedToolCall[] = (choice?.message?.tool_calls ?? []).map(
    (tc) => ({
      id: String(tc.id ?? ''),
      name: String(tc.function?.name ?? ''),
      input: safeParseJson(tc.function?.arguments),
    }),
  )

  const finishReason = choice?.finish_reason ?? 'stop'

  return {
    content,
    toolCalls,
    stopReason: OPENAI_STOP_REASON_MAP[finishReason] ?? finishReason,
    model: data.model ?? fallbackModel,
    inputTokens: data.usage?.prompt_tokens ?? 0,
    outputTokens: data.usage?.completion_tokens ?? 0,
  }
}
