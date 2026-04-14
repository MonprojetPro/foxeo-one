import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock fetch globally
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

describe('email-client', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('sendEmail', () => {
    it('should call Resend API with correct payload', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ id: 'email-123' }),
      })

      const { sendEmail } = await import('./email-client')
      await sendEmail(
        { to: 'user@example.com', subject: 'Test', html: '<p>Test</p>' },
        { apiKey: 'test-key', from: 'MonprojetPro <noreply@monprojet-pro.com>' }
      )

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.resend.com/emails',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-key',
            'Content-Type': 'application/json',
          }),
          body: JSON.stringify({
            from: 'MonprojetPro <noreply@monprojet-pro.com>',
            to: 'user@example.com',
            subject: 'Test',
            html: '<p>Test</p>',
          }),
        })
      )
    })

    it('should throw on Resend API error', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        statusText: 'Unauthorized',
        json: async () => ({ message: 'Invalid API key' }),
      })

      const { sendEmail } = await import('./email-client')
      await expect(
        sendEmail(
          { to: 'user@example.com', subject: 'Test', html: '<p>Test</p>' },
          { apiKey: 'bad-key', from: 'MonprojetPro <noreply@monprojet-pro.com>' }
        )
      ).rejects.toThrow('Resend API error')
    })
  })

  describe('sendWithRetry', () => {
    it('should succeed on first attempt', async () => {
      mockFetch.mockResolvedValue({ ok: true, json: async () => ({}) })

      const { sendWithRetry } = await import('./email-client')
      await sendWithRetry(
        { to: 'user@example.com', subject: 'Test', html: '<p>Test</p>' },
        { apiKey: 'test-key', from: 'MonprojetPro <noreply@monprojet-pro.com>' }
      )

      expect(mockFetch).toHaveBeenCalledTimes(1)
    })

    it('should retry on failure and succeed on second attempt', async () => {
      // Use fake timers to avoid waiting 3 seconds
      vi.useFakeTimers()

      mockFetch
        .mockResolvedValueOnce({ ok: false, statusText: 'Error', json: async () => ({ message: 'Temp error' }) })
        .mockResolvedValueOnce({ ok: true, json: async () => ({}) })

      const { sendWithRetry } = await import('./email-client')
      const promise = sendWithRetry(
        { to: 'user@example.com', subject: 'Test', html: '<p>Test</p>' },
        { apiKey: 'test-key', from: 'MonprojetPro <noreply@monprojet-pro.com>' },
        2
      )

      // Advance timer to skip backoff delay
      await vi.runAllTimersAsync()
      await promise

      expect(mockFetch).toHaveBeenCalledTimes(2)
      vi.useRealTimers()
    })

    it('should throw after exhausting all retries', async () => {
      vi.useFakeTimers()

      mockFetch.mockResolvedValue({
        ok: false,
        statusText: 'Error',
        json: async () => ({ message: 'Persistent error' }),
      })

      const { sendWithRetry } = await import('./email-client')
      let caughtError: Error | undefined
      const promise = sendWithRetry(
        { to: 'user@example.com', subject: 'Test', html: '<p>Test</p>' },
        { apiKey: 'test-key', from: 'MonprojetPro <noreply@monprojet-pro.com>' },
        3
      ).catch((err: Error) => { caughtError = err })

      await vi.runAllTimersAsync()
      await promise
      vi.useRealTimers()

      expect(caughtError).toBeDefined()
      expect(caughtError?.message).toContain('Resend API error')
      expect(mockFetch).toHaveBeenCalledTimes(3)
    })
  })

  describe('createEmailClient', () => {
    it('should return sendEmail and sendWithRetry bound to config', async () => {
      mockFetch.mockResolvedValue({ ok: true, json: async () => ({}) })

      const { createEmailClient } = await import('./email-client')
      const client = createEmailClient({ apiKey: 'test-key', from: 'MonprojetPro <noreply@monprojet-pro.com>' })

      await client.send({ to: 'user@example.com', subject: 'Test', html: '<p>Test</p>' })

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.resend.com/emails',
        expect.objectContaining({
          headers: expect.objectContaining({ Authorization: 'Bearer test-key' }),
        })
      )
    })
  })
})
