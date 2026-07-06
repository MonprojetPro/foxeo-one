import { describe, it, expect } from 'vitest'
import {
  isAllowedApiKeyEnv,
  buildAnthropicMessagesFromLegacy,
  toOpenAiMessages,
  toOpenAiTools,
  fromAnthropicResponse,
  fromOpenAiResponse,
  type AnthropicMessage,
  type AnthropicTool,
} from './provider-adapter'

// ── isAllowedApiKeyEnv — allowlist des secrets ────────────────────────────────

describe('isAllowedApiKeyEnv', () => {
  it('accepte les noms UPPER_SNAKE_CASE finissant par _API_KEY', () => {
    expect(isAllowedApiKeyEnv('ANTHROPIC_API_KEY')).toBe(true)
    expect(isAllowedApiKeyEnv('OPENAI_API_KEY')).toBe(true)
    expect(isAllowedApiKeyEnv('MISTRAL_API_KEY')).toBe(true)
    expect(isAllowedApiKeyEnv('GROQ_API_KEY')).toBe(true)
    expect(isAllowedApiKeyEnv('OPENROUTER_API_KEY')).toBe(true)
  })

  it('refuse les secrets sensibles Supabase', () => {
    expect(isAllowedApiKeyEnv('SUPABASE_SERVICE_ROLE_KEY')).toBe(false)
    expect(isAllowedApiKeyEnv('SUPABASE_URL')).toBe(false)
    expect(isAllowedApiKeyEnv('SUPABASE_ANON_KEY')).toBe(false)
  })

  it('refuse les noms mal formés', () => {
    expect(isAllowedApiKeyEnv('openai_api_key')).toBe(false) // lowercase
    expect(isAllowedApiKeyEnv('_API_KEY')).toBe(false) // pas de préfixe
    expect(isAllowedApiKeyEnv('FOO_API_KEY_EXTRA')).toBe(false) // suffixe après
    expect(isAllowedApiKeyEnv('FOO-BAR_API_KEY')).toBe(false) // tiret interdit
    expect(isAllowedApiKeyEnv('')).toBe(false)
    expect(isAllowedApiKeyEnv(null)).toBe(false)
    expect(isAllowedApiKeyEnv(undefined)).toBe(false)
    expect(isAllowedApiKeyEnv(42)).toBe(false)
  })
})

// ── buildAnthropicMessagesFromLegacy — dédoublonnage legacy ───────────────────

describe('buildAnthropicMessagesFromLegacy', () => {
  it('ajoute le message user à la fin de l\'historique', () => {
    const result = buildAnthropicMessagesFromLegacy('Salut', [
      { role: 'user', content: 'Bonjour' },
      { role: 'assistant', content: 'Bonjour !' },
    ])
    expect(result).toEqual([
      { role: 'user', content: 'Bonjour' },
      { role: 'assistant', content: 'Bonjour !' },
      { role: 'user', content: 'Salut' },
    ])
  })

  it('ne ré-ajoute PAS le message si l\'historique se termine déjà par lui (dédoublonnage)', () => {
    const result = buildAnthropicMessagesFromLegacy('Salut', [
      { role: 'assistant', content: 'Bonjour !' },
      { role: 'user', content: 'Salut' },
    ])
    expect(result).toHaveLength(2)
    expect(result[1]).toEqual({ role: 'user', content: 'Salut' })
  })

  it('normalise les rôles inconnus en user', () => {
    const result = buildAnthropicMessagesFromLegacy('Q', [
      { role: 'system', content: 'X' },
    ])
    expect(result[0]!.role).toBe('user')
  })

  it('gère un historique vide', () => {
    expect(buildAnthropicMessagesFromLegacy('Q', [])).toEqual([
      { role: 'user', content: 'Q' },
    ])
  })
})

// ── toOpenAiMessages — Anthropic → OpenAI ─────────────────────────────────────

describe('toOpenAiMessages', () => {
  it('place le systemPrompt en premier message role:system', () => {
    const result = toOpenAiMessages('Tu es Élio.', [
      { role: 'user', content: 'Salut' },
    ])
    expect(result[0]).toEqual({ role: 'system', content: 'Tu es Élio.' })
    expect(result[1]).toEqual({ role: 'user', content: 'Salut' })
  })

  it('convertit les blocs tool_use assistant en tool_calls (arguments stringifiés)', () => {
    const messages: AnthropicMessage[] = [
      { role: 'user', content: 'Cherche Dupont' },
      {
        role: 'assistant',
        content: [
          { type: 'text', text: 'Je cherche.' },
          { type: 'tool_use', id: 'tu_1', name: 'search_client', input: { query: 'Dupont' } },
        ],
      },
    ]
    const result = toOpenAiMessages('sys', messages)
    const assistant = result[2]!
    expect(assistant.role).toBe('assistant')
    expect(assistant.content).toBe('Je cherche.')
    expect(assistant.tool_calls).toEqual([
      {
        id: 'tu_1',
        type: 'function',
        function: { name: 'search_client', arguments: JSON.stringify({ query: 'Dupont' }) },
      },
    ])
  })

  it('assistant avec tool_use sans texte → content null', () => {
    const messages: AnthropicMessage[] = [
      {
        role: 'assistant',
        content: [{ type: 'tool_use', id: 'tu_1', name: 'f', input: {} }],
      },
    ]
    const result = toOpenAiMessages('sys', messages)
    expect(result[1]!.content).toBeNull()
    expect(result[1]!.tool_calls).toHaveLength(1)
  })

  it('convertit les tool_result user en messages role:tool avec tool_call_id', () => {
    const messages: AnthropicMessage[] = [
      {
        role: 'user',
        content: [
          { type: 'tool_result', tool_use_id: 'tu_1', content: '{"found":true}' },
        ],
      },
    ]
    const result = toOpenAiMessages('sys', messages)
    expect(result[1]).toEqual({
      role: 'tool',
      tool_call_id: 'tu_1',
      content: '{"found":true}',
    })
  })

  it('émet les tool_result AVANT le texte du même message user (contrainte d\'ordre OpenAI)', () => {
    const messages: AnthropicMessage[] = [
      {
        role: 'user',
        content: [
          { type: 'text', text: 'Et ensuite ?' },
          { type: 'tool_result', tool_use_id: 'tu_1', content: 'résultat' },
        ],
      },
    ]
    const result = toOpenAiMessages('sys', messages)
    expect(result[1]!.role).toBe('tool')
    expect(result[2]).toEqual({ role: 'user', content: 'Et ensuite ?' })
  })

  it('gère un tool_result dont le content est un tableau de blocs text', () => {
    const messages: AnthropicMessage[] = [
      {
        role: 'user',
        content: [
          {
            type: 'tool_result',
            tool_use_id: 'tu_1',
            content: [
              { type: 'text', text: 'ligne 1' },
              { type: 'text', text: 'ligne 2' },
            ],
          },
        ],
      },
    ]
    const result = toOpenAiMessages('sys', messages)
    expect(result[1]!.content).toBe('ligne 1\nligne 2')
  })

  it('gère un tool_result sans content', () => {
    const messages: AnthropicMessage[] = [
      { role: 'user', content: [{ type: 'tool_result', tool_use_id: 'tu_1' }] },
    ]
    const result = toOpenAiMessages('sys', messages)
    expect(result[1]!.content).toBe('')
  })
})

// ── toOpenAiTools — tools Anthropic → OpenAI ──────────────────────────────────

describe('toOpenAiTools', () => {
  it('mappe input_schema → parameters dans une function OpenAI', () => {
    const tools: AnthropicTool[] = [
      {
        name: 'search_client',
        description: 'Recherche un client',
        input_schema: { type: 'object', properties: { query: { type: 'string' } } },
      },
    ]
    expect(toOpenAiTools(tools)).toEqual([
      {
        type: 'function',
        function: {
          name: 'search_client',
          description: 'Recherche un client',
          parameters: { type: 'object', properties: { query: { type: 'string' } } },
        },
      },
    ])
  })

  it('omet description si absente', () => {
    const result = toOpenAiTools([{ name: 'f', input_schema: { type: 'object' } }])
    expect(result[0]!.function).not.toHaveProperty('description')
  })
})

// ── fromAnthropicResponse — réponse Anthropic → unifié ────────────────────────

describe('fromAnthropicResponse', () => {
  it('compat legacy : un seul bloc text → content identique à l\'ancien code', () => {
    const unified = fromAnthropicResponse(
      {
        content: [{ type: 'text', text: 'Réponse.' }],
        stop_reason: 'end_turn',
        model: 'claude-sonnet-4-6',
        usage: { input_tokens: 10, output_tokens: 5 },
      },
      'fallback-model',
    )
    expect(unified).toEqual({
      content: 'Réponse.',
      toolCalls: [],
      stopReason: 'end_turn',
      model: 'claude-sonnet-4-6',
      inputTokens: 10,
      outputTokens: 5,
    })
  })

  it('concatène plusieurs blocs text', () => {
    const unified = fromAnthropicResponse(
      { content: [{ type: 'text', text: 'A' }, { type: 'text', text: 'B' }] },
      'm',
    )
    expect(unified.content).toBe('AB')
  })

  it('extrait les tool_use en toolCalls', () => {
    const unified = fromAnthropicResponse(
      {
        content: [
          { type: 'text', text: 'Je lance la recherche.' },
          { type: 'tool_use', id: 'tu_9', name: 'search_client', input: { query: 'X' } },
        ],
        stop_reason: 'tool_use',
      },
      'm',
    )
    expect(unified.toolCalls).toEqual([
      { id: 'tu_9', name: 'search_client', input: { query: 'X' } },
    ])
    expect(unified.stopReason).toBe('tool_use')
  })

  it('valeurs par défaut : content vide, model fallback, tokens 0', () => {
    const unified = fromAnthropicResponse({}, 'fallback-model')
    expect(unified.content).toBe('')
    expect(unified.toolCalls).toEqual([])
    expect(unified.model).toBe('fallback-model')
    expect(unified.inputTokens).toBe(0)
    expect(unified.outputTokens).toBe(0)
  })
})

// ── fromOpenAiResponse — réponse OpenAI → unifié ──────────────────────────────

describe('fromOpenAiResponse', () => {
  it('mappe une réponse texte simple (prompt_tokens/completion_tokens)', () => {
    const unified = fromOpenAiResponse(
      {
        choices: [{ message: { content: 'Réponse.' }, finish_reason: 'stop' }],
        model: 'gpt-5.2',
        usage: { prompt_tokens: 20, completion_tokens: 8 },
      },
      'fallback',
    )
    expect(unified).toEqual({
      content: 'Réponse.',
      toolCalls: [],
      stopReason: 'end_turn',
      model: 'gpt-5.2',
      inputTokens: 20,
      outputTokens: 8,
    })
  })

  it('mappe tool_calls → toolCalls (arguments JSON parsés) + stopReason tool_use', () => {
    const unified = fromOpenAiResponse(
      {
        choices: [
          {
            message: {
              content: null,
              tool_calls: [
                {
                  id: 'call_1',
                  function: { name: 'search_client', arguments: '{"query":"Dupont"}' },
                },
              ],
            },
            finish_reason: 'tool_calls',
          },
        ],
      },
      'm',
    )
    expect(unified.content).toBe('')
    expect(unified.toolCalls).toEqual([
      { id: 'call_1', name: 'search_client', input: { query: 'Dupont' } },
    ])
    expect(unified.stopReason).toBe('tool_use')
  })

  it('arguments JSON invalides → input {}', () => {
    const unified = fromOpenAiResponse(
      {
        choices: [
          {
            message: {
              tool_calls: [{ id: 'c', function: { name: 'f', arguments: '{oops' } }],
            },
            finish_reason: 'tool_calls',
          },
        ],
      },
      'm',
    )
    expect(unified.toolCalls[0]!.input).toEqual({})
  })

  it('mappe finish_reason length → max_tokens, et passe les valeurs inconnues telles quelles', () => {
    const cut = fromOpenAiResponse(
      { choices: [{ message: { content: 'x' }, finish_reason: 'length' }] },
      'm',
    )
    expect(cut.stopReason).toBe('max_tokens')

    const other = fromOpenAiResponse(
      { choices: [{ message: { content: 'x' }, finish_reason: 'content_filter' }] },
      'm',
    )
    expect(other.stopReason).toBe('content_filter')
  })

  it('gère content en tableau de parts (certains providers)', () => {
    const unified = fromOpenAiResponse(
      {
        choices: [
          {
            message: { content: [{ type: 'text', text: 'A' }, { type: 'text', text: 'B' }] },
            finish_reason: 'stop',
          },
        ],
      },
      'm',
    )
    expect(unified.content).toBe('AB')
  })

  it('valeurs par défaut : réponse vide → content vide, model fallback, tokens 0', () => {
    const unified = fromOpenAiResponse({}, 'fallback')
    expect(unified.content).toBe('')
    expect(unified.toolCalls).toEqual([])
    expect(unified.model).toBe('fallback')
    expect(unified.inputTokens).toBe(0)
    expect(unified.outputTokens).toBe(0)
  })
})
