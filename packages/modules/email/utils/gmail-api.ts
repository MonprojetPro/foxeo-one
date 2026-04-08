import type { SupabaseClient } from '@supabase/supabase-js'
import type { EmailMessage, EmailThread } from '../types/email.types'

const GMAIL_API = 'https://gmail.googleapis.com/gmail/v1/users/me'
const TOKEN_URL = 'https://oauth2.googleapis.com/token'

// --- Token management ---

export interface StoredToken {
  accessToken: string
  refreshToken: string | null
  tokenExpiry: string | null
  gmailEmail: string
}

/**
 * Récupère un access token valide (rafraîchi si expiré).
 */
export async function getValidAccessToken(
  supabase: SupabaseClient,
  operatorId: string
): Promise<string | null> {
  const { data: integration } = await supabase
    .from('gmail_integrations')
    .select('access_token, refresh_token, token_expiry, gmail_email')
    .eq('operator_id', operatorId)
    .maybeSingle()

  if (!integration) return null

  // Vérifier si le token est encore valide (marge de 5 minutes)
  const expiry = integration.token_expiry ? new Date(integration.token_expiry) : null
  const isExpired = !expiry || expiry.getTime() - Date.now() < 5 * 60 * 1000

  if (!isExpired) return integration.access_token

  // Rafraîchir le token
  if (!integration.refresh_token) return null

  const refreshed = await refreshAccessToken(integration.refresh_token)
  if (!refreshed) return null

  const newExpiry = new Date(Date.now() + refreshed.expires_in * 1000).toISOString()
  await supabase
    .from('gmail_integrations')
    .update({ access_token: refreshed.access_token, token_expiry: newExpiry })
    .eq('operator_id', operatorId)

  return refreshed.access_token
}

async function refreshAccessToken(refreshToken: string): Promise<{ access_token: string; expires_in: number } | null> {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  if (!clientId || !clientSecret) return null

  try {
    const res = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

// --- Gmail API helpers ---

async function gmailGet(accessToken: string, path: string, params?: Record<string, string | string[]>): Promise<Response> {
  const url = new URL(`${GMAIL_API}${path}`)
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (Array.isArray(v)) {
        v.forEach((val) => url.searchParams.append(k, val))
      } else {
        url.searchParams.set(k, v)
      }
    })
  }
  return fetch(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
}

async function gmailPost(accessToken: string, path: string, body: unknown): Promise<Response> {
  return fetch(`${GMAIL_API}${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
}

// --- Base64url ---

function decodeBase64Url(str: string): string {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/')
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4)
  return Buffer.from(padded, 'base64').toString('utf-8')
}

function encodeBase64Url(str: string): string {
  return Buffer.from(str).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

// --- Parsing email parts ---

interface GmailMessagePart {
  mimeType: string
  body?: { data?: string; size?: number }
  parts?: GmailMessagePart[]
  headers?: Array<{ name: string; value: string }>
}

function extractBody(payload: GmailMessagePart): string {
  // Priorité : text/plain > text/html
  if (payload.mimeType === 'text/plain' && payload.body?.data) {
    return decodeBase64Url(payload.body.data)
  }
  if (payload.mimeType === 'text/html' && payload.body?.data) {
    return stripHtml(decodeBase64Url(payload.body.data))
  }
  if (payload.parts) {
    const plain = payload.parts.find((p) => p.mimeType === 'text/plain')
    if (plain?.body?.data) return decodeBase64Url(plain.body.data)
    const html = payload.parts.find((p) => p.mimeType === 'text/html')
    if (html?.body?.data) return stripHtml(decodeBase64Url(html.body.data))
    // Multipart imbriqué
    for (const part of payload.parts) {
      const body = extractBody(part)
      if (body) return body
    }
  }
  return ''
}

function getHeader(headers: Array<{ name: string; value: string }>, name: string): string {
  return headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value ?? ''
}

// --- Public API functions ---

export async function fetchClientThreads(
  accessToken: string,
  clientEmail: string,
  maxResults = 20
): Promise<EmailThread[]> {
  const query = `from:${clientEmail} OR to:${clientEmail}`
  const res = await gmailGet(accessToken, '/threads', {
    q: query,
    maxResults: String(maxResults),
  })
  if (!res.ok) return []

  const data = await res.json()
  const threads: Array<{ id: string; snippet: string }> = data.threads ?? []

  // Charger les métadonnées de chaque thread (en parallèle, max 5 à la fois)
  const results: EmailThread[] = []
  for (let i = 0; i < threads.length; i += 5) {
    const batch = threads.slice(i, i + 5)
    const batchResults = await Promise.all(
      batch.map(async (t) => {
        const r = await gmailGet(accessToken, `/threads/${t.id}`, { format: 'metadata', metadataHeaders: ['Subject', 'From', 'Date'] })
        if (!r.ok) return null
        const td = await r.json()
        const messages = td.messages ?? []
        const last = messages[messages.length - 1]
        if (!last) return null
        const headers = last.payload?.headers ?? []
        const subject = getHeader(headers, 'Subject') || '(sans objet)'
        const from = getHeader(headers, 'From')
        const date = getHeader(headers, 'Date')
        const unread = (last.labelIds ?? []).includes('UNREAD')
        return {
          id: t.id,
          subject,
          lastMessageDate: date ? new Date(date).toISOString() : new Date().toISOString(),
          lastMessagePreview: t.snippet || '',
          messageCount: messages.length,
          unread,
          from,
        } satisfies EmailThread
      })
    )
    results.push(...batchResults.filter((x): x is EmailThread => x !== null))
  }

  return results
}

export async function fetchThreadMessages(
  accessToken: string,
  threadId: string,
  operatorEmail: string
): Promise<EmailMessage[]> {
  const res = await gmailGet(accessToken, `/threads/${threadId}`, { format: 'full' })
  if (!res.ok) return []

  const data = await res.json()
  const messages = data.messages ?? []

  return messages.map((msg: { id: string; threadId: string; payload?: GmailMessagePart }) => {
    const headers = msg.payload?.headers ?? []
    const from = getHeader(headers, 'From')
    const toRaw = getHeader(headers, 'To')
    const cc = getHeader(headers, 'Cc')
    const subject = getHeader(headers, 'Subject') || '(sans objet)'
    const date = getHeader(headers, 'Date')
    const messageId = getHeader(headers, 'Message-ID')

    const toList = toRaw ? toRaw.split(',').map((s) => s.trim()) : []
    const ccList = cc ? cc.split(',').map((s) => s.trim()) : []

    const body = msg.payload ? extractBody(msg.payload) : ''
    const isOutgoing = from.toLowerCase().includes(operatorEmail.toLowerCase())

    return {
      id: msg.id,
      threadId: msg.threadId,
      from,
      to: toList,
      cc: ccList,
      subject,
      bodyText: body,
      date: date ? new Date(date).toISOString() : new Date().toISOString(),
      isOutgoing,
      messageIdHeader: messageId,
    } satisfies EmailMessage
  })
}

export async function trashGmailThread(
  accessToken: string,
  threadId: string
): Promise<boolean> {
  const res = await gmailPost(accessToken, `/threads/${threadId}/trash`, {})
  return res.ok
}

export async function sendGmailMessage(
  accessToken: string,
  opts: {
    from: string
    to: string
    subject: string
    body: string
    threadId?: string
    inReplyTo?: string
    references?: string
  }
): Promise<boolean> {
  const lines = [
    `From: ${opts.from}`,
    `To: ${opts.to}`,
    `Subject: ${opts.subject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: quoted-printable',
  ]
  if (opts.inReplyTo) lines.push(`In-Reply-To: ${opts.inReplyTo}`)
  if (opts.references) lines.push(`References: ${opts.references}`)
  lines.push('', opts.body)

  const raw = encodeBase64Url(lines.join('\r\n'))
  const sendBody: Record<string, string> = { raw }
  if (opts.threadId) sendBody.threadId = opts.threadId

  const res = await gmailPost(accessToken, '/messages/send', sendBody)
  return res.ok
}
