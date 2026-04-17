'use server'

import { assertOperator } from './assert-operator'
import { successResponse, errorResponse } from '@monprojetpro/types'
import type { ActionResponse } from '@monprojetpro/types'
import type { CollectionReminderWithClient } from '../types/billing.types'

export async function getPendingReminders(): Promise<
  ActionResponse<CollectionReminderWithClient[]>
> {
  const { supabase, error } = await assertOperator()
  if (error || !supabase) return errorResponse(error?.message ?? 'Non authentifié', 'UNAUTHORIZED')

  // Fetch pending reminders avec infos client
  const { data: reminders, error: fetchError } = await supabase
    .from('collection_reminders')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  if (fetchError) {
    return errorResponse('Erreur chargement relances', 'DB_ERROR', fetchError)
  }

  if (!reminders || reminders.length === 0) {
    return successResponse([])
  }

  const clientIds = [...new Set(reminders.map((r) => r.client_id))]

  const { data: clients } = await supabase
    .from('clients')
    .select('id, name, email')
    .in('id', clientIds)

  const { data: profiles } = await supabase
    .from('communication_profiles')
    .select('client_id')
    .in('client_id', clientIds)

  const clientMap = new Map((clients ?? []).map((c) => [c.id, c]))
  const profileClientIds = new Set((profiles ?? []).map((p) => p.client_id))

  const result: CollectionReminderWithClient[] = reminders.map((r) => {
    const client = clientMap.get(r.client_id)
    return {
      ...r,
      client_email: client?.email ?? '',
      client_name: client?.name ?? '',
      has_communication_profile: profileClientIds.has(r.client_id),
    }
  })

  return successResponse(result)
}

export async function getReminderHistory(): Promise<
  ActionResponse<CollectionReminderWithClient[]>
> {
  const { supabase, error } = await assertOperator()
  if (error || !supabase) return errorResponse(error?.message ?? 'Non authentifié', 'UNAUTHORIZED')

  const { data: reminders, error: fetchError } = await supabase
    .from('collection_reminders')
    .select('*')
    .in('status', ['sent', 'cancelled'])
    .order('updated_at', { ascending: false })
    .limit(50)

  if (fetchError) {
    return errorResponse('Erreur chargement historique', 'DB_ERROR', fetchError)
  }

  if (!reminders || reminders.length === 0) {
    return successResponse([])
  }

  const clientIds = [...new Set(reminders.map((r) => r.client_id))]

  const { data: clients } = await supabase
    .from('clients')
    .select('id, name, email')
    .in('id', clientIds)

  const { data: profiles } = await supabase
    .from('communication_profiles')
    .select('client_id')
    .in('client_id', clientIds)

  const clientMap = new Map((clients ?? []).map((c) => [c.id, c]))
  const profileClientIds = new Set((profiles ?? []).map((p) => p.client_id))

  const result: CollectionReminderWithClient[] = reminders.map((r) => {
    const client = clientMap.get(r.client_id)
    return {
      ...r,
      client_email: client?.email ?? '',
      client_name: client?.name ?? '',
      has_communication_profile: profileClientIds.has(r.client_id),
    }
  })

  return successResponse(result)
}
