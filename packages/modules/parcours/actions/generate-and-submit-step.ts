'use server'

import { createServerSupabaseClient, checkClientWriteAllowed } from '@monprojetpro/supabase'
import { type ActionResponse, successResponse, errorResponse } from '@monprojetpro/types'
import { OPERATOR_IDENTITY_RULE } from '@monprojetpro/utils'
import { getEffectiveElioConfig } from './get-effective-elio-config'

const MAX_MESSAGES = 30
const ELIO_CHAT_FUNCTION = 'elio-chat'

/**
 * Plafond de rédaction par appel. L'ancienne valeur (2000) coupait les documents
 * en pleine phrase : un livrable de parcours avec ses tableaux dépasse largement
 * les ~1400 mots correspondants. 8192 est la valeur par défaut de l'Edge Function
 * elio-chat — on s'aligne dessus au lieu de la sous-plafonner en silence.
 */
const DEFAULT_MAX_TOKENS = 8192

/** Relances autorisées quand le modèle est coupé — 3 × 8192 tokens couvrent tous les cas observés. */
const MAX_CONTINUATIONS = 2

/**
 * Demande la suite d'un document tronqué. On renvoie la consigne d'origine (pour que
 * le ton et la structure restent identiques) puis la fin de ce qui a déjà été écrit,
 * qui sert de point de raccord. On n'envoie pas le document entier : inutile, et ça
 * gonflerait le contexte à chaque relance.
 */
function buildContinuationPrompt(originalPrompt: string, partialDocument: string): string {
  const tail = partialDocument.slice(-2000)
  return `${originalPrompt}

---

**Tu as déjà commencé ce document, mais ta réponse a été coupée avant la fin.**
Voici la fin de ce qui a été rédigé :

<<<
${tail}
>>>

Reprends EXACTEMENT là où la rédaction s'est arrêtée et termine le document.
Ne répète pas ce qui précède, ne réécris pas l'en-tête, n'ajoute aucun commentaire :
écris uniquement la suite, en gardant le même ton et le même format markdown.`
}

/**
 * Recolle un fragment de continuation au document.
 *
 * La coupure tombe presque toujours en plein milieu d'un mot ou d'une ligne. Si le
 * fragment commence par une ponctuation ou une minuscule, c'est la suite immédiate
 * de la phrase : on colle sans rien insérer. Sinon, c'est un nouveau bloc et on
 * rétablit le saut de paragraphe attendu par le markdown.
 */
function joinContinuation(document: string, chunk: string): string {
  const cleanChunk = chunk.replace(/^\s+/, '')
  const startsNewBlock = /^([#\-*>|]|\d+\.)/.test(cleanChunk) || /^[A-ZÀ-Þ]/.test(cleanChunk)

  return startsNewBlock
    ? `${document.replace(/\s+$/, '')}\n\n${cleanChunk}`
    : `${document}${cleanChunk}`
}

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

    // Espace figé — générer un livrable produit du nouveau contenu de parcours :
    // interdit à un client qui a résilié (son espace est consultable, pas modifiable).
    const readOnly = await checkClientWriteAllowed()
    if (readOnly) return { data: null, error: readOnly }

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

    const systemPrompt =
      // Le document parle de MiKL (« actionnable pour MiKL qui va le valider ») : la règle
      // d'identité évite qu'il soit rédigé au féminin une fois sur N.
      'Tu es Élio, un assistant IA expert en rédaction de documents professionnels structurés en markdown.' +
      OPERATOR_IDENTITY_RULE

    const model = config?.model ?? 'claude-sonnet-4-6'
    const maxTokens = config?.maxTokens ?? DEFAULT_MAX_TOKENS
    const temperature = config?.temperature ?? 1.0

    // Appel via Edge Function elio-chat — clé Anthropic gérée côté Supabase secrets
    const first = await supabase.functions.invoke(ELIO_CHAT_FUNCTION, {
      body: { systemPrompt, message: prompt, model, maxTokens, temperature },
    })

    if (first.error) {
      console.error('[PARCOURS:GENERATE_DOC] Edge function error:', first.error)
      return errorResponse('Service IA indisponible', 'API_ERROR', { message: first.error.message })
    }

    let lastResponse = first.data
    let document: string = lastResponse?.content ?? ''

    if (!document.trim()) {
      return errorResponse('Élio n\'a pas pu générer le document — veuillez réessayer', 'API_ERROR')
    }

    // Reprise sur troncature — l'Edge Function renvoie `stopReason: 'max_tokens'` quand le
    // modèle a été coupé net en cours de rédaction. Ce champ existait déjà mais n'était lu
    // par personne : les documents partaient amputés en plein milieu d'une phrase, sans que
    // ni le client ni MiKL n'en soient avertis (constat MiKL du 2026-08-02). On relance donc
    // la rédaction là où elle s'est arrêtée, en recollant les morceaux.
    let continuations = 0
    while (lastResponse?.stopReason === 'max_tokens' && continuations < MAX_CONTINUATIONS) {
      continuations += 1
      const next = await supabase.functions.invoke(ELIO_CHAT_FUNCTION, {
        body: {
          systemPrompt,
          message: buildContinuationPrompt(prompt, document),
          model,
          maxTokens,
          temperature,
        },
      })

      // Une continuation qui échoue n'annule pas le document déjà produit : on garde ce
      // qu'on a plutôt que de tout perdre, et on sort de la boucle.
      const chunk: string = next.data?.content ?? ''
      if (next.error || !chunk.trim()) {
        console.error('[PARCOURS:GENERATE_DOC] Continuation échouée:', next.error?.message ?? 'contenu vide')
        break
      }

      document = joinContinuation(document, chunk)
      lastResponse = next.data
    }

    console.log(
      '[PARCOURS:GENERATE_DOC] Document généré pour step:', input.stepId,
      '| longueur:', document.length,
      '| continuations:', continuations,
    )

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
