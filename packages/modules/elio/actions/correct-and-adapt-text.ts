'use server'

import { createServerSupabaseClient } from '@foxeo/supabase'
import { successResponse, errorResponse, type ActionResponse } from '@foxeo/types'
import type { CommunicationProfile } from '../types/communication-profile.types'
import { toCommunicationProfile, type CommunicationProfileDB } from '../types/communication-profile.types'
import { getProfileLabels } from '../utils/profile-labels'

const ELIO_TIMEOUT_MS = 60_000

/**
 * Construit le prompt de correction adapté au profil de communication.
 */
function buildCorrectionPrompt(
  originalText: string,
  profile: CommunicationProfile | null,
): string {
  const { toneLabel, lengthLabel, styleLabel } = getProfileLabels(profile)

  return `Tu es un assistant de rédaction professionnelle.

**Tâche** : Corrige et adapte le texte suivant au profil de communication du client.

**Texte original** :
${originalText}

**Profil de communication du client** :
- Ton : ${toneLabel}
- Longueur des messages : ${lengthLabel}
- Style d'interaction : ${styleLabel}

**Instructions** :
1. Corrige l'orthographe, la grammaire et la ponctuation
2. Adapte le ton selon le profil (tutoiement/vouvoiement, longueur, style)
3. Retourne le texte corrigé suivi d'une brève explication des changements

**Format de réponse** :
---
[Texte corrigé et adapté]
---

[Explication des changements]`
}

/**
 * Server Action — Corrige et adapte un texte au profil de communication d'un client.
 * Retourne toujours { data, error } — jamais throw.
 */
export async function correctAndAdaptText(
  clientName: string,
  originalText: string,
): Promise<ActionResponse<string>> {
  if (!clientName.trim()) {
    return errorResponse('Le nom du client ne peut pas être vide', 'VALIDATION_ERROR')
  }
  if (!originalText.trim()) {
    return errorResponse('Le texte à corriger ne peut pas être vide', 'VALIDATION_ERROR')
  }

  const supabase = await createServerSupabaseClient()

  // 1. Rechercher le client par nom
  const sanitized = clientName.trim().replace(/[%_\\]/g, '\\$&')
  const { data: clients, error: clientError } = await supabase
    .from('clients')
    .select('id, name, email')
    .ilike('name', `%${sanitized}%`)
    .limit(5)

  if (clientError) {
    return errorResponse('Erreur lors de la recherche client', 'DB_ERROR', clientError)
  }

  if (!clients || clients.length === 0) {
    return errorResponse(
      `Quel client ? Je n'ai pas trouvé "${clientName}" dans ta base.`,
      'CLIENT_NOT_FOUND',
    )
  }

  // M1 fix: disambiguation quand plusieurs clients matchent
  if (clients.length > 1) {
    const names = clients.map((c) => (c as { name: string }).name).join(', ')
    return errorResponse(
      `Plusieurs clients correspondent à "${clientName}" : ${names}. Précise lequel.`,
      'MULTIPLE_CLIENTS',
    )
  }

  const client = clients[0]!

  // 2. Charger le profil de communication (peut être null)
  const { data: profileData } = await supabase
    .from('communication_profiles')
    .select('*')
    .eq('client_id', (client as { id: string }).id)
    .maybeSingle()

  const profile = profileData
    ? toCommunicationProfile(profileData as CommunicationProfileDB)
    : null

  // 3. Construire le prompt
  const prompt = buildCorrectionPrompt(originalText, profile)

  // 4. Appeler Élio Edge Function avec timeout
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), ELIO_TIMEOUT_MS)

  try {
    const { data, error: fnError } = await supabase.functions.invoke('elio-chat', {
      body: {
        systemPrompt: '',
        message: prompt,
        dashboardType: 'hub',
      },
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (fnError) {
      return errorResponse('Erreur lors de la correction du texte', 'LLM_ERROR', fnError)
    }

    const correctedText = (data as { content?: string })?.content ?? ''
    return successResponse(correctedText)
  } catch (err) {
    clearTimeout(timeoutId)
    return errorResponse('Erreur inattendue lors de la correction', 'LLM_ERROR', err)
  }
}
