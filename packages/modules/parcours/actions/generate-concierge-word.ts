'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { type ActionResponse, successResponse, errorResponse } from '@monprojetpro/types'

const CONCIERGE_TIMEOUT_MS = 15_000 // appel léger, 15s suffisent
const HAIKU_MODEL = 'claude-haiku-4-5-20251001' // mot court → modèle éco (cf. routage)

/**
 * Persona compacte d'Élio le Concierge pour les mots PROACTIFS (≠ chat complet).
 * Garde-fou factuel obligatoire : il ne ment jamais sur les faits, il ne se base QUE sur
 * l'événement décrit, n'invente aucune action / date / résultat (cf. posture coach d'Élio).
 */
const CONCIERGE_SYSTEM_PROMPT = `Tu es Élio, le Concierge du Lab MonprojetPro : l'assistant qui accompagne un entrepreneur dans son parcours d'incubation, comme un vrai partenaire de projet. Tu écris un court mot proactif au client (tutoiement), chaleureux et encourageant. Règles STRICTES : 1 à 2 phrases maximum ; pas de markdown, pas de liste, pas de guillemets autour du message ; tu te bases UNIQUEMENT sur l'événement décrit ci-dessous et tu n'inventes aucune action, aucune date, aucun résultat. Réponds uniquement avec le mot d'Élio, rien d'autre.`

/** Événements qui déclenchent un mot d'Élio. Étendu au fil des incréments (LOT F). */
export type ConciergeEvent = {
  type: 'agent_reopened'
  agentLabel: string
  reason?: string
}

function buildEventPrompt(event: ConciergeEvent): string {
  switch (event.type) {
    case 'agent_reopened':
      return `Événement : MiKL vient de rouvrir l'étape « ${event.agentLabel} » du parcours du client.${
        event.reason ? ` Motif indiqué par MiKL : ${event.reason}.` : ''
      } Le client peut maintenant soumettre une nouvelle version de son document pour CETTE étape ; ses autres étapes ne sont pas affectées. Écris le mot d'Élio qui explique au client que cette étape a été rouverte pour qu'il puisse l'approfondir, et qui l'invite chaleureusement à la reprendre quand il le souhaite.`
  }
}

/** Message déterministe si l'IA échoue / dépasse le délai — jamais de bandeau vide. */
function buildFallback(event: ConciergeEvent): string {
  switch (event.type) {
    case 'agent_reopened':
      return `Bonne nouvelle : l'étape « ${event.agentLabel} » a été rouverte pour que tu puisses l'approfondir. Reprends-la quand tu veux, je reste à tes côtés.`
  }
}

/**
 * Génère « le dernier mot d'Élio » pour un client, à partir d'un événement de parcours,
 * et l'enregistre dans `client_concierge_messages`.
 *
 * - IA d'abord (Haiku via l'Edge Function `elio-chat`), fallback templaté si échec/timeout.
 * - L'INSERT déclenche le broadcast `parcours_changed` (trigger) → la home « Mon Parcours »
 *   du client re-fetch `getParcours` et affiche le mot en direct (RSC-009).
 * - Best-effort : l'appelant (ex: reopenAgent) ne doit JAMAIS échouer si la génération échoue.
 */
export async function generateConciergeWord(
  clientId: string,
  event: ConciergeEvent
): Promise<ActionResponse<{ body: string; source: 'ai' | 'template' }>> {
  if (!clientId) return errorResponse('clientId requis', 'VALIDATION_ERROR')

  const supabase = await createServerSupabaseClient()

  let body = ''
  let source: 'ai' | 'template' = 'ai'

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), CONCIERGE_TIMEOUT_MS)
  try {
    const { data, error: fnError } = await supabase.functions.invoke('elio-chat', {
      body: {
        systemPrompt: CONCIERGE_SYSTEM_PROMPT,
        message: buildEventPrompt(event),
        model: HAIKU_MODEL,
        maxTokens: 160,
        temperature: 0.7,
      },
      signal: controller.signal,
    })
    clearTimeout(timeoutId)

    const aiText = ((data as { content?: string })?.content ?? '').trim()
    if (fnError || !aiText) {
      body = buildFallback(event)
      source = 'template'
    } else {
      body = aiText
    }
  } catch {
    clearTimeout(timeoutId)
    body = buildFallback(event)
    source = 'template'
  }

  const { error: insertError } = await supabase.from('client_concierge_messages').insert({
    client_id: clientId,
    event_type: event.type,
    agent_label: event.agentLabel ?? null,
    body,
    source,
  })

  if (insertError) {
    console.error('[PARCOURS:CONCIERGE_WORD] Insert error:', insertError)
    return errorResponse("Échec d'enregistrement du mot d'Élio", 'DATABASE_ERROR', insertError)
  }

  return successResponse({ body, source })
}
