'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { successResponse, errorResponse, type ActionResponse } from '@monprojetpro/types'
import { toCamelCase } from '@monprojetpro/utils'
import type { DashboardType, ElioMessagePersisted } from '../types/elio.types'

const WELCOME_MESSAGES: Record<DashboardType, { formal: string; casual: string }> = {
  hub: {
    formal: "Bonjour MiKL ! Je suis Élio Hub, votre assistant. Je peux vous aider à naviguer dans le Hub, chercher des infos clients, corriger vos textes ou générer des brouillons. Comment puis-je vous aider ?",
    casual: "Hey MiKL ! Je suis Élio Hub, ton assistant. Je peux t'aider à naviguer dans le Hub, chercher des infos clients, corriger tes textes ou générer des brouillons. Qu'est-ce que tu veux faire ?",
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

export async function getWelcomeMessage(
  dashboardType: DashboardType,
  tutoiement: boolean,
  customGreeting?: string
): Promise<string> {
  // Task 2.1 — utiliser le greeting custom si fourni (Story 6.6 / Orpheus config)
  if (customGreeting?.trim()) {
    return customGreeting.trim()
  }
  return tutoiement
    ? WELCOME_MESSAGES[dashboardType].casual
    : WELCOME_MESSAGES[dashboardType].formal
}

/**
 * Server Action — Génère et persiste le message d'accueil Élio pour une nouvelle conversation.
 * Adapte le ton selon le profil de communication (tutoiement/vouvoiement).
 * Si customGreeting fourni, l'utilise à la place du message par défaut (AC1 Story 8.7).
 * Retourne toujours { data, error } — jamais throw.
 */
export async function generateWelcomeMessage(
  conversationId: string,
  dashboardType: DashboardType,
  tutoiement: boolean = false,
  customGreeting?: string
): Promise<ActionResponse<ElioMessagePersisted>> {
  if (!conversationId) {
    return errorResponse('conversationId requis', 'VALIDATION_ERROR')
  }

  const supabase = await createServerSupabaseClient()

  const content = await getWelcomeMessage(dashboardType, tutoiement, customGreeting)

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
