'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { type ActionResponse, successResponse, errorResponse } from '@monprojetpro/types'

/**
 * Coaching One+ — configuration des crédits depuis le Hub (Contrat 5, chantier 2026-07-06).
 *
 * Le solde d'un client = SUM(delta) du ledger `coaching_credit_ledger` (fonction SQL
 * `get_coaching_balance`). L'opérateur peut ajuster les crédits/mois (`client_configs.
 * coaching_monthly_credits`) et recharger manuellement (mouvement `manual_adjust`).
 *
 * Server Actions : jamais de throw, retour { data, error }. RLS opérateur sur le ledger.
 */

export interface CoachingLedgerEntry {
  id: string
  delta: number
  reason: 'monthly_accrual' | 'session_booked' | 'manual_adjust' | 'session_cancelled' | 'initial_grant'
  meetingId: string | null
  note: string | null
  createdBy: string
  createdAt: string
}

export interface CoachingCreditsInfo {
  balance: number
  monthlyCredits: number
  elioTier: 'one' | 'one_plus' | null
  recentLedger: CoachingLedgerEntry[]
}

interface LedgerRowDB {
  id: string
  delta: number
  reason: CoachingLedgerEntry['reason']
  meeting_id: string | null
  note: string | null
  created_by: string
  created_at: string
}

const ClientIdSchema = z.string().uuid('ID client invalide')

const SetMonthlyCreditsSchema = z.object({
  clientId: ClientIdSchema,
  monthlyCredits: z.number().int('Nombre entier requis').min(0, 'Minimum 0').max(30, 'Maximum 30'),
})

const AddCreditsSchema = z.object({
  clientId: ClientIdSchema,
  amount: z
    .number()
    .int('Nombre entier requis')
    .min(-50, 'Minimum -50')
    .max(50, 'Maximum 50')
    .refine((n) => n !== 0, 'Le nombre de crédits ne peut pas être 0'),
  note: z.string().max(500).optional(),
})

/** Auth + lookup opérateur + vérification que le client lui appartient. */
async function resolveOperatorForClient(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  clientId: string
): Promise<ActionResponse<{ operatorId: string }>> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return errorResponse('Non authentifié', 'UNAUTHORIZED')
  }

  const { data: operator, error: opError } = await supabase
    .from('operators')
    .select('id')
    .eq('auth_user_id', user.id)
    .single()

  if (opError || !operator) {
    return errorResponse('Opérateur non trouvé', 'NOT_FOUND')
  }

  const { data: client, error: clientError } = await supabase
    .from('clients')
    .select('id')
    .eq('id', clientId)
    .eq('operator_id', operator.id)
    .single()

  if (clientError || !client) {
    return errorResponse('Client introuvable ou accès non autorisé', 'NOT_FOUND')
  }

  return successResponse({ operatorId: operator.id })
}

/**
 * Solde + crédits mensuels + 10 derniers mouvements du ledger (fiche client Hub).
 */
export async function getCoachingCreditsInfo(
  clientId: string
): Promise<ActionResponse<CoachingCreditsInfo>> {
  try {
    const parsed = ClientIdSchema.safeParse(clientId)
    if (!parsed.success) {
      return errorResponse('ID client invalide', 'INVALID_INPUT')
    }

    const supabase = await createServerSupabaseClient()
    const auth = await resolveOperatorForClient(supabase, parsed.data)
    if (auth.error) {
      return errorResponse(auth.error.message, auth.error.code)
    }

    const [balanceResult, configResult, ledgerResult] = await Promise.all([
      supabase.rpc('get_coaching_balance', { p_client_id: parsed.data }),
      supabase
        .from('client_configs')
        .select('coaching_monthly_credits, elio_tier')
        .eq('client_id', parsed.data)
        .maybeSingle(),
      supabase
        .from('coaching_credit_ledger')
        .select('id, delta, reason, meeting_id, note, created_by, created_at')
        .eq('client_id', parsed.data)
        .order('created_at', { ascending: false })
        .limit(10),
    ])

    if (balanceResult.error) {
      console.error('[CRM:COACHING_CREDITS] Balance error:', balanceResult.error)
      return errorResponse('Erreur lors du calcul du solde', 'DATABASE_ERROR', balanceResult.error)
    }

    if (ledgerResult.error) {
      console.error('[CRM:COACHING_CREDITS] Ledger error:', ledgerResult.error)
      return errorResponse('Erreur lors du chargement de l\'historique', 'DATABASE_ERROR', ledgerResult.error)
    }

    const config = configResult.data as
      | { coaching_monthly_credits: number | null; elio_tier: 'one' | 'one_plus' | null }
      | null

    const recentLedger: CoachingLedgerEntry[] = ((ledgerResult.data ?? []) as LedgerRowDB[]).map(
      (row) => ({
        id: row.id,
        delta: row.delta,
        reason: row.reason,
        meetingId: row.meeting_id,
        note: row.note,
        createdBy: row.created_by,
        createdAt: row.created_at,
      })
    )

    return successResponse<CoachingCreditsInfo>({
      balance: typeof balanceResult.data === 'number' ? balanceResult.data : 0,
      monthlyCredits: config?.coaching_monthly_credits ?? 1,
      elioTier: config?.elio_tier ?? null,
      recentLedger,
    })
  } catch (error) {
    console.error('[CRM:COACHING_CREDITS] Unexpected error:', error)
    return errorResponse('Une erreur inattendue est survenue', 'INTERNAL_ERROR', error)
  }
}

/**
 * Modifie le nombre de crédits coaching accordés chaque mois à ce client.
 */
export async function setCoachingMonthlyCredits(
  clientId: string,
  monthlyCredits: number
): Promise<ActionResponse<{ monthlyCredits: number }>> {
  try {
    const parsed = SetMonthlyCreditsSchema.safeParse({ clientId, monthlyCredits })
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? 'Données invalides'
      return errorResponse(firstError, 'INVALID_INPUT', parsed.error.issues)
    }

    const supabase = await createServerSupabaseClient()
    const auth = await resolveOperatorForClient(supabase, parsed.data.clientId)
    if (auth.error || !auth.data) {
      return errorResponse(auth.error?.message ?? 'Non autorisé', auth.error?.code ?? 'UNAUTHORIZED')
    }

    const { error: updateError } = await supabase
      .from('client_configs')
      .update({ coaching_monthly_credits: parsed.data.monthlyCredits })
      .eq('client_id', parsed.data.clientId)

    if (updateError) {
      console.error('[CRM:COACHING_CREDITS] Update monthly credits error:', updateError)
      return errorResponse('Erreur lors de la mise à jour', 'DATABASE_ERROR', updateError)
    }

    // Trace (non bloquant)
    await supabase.from('activity_logs').insert({
      actor_type: 'operator',
      actor_id: auth.data.operatorId,
      action: 'coaching_monthly_credits_updated',
      entity_type: 'client',
      entity_id: parsed.data.clientId,
      metadata: { monthlyCredits: parsed.data.monthlyCredits },
    })

    revalidatePath(`/modules/crm/clients/${parsed.data.clientId}`)

    return successResponse({ monthlyCredits: parsed.data.monthlyCredits })
  } catch (error) {
    console.error('[CRM:COACHING_CREDITS] Unexpected error:', error)
    return errorResponse('Une erreur inattendue est survenue', 'INTERNAL_ERROR', error)
  }
}

/**
 * Recharge (ou retire) manuellement des crédits coaching — mouvement `manual_adjust`.
 */
export async function addCoachingCredits(
  clientId: string,
  amount: number,
  note?: string
): Promise<ActionResponse<{ balance: number }>> {
  try {
    const parsed = AddCreditsSchema.safeParse({ clientId, amount, note })
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? 'Données invalides'
      return errorResponse(firstError, 'INVALID_INPUT', parsed.error.issues)
    }

    const supabase = await createServerSupabaseClient()
    const auth = await resolveOperatorForClient(supabase, parsed.data.clientId)
    if (auth.error || !auth.data) {
      return errorResponse(auth.error?.message ?? 'Non autorisé', auth.error?.code ?? 'UNAUTHORIZED')
    }

    const { error: insertError } = await supabase.from('coaching_credit_ledger').insert({
      client_id: parsed.data.clientId,
      delta: parsed.data.amount,
      reason: 'manual_adjust',
      note: parsed.data.note?.trim() || null,
      created_by: `operator:${auth.data.operatorId}`,
    })

    if (insertError) {
      console.error('[CRM:COACHING_CREDITS] Ledger insert error:', insertError)
      return errorResponse('Erreur lors de l\'ajout des crédits', 'DATABASE_ERROR', insertError)
    }

    const { data: balance, error: balanceError } = await supabase.rpc('get_coaching_balance', {
      p_client_id: parsed.data.clientId,
    })

    if (balanceError) {
      console.error('[CRM:COACHING_CREDITS] Balance after adjust error:', balanceError)
      // L'insert a réussi — on ne fait pas échouer l'action pour un solde non relu
    }

    // Trace (non bloquant)
    await supabase.from('activity_logs').insert({
      actor_type: 'operator',
      actor_id: auth.data.operatorId,
      action: 'coaching_credits_adjusted',
      entity_type: 'client',
      entity_id: parsed.data.clientId,
      metadata: { amount: parsed.data.amount, note: parsed.data.note ?? null },
    })

    revalidatePath(`/modules/crm/clients/${parsed.data.clientId}`)

    return successResponse({ balance: typeof balance === 'number' ? balance : 0 })
  } catch (error) {
    console.error('[CRM:COACHING_CREDITS] Unexpected error:', error)
    return errorResponse('Une erreur inattendue est survenue', 'INTERNAL_ERROR', error)
  }
}
