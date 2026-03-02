'use server'

import { createServerSupabaseClient } from '@foxeo/supabase'
import { successResponse, errorResponse, type ActionResponse } from '@foxeo/types'
import { toCamelCase } from '@foxeo/utils'
import type { DashboardType, ElioMessagePersisted } from '../types/elio.types'

const WELCOME_MESSAGES: Record<DashboardType, { formal: string; casual: string }> = {
  hub: {
    formal: "Bonjour MiKL ! Je suis Élio Hub, votre assistant. Comment puis-je vous aider aujourd'hui ?",
    casual: "Hey MiKL ! Qu'est-ce que je peux faire pour toi ?",
  },
  lab: {
    formal: 'Bonjour ! Bienvenue sur Élio Lab. Comment puis-je vous accompagner dans votre parcours ?',
    casual: 'Salut ! On reprend ton parcours ? Sur quoi tu veux bosser ?',
  },
  one: {
    formal: "Bonjour ! Je suis Élio, votre assistant. Comment puis-je vous aider aujourd'hui ?",
    casual: "Salut ! Comment je peux t'aider aujourd'hui ?",
  },
}

export function getWelcomeMessage(dashboardType: DashboardType, tutoiement: boolean): string {
  return tutoiement
    ? WELCOME_MESSAGES[dashboardType].casual
    : WELCOME_MESSAGES[dashboardType].formal
}

/**
 * Server Action — Génère et persiste le message d'accueil Élio pour une nouvelle conversation.
 * Adapte le ton selon le profil de communication (tutoiement/vouvoiement).
 * Retourne toujours { data, error } — jamais throw.
 */
export async function generateWelcomeMessage(
  conversationId: string,
  dashboardType: DashboardType,
  tutoiement: boolean = false
): Promise<ActionResponse<ElioMessagePersisted>> {
  if (!conversationId) {
    return errorResponse('conversationId requis', 'VALIDATION_ERROR')
  }

  const supabase = await createServerSupabaseClient()

  const content = getWelcomeMessage(dashboardType, tutoiement)

  const { data, error } = await supabase
    .from('elio_messages')
    .insert({
      conversation_id: conversationId,
      role: 'assistant',
      content,
      metadata: {},
    })
    .select()
    .single()

  if (error) {
    return errorResponse("Erreur lors de la création du message d'accueil", 'DB_ERROR', error)
  }

  const message = toCamelCase(data) as unknown as ElioMessagePersisted
  return successResponse(message)
}
