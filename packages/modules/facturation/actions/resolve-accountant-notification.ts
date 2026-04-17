'use server'

import { z } from 'zod'
import { assertOperator } from './assert-operator'
import type { ActionResponse } from '@monprojetpro/types'

// ── Schema ────────────────────────────────────────────────────────────────────

const ResolveSchema = z.object({
  notificationId: z.string().uuid('ID notification invalide'),
})

// ============================================================
// resolveAccountantNotification — passe le statut à 'resolved'
// Réservé aux opérateurs (is_operator())
// ============================================================

// ============================================================
// getAccountantNotifications — liste les notifications actives (non résolues)
// Triées par date desc. Réservé aux opérateurs.
// ============================================================

export interface AccountantNotificationRow {
  id: string
  type: 'missing_receipt' | 'info_request' | 'other'
  title: string
  body: string | null
  source_email: string | null
  status: 'unread' | 'read' | 'resolved'
  created_at: string
}

export async function getAccountantNotifications(): Promise<ActionResponse<AccountantNotificationRow[]>> {
  const { supabase, error: authError } = await assertOperator()
  if (authError || !supabase) return { data: null, error: authError }

  const { data, error: fetchError } = await supabase
    .from('accountant_notifications')
    .select('id, type, title, body, source_email, status, created_at')
    .neq('status', 'resolved')
    .order('created_at', { ascending: false })

  if (fetchError) {
    return {
      data: null,
      error: { message: 'Erreur chargement notifications comptable', code: 'DB_ERROR', details: { message: fetchError.message } },
    }
  }

  return { data: data ?? [], error: null }
}

// ============================================================
// resolveAccountantNotification — passe le statut à 'resolved'
// Réservé aux opérateurs (is_operator())
// ============================================================

export async function resolveAccountantNotification(
  notificationId: string
): Promise<ActionResponse<{ resolved: boolean }>> {
  const { supabase, error: authError } = await assertOperator()
  if (authError || !supabase) return { data: null, error: authError }

  const parsed = ResolveSchema.safeParse({ notificationId })
  if (!parsed.success) {
    return {
      data: null,
      error: {
        message: parsed.error.issues[0]?.message ?? 'ID invalide',
        code: 'VALIDATION_ERROR',
      },
    }
  }

  const { error: updateError } = await supabase
    .from('accountant_notifications')
    .update({ status: 'resolved' })
    .eq('id', notificationId)

  if (updateError) {
    return {
      data: null,
      error: {
        message: 'Erreur lors de la mise à jour du statut',
        code: 'DB_ERROR',
        details: { message: updateError.message },
      },
    }
  }

  return { data: { resolved: true }, error: null }
}
