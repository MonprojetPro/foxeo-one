/**
 * Email d'invitation à une visio — texte brut ET HTML, fonctions PURES.
 *
 * ⚠️ POURQUOI CE FICHIER N'EST PAS UNE SERVER ACTION : tout ce qu'exporte un
 * fichier `'use server'` devient un endpoint appelable depuis le navigateur. Un
 * formateur de texte n'a aucune raison d'ouvrir une surface réseau.
 *
 * 🔑 LES DEUX VERSIONS PARTENT ENSEMBLE (T-057). Le HTML donne l'email soigné
 * que MiKL demandait ; le texte reste le repli universel — clients en mode
 * texte, lecteurs d'écran, aperçus de notification. Envoyer de l'HTML seul
 * laisserait ces lecteurs devant un message vide.
 *
 * Le visuel reprend celui des emails transactionnels (`_shared/email-templates`)
 * plutôt que d'en inventer un second : deux chartes finissent toujours par
 * diverger. On n'importe pas ce module — il vit côté Deno — mais on en suit la
 * grammaire : même carte blanche, même vert, même typographie.
 */

export interface MeetInvitationInput {
  clientName: string
  title: string
  meetUri: string
  scheduledAt?: string
  message?: string
}

const ACCENT = '#059669'

export function formatMeetingDateFr(iso: string): string {
  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'full',
    timeStyle: 'short',
    timeZone: 'Europe/Paris',
  }).format(new Date(iso))
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/** Corps texte brut — repli universel, jamais omis. */
export function buildMeetInvitationBody(input: MeetInvitationInput): string {
  const lines = [`Bonjour ${input.clientName},`, '']

  if (input.message?.trim()) {
    lines.push(input.message.trim(), '')
  }

  if (input.scheduledAt) {
    lines.push(
      `Notre rendez-vous « ${input.title} » est prévu le ${formatMeetingDateFr(input.scheduledAt)}.`
    )
  } else {
    lines.push(`Voici le lien pour notre visioconférence « ${input.title} ».`)
  }

  lines.push(
    '',
    'Lien pour rejoindre la visio :',
    input.meetUri,
    '',
    "Aucune installation n'est nécessaire : le lien s'ouvre directement dans votre navigateur.",
    '',
    'À bientôt,',
    'MiKL — MonprojetPro'
  )

  return lines.join('\n')
}

/** Version HTML — même contenu, présentation soignée. */
export function buildMeetInvitationHtml(input: MeetInvitationInput): string {
  const safeName = escapeHtml(input.clientName)
  const safeTitle = escapeHtml(input.title)

  // ⚠️ Le lien n'est inséré que s'il est bien http(s) : une URL `javascript:`
  // dans un `href` est une porte ouverte, et rien ne garantit la forme d'une
  // valeur venue d'une API tierce.
  const safeUri = /^https?:\/\//.test(input.meetUri) ? escapeHtml(input.meetUri) : ''

  const when = input.scheduledAt
    ? `<p style="margin:0 0 16px;">Notre rendez-vous <strong>« ${safeTitle} »</strong> est prévu le <strong>${escapeHtml(formatMeetingDateFr(input.scheduledAt))}</strong>.</p>`
    : `<p style="margin:0 0 16px;">Voici le lien pour notre visioconférence <strong>« ${safeTitle} »</strong>.</p>`

  const note = input.message?.trim()
    ? `<p style="margin:0 0 16px;padding:12px 16px;background:#f4f4f5;border-left:3px solid ${ACCENT};border-radius:4px;color:#3f3f46;">${escapeHtml(input.message.trim())}</p>`
    : ''

  const button = safeUri
    ? `<a href="${safeUri}" style="display:inline-block;margin:8px 0 16px;padding:14px 28px;background:${ACCENT};color:#ffffff;border-radius:6px;text-decoration:none;font-family:'Poppins',Arial,sans-serif;font-weight:600;">Rejoindre la visio</a>
       <p style="margin:0 0 16px;font-size:13px;color:#71717a;">Si le bouton ne fonctionne pas, copiez ce lien :<br /><a href="${safeUri}" style="color:${ACCENT};word-break:break-all;">${safeUri}</a></p>`
    : ''

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Visio MonprojetPro</title>
</head>
<body style="margin:0;padding:20px;background:#f4f4f5;font-family:'Inter',Arial,sans-serif;">
  <div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:8px;padding:32px;">
    <p style="margin:0 0 24px;font-family:'Poppins',sans-serif;font-weight:700;font-size:18px;color:${ACCENT};letter-spacing:-0.01em;">MonprojetPro</p>
    <h2 style="color:#0a0a0a;font-family:'Poppins',sans-serif;margin:0 0 16px;font-size:20px;">Invitation à une visioconférence</h2>
    <div style="color:#3f3f46;line-height:1.6;">
      <p style="margin:0 0 16px;">Bonjour <strong>${safeName}</strong>,</p>
      ${note}
      ${when}
      ${button}
      <p style="margin:0 0 16px;font-size:14px;color:#71717a;">Aucune installation n'est nécessaire : le lien s'ouvre directement dans votre navigateur.</p>
      <p style="margin:24px 0 0;">À bientôt,<br /><strong>MiKL</strong> — MonprojetPro</p>
    </div>
  </div>
</body>
</html>`
}
