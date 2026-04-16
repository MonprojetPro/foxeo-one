// Story 13.3 — Actions bloquées en mode impersonation
// Ces actions sont interdites quand un opérateur agit en tant que client

export const IMPERSONATION_BLOCKED_ACTIONS = [
  'change_password',
  'delete_account',
  'update_email',
  'disable_module',
  'delete_document',
  'delete_chat',
  'delete_brief',
  'delete_conversation',
  'archive_client',
  'suspend_client',
  'delete_data',
] as const

export type BlockedAction = (typeof IMPERSONATION_BLOCKED_ACTIONS)[number]

export function isBlockedInImpersonation(action: string): boolean {
  return (IMPERSONATION_BLOCKED_ACTIONS as readonly string[]).includes(action)
}

export const IMPERSONATION_COOKIE_NAME = 'mpro-impersonation-session'

export const IMPERSONATION_MAX_DURATION_MS = 60 * 60 * 1000 // 1 heure

export interface ImpersonationSessionData {
  sessionId: string
  operatorId: string
  clientId: string
  clientAuthUserId: string
  expiresAt: string
}
