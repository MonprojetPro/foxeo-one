'use server'

import Anthropic from '@anthropic-ai/sdk'
import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { type ActionResponse, successResponse, errorResponse } from '@monprojetpro/types'
import { getEffectiveElioConfig } from './get-effective-elio-config'

const MAX_MESSAGES = 30
const API_TIMEOUT_MS = 30_000

/**
 * Story 14.7 — Génère un document livrable à partir de la conversation Élio d'une étape.
 * Appelle Claude avec l'historique de la conversation + config Élio effective.
 * Retourne le document en markdown — ne soumet PAS (voir submitGeneratedDocument).
 */
export async function generateDocumentFromConversation(
  input: { stepId: string; clientId: string }
): Promise<ActionResponse<{ document: string }>> {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('[PARCOURS:GENERATE_DOC] ANTHROPIC_API_KEY non configurée')
    return errorResponse('Service IA indisponible', 'CONFIG_ERROR')
  }

  try {
    const supabase = await createServerSupabaseClient()

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return errorResponse('Non authentifié', 'UNAUTHORIZED')
    }

    // Récupérer l'étape avec son parcours
    const { data: step, error: stepError } = await supabase
      .from('parcours_steps')
      .select('id, step_number, title, description, brief_template, status, parcours(client_id)')
      .eq('id', input.stepId)
      .single()

    if (stepError || !step) {
      return errorResponse('Étape non trouvée', 'NOT_FOUND', {
        message: stepError?.message ?? 'not found',
      })
    }

    // Vérification ownership
    const parcoursData = step.parcours as { client_id: string } | null
    if (!parcoursData || parcoursData.client_id !== input.clientId) {
      return errorResponse('Accès non autorisé à cette étape', 'FORBIDDEN')
    }

    // Trouver la conversation Élio liée à cette étape
    const { data: conversation, error: convError } = await supabase
      .from('elio_conversations')
      .select('id')
      .eq('step_id', input.stepId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (convError) {
      console.error('[PARCOURS:GENERATE_DOC] Conversation error:', convError)
      return errorResponse('Erreur lors de la récupération de la conversation', 'DB_ERROR', {
        message: convError.message,
      })
    }

    // Charger les messages de la conversation
    let conversationContext = ''
    if (conversation) {
      const { data: messages } = await supabase
        .from('elio_messages')
        .select('role, content')
        .eq('conversation_id', conversation.id)
        .order('created_at', { ascending: true })
        .limit(MAX_MESSAGES)

      if (messages && messages.length > 0) {
        conversationContext = messages
          .map((m: { role: string; content: string }) =>
            `**${m.role === 'user' ? 'Client' : 'Élio'}** : ${m.content}`)
          .join('\n\n')
      }
    }

    // Config Élio effective (step-specific > global client)
    const { data: config } = await getEffectiveElioConfig({
      stepId: input.stepId,
      clientId: input.clientId,
    })

    const stepNumber = Number(step.step_number) || 0
    const stepTitle = String(step.title ?? '')
    const stepDescription = String(step.description ?? '')
    const briefTemplate = step.brief_template ? String(step.brief_template) : null

    const prompt = buildDocumentPrompt({
      stepNumber,
      stepTitle,
      stepDescription,
      briefTemplate,
      conversationContext,
      customInstructions: config?.customInstructions ?? undefined,
    })

    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
      timeout: API_TIMEOUT_MS,
    })

    const message = await anthropic.messages.create({
      model: config?.model ?? 'claude-sonnet-4-6',
      max_tokens: config?.maxTokens ?? 2000,
      temperature: config?.temperature ?? 1.0,
      messages: [{ role: 'user', content: prompt }],
    })

    const document = message.content[0]?.type === 'text' ? message.content[0].text : ''

    if (!document.trim()) {
      return errorResponse('Élio n\'a pas pu générer le document — veuillez réessayer', 'API_ERROR')
    }

    console.log('[PARCOURS:GENERATE_DOC] Document généré pour step:', input.stepId, '| longueur:', document.length)

    return successResponse({ document })
  } catch (error) {
    console.error('[PARCOURS:GENERATE_DOC] Unexpected error:', error)
    return errorResponse('Échec génération document', 'API_ERROR', {
      message: error instanceof Error ? error.message : String(error),
    })
  }
}

interface BuildDocumentPromptInput {
  stepNumber: number
  stepTitle: string
  stepDescription: string
  briefTemplate: string | null
  conversationContext: string
  customInstructions?: string
}

function buildDocumentPrompt(input: BuildDocumentPromptInput): string {
  const { stepNumber, stepTitle, stepDescription, briefTemplate, conversationContext, customInstructions } = input

  const contextSection = conversationContext
    ? `**Conversation avec le client :**\n${conversationContext}`
    : '**Contexte :** Aucune conversation disponible — génère un document basé sur le template et la description de l\'étape.'

  return `Tu es Élio, l'assistant IA personnel du client dans son parcours MonprojetPro Lab.

Le client vient de terminer ses échanges sur l'étape ${stepNumber} : "${stepTitle}".
Description de l'étape : ${stepDescription}

**Template du document attendu :**
${briefTemplate ?? 'Document libre — structure à ta convenance en markdown'}

${contextSection}

**Tâche :**
À partir de cette conversation, génère un document professionnel et structuré en markdown.
Le document doit :
- Synthétiser les échanges et les décisions prises lors de la conversation
- Être clair et actionnable pour MiKL qui va le valider
- Respecter le template si fourni
- Utiliser un format markdown soigné (headings, listes, etc.)

Génère uniquement le document, sans introduction ni commentaire additionnel.${customInstructions?.trim() ? `\n\n**Instructions supplémentaires :**\n${customInstructions.trim()}` : ''}`
}
