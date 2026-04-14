'use server'

import Anthropic from '@anthropic-ai/sdk'
import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { type ActionResponse, successResponse, errorResponse } from '@monprojetpro/types'
import { toCommunicationProfile, type CommunicationProfileDB } from '../types/communication-profile.types'
import { getElioConfig } from './get-elio-config'
import { DEFAULT_ELIO_CONFIG } from '../types/elio-config.types'

const MAX_CONVERSATION_MESSAGES = 20
const API_TIMEOUT_MS = 30_000
const LOG_PREVIEW_LENGTH = 100

export async function generateBrief(
  stepId: string
): Promise<ActionResponse<{ brief: string }>> {
  // Validate env
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('[ELIO:GENERATE_BRIEF] ANTHROPIC_API_KEY non configurée')
    return errorResponse('Service IA indisponible', 'CONFIG_ERROR')
  }

  const supabase = await createServerSupabaseClient()

  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) {
    return errorResponse('Non authentifié', 'UNAUTHORIZED')
  }

  // Récupérer client
  const { data: client, error: clientError } = await supabase
    .from('clients')
    .select('id, operator_id')
    .eq('auth_user_id', user.id)
    .single()

  if (clientError || !client) {
    return errorResponse('Client non trouvé', 'NOT_FOUND', clientError)
  }

  // Récupérer étape avec parcours
  const { data: step, error: stepError } = await supabase
    .from('parcours_steps')
    .select('*, parcours(client_id)')
    .eq('id', stepId)
    .single()

  if (stepError || !step) {
    return errorResponse('Étape non trouvée', 'NOT_FOUND', stepError)
  }

  // Ownership check — le client ne peut générer que pour ses propres étapes
  const parcoursData = step.parcours as { client_id: string } | null
  if (!parcoursData || parcoursData.client_id !== client.id) {
    return errorResponse('Accès non autorisé à cette étape', 'FORBIDDEN')
  }

  // Récupérer config Élio (modèle, température, max_tokens, instructions custom)
  const { data: elioConfig } = await getElioConfig(client.id)
  const activeConfig = elioConfig ?? DEFAULT_ELIO_CONFIG

  // Récupérer profil communication (optionnel — valeurs par défaut si absent)
  const { data: profileDB } = await supabase
    .from('communication_profiles')
    .select('*')
    .eq('client_id', parcoursData.client_id)
    .maybeSingle()

  const profile = profileDB ? toCommunicationProfile(profileDB as CommunicationProfileDB) : null

  // Récupérer derniers messages conversation (table elio_conversations créée en Story 8.2)
  let conversationContext = ''
  try {
    const { data: messages, error: convError } = await supabase
      .from('elio_conversations')
      .select('role, content, created_at')
      .eq('client_id', client.id)
      .eq('step_id', stepId)
      .order('created_at', { ascending: false })
      .limit(MAX_CONVERSATION_MESSAGES)

    // Si erreur de type "table not found" → continuer sans contexte
    if (convError) {
      console.log('[ELIO:GENERATE_BRIEF] elio_conversations non disponible:', convError.message)
    } else if (messages && messages.length > 0) {
      const sorted = [...messages].reverse()
      conversationContext = sorted
        .map((m: { role: string; content: string }) => `**${m.role === 'user' ? 'Client' : 'Élio'}** : ${m.content}`)
        .join('\n\n')
    }
  } catch {
    // Table pas encore créée (Story 8.2)
    console.log('[ELIO:GENERATE_BRIEF] elio_conversations non disponible — brief sans contexte conversation')
  }

  // Construire le prompt — extraction typée des champs DB
  const stepNumber = Number(step.step_number) || 0
  const stepTitle = String(step.title ?? '')
  const stepDescription = String(step.description ?? '')
  const briefTemplate = step.brief_template ? String(step.brief_template) : null

  const prompt = buildGenerateBriefPrompt({
    stepNumber,
    stepTitle,
    stepDescription,
    briefTemplate,
    conversationContext,
    preferredTone: profile?.preferredTone ?? 'friendly',
    preferredLength: profile?.preferredLength ?? 'balanced',
    customInstructions: activeConfig.customInstructions ?? undefined,
  })

  try {
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
      timeout: API_TIMEOUT_MS,
    })

    const message = await anthropic.messages.create({
      model: activeConfig.model,
      max_tokens: activeConfig.maxTokens,
      temperature: activeConfig.temperature,
      messages: [{ role: 'user', content: prompt }],
    })

    const brief = message.content[0]?.type === 'text' ? message.content[0].text : ''

    if (!brief.trim()) {
      return errorResponse('Élio n\'a pas pu générer de brief — veuillez réessayer', 'API_ERROR')
    }

    console.log('[ELIO:GENERATE_BRIEF] Brief généré:', brief.substring(0, LOG_PREVIEW_LENGTH) + '...')

    return successResponse({ brief })
  } catch (error) {
    console.error('[ELIO:GENERATE_BRIEF] Error:', error)
    return errorResponse('Échec génération brief', 'API_ERROR', error)
  }
}

interface BuildPromptInput {
  stepNumber: number
  stepTitle: string
  stepDescription: string
  briefTemplate: string | null
  conversationContext: string
  preferredTone: string
  preferredLength: string
  customInstructions?: string
}

function buildGenerateBriefPrompt(input: BuildPromptInput): string {
  const {
    stepNumber,
    stepTitle,
    stepDescription,
    briefTemplate,
    conversationContext,
    preferredTone,
    preferredLength,
    customInstructions,
  } = input

  const contextSection = conversationContext
    ? `**Extrait de la conversation avec le client :**\n${conversationContext}`
    : '**Contexte :** Aucune conversation disponible — génère un brief basé sur le template et la description de l\'étape.'

  return `Tu es Élio, l'assistant IA personnel du client dans son parcours MonprojetPro Lab.

Le client est à l'étape ${stepNumber} : "${stepTitle}".
Description de l'étape : ${stepDescription}

**Template du brief attendu :**
${briefTemplate ?? 'Brief libre — structure à ta convenance'}

${contextSection}

**Profil de communication du client :**
- Ton : ${preferredTone}
- Longueur : ${preferredLength}

**Tâche :**
À partir de cette conversation, génère un brief professionnel et structuré en markdown pour cette étape.
Le brief doit :
- Refléter les échanges et les décisions prises
- Être clair et actionnable pour MiKL qui va le valider
- Respecter le template si fourni
- Utiliser un format markdown (headings, listes, etc.)

Génère uniquement le brief, sans introduction ni commentaire additionnel.${customInstructions?.trim() ? `\n\n**Instructions supplémentaires :**\n${customInstructions.trim()}` : ''}`
}
