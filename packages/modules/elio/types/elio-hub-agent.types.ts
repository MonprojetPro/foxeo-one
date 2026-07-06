/**
 * Types de la boucle agent Élio Hub (Contrats 3 & 4 — chantier Élio Hub 2026-07-06).
 *
 * Les blocs Anthropic (text / tool_use / tool_result) sont un MIROIR des types de
 * l'Edge Function `elio-chat` (supabase/functions/elio-chat/provider-adapter.ts) —
 * on ne peut pas importer un fichier Deno depuis Next.js. Garder les deux en phase.
 *
 * Fichier NON-'use server' : types + constantes uniquement (un export const dans
 * un fichier 'use server' casse next build).
 */

// ── Blocs Anthropic natifs (Contrat 1 — format accepté par l'Edge Function) ──

export interface AnthropicTextBlock {
  type: 'text'
  text: string
}

export interface AnthropicToolUseBlock {
  type: 'tool_use'
  id: string
  name: string
  input: Record<string, unknown>
}

export interface AnthropicToolResultBlock {
  type: 'tool_result'
  tool_use_id: string
  content?: string
  is_error?: boolean
}

export type AnthropicContentBlock =
  | AnthropicTextBlock
  | AnthropicToolUseBlock
  | AnthropicToolResultBlock

export interface AnthropicMessage {
  role: 'user' | 'assistant'
  content: string | AnthropicContentBlock[]
}

export interface AnthropicTool {
  name: string
  description?: string
  input_schema: Record<string, unknown>
}

/** Réponse unifiée de l'Edge Function elio-chat v2 (Contrat 1). */
export interface ElioChatUnifiedResponse {
  content: string
  toolCalls: Array<{ id: string; name: string; input: Record<string, unknown> }>
  stopReason: string
  model: string
  inputTokens: number
  outputTokens: number
}

// ── Table elio_hub_actions (Contrat 3) ───────────────────────────────────────

export type ElioHubActionStatus =
  | 'pending'
  | 'confirmed'
  | 'rejected'
  | 'executed'
  | 'failed'
  | 'auto_executed'

export interface ElioHubAction {
  id: string
  operatorId: string
  conversationId: string | null
  toolName: string
  toolInput: Record<string, unknown>
  summary: string
  status: ElioHubActionStatus
  result: Record<string, unknown> | null
  error: string | null
  createdAt: string
  decidedAt: string | null
  executedAt: string | null
}

// ── Résultat de la boucle agent (Contrat 4) ───────────────────────────────────

/** Proposition d'action retournée au chat après un tour d'agent. */
export interface HubAgentPendingAction {
  id: string
  toolName: string
  summary: string
  status: Extract<ElioHubActionStatus, 'pending' | 'auto_executed' | 'failed'>
  input: Record<string, unknown>
}

export interface HubAgentResult {
  content: string
  pendingActions: HubAgentPendingAction[]
  /** Noms des outils réellement appelés pendant la génération (affichage discret). */
  toolsUsed: string[]
  conversationId: string
}

// ── Noms d'outils ─────────────────────────────────────────────────────────────

export const HUB_READ_TOOL_NAMES = [
  'get_hub_overview',
  'search_client',
  'get_client_activity',
  'list_unpaid_invoices',
  'list_pending_validations',
  'list_stagnant_parcours',
  'list_silent_clients',
  'get_menufacile_report',
] as const

export const HUB_ACTION_TOOL_NAMES = [
  'send_chat_message',
  'send_email_to_client',
  'launch_parcours',
  'create_quote_draft',
  'add_coaching_credits',
] as const

export type HubReadToolName = (typeof HUB_READ_TOOL_NAMES)[number]
export type HubActionToolName = (typeof HUB_ACTION_TOOL_NAMES)[number]

export function isHubReadTool(name: string): name is HubReadToolName {
  return (HUB_READ_TOOL_NAMES as readonly string[]).includes(name)
}

export function isHubActionTool(name: string): name is HubActionToolName {
  return (HUB_ACTION_TOOL_NAMES as readonly string[]).includes(name)
}
