'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { successResponse, errorResponse, type ActionResponse } from '@monprojetpro/types'
import { toCamelCase } from '@monprojetpro/utils'
import type { DashboardType, ElioConversation } from '../types/elio.types'

const GRADUATION_WELCOME_DAYS = 7

const GRADUATION_WELCOME_TEMPLATE = {
  formal:
    "Félicitations pour la fin de votre parcours Lab ! Je suis Élio One, votre nouvel assistant. Je connais déjà votre projet grâce à votre parcours — n'hésitez pas à me poser des questions sur vos outils.",
  casual:
    "Félicitations pour la fin de ton parcours Lab ! Je suis Élio One, ton nouvel assistant. Je connais déjà ton projet grâce à ton parcours — hésite pas à me poser des questions sur tes outils.",
}

/**
 * Vérifie si un client a été gradué dans les N derniers jours.
 */
function isRecentlyGraduated(graduatedAt: string | null, days: number): boolean {
  if (!graduatedAt) return false
  const graduationDate = new Date(graduatedAt)
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - days)
  return graduationDate >= cutoff
}

/**
 * Server Action — Crée une nouvelle conversation Élio.
 * L'ancienne conversation n'est PAS supprimée (AC3).
 *
 * Pour les clients One récemment gradués (graduated_at < 7 jours) et leur
 * première conversation One, insère un message d'accueil contextuel (Story 9.2 AC3).
 * Retourne toujours { data, error } — jamais throw.
 */
export async function newConversation(
  dashboardType: DashboardType
): Promise<ActionResponse<ElioConversation>> {
  const supabase = await createServerSupabaseClient()

  const { data: user, error: authError } = await supabase.auth.getUser()
  if (authError || !user.user) {
    return errorResponse('Utilisateur non authentifié', 'AUTH_ERROR')
  }

  // Guard : Élio Lab doit être activé (ADR-01 Révision 2)
  // MiKL peut désactiver elio_lab_enabled après graduation — dans ce cas,
  // le client ne peut plus créer de nouvelle conversation Lab.
  if (dashboardType === 'lab') {
    const { data: clientRow } = await supabase
      .from('clients')
      .select('id')
      .eq('auth_user_id', user.user.id)
      .maybeSingle()

    if (clientRow) {
      const { data: config } = await supabase
        .from('client_configs')
        .select('elio_lab_enabled')
        .eq('client_id', clientRow.id)
        .maybeSingle()

      if (config && config.elio_lab_enabled === false) {
        return errorResponse(
          'Élio Lab est désactivé pour ce client. Contactez MiKL pour le réactiver.',
          'ELIO_LAB_DISABLED'
        )
      }
    }
  }

  const { data, error } = await supabase
    .from('elio_conversations')
    .insert({
      user_id: user.user.id,
      dashboard_type: dashboardType,
      title: 'Nouvelle conversation',
    })
    .select()
    .single()

  if (error) {
    return errorResponse('Erreur lors de la création de la conversation', 'DB_ERROR', error)
  }

  const conversation = toCamelCase(data) as unknown as ElioConversation

  // Story 9.2 AC3 — Message d'accueil post-graduation pour les clients One récemment gradués
  if (dashboardType === 'one') {
    await insertGraduationWelcomeIfNeeded(supabase, user.user.id, data.id)
  }

  return successResponse(conversation)
}

/**
 * Insère un message d'accueil Élio One post-graduation si :
 * - Le client a été gradué dans les 7 derniers jours
 * - C'est sa première conversation One
 */
async function insertGraduationWelcomeIfNeeded(
  supabase: Awaited<ReturnType<typeof import('@monprojetpro/supabase').createServerSupabaseClient>>,
  authUserId: string,
  conversationId: string
): Promise<void> {
  try {
    // Vérifier si le client est récemment gradué
    const { data: client } = await supabase
      .from('clients')
      .select('id, graduated_at')
      .eq('auth_user_id', authUserId)
      .maybeSingle()

    if (!client || !isRecentlyGraduated(client.graduated_at, GRADUATION_WELCOME_DAYS)) {
      return
    }

    // Vérifier si c'est la première conversation One (count = 1 après insertion)
    const { count } = await supabase
      .from('elio_conversations')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', authUserId)
      .eq('dashboard_type', 'one')

    if ((count ?? 0) > 1) {
      return
    }

    // Charger le profil de communication pour adapter le ton
    const { data: profile } = await supabase
      .from('communication_profiles')
      .select('tutoiement')
      .eq('client_id', client.id)
      .maybeSingle()

    const tutoiement = profile?.tutoiement ?? false
    const content = tutoiement
      ? GRADUATION_WELCOME_TEMPLATE.casual
      : GRADUATION_WELCOME_TEMPLATE.formal

    // Insérer le message système d'accueil
    await supabase.from('elio_messages').insert({
      conversation_id: conversationId,
      role: 'assistant',
      content,
      metadata: { isSystemWelcome: true, graduationWelcome: true },
    })
  } catch (err) {
    // Non-bloquant : erreur loggée mais ne bloque pas la création de conversation
    console.error('[ELIO:NEW_CONVERSATION:GRADUATION_WELCOME] Error:', err)
  }
}
