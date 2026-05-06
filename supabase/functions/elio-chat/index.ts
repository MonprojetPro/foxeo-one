// Edge Function: elio-chat
// Reçoit un message + system prompt + historique, appelle l'API Anthropic Claude.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages'
const ANTHROPIC_VERSION = '2023-06-01'
const DEFAULT_MODEL = 'claude-sonnet-4-6'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Étape 1 : vérifier la clé
    const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
    console.log('[ELIO] ANTHROPIC_API_KEY présente:', !!apiKey, 'longueur:', apiKey?.length ?? 0)

    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'ANTHROPIC_API_KEY manquante' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Étape 2 : parser le body
    const body = await req.json()
    const { systemPrompt, message, history = [], model = DEFAULT_MODEL, maxTokens = 8192, temperature = 1.0 } = body

    if (!systemPrompt || !message) {
      return new Response(
        JSON.stringify({ error: 'systemPrompt et message requis' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Étape 3 : construire les messages avec historique
    type HistoryMsg = { role: string; content: string }
    const messages = [
      ...(history as HistoryMsg[]).map((msg) => ({
        role: msg.role === 'assistant' ? 'assistant' : 'user',
        content: msg.content,
      })),
      { role: 'user', content: message },
    ]

    console.log('[ELIO] Appel Claude model:', model, '— historique:', history.length, 'messages')

    // Étape 4 : appeler Claude
    const anthropicBody = {
      model,
      max_tokens: maxTokens,
      temperature,
      system: systemPrompt,
      messages,
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
      return new Response(
        JSON.stringify({ error: `Claude API ${response.status}`, details: errBody }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const data = await response.json()

    const content = data.content?.[0]?.text ?? ''
    const inputTokens = data.usage?.input_tokens ?? 0
    const outputTokens = data.usage?.output_tokens ?? 0
    const usedModel = data.model ?? model

    console.log(`[ELIO] in=${inputTokens} out=${outputTokens} model=${usedModel}`)

    return new Response(
      JSON.stringify({ content, model: usedModel, inputTokens, outputTokens }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    const detail = err instanceof Error ? `${err.name}: ${err.message}` : String(err)
    console.error('[ELIO] CATCH:', detail)
    return new Response(
      JSON.stringify({ error: 'Erreur inattendue', details: detail }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
