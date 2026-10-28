import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'

// ---- Supabase mock : un canal distinct par sujet ----

type PresenceCallback = () => void

interface MockChannel {
  topic: string
  options: { config: Record<string, unknown> }
  callbacks: Record<string, PresenceCallback>
  state: Record<string, unknown[]>
  on: ReturnType<typeof vi.fn>
  subscribe: ReturnType<typeof vi.fn>
  track: ReturnType<typeof vi.fn>
  presenceState: ReturnType<typeof vi.fn>
}

const channels: MockChannel[] = []
/** Statuts renvoyes a l'abonnement, par sujet (defaut : SUBSCRIBED) */
let statusesFor: (topic: string) => string[] = () => ['SUBSCRIBED']
const mockSetAuth = vi.fn()
const mockRemoveChannel = vi.fn()

const mockChannelFn = vi.fn((topic: string, options: { config: Record<string, unknown> }) => {
  const channel: MockChannel = {
    topic,
    options,
    callbacks: {},
    state: {},
    on: vi.fn(),
    subscribe: vi.fn(),
    track: vi.fn().mockResolvedValue('ok'),
    presenceState: vi.fn(),
  }
  channel.on.mockImplementation((type: string, filter: { event: string }, cb: PresenceCallback) => {
    if (type === 'presence') channel.callbacks[filter.event] = cb
    return channel
  })
  channel.subscribe.mockImplementation((cb: (status: string) => void) => {
    statusesFor(topic).forEach((status) => cb(status))
    return channel
  })
  channel.presenceState.mockImplementation(() => channel.state)
  channels.push(channel)
  return channel
})

vi.mock('@monprojetpro/supabase', () => ({
  createClient: vi.fn(() => ({
    channel: mockChannelFn,
    removeChannel: mockRemoveChannel,
    realtime: { setAuth: mockSetAuth },
  })),
}))

import { useChatPresence, buildPresenceSubscriptions } from './use-chat-presence'
import { MAX_HUB_CLIENT_PRESENCE_CHANNELS } from '../utils/presence-topics'

const OPERATOR_ID = 'op-111'
const CLIENT_ID = 'client-aaa'
const OTHER_CLIENT_ID = 'client-bbb'

function channelFor(topic: string): MockChannel {
  const found = channels.find((c) => c.topic === topic)
  if (!found) throw new Error(`canal ${topic} jamais ouvert`)
  return found
}

function emit(topic: string, state: Record<string, unknown[]>, event = 'sync') {
  const channel = channelFor(topic)
  channel.state = state
  act(() => {
    channel.callbacks[event]?.()
  })
}

describe('buildPresenceSubscriptions (T-064)', () => {
  it('client : son propre sujet (publication) + celui de son operateur (ecoute), rien d\'autre', () => {
    const subs = buildPresenceSubscriptions(OPERATOR_ID, CLIENT_ID, 'client', [OTHER_CLIENT_ID])

    expect(subs).toEqual([
      { topic: `presence:client:${CLIENT_ID}`, ownerId: CLIENT_ID, ownerType: 'client', track: true },
      { topic: `presence:operator:${OPERATOR_ID}`, ownerId: OPERATOR_ID, ownerType: 'operator', track: false },
    ])
  })

  it('operateur : son sujet (publication) + un sujet par client, en ecoute seule', () => {
    const subs = buildPresenceSubscriptions(OPERATOR_ID, OPERATOR_ID, 'operator', [CLIENT_ID, OTHER_CLIENT_ID])

    expect(subs.map((s) => [s.topic, s.track])).toEqual([
      [`presence:operator:${OPERATOR_ID}`, true],
      [`presence:client:${CLIENT_ID}`, false],
      [`presence:client:${OTHER_CLIENT_ID}`, false],
    ])
  })
})

describe('useChatPresence — canaux prives (T-064)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    channels.length = 0
    statusesFor = () => ['SUBSCRIBED']
    mockSetAuth.mockResolvedValue(undefined)
  })

  it('canal refuse par la policy : previent une seule fois et ne publie rien', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    statusesFor = (topic) =>
      topic === `presence:client:${CLIENT_ID}` ? ['CHANNEL_ERROR', 'CHANNEL_ERROR'] : ['SUBSCRIBED']

    renderHook(() => useChatPresence(OPERATOR_ID, CLIENT_ID, 'client'))
    await waitFor(() => expect(channels).toHaveLength(2))

    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn).toHaveBeenCalledWith(`[presence] canal prive refuse : presence:client:${CLIENT_ID}`)
    expect(channelFor(`presence:client:${CLIENT_ID}`).track).not.toHaveBeenCalled()
    warn.mockRestore()
  })

  it('client : ouvre exactement 2 canaux PRIVES et ne rejoint jamais le sujet d\'un autre client', async () => {
    renderHook(() => useChatPresence(OPERATOR_ID, CLIENT_ID, 'client'))

    await waitFor(() => expect(mockChannelFn).toHaveBeenCalledTimes(2))

    expect(mockChannelFn).toHaveBeenCalledWith(`presence:client:${CLIENT_ID}`, {
      config: { private: true, presence: { key: CLIENT_ID } },
    })
    expect(mockChannelFn).toHaveBeenCalledWith(`presence:operator:${OPERATOR_ID}`, {
      config: { private: true },
    })
    expect(channels.some((c) => c.topic.includes(OTHER_CLIENT_ID))).toBe(false)
    expect(channels.some((c) => c.topic === `presence:operator:${OPERATOR_ID}` && 'presence' in c.options.config)).toBe(false)
  })

  it('pose le jeton utilisateur AVANT toute jonction (sinon la policy refuse le canal prive)', async () => {
    renderHook(() => useChatPresence(OPERATOR_ID, CLIENT_ID, 'client'))

    await waitFor(() => expect(mockChannelFn).toHaveBeenCalled())

    expect(mockSetAuth).toHaveBeenCalledTimes(1)
    // Number(undefined) = NaN : le test echoue si l'un des deux appels manque.
    expect(Number(mockSetAuth.mock.invocationCallOrder[0])).toBeLessThan(
      Number(mockChannelFn.mock.invocationCallOrder[0])
    )
  })

  it('client : publie sa presence sur SON sujet seulement, jamais sur celui de l\'operateur', async () => {
    renderHook(() => useChatPresence(OPERATOR_ID, CLIENT_ID, 'client'))

    await waitFor(() => expect(channels).toHaveLength(2))

    expect(channelFor(`presence:client:${CLIENT_ID}`).track).toHaveBeenCalledWith({
      user_id: CLIENT_ID,
      user_type: 'client',
      online_at: expect.any(String),
    })
    expect(channelFor(`presence:operator:${OPERATOR_ID}`).track).not.toHaveBeenCalled()
  })

  it('operateur : ecoute chaque client sans y publier, publie sur son propre sujet', async () => {
    renderHook(() => useChatPresence(OPERATOR_ID, OPERATOR_ID, 'operator', [CLIENT_ID, OTHER_CLIENT_ID]))

    await waitFor(() => expect(channels).toHaveLength(3))

    expect(channelFor(`presence:operator:${OPERATOR_ID}`).track).toHaveBeenCalledTimes(1)
    expect(channelFor(`presence:client:${CLIENT_ID}`).track).not.toHaveBeenCalled()
    expect(channelFor(`presence:client:${OTHER_CLIENT_ID}`).track).not.toHaveBeenCalled()
    channels.forEach((c) => expect(c.options.config.private).toBe(true))
  })

  it('l\'identite vient du sujet : une entree qui pretend etre un autre client est rattachee au titulaire du sujet', async () => {
    const { result } = renderHook(() =>
      useChatPresence(OPERATOR_ID, OPERATOR_ID, 'operator', [CLIENT_ID])
    )
    await waitFor(() => expect(channels).toHaveLength(2))

    emit(`presence:client:${CLIENT_ID}`, {
      [OTHER_CLIENT_ID]: [{ user_id: OTHER_CLIENT_ID, user_type: 'operator', online_at: '2026-10-28T10:00:00Z' }],
    })

    expect(result.current.presenceState).toEqual({
      [CLIENT_ID]: [{ user_id: CLIENT_ID, user_type: 'client', online_at: '2026-10-28T10:00:00Z' }],
    })
  })

  it('client : voit l\'operateur en ligne puis hors ligne (join puis leave)', async () => {
    const { result } = renderHook(() => useChatPresence(OPERATOR_ID, CLIENT_ID, 'client'))
    await waitFor(() => expect(channels).toHaveLength(2))

    emit(`presence:operator:${OPERATOR_ID}`, {
      [OPERATOR_ID]: [{ user_id: OPERATOR_ID, user_type: 'operator', online_at: '2026-10-28T10:00:00Z' }],
    }, 'join')
    expect(result.current.presenceState[OPERATOR_ID]).toHaveLength(1)

    emit(`presence:operator:${OPERATOR_ID}`, {}, 'leave')
    expect(result.current.presenceState[OPERATOR_ID]).toBeUndefined()
  })

  it('online_at non textuel : remplace par une chaine vide (contenu publie non fiable)', async () => {
    const { result } = renderHook(() => useChatPresence(OPERATOR_ID, CLIENT_ID, 'client'))
    await waitFor(() => expect(channels).toHaveLength(2))

    emit(`presence:operator:${OPERATOR_ID}`, { x: [{ online_at: 42 }] })

    expect(result.current.presenceState[OPERATOR_ID]).toEqual([
      { user_id: OPERATOR_ID, user_type: 'operator', online_at: '' },
    ])
  })

  it(`Hub : plafonne a ${MAX_HUB_CLIENT_PRESENCE_CHANNELS} clients et previent au-dela`, async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const many = Array.from({ length: MAX_HUB_CLIENT_PRESENCE_CHANNELS + 1 }, (_, i) => `client-${i}`)

    renderHook(() => useChatPresence(OPERATOR_ID, OPERATOR_ID, 'operator', many))

    await waitFor(() => expect(channels).toHaveLength(MAX_HUB_CLIENT_PRESENCE_CHANNELS + 1))
    expect(channels.some((c) => c.topic === `presence:client:client-${MAX_HUB_CLIENT_PRESENCE_CHANNELS}`)).toBe(false)
    expect(warn).toHaveBeenCalledTimes(1)
    warn.mockRestore()
  })

  it('ne se reabonne pas quand le Hub repasse la meme liste dans un nouveau tableau', async () => {
    const { rerender } = renderHook(
      ({ ids }: { ids: string[] }) => useChatPresence(OPERATOR_ID, OPERATOR_ID, 'operator', ids),
      { initialProps: { ids: [CLIENT_ID, OTHER_CLIENT_ID] } }
    )
    await waitFor(() => expect(channels).toHaveLength(3))

    rerender({ ids: [OTHER_CLIENT_ID, CLIENT_ID] })
    await act(async () => {})

    expect(mockChannelFn).toHaveBeenCalledTimes(3)
    expect(mockRemoveChannel).not.toHaveBeenCalled()
  })

  it('demontage : ferme tous les canaux ouverts', async () => {
    const { unmount } = renderHook(() =>
      useChatPresence(OPERATOR_ID, OPERATOR_ID, 'operator', [CLIENT_ID])
    )
    await waitFor(() => expect(channels).toHaveLength(2))

    unmount()

    expect(mockRemoveChannel).toHaveBeenCalledTimes(2)
    channels.forEach((c) => expect(mockRemoveChannel).toHaveBeenCalledWith(c))
  })

  it('demontage avant la pose du jeton : aucun canal n\'est ouvert', async () => {
    let releaseAuth: () => void = () => undefined
    mockSetAuth.mockReturnValue(new Promise<void>((resolve) => { releaseAuth = resolve }))

    const { unmount } = renderHook(() => useChatPresence(OPERATOR_ID, CLIENT_ID, 'client'))
    unmount()
    await act(async () => {
      releaseAuth()
    })

    expect(mockChannelFn).not.toHaveBeenCalled()
  })

  it('echec de la pose du jeton : ouvre quand meme les canaux prives (la policy tranchera)', async () => {
    mockSetAuth.mockRejectedValue(new Error('pas de session'))

    renderHook(() => useChatPresence(OPERATOR_ID, CLIENT_ID, 'client'))

    await waitFor(() => expect(channels).toHaveLength(2))
    channels.forEach((c) => expect(c.options.config.private).toBe(true))
  })

  it('n\'ouvre aucun canal si operatorId ou userId est vide', async () => {
    renderHook(() => useChatPresence('', CLIENT_ID, 'client'))
    renderHook(() => useChatPresence(OPERATOR_ID, '', 'client'))
    await act(async () => {})

    expect(mockSetAuth).not.toHaveBeenCalled()
    expect(mockChannelFn).not.toHaveBeenCalled()
  })
})
