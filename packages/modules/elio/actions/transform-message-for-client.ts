'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { successResponse, errorResponse, type ActionResponse } from '@monprojetpro/types'
import { getCommunicationProfile } from './get-communication-profile'
import { getProfileLabels } from '../utils/profile-labels'
import type { CommunicationProfile } from '../types/communication-profile.types'
import { TransformMessageInput, type TransformMessageResult } from '../types/elio.types'

const ELIO_TIMEOUT_MS = 30_000

/**
 * Construit le system prompt de transformation adapté au profil de communication du client.
 */
function buildTransformSystemPrompt(profile: CommunicationProfile | null): string {
  const { toneLabel, lengthLabel, styleLabel } = getProfileLabels(profile)

  const profileSection = profile
    ? `**Profil de communication du client** :
- Ton : ${toneLabel}
- Longueur des messages : ${lengthLabel}
- Style d'interaction : ${styleLabel}`
    : `**Profil de communication** : Non défini — utilise un ton professionnel et bienveillant par défaut.`

  return `Tu es un assistant de communication professionnelle pour un consultant entrepreneur.

**Tâche** : Transforme le message brut reçu en un message bien rédigé, adapté au profil du client.

${profileSection}

**Instructions** :
1. Corrige orthographe, grammaire et ponctuation
2. Adapte le ton selon le profil (tutoiement/vouvoiement, longueur, style)
3. Reste fidèle au sens du message original — ne rajoute pas d'informations
4. Retourne UNIQUEMENT le message transformé, sans explication, sans préambule

**Format de réponse** : Le message transformé directement, rien d'autre.`
}

/**
 * Server Action — Transforme un message brut en message poli adapté au profil de communication du client.
 * Appelle l'Edge Function Élio pour la reformulation.
 * Retourne toujours { data, error } — jamais throw.
 */
export async function transformMessageForClient(
  input: TransformMessageInput
): Promise<ActionResponse<TransformMessageResult>> {
  const parsed = TransformMessageInput.safeParse(input)
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message ?? 'Données invalides'
    return errorResponse(firstError, 'VALIDATION_ERROR', parsed.error.issues)
  }

  const { clientId, rawMessage } = parsed.data

  const supabase = await createServerSupabaseClient()

  // 1. Charger le profil de communication du client
  const profileResult = await getCommunicationProfile({ clientId })
  const profile = profileResult.data ?? null

  // 2. Construire le system prompt
  const systemPrompt = buildTransformSystemPrompt(profile)

  // 3. Appeler Élio Edge Function avec timeout
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), ELIO_TIMEOUT_MS)

  try {
    const { data, error: fnError } = await supabase.functions.invoke('elio-chat', {
      body: {
        systemPrompt,
        message: rawMessage,
        dashboardType: 'hub',
        maxTokens: 1500,
        temperature: 0.7,
      },
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (fnError) {
      return errorResponse('Erreur lors de la transformation du message', 'LLM_ERROR', fnError)
    }

    const transformedText = (data as { content?: string })?.content?.trim() ?? ''
    if (!transformedText) {
      return errorResponse('Élio na pas pu transformer le message', 'LLM_ERROR')
    }

    const profileLabels = profile ? getProfileLabels(profile) : null

    return successResponse({
      transformedText,
      profileUsed: profileLabels
        ? {
            tone: profileLabels.toneLabel,
            length: profileLabels.lengthLabel,
            style: profileLabels.styleLabel,
          }
        : null,
    })
  } catch (err) {
    clearTimeout(timeoutId)
    if (err instanceof Error && err.name === 'AbortError') {
      return errorResponse('Élio a mis trop de temps à répondre (timeout 30s)', 'TIMEOUT_ERROR')
    }
    return errorResponse('Erreur inattendue lors de la transformation', 'LLM_ERROR', err)
  }
}
