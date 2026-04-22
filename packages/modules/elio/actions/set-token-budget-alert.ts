'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { successResponse, errorResponse, type ActionResponse } from '@monprojetpro/types'
import { z } from 'zod'

const SetBudgetAlertInput = z.object({
  budgetEur: z.number().positive('Le budget doit être supérieur à 0'),
})

export interface BudgetAlertConfig {
  budgetEur: number
}

/** Clé system_config pour le seuil de budget IA mensuel (interne — non exportée depuis 'use server') */
const BUDGET_ALERT_KEY = 'elio_monthly_budget_eur'

/**
 * Sauvegarde le seuil de budget IA mensuel dans system_config.
 * Une notification Hub est déclenchée à 80% du seuil.
 */
export async function setTokenBudgetAlert(
  budgetEur: number,
): Promise<ActionResponse<BudgetAlertConfig>> {
  const parsed = SetBudgetAlertInput.safeParse({ budgetEur })
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message ?? 'Budget invalide'
    return errorResponse(firstError, 'VALIDATION_ERROR', parsed.error.issues)
  }

  try {
    const supabase = await createServerSupabaseClient()

    const { error } = await supabase
      .from('system_config')
      .upsert({ key: BUDGET_ALERT_KEY, value: parsed.data.budgetEur }, { onConflict: 'key' })

    if (error) {
      console.error('[ELIO:BUDGET_ALERT] upsert error:', error.message)
      return errorResponse('Erreur lors de la sauvegarde du budget', 'DATABASE_ERROR', error)
    }

    return successResponse<BudgetAlertConfig>({ budgetEur: parsed.data.budgetEur })
  } catch (err) {
    console.error('[ELIO:BUDGET_ALERT] Unexpected error:', String(err))
    return errorResponse('Erreur inattendue', 'INTERNAL_ERROR', { message: String(err) })
  }
}

/**
 * Lit le seuil de budget IA mensuel depuis system_config.
 * Retourne null si non configuré.
 */
export async function getTokenBudgetAlert(): Promise<ActionResponse<BudgetAlertConfig | null>> {
  try {
    const supabase = await createServerSupabaseClient()

    const { data, error } = await supabase
      .from('system_config')
      .select('value')
      .eq('key', BUDGET_ALERT_KEY)
      .maybeSingle()

    if (error) {
      return errorResponse('Erreur chargement budget', 'DATABASE_ERROR', error)
    }

    if (!data) {
      return successResponse<BudgetAlertConfig | null>(null)
    }

    const budgetEur = typeof data.value === 'number' ? data.value : Number(data.value)
    return successResponse<BudgetAlertConfig | null>({ budgetEur })
  } catch (err) {
    return errorResponse('Erreur inattendue', 'INTERNAL_ERROR', { message: String(err) })
  }
}
