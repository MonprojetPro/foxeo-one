import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  sendToElioHubAgent,
  confirmElioHubAction,
  rejectElioHubAction,
} from './elio-hub-agent'
import type { AnthropicMessage, AnthropicToolResultBlock } from '../types/elio-hub-agent.types'

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockInvoke = vi.fn()

/** Réponses par table, consommées dans l'ordre (la dernière est réutilisée). */
let tableResults: Record<string, Array<{ data: unknown; error: unknown }>> = {}
/** Payloads capturés des insert/update, par table. */
let insertCalls: Array<{ table: string; payload: Record<string, unknown> }> = []
let updateCalls: Array<{ table: string; payload: Record<string, unknown> }> = []

function queueResult(table: string, data: unknown, error: unknown = null) {
  ;(tableResults[table] ??= []).push({ data, error })
}

function makeChain(table: string) {
  const nextResult = () => {
    const queue = tableResults[table] ?? []
    return queue.length > 1 ? queue.shift()! : queue[0] ?? { data: null, error: null }
  }
  const chain: Record<string, unknown> = {}
  const self = () => chain
  for (const m of ['select', 'eq', 'neq', 'in', 'is', 'or', 'order', 'limit', 'range', 'lt', 'gte', 'lte']) {
    chain[m] = vi.fn(self)
  }
  chain.insert = vi.fn((payload: Record<string, unknown>) => {
    insertCalls.push({ table, payload })
    return chain
  })
  chain.update = vi.fn((payload: Record<string, unknown>) => {
    updateCalls.push({ table, payload })
    return chain
  })
  chain.maybeSingle = vi.fn(async () => nextResult())
  chain.single = vi.fn(async () => nextResult())
  // Chaîne awaitable à n'importe quel maillon (ex: await ...update().eq())
  chain.then = (resolve: (r: { data: unknown; error: unknown }) => void) => resolve(nextResult())
  return chain
}

vi.mock('@monprojetpro/supabase', () => ({
  createServerSupabaseClient: vi.fn(async () => ({
    auth: {
      getUser: vi.fn(async () => ({ data: { user: { id: 'auth-user-1' } }, error: null })),
    },
    functions: { invoke: mockInvoke },
    from: vi.fn((table: string) => makeChain(table)),
  })),
}))

const mockGetLlmConfig = vi.hoisted(() => vi.fn())
vi.mock('./llm-config', () => ({ getLlmConfig: mockGetLlmConfig }))

const mockLogTokenUsage = vi.hoisted(() => vi.fn(async () => undefined))
vi.mock('./log-token-usage', () => ({ logTokenUsage: mockLogTokenUsage }))

const mockRunReadTool = vi.hoisted(() => vi.fn())
vi.mock('./hub-tools/read-tools', () => ({ runHubReadTool: mockRunReadTool }))

const mockPrepare = vi.hoisted(() => vi.fn())
const mockExecute = vi.hoisted(() => vi.fn())
vi.mock('./hub-tools/action-tools', () => ({
  prepareHubAction: mockPrepare,
  executeHubAction: mockExecute,
}))

// ── Helpers ───────────────────────────────────────────────────────────────────

const HUB_AGENT_PROFILE = {
  provider: 'anthropic',
  model: 'claude-sonnet-4-6',
  baseUrl: null,
  apiKeyEnv: 'ANTHROPIC_API_KEY',
}

function finalResponse(content: string) {
  return {
    data: { content, toolCalls: [], stopReason: 'end_turn', model: 'claude-sonnet-4-6', inputTokens: 100, outputTokens: 50 },
    error: null,
  }
}

function toolUseResponse(name: string, input: Record<string, unknown>, id = 'toolu_1') {
  return {
    data: {
      content: '',
      toolCalls: [{ id, name, input }],
      stopReason: 'tool_use',
      model: 'claude-sonnet-4-6',
      inputTokens: 200,
      outputTokens: 30,
    },
    error: null,
  }
}

const PENDING_ROW = {
  id: 'action-1',
  operator_id: 'op-1',
  conversation_id: 'conv-1',
  tool_name: 'send_chat_message',
  tool_input: { content: 'Salut', _resolved_client_id: 'client-1', _resolved_client_name: 'Dupont' },
  summary: 'Envoyer un message chat à Dupont : « Salut »',
  status: 'pending',
  result: null,
  error: null,
  created_at: '2026-07-06T12:00:00Z',
  decided_at: null,
  executed_at: null,
}

beforeEach(() => {
  vi.clearAllMocks()
  tableResults = {}
  insertCalls = []
  updateCalls = []
  mockGetLlmConfig.mockResolvedValue({ data: { hubAgent: HUB_AGENT_PROFILE }, error: null })
  // Session opérateur valide par défaut
  queueResult('operators', { id: 'op-1' })
})

// ── sendToElioHubAgent ────────────────────────────────────────────────────────

describe('sendToElioHubAgent — garde d’accès', () => {
  it('refuse une session non-opérateur', async () => {
    tableResults = {}
    queueResult('operators', null) // pas de row opérateur

    const { data, error } = await sendToElioHubAgent({ conversationId: 'conv-1', message: 'coucou' })

    expect(data).toBeNull()
    expect(error?.code).toBe('FORBIDDEN')
    expect(mockInvoke).not.toHaveBeenCalled()
  })

  it('refuse un message vide et un conversationId manquant', async () => {
    const empty = await sendToElioHubAgent({ conversationId: 'conv-1', message: '   ' })
    expect(empty.error?.code).toBe('VALIDATION_ERROR')

    const noConv = await sendToElioHubAgent({ conversationId: '', message: 'coucou' })
    expect(noConv.error?.code).toBe('VALIDATION_ERROR')
  })
})

describe('sendToElioHubAgent — construction de la boucle messages', () => {
  it('charge l’historique, dédoublonne le message courant déjà persisté, et répond', async () => {
    // Le composant persiste le message user AVANT d'appeler l'agent
    queueResult('elio_messages', [
      { role: 'user', content: 'Bonjour Élio' },
      { role: 'assistant', content: 'Bonjour MiKL !' },
      { role: 'user', content: 'Combien de clients ?' },
    ])
    mockInvoke.mockResolvedValueOnce(finalResponse('Tu as 12 clients.'))

    const { data, error } = await sendToElioHubAgent({ conversationId: 'conv-1', message: 'Combien de clients ?' })

    expect(error).toBeNull()
    expect(data?.content).toBe('Tu as 12 clients.')

    const body = mockInvoke.mock.calls[0]![1].body as {
      messages: AnthropicMessage[]
      tools: unknown[]
      provider: { name: string; apiKeyEnv: string }
      model: string
      systemPrompt: string
    }
    // Pas de doublon du dernier message user
    expect(body.messages).toHaveLength(3)
    expect(body.messages[2]).toEqual({ role: 'user', content: 'Combien de clients ?' })
    // Profil hubAgent câblé
    expect(body.model).toBe('claude-sonnet-4-6')
    expect(body.provider).toEqual({ name: 'anthropic', apiKeyEnv: 'ANTHROPIC_API_KEY' })
    expect(body.tools.length).toBeGreaterThan(0)
    expect(body.systemPrompt).toContain('skip_confirmation')
    // Tokens logués (fire-and-forget)
    expect(mockLogTokenUsage).toHaveBeenCalledWith(
      expect.objectContaining({ conversationId: 'conv-1', inputTokens: 100, outputTokens: 50 }),
    )
  })

  it('ajoute le message courant si l’historique ne se termine pas par lui', async () => {
    queueResult('elio_messages', [{ role: 'assistant', content: 'Bienvenue !' }])
    mockInvoke.mockResolvedValueOnce(finalResponse('OK'))

    await sendToElioHubAgent({ conversationId: 'conv-1', message: 'Salut' })

    const body = mockInvoke.mock.calls[0]![1].body as { messages: AnthropicMessage[] }
    expect(body.messages).toHaveLength(2)
    expect(body.messages[1]).toEqual({ role: 'user', content: 'Salut' })
  })

  it('exécute un outil lecture, reboucle avec le tool_result, et retourne toolsUsed', async () => {
    queueResult('elio_messages', [])
    mockInvoke
      .mockResolvedValueOnce(toolUseResponse('get_hub_overview', {}))
      .mockResolvedValueOnce(finalResponse('MRR : 500 €.'))
    mockRunReadTool.mockResolvedValueOnce({ ok: true, payload: { mrrEur: 500 } })

    const { data, error } = await sendToElioHubAgent({ conversationId: 'conv-1', message: 'le MRR ?' })

    expect(error).toBeNull()
    expect(data?.content).toBe('MRR : 500 €.')
    expect(data?.toolsUsed).toEqual(['get_hub_overview'])
    expect(mockRunReadTool).toHaveBeenCalledWith(expect.anything(), 'op-1', 'get_hub_overview', {})

    // 2e appel : la boucle a rejoué assistant(tool_use) + user(tool_result)
    const secondBody = mockInvoke.mock.calls[1]![1].body as { messages: AnthropicMessage[] }
    expect(secondBody.messages).toHaveLength(3)
    const assistantMsg = secondBody.messages[1]!
    expect(assistantMsg.role).toBe('assistant')
    expect(Array.isArray(assistantMsg.content)).toBe(true)
    const toolResultMsg = secondBody.messages[2]!
    expect(toolResultMsg.role).toBe('user')
    const blocks = toolResultMsg.content as AnthropicToolResultBlock[]
    expect(blocks[0]!.type).toBe('tool_result')
    expect(blocks[0]!.tool_use_id).toBe('toolu_1')
    expect(blocks[0]!.content).toContain('500')
    // Tokens logués à CHAQUE tour
    expect(mockLogTokenUsage).toHaveBeenCalledTimes(2)
  })
})

// ── Mécanique garde-fou ───────────────────────────────────────────────────────

describe('sendToElioHubAgent — garde-fou des actions', () => {
  beforeEach(() => {
    mockPrepare.mockResolvedValue({
      status: 'ready',
      prepared: {
        toolName: 'send_chat_message',
        toolInput: { content: 'Salut', _resolved_client_id: 'client-1', _resolved_client_name: 'Dupont' },
        summary: 'Envoyer un message chat à Dupont : « Salut »',
      },
    })
  })

  it('sans skip_confirmation → proposition PENDING, jamais exécutée', async () => {
    queueResult('elio_messages', [])
    queueResult('elio_hub_actions', PENDING_ROW)
    mockInvoke
      .mockResolvedValueOnce(toolUseResponse('send_chat_message', { client: 'Dupont', content: 'Salut' }))
      .mockResolvedValueOnce(finalResponse('Proposition créée, à toi de valider.'))

    const { data, error } = await sendToElioHubAgent({ conversationId: 'conv-1', message: 'dis salut à Dupont' })

    expect(error).toBeNull()
    // L'outil réel n'a PAS été exécuté
    expect(mockExecute).not.toHaveBeenCalled()
    // La row insérée est bien pending
    const insert = insertCalls.find((c) => c.table === 'elio_hub_actions')
    expect(insert?.payload).toMatchObject({
      operator_id: 'op-1',
      conversation_id: 'conv-1',
      tool_name: 'send_chat_message',
      status: 'pending',
    })
    // L'action remonte au chat
    expect(data?.pendingActions).toHaveLength(1)
    expect(data?.pendingActions[0]).toMatchObject({ id: 'action-1', status: 'pending' })
    // Le tool_result renvoyé au LLM annonce l'attente de validation
    const secondBody = mockInvoke.mock.calls[1]![1].body as { messages: AnthropicMessage[] }
    const blocks = secondBody.messages[2]!.content as AnthropicToolResultBlock[]
    expect(blocks[0]!.content).toContain('en attente de validation')
    expect(blocks[0]!.content).toContain('action-1')
  })

  it('avec skip_confirmation:true → exécution immédiate, statut AUTO_EXECUTED', async () => {
    queueResult('elio_messages', [])
    queueResult('elio_hub_actions', { ...PENDING_ROW, status: 'auto_executed', result: { messageId: 'msg-9' } })
    mockExecute.mockResolvedValueOnce({ ok: true, result: { messageId: 'msg-9' } })
    mockInvoke
      .mockResolvedValueOnce(
        toolUseResponse('send_chat_message', { client: 'Dupont', content: 'Salut', skip_confirmation: true }),
      )
      .mockResolvedValueOnce(finalResponse('Message envoyé directement.'))

    const { data, error } = await sendToElioHubAgent({
      conversationId: 'conv-1',
      message: 'envoie salut à Dupont sans vérif',
    })

    expect(error).toBeNull()
    expect(mockExecute).toHaveBeenCalledTimes(1)
    const insert = insertCalls.find((c) => c.table === 'elio_hub_actions')
    expect(insert?.payload).toMatchObject({ status: 'auto_executed', result: { messageId: 'msg-9' } })
    expect(insert?.payload.executed_at).toBeTruthy()
    expect(data?.pendingActions[0]).toMatchObject({ status: 'auto_executed' })
  })

  it('avec skip_confirmation:true et exécution KO → statut FAILED + tool_result en erreur', async () => {
    queueResult('elio_messages', [])
    queueResult('elio_hub_actions', { ...PENDING_ROW, status: 'failed', error: 'RLS refusée' })
    mockExecute.mockResolvedValueOnce({ ok: false, error: 'RLS refusée' })
    mockInvoke
      .mockResolvedValueOnce(
        toolUseResponse('send_chat_message', { client: 'Dupont', content: 'Salut', skip_confirmation: true }),
      )
      .mockResolvedValueOnce(finalResponse("L'envoi a échoué."))

    const { data } = await sendToElioHubAgent({ conversationId: 'conv-1', message: 'sans vérif' })

    const insert = insertCalls.find((c) => c.table === 'elio_hub_actions')
    expect(insert?.payload).toMatchObject({ status: 'failed', error: 'RLS refusée' })
    expect(data?.pendingActions[0]).toMatchObject({ status: 'failed' })
  })

  it('client introuvable à la préparation → tool_result en erreur, aucune row créée', async () => {
    queueResult('elio_messages', [])
    mockPrepare.mockResolvedValueOnce({ status: 'error', message: 'Aucun client trouvé pour « Zorro ».' })
    mockInvoke
      .mockResolvedValueOnce(toolUseResponse('send_chat_message', { client: 'Zorro', content: 'Salut' }))
      .mockResolvedValueOnce(finalResponse('Je ne trouve pas ce client.'))

    const { data } = await sendToElioHubAgent({ conversationId: 'conv-1', message: 'dis salut à Zorro' })

    expect(insertCalls.filter((c) => c.table === 'elio_hub_actions')).toHaveLength(0)
    expect(data?.pendingActions).toHaveLength(0)
    const secondBody = mockInvoke.mock.calls[1]![1].body as { messages: AnthropicMessage[] }
    const blocks = secondBody.messages[2]!.content as AnthropicToolResultBlock[]
    expect(blocks[0]!.is_error).toBe(true)
  })
})

// ── confirm / reject ──────────────────────────────────────────────────────────

describe('confirmElioHubAction / rejectElioHubAction', () => {
  it('confirme une proposition pending : exécute l’outil et marque executed', async () => {
    queueResult('elio_hub_actions', PENDING_ROW) // 1. fetch initial (maybeSingle)
    queueResult('elio_hub_actions', null) // 2. update « confirmed » (chaîne awaitée)
    queueResult('elio_hub_actions', { ...PENDING_ROW, status: 'executed', result: { messageId: 'msg-2' } }) // 3. update final
    mockExecute.mockResolvedValueOnce({ ok: true, result: { messageId: 'msg-2' } })

    const { data, error } = await confirmElioHubAction('action-1')

    expect(error).toBeNull()
    expect(mockExecute).toHaveBeenCalledWith(
      expect.anything(),
      { operatorId: 'op-1' },
      'send_chat_message',
      PENDING_ROW.tool_input,
    )
    expect(data?.status).toBe('executed')
    // Les updates tracent la décision puis l'exécution
    expect(updateCalls[0]?.payload).toMatchObject({ status: 'confirmed' })
    expect(updateCalls[1]?.payload).toMatchObject({ status: 'executed' })
  })

  it('refuse de confirmer une proposition déjà traitée', async () => {
    queueResult('elio_hub_actions', { ...PENDING_ROW, status: 'rejected' })

    const { error } = await confirmElioHubAction('action-1')

    expect(error?.code).toBe('ALREADY_DECIDED')
    expect(mockExecute).not.toHaveBeenCalled()
  })

  it('rejette une proposition pending sans jamais exécuter l’outil', async () => {
    queueResult('elio_hub_actions', { ...PENDING_ROW, status: 'rejected', decided_at: '2026-07-06T13:00:00Z' })

    const { data, error } = await rejectElioHubAction('action-1')

    expect(error).toBeNull()
    expect(data?.status).toBe('rejected')
    expect(mockExecute).not.toHaveBeenCalled()
    expect(updateCalls[0]?.payload).toMatchObject({ status: 'rejected' })
  })
})
