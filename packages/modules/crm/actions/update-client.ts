'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient } from '@monprojetpro/supabase'
import {
  type ActionResponse,
  successResponse,
  errorResponse,
} from '@monprojetpro/types'
import { updateClientSchema, uuidSchema } from '@monprojetpro/utils'
import type { Client, UpdateClientInput } from '../types/crm.types'

export async function updateClient(
  clientId: string,
  input: UpdateClientInput,
  options?: { updatedAt?: string; force?: boolean }
): Promise<ActionResponse<Client>> {
  try {
    // Validate clientId as UUID
    const uuidResult = uuidSchema.safeParse(clientId)
    if (!uuidResult.success) {
      return errorResponse('Identifiant client invalide', 'VALIDATION_ERROR')
    }

    const supabase = await createServerSupabaseClient()

    // Auth check
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return errorResponse('Non authentifié', 'UNAUTHORIZED')
    }

    // Lookup operator record (operators.id ≠ auth.uid())
    const { data: operator, error: opError } = await supabase
      .from('operators')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()

    if (opError || !operator) {
      return errorResponse('Opérateur non trouvé', 'NOT_FOUND')
    }

    const operatorId = operator.id

    // Server-side validation
    const parsed = updateClientSchema.safeParse(input)
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? 'Données invalides'
      return errorResponse(firstError, 'VALIDATION_ERROR', parsed.error.issues)
    }

    const updateData = parsed.data

    // Check email uniqueness if email is being changed
    if (updateData.email) {
      const { data: existing, error: emailCheckError } = await supabase
        .from('clients')
        .select('id')
        .eq('operator_id', operatorId)
        .eq('email', updateData.email)
        .neq('id', clientId)
        .maybeSingle()

      if (emailCheckError) {
        console.error('[CRM:UPDATE] Email check error:', emailCheckError)
        return errorResponse('Erreur lors de la vérification', 'DB_ERROR', emailCheckError)
      }

      if (existing) {
        return errorResponse(
          'Cet email est déjà associé à un client',
          'EMAIL_ALREADY_EXISTS'
        )
      }
    }

    // Build snake_case update payload
    const dbUpdate: Record<string, unknown> = {}
    if (updateData.firstName !== undefined) dbUpdate.first_name = updateData.firstName || null
    if (updateData.name !== undefined) dbUpdate.name = updateData.name
    if (updateData.email !== undefined) dbUpdate.email = updateData.email
    if (updateData.company !== undefined) dbUpdate.company = updateData.company
    if (updateData.phone !== undefined) dbUpdate.phone = updateData.phone
    if (updateData.sector !== undefined) dbUpdate.sector = updateData.sector
    if (updateData.clientType !== undefined) dbUpdate.client_type = updateData.clientType

    // Update client — double check operator ownership + RLS
    let query = supabase
      .from('clients')
      .update(dbUpdate)
      .eq('id', clientId)
      .eq('operator_id', operatorId)

    // Optimistic lock: check updated_at unless force mode
    if (options?.updatedAt && !options.force) {
      query = query.eq('updated_at', options.updatedAt)
    }

    const { data: clientData, error: updateError } = await query.select().single()

    if (updateError || !clientData) {
      // PGRST116 = no rows found → conflict (updated_at mismatch)
      if (updateError?.code === 'PGRST116' && options?.updatedAt) {
        return errorResponse(
          'Les données ont été modifiées par un autre utilisateur. Veuillez recharger.',
          'CONFLICT'
        )
      }
      console.error('[CRM:UPDATE] Update error:', updateError)
      return errorResponse(
        'Erreur lors de la mise à jour du client',
        'DB_ERROR',
        updateError
      )
    }

    // Transform snake_case → camelCase
    const client: Client = {
      id: clientData.id,
      operatorId: clientData.operator_id,
      name: clientData.name,
      company: clientData.company,
      email: clientData.email,
      clientType: clientData.client_type,
      status: clientData.status,
      sector: clientData.sector ?? undefined,
      phone: clientData.phone ?? undefined,
      website: clientData.website ?? undefined,
      notes: clientData.notes ?? undefined,
      createdAt: clientData.created_at,
      updatedAt: clientData.updated_at,
    }

    // Invalidate Next.js RSC cache for CRM routes
    revalidatePath('/modules/crm')

    return successResponse(client)
  } catch (error) {
    console.error('[CRM:UPDATE] Unexpected error:', error)
    return errorResponse(
      'Une erreur inattendue est survenue',
      'INTERNAL_ERROR',
      error
    )
  }
}
