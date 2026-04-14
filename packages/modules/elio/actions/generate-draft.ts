'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { successResponse, errorResponse, type ActionResponse } from '@monprojetpro/types'
import type { CommunicationProfile } from '../types/communication-profile.types'
import { toCommunicationProfile, type CommunicationProfileDB } from '../types/communication-profile.types'
import { getProfileLabels } from '../utils/profile-labels'
import type { DraftResult, GenerateDraftInput } from '../types/elio.types'

const ELIO_TIMEOUT_MS = 60_000

/**
 * Construit le prompt de génération de brouillon.
 */
function buildDraftPrompt(
  input: GenerateDraftInput,
  profile: CommunicationProfile | null,
): string {
  const { toneLabel, lengthLabel } = getProfileLabels(profile)

  const typeInstructions: Record<string, string> = {
    email: 'Génère un email professionnel avec objet et signature "MiKL — MonprojetPro"',
    validation_hub: 'Génère une réponse pour le Validation Hub (ton pro mais chaleureux, pas de signature)',
    chat: 'Génère un message de chat (conversationnel, naturel)',
  }

  const contextBlock =
    input.recentContext && input.recentContext.length > 0
      ? `\n**Contexte récent** :\n${input.recentContext.join('\n')}\n`
      : ''

  return `Tu es un assistant de rédaction professionnelle pour MiKL (opérateur MonprojetPro).

**Tâche** : ${typeInstructions[input.draftType]}

**Client** : ${input.clientName}
**Sujet / Demande** : ${input.subject}
${contextBlock}
**Profil de communication du client** :
- Ton : ${toneLabel}
- Longueur : ${lengthLabel}

**Instructions** :
1. Génère un brouillon complet et professionnel
2. Adapte le ton selon le profil de communication
3. ${input.draftType === 'email' ? 'Inclus un objet clair et une signature "MiKL — MonprojetPro"' : 'Reste dans le style approprié au canal'}
4. Utilise le contexte récent si pertinent

**Format de réponse** :
---
[Brouillon généré]
---

[Note sur le profil utilisé]`
}

/**
 * Server Action — Génère un brouillon (email, validation_hub, chat) adapté au profil client.
 * Retourne toujours { data, error } — jamais throw.
 */
export async function generateDraft(
  input: GenerateDraftInput,
): Promise<ActionResponse<DraftResult>> {
  if (!input.clientName.trim()) {
    return errorResponse('Le nom du client ne peut pas être vide', 'VALIDATION_ERROR')
  }

  const supabase = await createServerSupabaseClient()

  // 1. Rechercher le client par nom
  const sanitized = input.clientName.trim().replace(/[%_\\]/g, '\\$&')
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
      `Quel client ? Je n'ai pas trouvé "${input.clientName}" dans ta base.`,
      'CLIENT_NOT_FOUND',
    )
  }

  // M1 fix: disambiguation quand plusieurs clients matchent
  if (clients.length > 1) {
    const names = clients.map((c) => (c as { name: string }).name).join(', ')
    return errorResponse(
      `Plusieurs clients correspondent à "${input.clientName}" : ${names}. Précise lequel.`,
      'MULTIPLE_CLIENTS',
    )
  }

  const client = clients[0]! as { id: string; name: string }

  // 2. Charger le profil de communication
  const { data: profileData } = await supabase
    .from('communication_profiles')
    .select('*')
    .eq('client_id', client.id)
    .maybeSingle()

  const profile = profileData
    ? toCommunicationProfile(profileData as CommunicationProfileDB)
    : null

  // 3. H2 fix: Charger le contexte récent via conversations du client (pas conversation_id = client.id)
  const { data: conversations } = await supabase
    .from('elio_conversations')
    .select('id')
    .eq('user_id', client.id)
    .order('updated_at', { ascending: false })
    .limit(1)

  let contextLines: string[] = []
  if (conversations && conversations.length > 0) {
    const convId = (conversations[0] as { id: string }).id
    const { data: recentMessages } = await supabase
      .from('elio_messages')
      .select('role, content')
      .eq('conversation_id', convId)
      .order('created_at', { ascending: false })
      .limit(5)

    contextLines = (recentMessages ?? []).map(
      (m: { role: string; content: string }) => `[${m.role}]: ${m.content}`,
    )
  }

  // 4. Construire le prompt
  const prompt = buildDraftPrompt({ ...input, recentContext: contextLines }, profile)

  // 5. Appeler Élio Edge Function avec timeout
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
      return errorResponse('Erreur lors de la génération du brouillon', 'LLM_ERROR', fnError)
    }

    const content = (data as { content?: string })?.content ?? ''
    return successResponse({
      content,
      draftType: input.draftType,
      clientName: client.name,
    })
  } catch (err) {
    clearTimeout(timeoutId)
    return errorResponse('Erreur inattendue lors de la génération', 'LLM_ERROR', err)
  }
}
