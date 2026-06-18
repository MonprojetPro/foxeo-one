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
export type ConciergeEvent =
  | { type: 'agent_reopened'; agentLabel: string; reason?: string }
  | { type: 'submission_sent'; agentLabel: string }
  | { type: 'submission_approved'; agentLabel: string; comment?: string }
  | { type: 'submission_revision'; agentLabel: string; comment?: string }
  | { type: 'parcours_completed'; agentLabel?: string }

function buildEventPrompt(event: ConciergeEvent): string {
  switch (event.type) {
    case 'agent_reopened':
      return `Événement : MiKL vient de rouvrir l'étape « ${event.agentLabel} » du parcours du client.${
        event.reason ? ` Motif indiqué par MiKL : ${event.reason}.` : ''
      } Le client peut maintenant soumettre une nouvelle version de son document pour CETTE étape ; ses autres étapes ne sont pas affectées. Écris le mot d'Élio qui explique au client que cette étape a été rouverte pour qu'il puisse l'approfondir, et qui l'invite chaleureusement à la reprendre quand il le souhaite.`
    case 'submission_sent':
      return `Événement : le client vient de soumettre son document pour l'étape « ${event.agentLabel} ». Il est maintenant en attente de la relecture de MiKL. Écris le mot d'Élio qui accuse réception avec enthousiasme, rassure le client (MiKL va l'examiner et reviendra vers lui), sans promettre de délai précis.`
    case 'submission_approved':
      return `Événement : MiKL vient de VALIDER le document du client pour l'étape « ${event.agentLabel} ».${
        event.comment ? ` Commentaire de MiKL : ${event.comment}.` : ''
      } Écris le mot d'Élio qui félicite chaleureusement le client pour cette étape franchie et l'encourage à poursuivre sur la suite de son parcours.`
    case 'submission_revision':
      return `Événement : MiKL a relu le document du client pour l'étape « ${event.agentLabel} » et demande des ajustements avant de valider.${
        event.comment ? ` Retour de MiKL : ${event.comment}.` : ''
      } Écris le mot d'Élio qui présente ce retour de façon constructive et bienveillante (ce n'est pas un échec, c'est une étape normale), et invite le client à consulter le feedback puis à resoumettre.`
    case 'parcours_completed':
      return `Événement : le client vient de faire valider sa DERNIÈRE étape — son parcours d'incubation Lab est désormais complet. Écris le mot d'Élio qui le félicite chaleureusement pour avoir bouclé tout son parcours et lui indique que MiKL va étudier l'ensemble et revenir vers lui pour la suite.`
  }
}

/** Message déterministe si l'IA échoue / dépasse le délai — jamais de bandeau vide. */
function buildFallback(event: ConciergeEvent): string {
  switch (event.type) {
    case 'agent_reopened':
      return `Bonne nouvelle : l'étape « ${event.agentLabel} » a été rouverte pour que tu puisses l'approfondir. Reprends-la quand tu veux, je reste à tes côtés.`
    case 'submission_sent':
      return `C'est envoyé ! Ton document pour « ${event.agentLabel} » est entre les mains de MiKL — il va l'examiner et revenir vers toi. Je reste là si tu as une question.`
    case 'submission_approved':
      return `Bravo, ton étape « ${event.agentLabel} » est validée ! 🎉 On continue sur ta lancée, je t'accompagne pour la suite.`
    case 'submission_revision':
      return `MiKL a relu ton document pour « ${event.agentLabel} » et t'a laissé un retour pour l'améliorer. Jette-y un œil, ajuste, et resoumets : c'est une étape tout à fait normale.`
    case 'parcours_completed':
      return `Félicitations, tu as bouclé tout ton parcours ! 🎉 MiKL va étudier l'ensemble et revenir vers toi pour la suite. Je reste à tes côtés.`
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
