'use server'

import { z } from 'zod'
import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { errorResponse, successResponse, type ActionResponse } from '@monprojetpro/types'
import type { CustomBranding } from '@monprojetpro/types'

// ─────────────────────────────────────────────────────────────────────────────
// Action client : mise à jour du branding par le client LUI-MÊME (mode One)
// ─────────────────────────────────────────────────────────────────────────────
// Délègue entièrement à la RPC Postgres `update_own_branding` (SECURITY DEFINER).
// La RPC garantit :
//   - que seul le client propriétaire peut modifier (via auth.uid())
//   - que SEULE la colonne custom_branding est touchée
//   - que les champs sont validés côté DB (displayName max 50, HEX, https logoUrl)
//
// Cette action NE vérifie PAS l'opérateur — c'est intentionnel.
// L'isolation est garantie par la RPC, pas par cette action.
// ─────────────────────────────────────────────────────────────────────────────

const UpdateOwnBrandingSchema = z.object({
  logoUrl: z.string().url().nullable().optional(),
  displayName: z.string().max(50, 'Nom affiché : 50 caractères max').nullable().optional(),
  accentColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Couleur hex invalide')
    .nullable()
    .optional(),
})

export async function updateOwnBranding(
  branding: Partial<Omit<CustomBranding, 'updatedAt'>>,
): Promise<ActionResponse<CustomBranding>> {
  const parsed = UpdateOwnBrandingSchema.safeParse(branding)
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message ?? 'Données invalides'
    return errorResponse(firstError, 'VALIDATION_ERROR', parsed.error.issues)
  }

  try {
    const supabase = await createServerSupabaseClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return errorResponse('Non authentifié', 'UNAUTHORIZED')
    }

    // Construire le payload JSONB — on n'inclut QUE les champs présents
    // (null = reset intentionnel, undefined = non fourni → ne pas toucher)
    const payload: Record<string, string | null> = {}
    if ('logoUrl' in parsed.data) payload.logoUrl = parsed.data.logoUrl ?? null
    if ('displayName' in parsed.data) payload.displayName = parsed.data.displayName ?? null
    if ('accentColor' in parsed.data) payload.accentColor = parsed.data.accentColor ?? null

    // Appel RPC SECURITY DEFINER — seul chemin d'écriture autorisé pour un client
    const { data: updatedBranding, error: rpcError } = await supabase.rpc(
      'update_own_branding',
      { p_branding: payload },
    )

    if (rpcError) {
      console.error('[CLIENT:UPDATE_OWN_BRANDING] RPC error:', rpcError)
      // Extraire le message métier depuis l'exception Postgres (ex: "VALIDATION_ERROR: ...")
      const msg = rpcError.message?.includes(':')
        ? rpcError.message.split(':').slice(1).join(':').trim()
        : 'Erreur lors de la mise à jour du branding'
      return errorResponse(msg, 'DATABASE_ERROR', rpcError)
    }

    return successResponse(updatedBranding as CustomBranding)
  } catch (error) {
    console.error('[CLIENT:UPDATE_OWN_BRANDING] Unexpected error:', error)
    return errorResponse('Une erreur inattendue est survenue', 'INTERNAL_ERROR', error)
  }
}
