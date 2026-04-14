// [EMAIL:CLIENT] MonprojetPro email client — wrapper Resend avec retry
// Utilise uniquement l'API fetch standard (Deno + Node compatible)

export interface EmailPayload {
  to: string
  subject: string
  html: string
}

export interface EmailClientConfig {
  apiKey: string
  from: string
}

export interface EmailClient {
  send: (payload: EmailPayload) => Promise<void>
  sendWithRetry: (payload: EmailPayload, maxRetries?: number) => Promise<void>
}

export async function sendEmail(
  payload: EmailPayload,
  config: EmailClientConfig
): Promise<void> {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: config.from,
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(
      `Resend API error: ${(error as { message?: string }).message ?? response.statusText}`
    )
  }
}

export async function sendWithRetry(
  payload: EmailPayload,
  config: EmailClientConfig,
  maxRetries = 3
): Promise<void> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await sendEmail(payload, config)
      console.log(`[EMAIL:SEND] Sent to ${payload.to} (attempt ${attempt})`)
      return
    } catch (error) {
      if (attempt === maxRetries) {
        console.error(`[EMAIL:FAILED] Failed to send to ${payload.to} after ${maxRetries} attempts:`, error)
        throw error
      }
      const delay = Math.pow(3, attempt - 1) * 1000 // 1s → 3s → 9s
      console.warn(`[EMAIL:RETRY] Attempt ${attempt} failed, retrying in ${delay}ms...`)
      await new Promise((resolve) => setTimeout(resolve, delay))
    }
  }
}

export function createEmailClient(config: EmailClientConfig): EmailClient {
  return {
    send: (payload: EmailPayload) => sendEmail(payload, config),
    sendWithRetry: (payload: EmailPayload, maxRetries?: number) =>
      sendWithRetry(payload, config, maxRetries),
  }
}
