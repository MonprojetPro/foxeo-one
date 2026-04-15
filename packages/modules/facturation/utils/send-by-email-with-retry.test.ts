import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('../config/pennylane', () => ({
  pennylaneClient: { post: vi.fn(), get: vi.fn(), put: vi.fn(), del: vi.fn() },
}))

import { pennylaneClient } from '../config/pennylane'
import { sendByEmailWithRetry } from './send-by-email-with-retry'

const mockPost = vi.mocked(pennylaneClient.post)

describe('sendByEmailWithRetry', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns sent on first try when no error', async () => {
    mockPost.mockResolvedValue({ data: null, error: null })

    const promise = sendByEmailWithRetry('PL-1')
    await vi.runAllTimersAsync()
    const result = await promise

    expect(result).toEqual({ sent: true, attempts: 1, lastError: null })
    expect(mockPost).toHaveBeenCalledTimes(1)
  })

  it('returns immediately on non-409 error (no retry)', async () => {
    mockPost.mockResolvedValue({
      data: null,
      error: { message: 'forbidden', code: 'PENNYLANE_403' },
    })

    const promise = sendByEmailWithRetry('PL-1')
    await vi.runAllTimersAsync()
    const result = await promise

    expect(result.sent).toBe(false)
    expect(result.attempts).toBe(1)
    expect(result.lastError?.code).toBe('PENNYLANE_403')
    expect(mockPost).toHaveBeenCalledTimes(1)
  })

  it('retries on 409 and succeeds on second try', async () => {
    mockPost
      .mockResolvedValueOnce({
        data: null,
        error: { message: 'PDF not ready', code: 'PENNYLANE_409' },
      })
      .mockResolvedValueOnce({ data: null, error: null })

    const promise = sendByEmailWithRetry('PL-1')
    await vi.runAllTimersAsync()
    const result = await promise

    expect(result.sent).toBe(true)
    expect(result.attempts).toBe(2)
    expect(mockPost).toHaveBeenCalledTimes(2)
  })

  it('gives up after MAX_RETRIES (5) consecutive 409s', async () => {
    mockPost.mockResolvedValue({
      data: null,
      error: { message: 'PDF not ready', code: 'PENNYLANE_409' },
    })

    const promise = sendByEmailWithRetry('PL-1')
    await vi.runAllTimersAsync()
    const result = await promise

    expect(result.sent).toBe(false)
    expect(result.attempts).toBe(5)
    expect(result.lastError?.code).toBe('PENNYLANE_409')
    expect(mockPost).toHaveBeenCalledTimes(5)
  })
})
