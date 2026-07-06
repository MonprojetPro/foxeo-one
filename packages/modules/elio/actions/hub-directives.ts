'use server'

/**
 * Directives permanentes Élio Hub (mode « Màj Élio » — chantier 2026-07-06).
 *
 * Pattern identique à alert-thresholds.ts : clé `elio_hub_directives` dans
 * system_config, Zod strict, écriture réservée à l'opérateur, lecture avec
 * fallback gracieux (jamais bloquante — l'agent Élio Hub les injecte en
 * best-effort dans son system prompt).
 */

import { randomUUID } from 'node:crypto'
import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { successResponse, errorResponse, type ActionResponse } from '@monprojetpro/types'
import {
  HubDirectivesSchema,
  HubDirectiveTextSchema,
  HUB_DIRECTIVES_KEY,
  MAX_HUB_DIRECTIVES,
  type HubDirective,
} from '../types/hub-directives.types'

type Supa = Awaited<ReturnType<typeof createServerSupabaseClient>>

/** Lecture brute + validation — partagé entre les 3 actions. */
async function readDirectives(supabase: Supa): Promise<HubDirective[]> {
  const { data, error } = await supabase
    .from('system_config')
    .select('value')
    .eq('key', HUB_DIRECTIVES_KEY)
    .maybeSingle()

  if (error || !data) {
    if (error) {
      console.warn('[ELIO:HUB_DIRECTIVES] Lecture system_config KO — fallback [] :', error.message)
    }
    return []
  }

  const parsed = HubDirectivesSchema.safeParse(data.value)
  if (!parsed.success) {
    console.warn(
      '[ELIO:HUB_DIRECTIVES] Valeur elio_hub_directives invalide — fallback [] :',
      parsed.error.issues[0]?.message ?? 'schéma non conforme',
    )
    return []
  }
  return parsed.data
}

/** Garde opérateur — pattern setAlertThresholds (check applicatif + RLS). */
async function requireOperator(
  supabase: Supa,
): Promise<ActionResponse<never> | null> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return errorResponse('Non authentifié', 'UNAUTHORIZED')
  }

  const { data: isOperator } = await supabase.rpc('is_operator')
  if (!isOperator) {
    return errorResponse('Accès réservé aux opérateurs', 'FORBIDDEN')
  }
  return null
}

/**
 * Liste les directives permanentes d'Élio Hub.
 * Fallback gracieux : clé absente / invalide / lecture KO → [] (jamais bloquant,
 * même pattern que getAlertThresholds — l'agent ne doit pas tomber pour ça).
 */
export async function getHubDirectives(): Promise<ActionResponse<HubDirective[]>> {
  try {
    const supabase = await createServerSupabaseClient()
    const directives = await readDirectives(supabase)
    return successResponse<HubDirective[]>(directives)
  } catch (err) {
    console.warn('[ELIO:HUB_DIRECTIVES] Erreur inattendue — fallback [] :', String(err))
    return successResponse<HubDirective[]>([])
  }
}

/**
 * Ajoute une directive permanente (opérateur only).
 * Déterministe et instantané — aucun appel LLM. Retourne la directive créée.
 */
export async function addHubDirective(text: string): Promise<ActionResponse<HubDirective>> {
  const parsed = HubDirectiveTextSchema.safeParse(text)
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message ?? 'Directive invalide'
    return errorResponse(firstError, 'VALIDATION_ERROR', parsed.error.issues)
  }

  try {
    const supabase = await createServerSupabaseClient()

    const guard = await requireOperator(supabase)
    if (guard) return guard

    const current = await readDirectives(supabase)
    if (current.length >= MAX_HUB_DIRECTIVES) {
      return errorResponse(
        `Limite de ${MAX_HUB_DIRECTIVES} directives atteinte — supprime une directive obsolète avant d'en ajouter.`,
        'LIMIT_REACHED',
      )
    }

    const directive: HubDirective = {
      id: randomUUID(),
      text: parsed.data,
      createdAt: new Date().toISOString(),
    }

    const { error } = await supabase
      .from('system_config')
      .upsert({ key: HUB_DIRECTIVES_KEY, value: [...current, directive] }, { onConflict: 'key' })

    if (error) {
      console.error('[ELIO:HUB_DIRECTIVES] upsert error:', error.message)
      return errorResponse("Erreur lors de l'enregistrement de la directive", 'DATABASE_ERROR', error)
    }

    return successResponse<HubDirective>(directive)
  } catch (err) {
    console.error('[ELIO:HUB_DIRECTIVES] Unexpected error:', String(err))
    return errorResponse('Erreur inattendue', 'INTERNAL_ERROR', { message: String(err) })
  }
}

/**
 * Supprime une directive par id (opérateur only).
 * Retourne la liste restante (pratique pour rafraîchir l'UI sans re-fetch).
 */
export async function removeHubDirective(id: string): Promise<ActionResponse<HubDirective[]>> {
  if (!id?.trim()) {
    return errorResponse('id de directive requis', 'VALIDATION_ERROR')
  }

  try {
    const supabase = await createServerSupabaseClient()

    const guard = await requireOperator(supabase)
    if (guard) return guard

    const current = await readDirectives(supabase)
    const remaining = current.filter((d) => d.id !== id)
    if (remaining.length === current.length) {
      return errorResponse('Directive introuvable', 'NOT_FOUND')
    }

    const { error } = await supabase
      .from('system_config')
      .upsert({ key: HUB_DIRECTIVES_KEY, value: remaining }, { onConflict: 'key' })

    if (error) {
      console.error('[ELIO:HUB_DIRECTIVES] upsert error:', error.message)
      return errorResponse('Erreur lors de la suppression de la directive', 'DATABASE_ERROR', error)
    }

    return successResponse<HubDirective[]>(remaining)
  } catch (err) {
    console.error('[ELIO:HUB_DIRECTIVES] Unexpected error:', String(err))
    return errorResponse('Erreur inattendue', 'INTERNAL_ERROR', { message: String(err) })
  }
}
