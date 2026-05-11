'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { type ActionResponse, successResponse, errorResponse } from '@monprojetpro/types'
import { getEffectiveElioConfig } from './get-effective-elio-config'

const MAX_MESSAGES = 30
const ELIO_CHAT_FUNCTION = 'elio-chat'

/**
 * Story 14.7 — Génère un document livrable à partir de la conversation Élio d'une étape.
 * Appelle l'Edge Function elio-chat (clé Anthropic gérée côté Supabase secrets uniquement).
 */
export async function generateDocumentFromConversation(
  input: { stepId: string; clientId: string }
): Promise<ActionResponse<{ document: string }>> {
  try {
    const supabase = await createServerSupabaseClient()

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return errorResponse('Non authentifié', 'UNAUTHORIZED')
    }

    // Récupérer l'étape et le nom du client en parallèle
    const [{ data: step, error: stepError }, { data: clientRow }] = await Promise.all([
      supabase
        .from('client_parcours_agents')
        .select('id, step_order, step_label, client_id, elio_lab_agents(name, description)')
        .eq('id', input.stepId)
        .single(),
      supabase
        .from('clients')
        .select('first_name, name')
        .eq('id', input.clientId)
        .single(),
    ])

    if (stepError || !step) {
      return errorResponse('Étape non trouvée', 'NOT_FOUND', {
        message: stepError?.message ?? 'not found',
      })
    }

    // Vérification ownership
    if (step.client_id !== input.clientId) {
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

    const agent = step.elio_lab_agents as { name?: string; description?: string } | null
    const stepNumber = Number(step.step_order) || 0
    const stepTitle = String(step.step_label ?? agent?.name ?? '')
    const stepDescription = String(agent?.description ?? '')
    const clientName = String((clientRow as { first_name?: string; name?: string } | null)?.first_name ?? (clientRow as { first_name?: string; name?: string } | null)?.name ?? 'Client')
    const today = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })

    const prompt = buildDocumentPrompt({
      stepNumber,
      stepTitle,
      stepDescription,
      conversationContext,
      clientName,
      date: today,
      customInstructions: config?.customInstructions ?? undefined,
    })

    // Appel via Edge Function elio-chat — clé Anthropic gérée côté Supabase secrets
    const { data: fnData, error: fnError } = await supabase.functions.invoke(ELIO_CHAT_FUNCTION, {
      body: {
        systemPrompt: 'Tu es Élio, un assistant IA expert en rédaction de documents professionnels structurés en markdown.',
        message: prompt,
        model: config?.model ?? 'claude-sonnet-4-6',
        maxTokens: config?.maxTokens ?? 2000,
        temperature: config?.temperature ?? 1.0,
      },
    })

    if (fnError) {
      console.error('[PARCOURS:GENERATE_DOC] Edge function error:', fnError)
      return errorResponse('Service IA indisponible', 'API_ERROR', { message: fnError.message })
    }

    const document = fnData?.content ?? ''

    if (!document.trim()) {
      return errorResponse('Élio n\'a pas pu générer le document — veuillez réessayer', 'API_ERROR')
    }

    console.log('[PARCOURS:GENERATE_DOC] Document généré pour step:', input.stepId, '| longueur:', document.length)

    return successResponse({ document })
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error)
    console.error('[PARCOURS:GENERATE_DOC] Unexpected error:', detail)
    return errorResponse(`Échec: ${detail}`, 'API_ERROR')
  }
}

interface BuildDocumentPromptInput {
  stepNumber: number
  stepTitle: string
  stepDescription: string
  conversationContext: string
  clientName: string
  date: string
  customInstructions?: string
}

function buildDocumentPrompt(input: BuildDocumentPromptInput): string {
  const { stepNumber, stepTitle, stepDescription, conversationContext, clientName, date, customInstructions } = input

  const contextSection = conversationContext
    ? `**Conversation avec le client :**\n${conversationContext}`
    : '**Contexte :** Aucune conversation disponible — génère un document basé sur la description de l\'étape.'

  return `Le client "${clientName}" vient de terminer ses échanges sur l'étape ${stepNumber} : "${stepTitle}".
Date du document : ${date}
Description de l'étape : ${stepDescription}

${contextSection}

**Tâche :**
À partir de cette conversation, génère un document professionnel et structuré en markdown.
Le document doit :
- Commencer par un en-tête avec : titre du document, "Client : ${clientName}", "Date : ${date}", "Étape : ${stepNumber}"
- Synthétiser les échanges et les décisions prises lors de la conversation
- Être clair et actionnable pour MiKL qui va le valider
- Utiliser un format markdown soigné (headings, listes, etc.)

Génère uniquement le document, sans introduction ni commentaire additionnel.${customInstructions?.trim() ? `\n\n**Instructions supplémentaires :**\n${customInstructions.trim()}` : ''}`
}
