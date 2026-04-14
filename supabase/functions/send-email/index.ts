// Edge Function: send-email
// Story: 3.3 — Notifications email transactionnelles
// Story: 5.4 — Envoi direct aux prospects (sans auth account)
//
// Déclenchement : appelé par trigger DB ou directement via pg_net
// Input A: { notificationId: string }
// Input B: { to: string, template: 'welcome-lab' | 'prospect-resources', data: object }

import { handleSendEmail, handleDirectEmail } from './handler.ts'

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { 'Content-Type': 'application/json' } }
    )
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const resendApiKey = Deno.env.get('RESEND_API_KEY')
  const emailFrom = Deno.env.get('EMAIL_FROM') ?? 'MonprojetPro <noreply@monprojet-pro.com>'

  if (!supabaseUrl || !serviceRoleKey || !resendApiKey) {
    console.error('[EMAIL:SEND] Missing required environment variables')
    return new Response(
      JSON.stringify({ error: 'Server configuration error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }

  const config = { supabaseUrl, serviceRoleKey, resendApiKey, emailFrom }

  let body: { notificationId?: string; to?: string; template?: string; data?: Record<string, unknown> }
  try {
    body = await req.json()
  } catch {
    return new Response(
      JSON.stringify({ error: 'Invalid JSON body' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }

  // Route: Direct send (prospect emails without auth account)
  if (body.to && body.template) {
    const result = await handleDirectEmail(
      { to: body.to, template: body.template as 'welcome-lab' | 'prospect-resources', data: body.data ?? {} },
      config
    )
    const status = result.success ? 200 : 500
    return new Response(JSON.stringify(result), {
      status,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Route: Notification-based send
  if (!body.notificationId) {
    return new Response(
      JSON.stringify({ error: 'Missing notificationId or (to + template)' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }

  const result = await handleSendEmail(
    { notificationId: body.notificationId },
    config
  )

  const status = result.success ? 200 : 500
  return new Response(JSON.stringify(result), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
})
