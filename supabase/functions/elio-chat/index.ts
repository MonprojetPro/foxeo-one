// Edge Function: elio-chat (v2 — multi-provider + tools, Contrat 1 chantier Élio Hub)
//
// Rétro-compatible : les appels legacy {systemPrompt, message, history, model,
// maxTokens, temperature} produisent la même réponse qu'avant — `content` reste la
// concaténation du texte, {content, model, inputTokens, outputTokens} inchangés
// (champs additifs : toolCalls, stopReason — ignorés par les 12 call-sites existants).
//
// Nouveau mode agent : body peut fournir `messages` (blocs Anthropic natifs : text,
// tool_use, tool_result) au lieu de message+history, plus `tools` (format Anthropic)
// et `provider` ({name: 'anthropic'|'openai-compatible', baseUrl, apiKeyEnv}).
//
// Sécurité : verify_jwt = true (config.toml) — les callers Server Actions passent le
// JWT user via supabase.functions.invoke, les Edge Functions internes passent le
// service role en Authorization Bearer. Clés LLM : Deno.env.get(apiKeyEnv) UNIQUEMENT
// si le nom finit par _API_KEY (allowlist), jamais de clé dans le body.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import {
  isAllowedApiKeyEnv,
  buildAnthropicMessagesFromLegacy,
  toOpenAiMessages,
  toOpenAiTools,
  fromAnthropicResponse,
  fromOpenAiResponse,
  type AnthropicMessage,
  type AnthropicTool,
  type ProviderConfig,
} from './provider-adapter.ts'

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages'
const ANTHROPIC_VERSION = '2023-06-01'
const DEFAULT_MODEL = 'claude-sonnet-4-6'
const DEFAULT_API_KEY_ENV = 'ANTHROPIC_API_KEY'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Étape 1 : parser le body
    const body = await req.json()
    const {
      systemPrompt,
      message,
      history = [],
      messages,
      tools,
      provider,
      model = DEFAULT_MODEL,
      maxTokens = 8192,
      temperature = 1.0,
    } = body as {
      systemPrompt?: string
      message?: string
      history?: Array<{ role: string; content: string }>
      messages?: AnthropicMessage[]
      tools?: AnthropicTool[]
      provider?: ProviderConfig
      model?: string
      maxTokens?: number
      temperature?: number
    }

    // Mode agent : blocs Anthropic natifs fournis directement.
    const agentMode = Array.isArray(messages) && messages.length > 0

    if (!systemPrompt || (!agentMode && !message)) {
      return jsonResponse({ error: 'systemPrompt et message requis' }, 400)
    }

    // Étape 2 : résoudre le provider (défaut : anthropic)
    const providerName = provider?.name ?? 'anthropic'
    if (providerName !== 'anthropic' && providerName !== 'openai-compatible') {
      return jsonResponse({ error: `provider.name inconnu: ${providerName}` }, 400)
    }
    if (providerName === 'openai-compatible' && !provider?.baseUrl) {
      return jsonResponse({ error: 'provider.baseUrl requis pour openai-compatible' }, 400)
    }

    const apiKeyEnv = provider?.apiKeyEnv ?? DEFAULT_API_KEY_ENV
    if (!isAllowedApiKeyEnv(apiKeyEnv)) {
      return jsonResponse(
        { error: 'apiKeyEnv invalide — doit être UPPER_SNAKE_CASE et finir par _API_KEY' },
        400,
      )
    }

    // Étape 3 : vérifier la clé (allowlist validée ci-dessus)
    const apiKey = Deno.env.get(apiKeyEnv)
    console.log(`[ELIO] ${apiKeyEnv} présente:`, !!apiKey, 'longueur:', apiKey?.length ?? 0)

    if (!apiKey) {
      return jsonResponse({ error: `${apiKeyEnv} manquante` }, 500)
    }

    // Étape 4 : construire les messages Anthropic natifs (source unique).
    // Mode legacy : port exact du dédoublonnage du dernier message user.
    const anthropicMessages: AnthropicMessage[] = agentMode
      ? messages!
      : buildAnthropicMessagesFromLegacy(message ?? '', history)

    const hasTools = Array.isArray(tools) && tools.length > 0

    console.log(
      `[ELIO] provider=${providerName} model=${model} — messages: ${anthropicMessages.length}, tools: ${hasTools ? tools!.length : 0}`,
    )

    // Étape 5 : appeler le provider
    if (providerName === 'openai-compatible') {
      const baseUrl = String(provider!.baseUrl).replace(/\/+$/, '')
      const openAiBody = {
        model,
        max_tokens: maxTokens,
        temperature,
        messages: toOpenAiMessages(systemPrompt, anthropicMessages),
        ...(hasTools ? { tools: toOpenAiTools(tools!) } : {}),
      }

      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(openAiBody),
      })

      console.log('[ELIO] OpenAI-compatible status:', response.status)

      if (!response.ok) {
        const errBody = await response.text()
        console.error('[ELIO] OpenAI-compatible error:', errBody)
        return jsonResponse({ error: `LLM API ${response.status}`, details: errBody }, 502)
      }

      const data = await response.json()
      const unified = fromOpenAiResponse(data, model)
      console.log(`[ELIO] in=${unified.inputTokens} out=${unified.outputTokens} model=${unified.model} stop=${unified.stopReason}`)
      return jsonResponse(unified)
    }

    // Provider anthropic (défaut — chemin legacy)
    const anthropicBody = {
      model,
      max_tokens: maxTokens,
      temperature,
      system: systemPrompt,
      messages: anthropicMessages,
      ...(hasTools ? { tools } : {}),
    }

    const response = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': ANTHROPIC_VERSION,
      },
      body: JSON.stringify(anthropicBody),
    })

    console.log('[ELIO] Claude status:', response.status)

    if (!response.ok) {
      const errBody = await response.text()
      console.error('[ELIO] Claude error:', errBody)
      return jsonResponse({ error: `Claude API ${response.status}`, details: errBody }, 502)
    }

    const data = await response.json()
    const unified = fromAnthropicResponse(data, model)

    console.log(`[ELIO] in=${unified.inputTokens} out=${unified.outputTokens} model=${unified.model} stop=${unified.stopReason}`)

    return jsonResponse(unified)
  } catch (err) {
    const detail = err instanceof Error ? `${err.name}: ${err.message}` : String(err)
    console.error('[ELIO] CATCH:', detail)
    return jsonResponse({ error: 'Erreur inattendue', details: detail }, 500)
  }
})
