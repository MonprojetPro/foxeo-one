'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { successResponse, errorResponse, type ActionResponse } from '@monprojetpro/types'
import type { GmailStatus } from '../types/email.types'

export async function getGmailStatus(): Promise<ActionResponse<GmailStatus>> {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return errorResponse('Non authentifié', 'AUTH_ERROR')

  const { data: integration } = await supabase
    .from('gmail_integrations')
    .select('gmail_email')
    .eq('operator_id', user.id)
    .maybeSingle()

  return successResponse({
    connected: !!integration,
    email: integration?.gmail_email ?? null,
  })
}
