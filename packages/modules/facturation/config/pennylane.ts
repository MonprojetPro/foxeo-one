import type { ActionResponse, ActionError } from '@monprojetpro/types'

// PENNYLANE_API_URL permet de switcher sandbox ↔ prod sans toucher au code :
//   sandbox : PENNYLANE_API_URL=https://sandbox.pennylane.com/api/external/v2
//   prod    : PENNYLANE_API_URL=https://app.pennylane.com/api/external/v2
const PENNYLANE_API_URL =
  process.env.PENNYLANE_API_URL ?? 'https://app.pennylane.com/api/external/v2'

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

/** Longueur au-dela de laquelle le motif est tronque dans le message affiche. */
const MAX_REASON_LENGTH = 300

/**
 * T-041a — extrait un motif LISIBLE du corps d'erreur Pennylane.
 *
 * Leur format varie selon l'endpoint : tantot `{ message }`, tantot
 * `{ error }`, tantot `{ errors: [...] }` ou un dictionnaire champ -> messages.
 * On couvre ces formes et, a defaut, on serialise — mieux vaut un JSON brut
 * sous les yeux de l'operateur que rien du tout.
 */
function extractPennylaneReason(details: unknown): string | null {
  if (details == null) return null

  const truncate = (s: string): string | null => {
    const trimmed = s.trim()
    if (trimmed === '') return null
    return trimmed.length > MAX_REASON_LENGTH
      ? `${trimmed.slice(0, MAX_REASON_LENGTH)}…`
      : trimmed
  }

  if (typeof details === 'string') return truncate(details)

  if (typeof details === 'object') {
    const body = details as Record<string, unknown>

    for (const key of ['message', 'error', 'detail', 'title'] as const) {
      if (typeof body[key] === 'string') return truncate(body[key] as string)
    }

    const errors = body.errors
    if (Array.isArray(errors)) {
      const parts = errors
        .map((e) =>
          typeof e === 'string'
            ? e
            : typeof e === 'object' && e !== null
              ? String((e as Record<string, unknown>).message ?? JSON.stringify(e))
              : String(e)
        )
        .filter(Boolean)
      if (parts.length > 0) return truncate(parts.join(' · '))
    }

    // Forme « champ -> [messages] », courante sur les erreurs de validation
    if (errors && typeof errors === 'object') {
      const parts = Object.entries(errors as Record<string, unknown>).map(
        ([field, msgs]) => `${field}: ${Array.isArray(msgs) ? msgs.join(', ') : String(msgs)}`
      )
      if (parts.length > 0) return truncate(parts.join(' · '))
    }

    try {
      return truncate(JSON.stringify(details))
    } catch {
      return null
    }
  }

  return null
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
    // 🔴 BUG PREEXISTANT CORRIGE (T-041a) — le code lisait `response.json()`
    // puis, en cas d'echec, `response.text()`. Or **le corps d'une Response ne
    // se lit qu'UNE fois** : des que Pennylane renvoie un corps vide ou non-JSON
    // (page HTML d'une passerelle, 502 d'un proxy), le second appel levait
    // `InvalidStateError: Body has already been used` — une **exception non
    // attrapee dans une Server Action**, qui remplacait l'erreur API par un
    // plantage, precisement au moment ou on avait besoin de lire le motif.
    // Trouve par le test ajoute pour la sonde, pas en lisant le code.
    const rawBody = await response.text().catch(() => '')
    let details: unknown = rawBody
    if (rawBody !== '') {
      try {
        details = JSON.parse(rawBody)
      } catch {
        details = rawBody
      }
    }

    // T-041a — le MOTIF du refus remonte jusqu'a l'ecran, pas seulement le code.
    //
    // 🔑 Pourquoi : le corps de la reponse partait en `console.error` cote
    // serveur, donc enferme dans les journaux Vercel, et l'operateur ne lisait
    // qu'un « Pennylane API error: 400 Bad Request » nu — inexploitable, et
    // impossible a diagnostiquer sans acces aux journaux. Un message d'erreur
    // de tiers sans son corps ne sert a personne.
    const reason = extractPennylaneReason(details)

    const error: ActionError = {
      message: reason
        ? `Pennylane API error: ${response.status} ${response.statusText} — ${reason}`
        : `Pennylane API error: ${response.status} ${response.statusText}`,
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
