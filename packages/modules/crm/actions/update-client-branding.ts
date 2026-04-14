'use server'

import { z } from 'zod'
import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { errorResponse, successResponse, type ActionResponse } from '@monprojetpro/types'
import type { CustomBranding } from '@monprojetpro/types'

const UpdateBrandingSchema = z.object({
  clientId: z.string().uuid('ID client invalide'),
  logoUrl: z.string().url().nullable().optional(),
  displayName: z.string().max(50, 'Nom affiché : 50 caractères max').nullable().optional(),
  accentColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Couleur hex invalide')
    .nullable()
    .optional(),
})

export async function updateClientBranding(
  clientId: string,
  branding: Partial<Omit<CustomBranding, 'updatedAt'>>,
): Promise<ActionResponse<CustomBranding>> {
  const parsed = UpdateBrandingSchema.safeParse({ clientId, ...branding })
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

    const { data: operator, error: opError } = await supabase
      .from('operators')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()

    if (opError || !operator) {
      return errorResponse('Opérateur non trouvé', 'NOT_FOUND')
    }

    // Verify client belongs to operator
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('id, name, operator_id')
      .eq('id', clientId)
      .eq('operator_id', operator.id)
      .single()

    if (clientError || !client) {
      return errorResponse('Client introuvable', 'NOT_FOUND')
    }

    // Fetch current branding
    const { data: config, error: configError } = await supabase
      .from('client_configs')
      .select('id, custom_branding')
      .eq('client_id', clientId)
      .single()

    if (configError || !config) {
      return errorResponse('Configuration client introuvable', 'NOT_FOUND')
    }

    const current = (config.custom_branding as Record<string, unknown>) ?? {}
    const { clientId: _cid, ...brandingFields } = parsed.data

    const updatedBranding: CustomBranding = {
      logoUrl: brandingFields.logoUrl !== undefined ? brandingFields.logoUrl ?? null : (current.logoUrl as string | null) ?? null,
      displayName: brandingFields.displayName !== undefined ? brandingFields.displayName ?? null : (current.displayName as string | null) ?? null,
      accentColor: brandingFields.accentColor !== undefined ? brandingFields.accentColor ?? null : (current.accentColor as string | null) ?? null,
      updatedAt: new Date().toISOString(),
    }

    const { error: updateError } = await supabase
      .from('client_configs')
      .update({ custom_branding: updatedBranding })
      .eq('id', config.id)

    if (updateError) {
      console.error('[CRM:UPDATE_BRANDING] Update error:', updateError)
      return errorResponse('Erreur lors de la mise à jour du branding', 'DATABASE_ERROR', updateError)
    }

    // Activity log (non-fatal)
    const { error: logError } = await supabase.from('activity_logs').insert({
      actor_type: 'operator',
      actor_id: operator.id,
      action: 'branding_updated',
      entity_type: 'client',
      entity_id: clientId,
      metadata: {
        displayName: updatedBranding.displayName,
        hasLogo: updatedBranding.logoUrl !== null,
        accentColor: updatedBranding.accentColor,
      },
    })

    if (logError) {
      console.error('[CRM:UPDATE_BRANDING] Activity log error:', logError)
    }

    return successResponse(updatedBranding)
  } catch (error) {
    console.error('[CRM:UPDATE_BRANDING] Unexpected error:', error)
    return errorResponse('Une erreur inattendue est survenue', 'INTERNAL_ERROR', error)
  }
}
