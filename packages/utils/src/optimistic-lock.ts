import type { SupabaseClient } from '@supabase/supabase-js'
import type { ActionResponse } from '@monprojetpro/types'
import { successResponse, errorResponse } from '@monprojetpro/types'

export async function withOptimisticLock<T>(
  supabase: SupabaseClient,
  table: string,
  id: string,
  originalUpdatedAt: string,
  updateData: Record<string, unknown>,
  options?: { force?: boolean }
): Promise<ActionResponse<T>> {
  let query = supabase
    .from(table)
    .update(updateData)
    .eq('id', id)

  if (!options?.force) {
    query = query.eq('updated_at', originalUpdatedAt)
  }

  const { data, error } = await query.select().single()

  if (error) {
    if (error.code === 'PGRST116') {
      // Distinguish conflict from deletion: if force mode would also fail, record was deleted
      if (!options?.force) {
        return errorResponse(
          'Les données ont été modifiées par un autre utilisateur. Veuillez recharger.',
          'CONFLICT'
        )
      }
      return errorResponse('Enregistrement introuvable', 'NOT_FOUND')
    }
    return errorResponse('Erreur lors de la mise à jour', 'DATABASE_ERROR', error)
  }

  return successResponse(data as T)
}
