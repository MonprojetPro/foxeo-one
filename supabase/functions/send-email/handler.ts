// [EMAIL:HANDLER] Logique métier de l'Edge Function send-email
// Séparé de l'entry point Deno pour testabilité Vitest

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { createEmailClient } from '../_shared/email-client.ts'
import { validationEmailTemplate } from '../_shared/email-templates/validation.ts'
import { newMessageEmailTemplate } from '../_shared/email-templates/new-message.ts'
import { alertInactivityEmailTemplate } from '../_shared/email-templates/alert-inactivity.ts'
import { graduationEmailTemplate } from '../_shared/email-templates/graduation.ts'
import { paymentFailedEmailTemplate } from '../_shared/email-templates/payment-failed.ts'
import { welcomeLabEmailTemplate } from '../_shared/email-templates/welcome-lab.ts'
import { welcomeOneEmailTemplate } from '../_shared/email-templates/welcome-one.ts'
import { finalPaymentConfirmationEmailTemplate } from '../_shared/email-templates/final-payment-confirmation.ts'
import { prospectResourcesEmailTemplate } from '../_shared/email-templates/prospect-resources.ts'
import { exportReadyEmailTemplate } from '../_shared/email-templates/export-ready.ts'
import { escapeHtml } from '../_shared/email-templates/base.ts'

export interface SendEmailInput {
  notificationId: string
}

// Direct email send (prospects / new clients without in-app notification)
export type DirectEmailTemplate =
  | 'welcome-lab'
  | 'welcome-one'
  | 'final-payment-confirmation'
  | 'prospect-resources'

export interface DirectEmailInput {
  to: string
  template: DirectEmailTemplate
  data: Record<string, unknown>
}

export interface DirectEmailResult {
  success: boolean
  error?: string
}

export async function handleDirectEmail(
  input: DirectEmailInput,
  config: SendEmailConfig
): Promise<DirectEmailResult> {
  const emailClient = createEmailClient({ apiKey: config.resendApiKey, from: config.emailFrom })

  let subject: string
  let html: string

  switch (input.template) {
    case 'welcome-lab': {
      const d = input.data as { clientName: string; firstStepLabel: string; activationLink: string }
      subject = 'Bienvenue dans MonprojetPro Lab !'
      html = welcomeLabEmailTemplate(d)
      break
    }
    case 'welcome-one': {
      const d = input.data as { clientName: string; activationLink: string; temporaryPassword: string | null }
      subject = 'Votre espace MonprojetPro One est prêt'
      html = welcomeOneEmailTemplate(d)
      break
    }
    case 'final-payment-confirmation': {
      const d = input.data as { clientName: string }
      subject = 'Projet livré — MonprojetPro'
      html = finalPaymentConfirmationEmailTemplate(d)
      break
    }
    case 'prospect-resources': {
      const d = input.data as { links: Array<{ name: string; url: string }> }
      subject = 'Vos ressources MonprojetPro'
      html = prospectResourcesEmailTemplate(d)
      break
    }
    default:
      return { success: false, error: `Unknown direct template: ${input.template}` }
  }

  try {
    await emailClient.sendWithRetry({ to: input.to, subject, html })
    return { success: true }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error(`[EMAIL:DIRECT] Failed to send ${input.template} to ${input.to}:`, msg)
    return { success: false, error: msg }
  }
}

export interface SendEmailConfig {
  supabaseUrl: string
  serviceRoleKey: string
  resendApiKey: string
  emailFrom: string
}

export interface SendEmailResult {
  success: boolean
  skipped?: boolean
  emailFailed?: boolean
  error?: string
}

interface NotificationRow {
  id: string
  recipient_type: 'client' | 'operator'
  recipient_id: string
  type: string
  title: string
  body: string | null
  link: string | null
}

interface RecipientRow {
  email: string
  name: string
  /** Prénom — colonne `clients` uniquement (la table `operators` n'en a pas). */
  first_name?: string | null
  company?: string
  email_notifications_enabled: boolean
}

/**
 * Nom à employer pour S'ADRESSER au destinataire (« Bonjour … »).
 *
 * ⚠️ `clients.name` est le NOM DE FAMILLE (le formulaire de création dit « Nom de
 * famille »), le prénom vit dans `first_name`. Tous les emails écrivaient donc
 * « Bonjour Vasseur, 🎉 Bienvenue dans MonprojetPro Lab ! » — froid et incorrect, sur
 * le tout premier email reçu par un nouveau client. Le défaut est resté invisible tant
 * que le seul client de test s'appelait « Dev Test » (nom complet dans `name`).
 *
 * Les opérateurs n'ont pas de `first_name` : le fallback sur `name` leur convient (MiKL).
 */
function greetingName(recipient: RecipientRow): string {
  return recipient.first_name?.trim() || recipient.name
}

function buildPlatformUrl(notification: NotificationRow): string {
  // Bases configurables via env. Defauts = URLs Vercel reelles tant que les
  // sous-domaines app./hub.monprojet-pro.com ne sont pas branches en DNS.
  // lab.monprojet-pro.com n'existe pas — ne jamais l'utiliser.
  const clientBase = Deno.env.get('CLIENT_APP_URL') ?? 'https://monprojetpro-client.vercel.app'
  const hubBase = Deno.env.get('HUB_URL') ?? 'https://monprojetpro-hub.vercel.app'
  const base = notification.recipient_type === 'operator' ? hubBase : clientBase
  return notification.link ? `${base}${notification.link}` : base
}

// ============================================================
// DB template lookup + variable substitution (Story 12.3)
// ============================================================

/** Map notification type + optional outcome to email_templates.template_key */
function resolveTemplateKey(notification: NotificationRow): string | null {
  switch (notification.type) {
    case 'validation':
      return notification.body?.includes('refusé') ? 'brief_refuse' : 'brief_valide'
    case 'graduation':
      return 'graduation'
    case 'payment':
      return 'echec_paiement'
    case 'inactivity_alert':
    case 'alert':
      return 'rappel_parcours'
    default:
      return null
  }
}

/** Substitute {variable} placeholders with safe HTML-escaped values.
 *  All literal text (non-variable parts) is also escaped for safe HTML embedding. */
function substituteTemplateVars(
  template: string,
  vars: Record<string, string>
): string {
  // Split by {variable} pattern, process each segment
  const parts = template.split(/(\{\w+\})/)
  return parts
    .map((part) => {
      const match = part.match(/^\{(\w+)\}$/)
      if (match) {
        const value = vars[match[1]]
        return value !== undefined ? escapeHtml(value) : escapeHtml(part)
      }
      return escapeHtml(part)
    })
    .join('')
}

/** Wrap pre-escaped body in basic HTML (text is already HTML-safe from substituteTemplateVars) */
function plainTextToHtml(text: string, subject: string): string {
  const lines = text
    .split('\n')
    .map((line) => (line.trim() === '' ? '<br />' : `<p style="margin:0 0 8px;">${line}</p>`))
    .join('\n')
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8" /><title>${escapeHtml(subject)}</title></head><body style="font-family:Arial,sans-serif;padding:20px;max-width:600px;margin:0 auto;">${lines}</body></html>`
}

/** Try to fetch a customized template from email_templates table.
 *  Returns null if not found or on error (caller falls back to hardcoded). */
async function fetchDbEmailTemplate(
  supabase: ReturnType<typeof createClient>,
  templateKey: string
): Promise<{ subject: string; body: string } | null> {
  try {
    const { data, error } = await supabase
      .from('email_templates')
      .select('subject, body')
      .eq('template_key', templateKey)
      .single()
    if (error || !data) return null
    return { subject: data.subject as string, body: data.body as string }
  } catch {
    return null
  }
}

function renderTemplate(notification: NotificationRow, recipient: RecipientRow): { subject: string; html: string } {
  const platformUrl = buildPlatformUrl(notification)

  switch (notification.type) {
    case 'validation':
      return {
        subject: `Votre brief a été traité — MonprojetPro`,
        html: validationEmailTemplate({
          clientName: greetingName(recipient),
          briefTitle: notification.title,
          outcome: notification.body?.includes('refusé') ? 'refused' : 'validated',
          comment: notification.body ?? undefined,
          platformUrl,
        }),
      }

    case 'message': {
      // Extraire le nom de l'expéditeur depuis le titre (format: "Nouveau message de {sender}")
      const senderMatch = notification.title.match(/(?:Nouveau message de |New message from )(.+)/)
      const senderName = senderMatch?.[1] ?? (notification.recipient_type === 'client' ? 'votre accompagnateur' : 'votre client')
      return {
        subject: notification.title,
        html: newMessageEmailTemplate({
          recipientName: greetingName(recipient),
          senderName,
          messagePreview: notification.body ?? '',
          platformUrl,
          recipientType: notification.recipient_type,
        }),
      }
    }

    case 'inactivity_alert':
    case 'alert': {
      const clientNameMatch = notification.title.match(/Client inactif\s*:\s*(.+)/)
      // Extraire le nombre de jours depuis le body (format: "inactif depuis X jours")
      const daysMatch = notification.body?.match(/inactif depuis (\d+) jours/)
      // Extraire la date depuis le body (format: "Dernière activité : DD/MM/YYYY")
      const dateMatch = notification.body?.match(/Derni[eè]re activit[ée]\s*:\s*(\S+)/)
      return {
        subject: notification.title,
        html: alertInactivityEmailTemplate({
          clientName: clientNameMatch?.[1] ?? 'Votre client',
          daysSinceActivity: daysMatch ? parseInt(daysMatch[1], 10) : 0,
          lastActivityDate: dateMatch?.[1] ?? new Date().toLocaleDateString('fr-FR'),
          platformUrl,
        }),
      }
    }

    case 'graduation':
      return {
        subject: 'Félicitations ! Votre espace One est prêt — MonprojetPro',
        html: graduationEmailTemplate({
          clientName: greetingName(recipient),
          oneUrl: platformUrl,
        }),
      }

    case 'export_ready':
      return {
        subject: 'Votre export de données est prêt — MonprojetPro',
        html: exportReadyEmailTemplate({
          clientName: greetingName(recipient),
          downloadUrl: platformUrl,
        }),
      }

    case 'payment': {
      // Extraire le montant depuis le body (format: "X,XX EUR" ou "X.XX EUR")
      const amountMatch = notification.body?.match(/([\d.,]+)\s*(EUR|€)/)
      return {
        subject: 'Échec de paiement — MonprojetPro',
        html: paymentFailedEmailTemplate({
          recipientName: greetingName(recipient),
          amount: amountMatch?.[1] ?? '—',
          currency: amountMatch?.[2] ?? 'EUR',
          platformUrl,
          recipientType: notification.recipient_type,
        }),
      }
    }

    default:
      return {
        subject: notification.title,
        html: `<p>${notification.body ?? notification.title}</p>`,
      }
  }
}

// Task 5.2 — Alerte MiKL si > 5 échecs email en 1h
const EMAIL_FAILURE_THRESHOLD = 5
const EMAIL_FAILURE_WINDOW_MS = 60 * 60 * 1000 // 1 heure

async function checkEmailFailureThreshold(
  supabase: ReturnType<typeof createClient>,
  recipientId: string
): Promise<void> {
  try {
    const oneHourAgo = new Date(Date.now() - EMAIL_FAILURE_WINDOW_MS).toISOString()
    const { count, error } = await supabase
      .from('activity_logs')
      .select('id', { count: 'exact', head: true })
      .eq('action', 'email_failed')
      .gte('created_at', oneHourAgo)

    if (error || count === null) return
    if (count <= EMAIL_FAILURE_THRESHOLD) return

    // Alerter tous les opérateurs (admins)
    const { data: operators } = await supabase
      .from('operators')
      .select('auth_user_id')
      .eq('role', 'admin')

    if (!operators?.length) return

    for (const op of operators) {
      if (!op.auth_user_id) continue
      await supabase.from('notifications').insert({
        recipient_type: 'operator',
        recipient_id: op.auth_user_id,
        type: 'alert',
        title: `Alerte email : ${count} échecs en 1h`,
        body: `Le service email a enregistré ${count} échecs d'envoi dans la dernière heure. Vérifiez la configuration Resend.`,
        link: null,
      })
    }

    console.warn(`[EMAIL:MONITOR] Alert triggered: ${count} failures in last hour`)
  } catch (err) {
    // Le monitoring ne doit pas bloquer le flux principal
    console.error('[EMAIL:MONITOR] Failed to check failure threshold:', err)
  }
}

export async function handleSendEmail(
  input: SendEmailInput,
  config: SendEmailConfig
): Promise<SendEmailResult> {
  const supabase = createClient(config.supabaseUrl, config.serviceRoleKey)
  const emailClient = createEmailClient({ apiKey: config.resendApiKey, from: config.emailFrom })

  // 1. Fetch notification
  const { data: notification, error: notifError } = await supabase
    .from('notifications')
    .select('id, recipient_type, recipient_id, type, title, body, link')
    .eq('id', input.notificationId)
    .single()

  if (notifError || !notification) {
    console.error('[EMAIL:SEND] Notification not found:', input.notificationId, notifError)
    return { success: false, error: `Notification not found: ${notifError?.message}` }
  }

  const notif = notification as NotificationRow

  // 2. Fetch recipient and check email preferences
  // recipient_id = auth.uid() (via RLS), donc on cherche par auth_user_id
  const recipientTable = notif.recipient_type === 'client' ? 'clients' : 'operators'
  // `company` n'existe QUE sur clients : le demander sur operators fait echouer tout
  // le select (colonne inconnue) -> "Recipient not found" -> aucun email operateur.
  // `first_name` et `company` n'existent QUE sur clients : les demander sur operators
  // fait echouer tout le select (colonne inconnue) -> "Recipient not found".
  const recipientColumns =
    notif.recipient_type === 'client'
      ? 'email, name, first_name, company, email_notifications_enabled'
      : 'email, name, email_notifications_enabled'
  const { data: recipient, error: recipientError } = await supabase
    .from(recipientTable)
    .select(recipientColumns)
    .eq('auth_user_id', notif.recipient_id)
    .single()

  if (recipientError || !recipient) {
    console.error('[EMAIL:SEND] Recipient not found:', notif.recipient_id, recipientError)
    return { success: false, error: `Recipient not found: ${recipientError?.message}` }
  }

  const recip = recipient as RecipientRow

  // 3. Check preferences (default: true)
  const emailEnabled = recip.email_notifications_enabled !== false
  if (!emailEnabled) {
    console.log(`[EMAIL:SEND] Skipped — email notifications disabled for recipient ${notif.recipient_id}`)
    return { success: true, skipped: true }
  }

  // 4. Build and send email
  // 4a. Check for customized DB template first (Story 12.3)
  try {
    let subject: string
    let html: string

    const templateKey = resolveTemplateKey(notif)
    const dbTemplate = templateKey ? await fetchDbEmailTemplate(supabase, templateKey) : null

    if (dbTemplate) {
      const platformUrl = buildPlatformUrl(notif)
      const amountMatch = notif.body?.match(/([\d.,]+)\s*(EUR|€)/)
      const briefTitleMatch = notif.title.match(/^[^—]+—\s*(.+)$/)
      const vars: Record<string, string> = {
        // La variable s'appelle « prenom » dans les templates éditables : elle doit
        // vraiment contenir le prénom, pas `clients.name` (= le nom de famille).
        prenom: greetingName(recip),
        entreprise: recip.company ?? '',
        titre_brief: briefTitleMatch?.[1] ?? notif.title,
        commentaire: notif.body ?? '',
        lien: platformUrl,
        montant: amountMatch ? `${amountMatch[1]} ${amountMatch[2]}` : '',
      }
      subject = substituteTemplateVars(dbTemplate.subject, vars)
      const htmlBody = substituteTemplateVars(dbTemplate.body, vars)
      html = plainTextToHtml(htmlBody, subject)
    } else {
      // Fallback to hardcoded templates
      const rendered = renderTemplate(notif, recip)
      subject = rendered.subject
      html = rendered.html
    }

    await emailClient.sendWithRetry({ to: recip.email, subject, html })

    // 5. Log success
    await supabase.from('activity_logs').insert({
      actor_type: 'system',
      actor_id: notif.recipient_id,
      action: 'email_sent',
      entity_type: 'notification',
      entity_id: notif.id,
      metadata: { type: notif.type, recipient: recip.email },
    })

    return { success: true }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error(`[EMAIL:FAILED] Failed to send email for notification ${notif.id}:`, errorMessage)

    // Log failure in activity_logs (mode dégradé — in-app reste fonctionnel)
    await supabase.from('activity_logs').insert({
      actor_type: 'system',
      actor_id: notif.recipient_id,
      action: 'email_failed',
      entity_type: 'notification',
      entity_id: notif.id,
      metadata: { type: notif.type, recipient: recip.email, error: errorMessage },
    })

    // Task 5.2 — Monitoring : alerte MiKL si > 5 échecs en 1h
    await checkEmailFailureThreshold(supabase, notif.recipient_id)

    return { success: false, emailFailed: true, error: errorMessage }
  }
}
