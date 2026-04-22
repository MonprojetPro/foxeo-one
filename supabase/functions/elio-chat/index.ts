// Edge Function: elio-chat
// Reçoit un message + system prompt, appelle l'API Gemini, retourne la réponse.
// Provider actuel : Google Gemini 2.0 Flash

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const GEMINI_MODEL = 'gemini-2.5-flash'
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`

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
    const apiKey = Deno.env.get('GEMINI_API_KEY')
    console.log('[ELIO] apiKey présente:', !!apiKey, 'longueur:', apiKey?.length ?? 0)

    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'GEMINI_API_KEY manquante' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Étape 2 : parser le body
    const body = await req.json()
    const { systemPrompt, message, maxTokens = 1500, temperature = 1.0 } = body

    if (!systemPrompt || !message) {
      return new Response(
        JSON.stringify({ error: 'systemPrompt et message requis' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Étape 3 : appeler Gemini
    console.log('[ELIO] Appel Gemini model:', GEMINI_MODEL)
    const geminiBody = {
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents: [{ role: 'user', parts: [{ text: message }] }],
      generationConfig: { maxOutputTokens: maxTokens, temperature },
    }

    console.log('[ELIO] URL:', GEMINI_API_URL)

    const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(geminiBody),
    })

    console.log('[ELIO] Gemini status:', response.status)

    if (!response.ok) {
      const errBody = await response.text()
      console.error('[ELIO] Gemini error:', errBody)
      return new Response(
        JSON.stringify({ error: `Gemini ${response.status}`, details: errBody }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const data = await response.json()
    console.log('[ELIO] Gemini OK, candidates:', data.candidates?.length)

    const content = data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
    const inputTokens = data.usageMetadata?.promptTokenCount ?? 0
    const outputTokens = data.usageMetadata?.candidatesTokenCount ?? 0

    console.log(`[ELIO] in=${inputTokens} out=${outputTokens}`)

    return new Response(
      JSON.stringify({ content, model: GEMINI_MODEL, inputTokens, outputTokens }),
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
