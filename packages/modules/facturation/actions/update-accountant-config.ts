'use server'

import { z } from 'zod'
import { assertOperator } from './assert-operator'
import type { ActionResponse } from '@monprojetpro/types'

// ── Schema ────────────────────────────────────────────────────────────────────

const UpdateAccountantConfigSchema = z.object({
  accountantEmail: z.string().email('Adresse email invalide').or(z.literal('')),
  syncEnabled: z.boolean(),
})

// ============================================================
// updateAccountantConfig — sauvegarde email comptable + flag sync Gmail
// Réservé aux opérateurs (is_operator())
// ============================================================

export async function updateAccountantConfig(
  accountantEmail: string,
  syncEnabled: boolean
): Promise<ActionResponse<{ saved: boolean }>> {
  const { supabase, error: authError } = await assertOperator()
  if (authError || !supabase) return { data: null, error: authError }

  const parsed = UpdateAccountantConfigSchema.safeParse({ accountantEmail, syncEnabled })
  if (!parsed.success) {
    return {
      data: null,
      error: {
        message: parsed.error.issues[0]?.message ?? 'Données invalides',
        code: 'VALIDATION_ERROR',
      },
    }
  }

  const { error: upsertError } = await supabase
    .from('system_config')
    .upsert(
      [
        { key: 'accountant_email', value: JSON.stringify(accountantEmail) },
        { key: 'accountant_email_sync_enabled', value: String(syncEnabled) },
      ],
      { onConflict: 'key' }
    )

  if (upsertError) {
    return {
      data: null,
      error: {
        message: 'Erreur lors de la sauvegarde de la configuration comptable',
        code: 'DB_ERROR',
        details: { message: upsertError.message },
      },
    }
  }

  return { data: { saved: true }, error: null }
}

// ============================================================
// getAccountantConfig — lecture email comptable + flag sync
// ============================================================

export async function getAccountantConfig(): Promise<
  ActionResponse<{ accountantEmail: string; syncEnabled: boolean }>
> {
  const { supabase, error: authError } = await assertOperator()
  if (authError || !supabase) return { data: null, error: authError }

  const { data: rows, error: fetchError } = await supabase
    .from('system_config')
    .select('key, value')
    .in('key', ['accountant_email', 'accountant_email_sync_enabled'])

  if (fetchError) {
    return {
      data: null,
      error: { message: 'Erreur lecture config comptable', code: 'DB_ERROR', details: { message: fetchError.message } },
    }
  }

  const configMap = new Map((rows ?? []).map((r: { key: string; value: unknown }) => [r.key, r.value]))

  const rawEmail = configMap.get('accountant_email')
  let accountantEmail = ''
  if (typeof rawEmail === 'string') {
    try { accountantEmail = JSON.parse(rawEmail) } catch { accountantEmail = rawEmail }
  }

  const rawSync = configMap.get('accountant_email_sync_enabled')
  const syncEnabled = rawSync === 'true' || rawSync === true

  return { data: { accountantEmail, syncEnabled }, error: null }
}
