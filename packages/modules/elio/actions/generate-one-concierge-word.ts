'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { type ActionResponse, successResponse, errorResponse } from '@monprojetpro/types'
import { OPERATOR_IDENTITY_RULE } from '@monprojetpro/utils'
import { getLlmConfig } from './llm-config'

const CONCIERGE_TIMEOUT_MS = 15_000 // appel léger, 15s suffisent
const HAIKU_MODEL = 'claude-haiku-4-5-20251001' // fallback si la config LLM est illisible

/**
 * Résout le profil `micro` de la config LLM (Contrat 2) : model + provider.
 * Fallback comportement historique (Haiku, provider Anthropic implicite) si erreur.
 */
async function resolveMicroLlm(): Promise<{
  model: string
  provider?: { name: string; baseUrl?: string; apiKeyEnv: string }
}> {
  try {
    const { data } = await getLlmConfig()
    const micro = data?.micro
    if (!micro?.model) return { model: HAIKU_MODEL }
    return {
      model: micro.model,
      provider: {
        name: micro.provider,
        ...(micro.baseUrl ? { baseUrl: micro.baseUrl } : {}),
        apiKeyEnv: micro.apiKeyEnv,
      },
    }
  } catch {
    return { model: HAIKU_MODEL }
  }
}

/**
 * Persona compacte d'Élio le Concierge ONE pour les mots PROACTIFS (≠ chat complet).
 *
 * Différence majeure avec le Concierge Lab : ici, Élio n'accompagne PAS un parcours
 * d'incubation. Il est l'assistant de l'OUTIL MÉTIER quotidien (le One) — la console de
 * pilotage des livrables du client + le canal de lien avec MiKL. Ton factuel, tutoiement,
 * 1-2 phrases, jamais de markdown. Garde-fou factuel : il ne se base QUE sur l'événement
 * décrit et n'invente aucune action / date / résultat.
 */
const ONE_CONCIERGE_SYSTEM_PROMPT = `Tu es Élio, l'assistant du dashboard One de MonprojetPro : l'outil métier quotidien d'un entrepreneur, sa console de pilotage de ses livrables et son lien permanent avec MiKL. Tu écris un court mot proactif au client (tutoiement), clair et utile — pas mielleux, factuel et orienté action. Règles STRICTES : 1 à 2 phrases maximum ; pas de markdown, pas de liste, pas de guillemets autour du message ; tu te bases UNIQUEMENT sur l'événement décrit ci-dessous et tu n'inventes aucune action, aucune date, aucun résultat. Réponds uniquement avec le mot d'Élio, rien d'autre.
${OPERATOR_IDENTITY_RULE}`

/**
 * Événements One qui déclenchent un mot d'Élio. Union extensible : ajouter un nouveau cas
 * ici + le `case` correspondant dans buildEventPrompt et buildFallback (le compilateur
 * forcera l'exhaustivité via le `never` final).
 */
export type OneConciergeEvent =
  | { type: 'graduation_welcome'; clientName?: string }
  | { type: 'tool_update'; title?: string }
  | { type: 'tool_comment'; title?: string }
  | { type: 'tool_delivered' }
  | { type: 'tool_construction' }
  | { type: 'evolution_approved'; requestLabel?: string }
  | { type: 'evolution_revision'; requestLabel?: string; comment?: string }
  | { type: 'module_enabled'; moduleLabel: string }
  | { type: 'tier_changed'; tierLabel: string }
  | { type: 'support_status_changed'; subject?: string; status?: string }

/** Libellé d'agent/élément concerné, stocké dans agent_label (réutilise la colonne existante). */
function eventLabel(event: OneConciergeEvent): string | null {
  switch (event.type) {
    case 'graduation_welcome':
      return event.clientName ?? null
    case 'tool_update':
    case 'tool_comment':
      return event.title ?? null
    case 'tool_delivered':
    case 'tool_construction':
      return null
    case 'evolution_approved':
    case 'evolution_revision':
      return event.requestLabel ?? null
    case 'module_enabled':
      return event.moduleLabel
    case 'tier_changed':
      return event.tierLabel
    case 'support_status_changed':
      return event.subject ?? null
  }
}

function buildEventPrompt(event: OneConciergeEvent): string {
  switch (event.type) {
    case 'graduation_welcome':
      return `Événement : le client vient d'accéder à son dashboard One${
        event.clientName ? ` (${event.clientName})` : ''
      } — sa console de pilotage de ses livrables et son lien permanent avec MiKL. Écris le mot d'Élio qui lui souhaite chaleureusement la bienvenue dans son One et lui indique qu'il peut t'y poser ses questions au quotidien.`
    case 'tool_update':
      return `Événement : MiKL vient de publier une mise à jour dans le Suivi de l'outil${
        event.title ? ` : « ${event.title} »` : ''
      }. Écris le mot d'Élio qui informe le client qu'une nouvelle avancée sur son outil est disponible et l'invite à consulter l'onglet Suivi de l'outil.`
    case 'tool_comment':
      return `Événement : il y a du nouveau dans un échange du Suivi de l'outil${
        event.title ? ` sur « ${event.title} »` : ''
      }. Écris le mot d'Élio qui signale au client cette nouvelle réponse et l'invite à y jeter un œil.`
    case 'tool_delivered':
      return `Événement : l'outil sur-mesure du client vient d'être marqué comme LIVRÉ par MiKL — les cockpits de pilotage sont désormais actifs sur son tableau de bord. Écris le mot d'Élio qui félicite le client pour cette étape (son outil est prêt) et l'invite à explorer son tableau de bord.`
    case 'tool_construction':
      return `Événement : l'outil du client repasse temporairement en phase « chantier » — MiKL travaille dessus (améliorations ou corrections). Le tableau de bord reste entièrement accessible. Écris le mot d'Élio qui l'informe factuellement et le rassure : rien n'est perdu, il sera prévenu à la re-livraison.`
    case 'evolution_approved':
      return `Événement : une demande d'évolution du client${
        event.requestLabel ? ` (« ${event.requestLabel} »)` : ''
      } a été acceptée par MiKL. Écris le mot d'Élio qui annonce la bonne nouvelle et indique que MiKL va la prendre en charge.`
    case 'evolution_revision':
      return `Événement : MiKL a examiné une demande d'évolution du client${
        event.requestLabel ? ` (« ${event.requestLabel} »)` : ''
      } et a besoin de précisions avant d'aller plus loin.${
        event.comment ? ` Retour de MiKL : ${event.comment}.` : ''
      } Écris le mot d'Élio qui présente ce retour de façon constructive et invite le client à apporter les précisions demandées.`
    case 'module_enabled':
      return `Événement : un nouveau module vient d'être activé dans le One du client : « ${event.moduleLabel} ». Écris le mot d'Élio qui annonce que cette nouvelle fonctionnalité est disponible et invite le client à la découvrir.`
    case 'tier_changed':
      return `Événement : l'offre du client vient de passer à « ${event.tierLabel} ». Écris le mot d'Élio qui confirme ce changement d'offre de façon factuelle et positive, sans inventer le détail des nouveaux avantages.`
    case 'support_status_changed':
      return `Événement : le statut d'un ticket de support du client${
        event.subject ? ` (« ${event.subject} »)` : ''
      } a évolué${event.status ? ` vers « ${event.status} »` : ''}. Écris le mot d'Élio qui informe le client de cette évolution et l'invite à consulter l'onglet Support pour le détail.`
  }
}

/** Message déterministe si l'IA échoue / dépasse le délai — jamais de bandeau vide. */
function buildFallback(event: OneConciergeEvent): string {
  switch (event.type) {
    case 'graduation_welcome':
      return `Bienvenue dans ton dashboard One${
        event.clientName ? `, ${event.clientName}` : ''
      } ! C'est ici que tu pilotes tes livrables et que tu gardes le lien avec MiKL. Je suis là si tu as une question.`
    case 'tool_update':
      return `Du nouveau sur ton outil${
        event.title ? ` : « ${event.title} »` : ''
      } — va voir l'onglet Suivi de l'outil pour découvrir l'avancée.`
    case 'tool_comment':
      return `Il y a une nouvelle réponse dans le Suivi de l'outil${
        event.title ? ` sur « ${event.title} »` : ''
      }. Jette-y un œil quand tu veux.`
    case 'tool_delivered':
      return `Ton outil est livré ! Les cockpits de pilotage sont maintenant actifs sur ton tableau de bord — va les découvrir.`
    case 'tool_construction':
      return `Ton outil repasse en chantier : MiKL travaille dessus. Ton tableau de bord reste entièrement accessible, et tu seras prévenu dès que c'est prêt.`
    case 'evolution_approved':
      return `Bonne nouvelle : ta demande d'évolution${
        event.requestLabel ? ` « ${event.requestLabel} »` : ''
      } a été acceptée. MiKL va la prendre en charge.`
    case 'evolution_revision':
      return `MiKL a besoin de quelques précisions sur ta demande d'évolution${
        event.requestLabel ? ` « ${event.requestLabel} »` : ''
      } avant d'avancer. Reprends-la pour préciser, et il pourra continuer.`
    case 'module_enabled':
      return `Nouveau dans ton One : le module « ${event.moduleLabel} » est désormais disponible. Va le découvrir quand tu veux.`
    case 'tier_changed':
      return `Ton offre est désormais « ${event.tierLabel} ». Si tu as une question sur ce que ça change, je suis là.`
    case 'support_status_changed':
      return `Le statut de ton ticket${
        event.subject ? ` « ${event.subject} »` : ''
      } a évolué${event.status ? ` : ${event.status}` : ''}. Consulte l'onglet Support pour le détail.`
  }
}

/**
 * Génère « le dernier mot d'Élio » côté ONE pour un client, à partir d'un événement de
 * l'outil métier, et l'enregistre dans `client_concierge_messages` (dashboard_context='one').
 *
 * - IA d'abord (Haiku via l'Edge Function `elio-chat`), fallback templaté si échec/timeout.
 * - L'INSERT déclenche le broadcast `one_concierge_changed` sur `one:{client_id}` (trigger)
 *   → l'accueil One du client re-fetch getOneConciergeWord et affiche le mot en direct.
 * - Best-effort : l'appelant (ex: publication d'un suivi-outil, activation module…) ne doit
 *   JAMAIS échouer si la génération échoue. Toute erreur est avalée et journalisée.
 */
export async function generateOneConciergeWord(
  clientId: string,
  event: OneConciergeEvent
): Promise<ActionResponse<{ body: string; source: 'ai' | 'template' }>> {
  if (!clientId) return errorResponse('clientId requis', 'VALIDATION_ERROR')

  try {
    const supabase = await createServerSupabaseClient()

    let body = ''
    let source: 'ai' | 'template' = 'ai'

    // Profil `micro` de la config LLM (fallback Haiku si illisible)
    const microLlm = await resolveMicroLlm()

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), CONCIERGE_TIMEOUT_MS)
    try {
      const { data, error: fnError } = await supabase.functions.invoke('elio-chat', {
        body: {
          systemPrompt: ONE_CONCIERGE_SYSTEM_PROMPT,
          message: buildEventPrompt(event),
          model: microLlm.model,
          ...(microLlm.provider ? { provider: microLlm.provider } : {}),
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
      agent_label: eventLabel(event),
      body,
      source,
      dashboard_context: 'one',
    })

    if (insertError) {
      console.error('[ELIO:ONE_CONCIERGE_WORD] Insert error:', insertError)
      return errorResponse("Échec d'enregistrement du mot d'Élio One", 'DATABASE_ERROR', insertError)
    }

    return successResponse({ body, source })
  } catch (err) {
    // Best-effort absolu : ne jamais propager une erreur à l'action parente.
    console.error('[ELIO:ONE_CONCIERGE_WORD] Unexpected error (ignored):', err)
    return errorResponse('Mot d\'Élio One non généré', 'INTERNAL_ERROR', err)
  }
}
