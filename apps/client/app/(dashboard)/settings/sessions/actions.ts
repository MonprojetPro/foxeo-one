'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { errorResponse, successResponse } from '@monprojetpro/types'
import type { ActionResponse } from '@monprojetpro/types'
import { parseUserAgent, maskIpAddress } from '@monprojetpro/utils'
import type { SessionInfo } from '@monprojetpro/utils'
import { jwtDecode } from './jwt-decode'

/** Raw session row from fn_get_user_sessions RPC */
interface RawSession {
  id: string
  created_at: string
  updated_at: string
  refreshed_at: string | null
  user_agent: string | null
  ip: string | null
  aal: string | null
  not_after: string | null
}

/**
 * Get all active sessions for the current user.
 * Identifies the current session via JWT session_id claim.
 */
export async function getActiveSessionsAction(): Promise<ActionResponse<SessionInfo[]>> {
  const supabase = await createServerSupabaseClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user) {
    return errorResponse('Non authentifie', 'UNAUTHORIZED')
  }

  // Extract current session_id from JWT to mark "current" session in the UI.
  // NOTE: getSession() reads the JWT from cookies WITHOUT server-side validation.
  // This is safe here because getUser() above already validated authentication.
  // The session_id is used solely for UI display (badge "Session courante"), not for
  // any security decision — worst case a forged session_id mislabels the current session.
  const { data: { session } } = await supabase.auth.getSession()
  let currentSessionId: string | null = null
  if (session?.access_token) {
    const decoded = jwtDecode(session.access_token)
    currentSessionId = decoded?.session_id ?? null
  }

  const { data, error } = await supabase.rpc('fn_get_user_sessions', {
    p_user_id: user.id,
  } as never)

  if (error) {
    return errorResponse('Erreur lors du chargement des sessions', 'DB_ERROR', error)
  }

  const rawSessions: RawSession[] = (data as RawSession[] | null) ?? []

  const sessions: SessionInfo[] = rawSessions.map((s) => {
    const parsed = parseUserAgent(s.user_agent ?? '')
    return {
      id: s.id,
      browser: parsed.browser,
      os: parsed.os,
      deviceType: parsed.deviceType,
      ipAddress: maskIpAddress(s.ip ?? ''),
      lastActivity: s.updated_at || s.refreshed_at || s.created_at,
      createdAt: s.created_at,
      isCurrent: s.id === currentSessionId,
    }
  })

  return successResponse(sessions)
}

/**
 * Revoke a specific session (not the current one).
 */
export async function revokeSessionAction(sessionId: string): Promise<ActionResponse<null>> {
  if (!sessionId) {
    return errorResponse('ID de session requis', 'VALIDATION_ERROR')
  }

  const supabase = await createServerSupabaseClient()

  // Verify authentication server-side before calling RPC
  const { error: userError } = await supabase.auth.getUser()
  if (userError) {
    return errorResponse('Non authentifie', 'UNAUTHORIZED')
  }

  const { data, error } = await supabase.rpc('fn_revoke_session', {
    p_session_id: sessionId,
  } as never)

  if (error) {
    return errorResponse('Erreur lors de la revocation de la session', 'REVOKE_ERROR', error)
  }

  const result = data as { success: boolean; error?: string } | null
  if (!result?.success) {
    return errorResponse(result?.error ?? 'Echec de la revocation', 'REVOKE_ERROR')
  }

  return successResponse(null)
}

/**
 * Revoke all sessions except the current one.
 */
export async function revokeOtherSessionsAction(
  currentSessionId: string
): Promise<ActionResponse<{ revokedCount: number }>> {
  if (!currentSessionId) {
    return errorResponse('ID de session courante requis', 'VALIDATION_ERROR')
  }

  const supabase = await createServerSupabaseClient()

  // Verify authentication server-side before calling RPC
  const { error: userError } = await supabase.auth.getUser()
  if (userError) {
    return errorResponse('Non authentifie', 'UNAUTHORIZED')
  }

  const { data, error } = await supabase.rpc('fn_revoke_other_sessions', {
    p_keep_session_id: currentSessionId,
  } as never)

  if (error) {
    return errorResponse('Erreur lors de la revocation des sessions', 'REVOKE_ERROR', error)
  }

  const result = data as { success: boolean; revokedCount?: number; error?: string } | null
  if (!result?.success) {
    return errorResponse(result?.error ?? 'Echec de la revocation', 'REVOKE_ERROR')
  }

  return successResponse({ revokedCount: result.revokedCount ?? 0 })
}
