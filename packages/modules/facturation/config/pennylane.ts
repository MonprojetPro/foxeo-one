import type { ActionResponse, ActionError } from '@foxeo/types'

const PENNYLANE_API_URL = 'https://app.pennylane.com/api/external/v2'
const REQUEST_TIMEOUT_MS = 30_000
const MAX_RETRIES = 1
const MAX_RATE_LIMIT_RETRIES = 3

function getToken(): string | null {
  return process.env.PENNYLANE_API_TOKEN ?? null
}

function buildHeaders(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'X-Use-2026-API-Changes': 'true',
  }
}

function isRetryable(status: number): boolean {
  return status === 408 || (status >= 500 && status <= 599)
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(url, { ...options, signal: controller.signal })
    return response
  } finally {
    clearTimeout(timeoutId)
  }
}

async function executeRequest<T>(
  method: string,
  path: string,
  body?: unknown,
  attempt = 0,
  rateLimitRetries = 0
): Promise<ActionResponse<T>> {
  const token = getToken()
  if (!token) {
    const error: ActionError = {
      message: 'PENNYLANE_API_TOKEN is not configured',
      code: 'CONFIG_ERROR',
    }
    return { data: null, error }
  }

  const url = `${PENNYLANE_API_URL}${path}`
  const options: RequestInit = {
    method,
    headers: buildHeaders(token),
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  }

  let response: Response

  try {
    response = await fetchWithTimeout(url, options, REQUEST_TIMEOUT_MS)
  } catch (err) {
    const isAbort = err instanceof Error && err.name === 'AbortError'
    const message = isAbort ? 'Request timeout after 30s' : 'Network error'

    if (attempt < MAX_RETRIES) {
      await sleep(1_000)
      return executeRequest<T>(method, path, body, attempt + 1, rateLimitRetries)
    }

    const error: ActionError = {
      message,
      code: isAbort ? 'TIMEOUT' : 'NETWORK_ERROR',
      details: err,
    }
    return { data: null, error }
  }

  // Rate limiting — respect retry-after with max attempts guard
  if (response.status === 429) {
    if (rateLimitRetries >= MAX_RATE_LIMIT_RETRIES) {
      const error: ActionError = {
        message: 'Pennylane rate limit exceeded after max retries',
        code: 'RATE_LIMIT_EXCEEDED',
      }
      return { data: null, error }
    }

    const retryAfter = parseInt(response.headers.get('retry-after') ?? '5', 10)
    const remaining = response.headers.get('ratelimit-remaining')
    console.warn(
      `[PENNYLANE:RATE_LIMIT] Rate limit hit. Remaining: ${remaining}. Retry after: ${retryAfter}s (attempt ${rateLimitRetries + 1}/${MAX_RATE_LIMIT_RETRIES})`
    )
    await sleep(retryAfter * 1_000)
    return executeRequest<T>(method, path, body, attempt, rateLimitRetries + 1)
  }

  // Retry on 5xx
  if (isRetryable(response.status) && attempt < MAX_RETRIES) {
    await sleep(1_000)
    return executeRequest<T>(method, path, body, attempt + 1, rateLimitRetries)
  }

  if (!response.ok) {
    let details: unknown
    try {
      details = await response.json()
    } catch {
      details = await response.text()
    }

    const error: ActionError = {
      message: `Pennylane API error: ${response.status} ${response.statusText}`,
      code: `PENNYLANE_${response.status}`,
      details,
    }
    return { data: null, error }
  }

  // 204 No Content (DELETE)
  if (response.status === 204) {
    return { data: null, error: null }
  }

  try {
    const data = (await response.json()) as T
    return { data, error: null }
  } catch (err) {
    const error: ActionError = {
      message: 'Failed to parse Pennylane API response',
      code: 'PARSE_ERROR',
      details: err,
    }
    return { data: null, error }
  }
}

// ============================================================
// Pennylane HTTP client
// ============================================================

export const pennylaneClient = {
  get<T>(path: string): Promise<ActionResponse<T>> {
    return executeRequest<T>('GET', path)
  },

  post<T>(path: string, body: unknown): Promise<ActionResponse<T>> {
    return executeRequest<T>('POST', path, body)
  },

  put<T>(path: string, body: unknown): Promise<ActionResponse<T>> {
    return executeRequest<T>('PUT', path, body)
  },

  del(path: string): Promise<ActionResponse<null>> {
    return executeRequest<null>('DELETE', path)
  },
}

export { PENNYLANE_API_URL }
