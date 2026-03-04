'use server'

import { createServerSupabaseClient } from '@foxeo/supabase'
import { successResponse, errorResponse, type ActionResponse } from '@foxeo/types'
import type { CommunicationProfile } from '../types/communication-profile.types'
import { toCommunicationProfile, type CommunicationProfileDB } from '../types/communication-profile.types'
import { getProfileLabels } from '../utils/profile-labels'

const ELIO_TIMEOUT_MS = 60_000

export interface AdjustDraftInput {
  previousDraft: string
  instruction: string
  clientName: string
  draftType: 'email' | 'validation_hub' | 'chat'
  currentVersion?: number
}

export interface AdjustedDraftResult {
  content: string
  draftType: 'email' | 'validation_hub' | 'chat'
  clientName: string
  version: number
}

function buildAdjustPrompt(
  previousDraft: string,
  instruction: string,
  profile: CommunicationProfile | null,
  draftType: string,
): string {
  const { toneLabel } = getProfileLabels(profile)

  return `Tu es un assistant de rédaction professionnelle.

**Tâche** : Modifie le brouillon suivant selon l'instruction donnée.

**Brouillon précédent** :
---
${previousDraft}
---

**Instruction de modification** : ${instruction}

**Type de contenu** : ${draftType === 'email' ? 'Email' : draftType === 'validation_hub' ? 'Réponse Validation Hub' : 'Message chat'}
**Ton du client** : ${toneLabel}

**Instructions** :
1. Applique la modification demandée
2. Conserve le style et le ton du profil client
3. Retourne le brouillon modifié suivi d'une note courte

**Format de réponse** :
---
[Brouillon modifié]
---

[Note sur les modifications]`
}

/**
 * Server Action — Ajuste un brouillon existant selon une instruction.
 * Retourne toujours { data, error } — jamais throw.
 */
export async function adjustDraft(
  input: AdjustDraftInput,
): Promise<ActionResponse<AdjustedDraftResult>> {
  if (!input.previousDraft.trim()) {
    return errorResponse('Le brouillon précédent ne peut pas être vide', 'VALIDATION_ERROR')
  }
  if (!input.instruction.trim()) {
    return errorResponse('L\'instruction de modification ne peut pas être vide', 'VALIDATION_ERROR')
  }

  const supabase = await createServerSupabaseClient()

  // Charger le profil de communication si clientName fourni
  let profile: CommunicationProfile | null = null
  if (input.clientName.trim()) {
    const sanitized = input.clientName.trim().replace(/[%_\\]/g, '\\$&')
    const { data: clients } = await supabase
      .from('clients')
      .select('id, name')
      .ilike('name', `%${sanitized}%`)
      .limit(1)

    if (clients && clients.length > 0) {
      const clientId = (clients[0] as { id: string }).id
      const { data: profileData } = await supabase
        .from('communication_profiles')
        .select('*')
        .eq('client_id', clientId)
        .maybeSingle()
      profile = profileData ? toCommunicationProfile(profileData as CommunicationProfileDB) : null
    }
  }

  const prompt = buildAdjustPrompt(input.previousDraft, input.instruction, profile, input.draftType)

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
      return errorResponse('Erreur lors de l\'ajustement du brouillon', 'LLM_ERROR', fnError)
    }

    const content = (data as { content?: string })?.content ?? ''
    const version = (input.currentVersion ?? 1) + 1

    return successResponse({
      content,
      draftType: input.draftType,
      clientName: input.clientName,
      version,
    })
  } catch (err) {
    clearTimeout(timeoutId)
    return errorResponse('Erreur inattendue lors de l\'ajustement', 'LLM_ERROR', err)
  }
}
