// Edge Function: send-email
// Story: 3.3 — Notifications email transactionnelles · 5.4 — Envoi direct prospects
//
// VERSION CONSOLIDEE (auto-contenue). Deployee via MCP (le CLI n'a pas les
// privileges et le MCP ne bundle pas ../_shared). Logique de reference testee
// dans handler.ts + _shared/email-templates/*. Garder les deux en phase.
//
// Input A: { notificationId: string }   (route notification)
// Input B: { to, template, data }        (route directe)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

interface BaseTemplateContent { title: string; body: string; ctaUrl?: string; ctaText?: string }

function baseTemplate(content: BaseTemplateContent): string {
  const cta = content.ctaUrl
    ? `<a href="${content.ctaUrl}" style="display:inline-block;margin-top:24px;padding:12px 24px;background:#059669;color:#ffffff;border-radius:6px;text-decoration:none;font-family:'Poppins',sans-serif;font-weight:600;">${content.ctaText ?? 'Voir sur MonprojetPro'}</a>`
    : ''
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /><title>${escapeHtml(content.title)}</title></head><body style="margin:0;padding:20px;background:#f4f4f5;font-family:'Inter',Arial,sans-serif;"><div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:8px;padding:32px;"><h2 style="color:#0a0a0a;font-family:'Poppins',sans-serif;margin:0 0 16px;">${escapeHtml(content.title)}</h2><div style="color:#3f3f46;line-height:1.6;">${content.body}</div>${cta}<hr style="margin-top:32px;border:none;border-top:1px solid #e4e4e7;" /><p style="font-size:12px;color:#a1a1aa;margin:16px 0 0;">Vous recevez cet email car vous êtes inscrit sur MonprojetPro.</p></div></body></html>`
}

interface EmailPayload { to: string; subject: string; html: string }
interface EmailClientConfig { apiKey: string; from: string }

async function resendSend(payload: EmailPayload, config: EmailClientConfig): Promise<void> {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${config.apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: config.from, to: payload.to, subject: payload.subject, html: payload.html }),
  })
  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(`Resend API error: ${(error as { message?: string }).message ?? response.statusText}`)
  }
}

async function sendWithRetry(payload: EmailPayload, config: EmailClientConfig, maxRetries = 3): Promise<void> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await resendSend(payload, config)
      console.log(`[EMAIL:SEND] Sent to ${payload.to} (attempt ${attempt})`)
      return
    } catch (error) {
      if (attempt === maxRetries) {
        console.error(`[EMAIL:FAILED] Failed to send to ${payload.to} after ${maxRetries} attempts:`, error)
        throw error
      }
      const delay = Math.pow(3, attempt - 1) * 1000
      console.warn(`[EMAIL:RETRY] Attempt ${attempt} failed, retrying in ${delay}ms...`)
      await new Promise((resolve) => setTimeout(resolve, delay))
    }
  }
}

function validationEmailTemplate(d: { clientName: string; briefTitle: string; outcome: 'validated' | 'refused'; comment?: string; platformUrl: string }): string {
  const outcomeText = d.outcome === 'validated' ? 'validé' : 'refusé'
  const commentSection = d.comment ? `<p style="margin-top:12px;padding:12px;background:#f4f4f5;border-radius:6px;font-style:italic;">"${escapeHtml(d.comment)}"</p>` : ''
  const body = `<p>Bonjour <strong>${escapeHtml(d.clientName)}</strong>,</p><p>Votre brief <strong>"${escapeHtml(d.briefTitle)}"</strong> a été <strong>${outcomeText}</strong> par votre accompagnateur MonprojetPro.</p>${commentSection}${d.outcome === 'validated' ? '<p>Félicitations ! Vous pouvez passer à l\'étape suivante.</p>' : '<p>Pas d\'inquiétude — consultez les retours et soumettez une nouvelle version.</p>'}`
  return baseTemplate({ title: `Votre brief a été ${outcomeText}`, body, ctaUrl: d.platformUrl, ctaText: 'Voir sur MonprojetPro' })
}

function newMessageEmailTemplate(d: { recipientName: string; senderName: string; messagePreview: string; platformUrl: string }): string {
  const preview = d.messagePreview.length > 200 ? d.messagePreview.slice(0, 200) + '...' : d.messagePreview
  const body = `<p>Bonjour <strong>${escapeHtml(d.recipientName)}</strong>,</p><p>Vous avez reçu un nouveau message de <strong>${escapeHtml(d.senderName)}</strong>.</p><blockquote style="margin:16px 0;padding:12px 16px;border-left:4px solid #e4e4e7;color:#71717a;font-style:italic;">${escapeHtml(preview)}</blockquote><p>Connectez-vous pour répondre.</p>`
  return baseTemplate({ title: `Nouveau message de ${d.senderName}`, body, ctaUrl: d.platformUrl, ctaText: 'Voir le message' })
}

function alertInactivityEmailTemplate(d: { clientName: string; daysSinceActivity: number; lastActivityDate: string; platformUrl: string }): string {
  const body = `<p>Bonjour,</p><p>Votre client <strong>${escapeHtml(d.clientName)}</strong> est <strong>inactif depuis ${d.daysSinceActivity} jours</strong>.</p><p>Dernière activité enregistrée : <strong>${escapeHtml(d.lastActivityDate)}</strong>.</p><p>Un suivi proactif maintenant peut faire la différence dans son parcours Lab.</p>`
  return baseTemplate({ title: `Client inactif : ${d.clientName}`, body, ctaUrl: d.platformUrl, ctaText: 'Voir la fiche client' })
}

function graduationEmailTemplate(d: { clientName: string; oneUrl: string }): string {
  const body = `<p>Bonjour <strong>${escapeHtml(d.clientName)}</strong>,</p><p>🎉 <strong>Félicitations !</strong> Vous avez terminé votre parcours Lab avec succès.</p><p>Votre espace <strong>MonprojetPro One</strong> est maintenant prêt.</p><p>Bienvenue dans votre nouvelle aventure entrepreneuriale !</p>`
  return baseTemplate({ title: 'Félicitations ! Votre espace One est prêt', body, ctaUrl: d.oneUrl, ctaText: 'Accéder à mon espace One' })
}

function paymentFailedEmailTemplate(d: { recipientName: string; clientName?: string; amount: string; currency: string; platformUrl: string; recipientType: 'client' | 'operator' }): string {
  const isOperator = d.recipientType === 'operator'
  const title = `Échec de paiement${isOperator && d.clientName ? ` — ${d.clientName}` : ''}`
  const body = isOperator
    ? `<p>Bonjour <strong>${escapeHtml(d.recipientName)}</strong>,</p><p>Un <strong>échec de paiement</strong> a été détecté pour votre client <strong>${escapeHtml(d.clientName ?? 'inconnu')}</strong>.</p><p>Montant : <strong>${escapeHtml(d.amount)} ${escapeHtml(d.currency)}</strong></p>`
    : `<p>Bonjour <strong>${escapeHtml(d.recipientName)}</strong>,</p><p>Nous n'avons pas pu traiter votre <strong>paiement</strong> de <strong>${escapeHtml(d.amount)} ${escapeHtml(d.currency)}</strong>.</p><p>Veuillez vérifier votre moyen de paiement.</p>`
  return baseTemplate({ title, body, ctaUrl: d.platformUrl, ctaText: isOperator ? 'Voir les détails' : 'Mettre à jour mon paiement' })
}

function exportReadyEmailTemplate(d: { clientName: string; downloadUrl: string }): string {
  const body = `<p>Bonjour <strong>${escapeHtml(d.clientName)}</strong>,</p><p>Votre export de données personnelles est prêt. Conformément au RGPD (article 15), il contient l'ensemble des informations que nous détenons à votre sujet.</p><p>Pour des raisons de sécurité, le lien de téléchargement <strong>expire dans 7 jours</strong>.</p>`
  return baseTemplate({ title: 'Votre export de données est prêt', body, ctaUrl: d.downloadUrl, ctaText: 'Télécharger mes données' })
}

function welcomeLabEmailTemplate(d: { clientName: string; parcoursName: string; activationLink: string }): string {
  const body = `<p>Bonjour <strong>${escapeHtml(d.clientName)}</strong>,</p><p>🎉 Bienvenue dans <strong>MonprojetPro Lab</strong> !</p><p>Votre parcours <strong>${escapeHtml(d.parcoursName)}</strong> est maintenant prêt.</p><p style="color:#6b7280;font-size:14px;">Ce lien d'activation est valable 7 jours.</p>`
  return baseTemplate({ title: 'Bienvenue dans MonprojetPro Lab !', body, ctaUrl: d.activationLink, ctaText: 'Activer mon espace Lab' })
}

function welcomeOneEmailTemplate(d: { clientName: string; activationLink: string; temporaryPassword: string | null }): string {
  const pwdBlock = d.temporaryPassword
    ? `<p>Votre mot de passe temporaire : <code style="background:#f4f4f5;padding:4px 8px;border-radius:4px;font-family:monospace;">${escapeHtml(d.temporaryPassword)}</code></p>`
    : `<p style="color:#6b7280;font-size:14px;">Utilisez l'email et le mot de passe que vous avez déjà définis.</p>`
  const body = `<p>Bonjour <strong>${escapeHtml(d.clientName)}</strong>,</p><p>🎉 Votre espace <strong>MonprojetPro One</strong> est maintenant actif.</p>${pwdBlock}`
  return baseTemplate({ title: 'Votre espace One est prêt !', body, ctaUrl: d.activationLink, ctaText: 'Accéder à mon espace' })
}

function finalPaymentConfirmationEmailTemplate(d: { clientName: string }): string {
  const body = `<p>Bonjour <strong>${escapeHtml(d.clientName)}</strong>,</p><p>✅ Nous confirmons la réception de votre paiement final.</p><p>Votre projet est maintenant entièrement livré et payé. Merci pour votre confiance !</p>`
  return baseTemplate({ title: 'Projet livré et payé en intégralité', body })
}

function prospectResourcesEmailTemplate(d: { links: Array<{ name: string; url: string }> }): string {
  const escapeUrl = (url: string) => url.replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const linkItems = d.links.map((link) => `<li style="margin-bottom:8px;"><a href="${escapeUrl(link.url)}" style="color:#059669;text-decoration:underline;">${escapeHtml(link.name)}</a></li>`).join('')
  const body = `<p>Suite à notre échange, voici les ressources utiles :</p>${d.links.length > 0 ? `<ul style="padding-left:20px;color:#3f3f46;">${linkItems}</ul>` : '<p>Aucune ressource disponible.</p>'}<p style="color:#6b7280;font-size:14px;">Ces liens sont valables 7 jours.</p>`
  return baseTemplate({ title: 'Vos ressources MonprojetPro', body })
}

interface SendEmailConfig { supabaseUrl: string; serviceRoleKey: string; resendApiKey: string; emailFrom: string }
interface NotificationRow { id: string; recipient_type: 'client' | 'operator'; recipient_id: string; type: string; title: string; body: string | null; link: string | null }
interface RecipientRow { email: string; name: string; company?: string; email_notifications_enabled: boolean }

function buildPlatformUrl(notification: NotificationRow): string {
  const base = notification.recipient_type === 'operator' ? 'https://hub.monprojet-pro.com' : 'https://lab.monprojet-pro.com'
  return notification.link ? `${base}${notification.link}` : base
}

function resolveTemplateKey(notification: NotificationRow): string | null {
  switch (notification.type) {
    case 'validation': return notification.body?.includes('refusé') ? 'brief_refuse' : 'brief_valide'
    case 'graduation': return 'graduation'
    case 'payment': return 'echec_paiement'
    case 'inactivity_alert':
    case 'alert': return 'rappel_parcours'
    default: return null
  }
}

function substituteTemplateVars(template: string, vars: Record<string, string>): string {
  const parts = template.split(/(\{\w+\})/)
  return parts.map((part) => {
    const match = part.match(/^\{(\w+)\}$/)
    if (match) { const value = vars[match[1]]; return value !== undefined ? escapeHtml(value) : escapeHtml(part) }
    return escapeHtml(part)
  }).join('')
}

function plainTextToHtml(text: string, subject: string): string {
  const lines = text.split('\n').map((line) => (line.trim() === '' ? '<br />' : `<p style="margin:0 0 8px;">${line}</p>`)).join('\n')
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8" /><title>${escapeHtml(subject)}</title></head><body style="font-family:Arial,sans-serif;padding:20px;max-width:600px;margin:0 auto;">${lines}</body></html>`
}

async function fetchDbEmailTemplate(supabase: ReturnType<typeof createClient>, templateKey: string): Promise<{ subject: string; body: string } | null> {
  try {
    const { data, error } = await supabase.from('email_templates').select('subject, body').eq('template_key', templateKey).single()
    if (error || !data) return null
    return { subject: data.subject as string, body: data.body as string }
  } catch { return null }
}

function renderTemplate(notification: NotificationRow, recipient: RecipientRow): { subject: string; html: string } {
  const platformUrl = buildPlatformUrl(notification)
  switch (notification.type) {
    case 'validation':
      return { subject: 'Votre brief a été traité — MonprojetPro', html: validationEmailTemplate({ clientName: recipient.name, briefTitle: notification.title, outcome: notification.body?.includes('refusé') ? 'refused' : 'validated', comment: notification.body ?? undefined, platformUrl }) }
    case 'message': {
      const senderMatch = notification.title.match(/(?:Nouveau message de |New message from )(.+)/)
      const senderName = senderMatch?.[1] ?? (notification.recipient_type === 'client' ? 'votre accompagnateur' : 'votre client')
      return { subject: notification.title, html: newMessageEmailTemplate({ recipientName: recipient.name, senderName, messagePreview: notification.body ?? '', platformUrl }) }
    }
    case 'inactivity_alert':
    case 'alert': {
      const clientNameMatch = notification.title.match(/Client inactif\s*:\s*(.+)/)
      const daysMatch = notification.body?.match(/inactif depuis (\d+) jours/)
      const dateMatch = notification.body?.match(/Derni[eè]re activit[eé]\s*:\s*(\S+)/)
      return { subject: notification.title, html: alertInactivityEmailTemplate({ clientName: clientNameMatch?.[1] ?? 'Votre client', daysSinceActivity: daysMatch ? parseInt(daysMatch[1], 10) : 0, lastActivityDate: dateMatch?.[1] ?? '', platformUrl }) }
    }
    case 'graduation':
      return { subject: 'Félicitations ! Votre espace One est prêt — MonprojetPro', html: graduationEmailTemplate({ clientName: recipient.name, oneUrl: platformUrl }) }
    case 'export_ready':
      return { subject: 'Votre export de données est prêt — MonprojetPro', html: exportReadyEmailTemplate({ clientName: recipient.name, downloadUrl: platformUrl }) }
    case 'payment': {
      const amountMatch = notification.body?.match(/([\d.,]+)\s*(EUR|€)/)
      return { subject: 'Échec de paiement — MonprojetPro', html: paymentFailedEmailTemplate({ recipientName: recipient.name, amount: amountMatch?.[1] ?? '—', currency: amountMatch?.[2] ?? 'EUR', platformUrl, recipientType: notification.recipient_type }) }
    }
    default:
      return { subject: notification.title, html: baseTemplate({ title: notification.title, body: `<p>${escapeHtml(notification.body ?? notification.title)}</p>`, ctaUrl: platformUrl }) }
  }
}

const EMAIL_FAILURE_THRESHOLD = 5
const EMAIL_FAILURE_WINDOW_MS = 60 * 60 * 1000

async function checkEmailFailureThreshold(supabase: ReturnType<typeof createClient>): Promise<void> {
  try {
    const oneHourAgo = new Date(Date.now() - EMAIL_FAILURE_WINDOW_MS).toISOString()
    const { count, error } = await supabase.from('activity_logs').select('id', { count: 'exact', head: true }).eq('action', 'email_failed').gte('created_at', oneHourAgo)
    if (error || count === null) return
    if (count <= EMAIL_FAILURE_THRESHOLD) return
    const { data: operators } = await supabase.from('operators').select('auth_user_id').eq('role', 'admin')
    if (!operators?.length) return
    for (const op of operators as Array<{ auth_user_id: string | null }>) {
      if (!op.auth_user_id) continue
      await supabase.from('notifications').insert({ recipient_type: 'operator', recipient_id: op.auth_user_id, type: 'alert', title: `Alerte email : ${count} échecs en 1h`, body: `Le service email a enregistré ${count} échecs d'envoi dans la dernière heure.`, link: null })
    }
  } catch (err) { console.error('[EMAIL:MONITOR] Failed:', err) }
}

interface SendEmailResult { success: boolean; skipped?: boolean; emailFailed?: boolean; error?: string }

async function handleSendEmail(notificationId: string, config: SendEmailConfig): Promise<SendEmailResult> {
  const supabase = createClient(config.supabaseUrl, config.serviceRoleKey)
  const { data: notification, error: notifError } = await supabase.from('notifications').select('id, recipient_type, recipient_id, type, title, body, link').eq('id', notificationId).single()
  if (notifError || !notification) { console.error('[EMAIL:SEND] Notification not found:', notificationId, notifError); return { success: false, error: `Notification not found: ${notifError?.message}` } }
  const notif = notification as NotificationRow
  const recipientTable = notif.recipient_type === 'client' ? 'clients' : 'operators'
  const { data: recipient, error: recipientError } = await supabase.from(recipientTable).select('email, name, company, email_notifications_enabled').eq('auth_user_id', notif.recipient_id).single()
  if (recipientError || !recipient) { console.error('[EMAIL:SEND] Recipient not found:', notif.recipient_id, recipientError); return { success: false, error: `Recipient not found: ${recipientError?.message}` } }
  const recip = recipient as RecipientRow
  if (recip.email_notifications_enabled === false) { console.log(`[EMAIL:SEND] Skipped — disabled for ${notif.recipient_id}`); return { success: true, skipped: true } }
  try {
    let subject: string
    let html: string
    const templateKey = resolveTemplateKey(notif)
    const dbTemplate = templateKey ? await fetchDbEmailTemplate(supabase, templateKey) : null
    if (dbTemplate) {
      const platformUrl = buildPlatformUrl(notif)
      const amountMatch = notif.body?.match(/([\d.,]+)\s*(EUR|€)/)
      const briefTitleMatch = notif.title.match(/^[^—]+—\s*(.+)$/)
      const vars: Record<string, string> = { prenom: recip.name, entreprise: recip.company ?? '', titre_brief: briefTitleMatch?.[1] ?? notif.title, commentaire: notif.body ?? '', lien: platformUrl, montant: amountMatch ? `${amountMatch[1]} ${amountMatch[2]}` : '' }
      subject = substituteTemplateVars(dbTemplate.subject, vars)
      html = plainTextToHtml(substituteTemplateVars(dbTemplate.body, vars), subject)
    } else {
      const rendered = renderTemplate(notif, recip)
      subject = rendered.subject
      html = rendered.html
    }
    await sendWithRetry({ to: recip.email, subject, html }, { apiKey: config.resendApiKey, from: config.emailFrom })
    await supabase.from('activity_logs').insert({ actor_type: 'system', actor_id: notif.recipient_id, action: 'email_sent', entity_type: 'notification', entity_id: notif.id, metadata: { type: notif.type, recipient: recip.email } })
    return { success: true }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error(`[EMAIL:FAILED] notification ${notif.id}:`, errorMessage)
    await supabase.from('activity_logs').insert({ actor_type: 'system', actor_id: notif.recipient_id, action: 'email_failed', entity_type: 'notification', entity_id: notif.id, metadata: { type: notif.type, recipient: recip.email, error: errorMessage } })
    await checkEmailFailureThreshold(supabase)
    return { success: false, emailFailed: true, error: errorMessage }
  }
}

type DirectEmailTemplate = 'welcome-lab' | 'welcome-one' | 'final-payment-confirmation' | 'prospect-resources'

async function handleDirectEmail(input: { to: string; template: DirectEmailTemplate; data: Record<string, unknown> }, config: SendEmailConfig): Promise<{ success: boolean; error?: string }> {
  let subject: string
  let html: string
  switch (input.template) {
    case 'welcome-lab': { const d = input.data as { clientName: string; parcoursName: string; activationLink: string }; subject = 'Bienvenue dans MonprojetPro Lab !'; html = welcomeLabEmailTemplate(d); break }
    case 'welcome-one': { const d = input.data as { clientName: string; activationLink: string; temporaryPassword: string | null }; subject = 'Votre espace MonprojetPro One est prêt'; html = welcomeOneEmailTemplate(d); break }
    case 'final-payment-confirmation': { const d = input.data as { clientName: string }; subject = 'Projet livré — MonprojetPro'; html = finalPaymentConfirmationEmailTemplate(d); break }
    case 'prospect-resources': { const d = input.data as { links: Array<{ name: string; url: string }> }; subject = 'Vos ressources MonprojetPro'; html = prospectResourcesEmailTemplate(d); break }
    default: return { success: false, error: `Unknown direct template: ${input.template}` }
  }
  try {
    await sendWithRetry({ to: input.to, subject, html }, { apiKey: config.resendApiKey, from: config.emailFrom })
    return { success: true }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error(`[EMAIL:DIRECT] Failed ${input.template} to ${input.to}:`, msg)
    return { success: false, error: msg }
  }
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: { 'Content-Type': 'application/json' } })
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const resendApiKey = Deno.env.get('RESEND_API_KEY')
  const emailFrom = Deno.env.get('EMAIL_FROM') ?? 'MonprojetPro <contact@monprojet-pro.com>'
  if (!supabaseUrl || !serviceRoleKey || !resendApiKey) {
    console.error('[EMAIL:SEND] Missing env vars (RESEND_API_KEY ?)')
    return new Response(JSON.stringify({ error: 'Server configuration error', missing: { RESEND_API_KEY: !resendApiKey } }), { status: 500, headers: { 'Content-Type': 'application/json' } })
  }
  const config: SendEmailConfig = { supabaseUrl, serviceRoleKey, resendApiKey, emailFrom }
  let body: { notificationId?: string; to?: string; template?: string; data?: Record<string, unknown> }
  try { body = await req.json() } catch { return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { status: 400, headers: { 'Content-Type': 'application/json' } }) }
  if (body.to && body.template) {
    const result = await handleDirectEmail({ to: body.to, template: body.template as DirectEmailTemplate, data: body.data ?? {} }, config)
    return new Response(JSON.stringify(result), { status: result.success ? 200 : 500, headers: { 'Content-Type': 'application/json' } })
  }
  if (!body.notificationId) return new Response(JSON.stringify({ error: 'Missing notificationId or (to + template)' }), { status: 400, headers: { 'Content-Type': 'application/json' } })
  const result = await handleSendEmail(body.notificationId, config)
  return new Response(JSON.stringify(result), { status: result.success ? 200 : 500, headers: { 'Content-Type': 'application/json' } })
})
