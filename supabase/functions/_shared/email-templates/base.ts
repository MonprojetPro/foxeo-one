// [EMAIL:TEMPLATE] Template de base MonprojetPro — layout HTML responsive

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export { escapeHtml }

/**
 * En-tête de marque des emails — T-057.
 *
 * 🔴 CE QUI ÉTAIT CASSÉ : le logo pointait vers `https://monprojetpro.biz/logo.png`,
 * un domaine qui **n'existe plus** depuis le rebrand (vérifié le 2026-10-15 : le
 * DNS ne résout pas). **Tous** les emails transactionnels envoyés aux clients
 * affichaient donc une image brisée — bienvenue, graduation, validation,
 * relances de paiement. Personne ne l'avait vu, parce qu'un email part sans que
 * son expéditeur le relise.
 *
 * ⚠️ POURQUOI PAS SIMPLEMENT UNE AUTRE URL : les logos du dépôt vivent dans le
 * `public/` des apps, et leur middleware **redirige vers la page de connexion**
 * (vérifié : 307 vers `/login`). Un client mail n'est pas authentifié — il
 * recevrait une page HTML à la place de l'image, donc une image cassée de plus.
 *
 * 🔑 LA RÈGLE RETENUE : on n'affiche une image **que** si une URL publique est
 * explicitement configurée (`EMAIL_LOGO_URL`). Sans elle, un titre texte soigné.
 * Un logo absent est propre ; un logo brisé donne un email qui a l'air en panne.
 */
function brandHeader(): string {
  const raw = typeof Deno !== 'undefined' ? Deno.env.get('EMAIL_LOGO_URL') : undefined
  const logoUrl = raw?.trim()

  if (logoUrl && /^https:\/\//.test(logoUrl)) {
    return `<img src="${escapeHtml(logoUrl)}" alt="MonprojetPro" style="height:32px;margin-bottom:24px;" />`
  }

  return `<p style="margin:0 0 24px;font-family:'Poppins',sans-serif;font-weight:700;font-size:18px;color:#059669;letter-spacing:-0.01em;">MonprojetPro</p>`
}

export interface BaseTemplateContent {
  title: string
  body: string
  ctaUrl?: string
  ctaText?: string
}

export function baseTemplate(content: BaseTemplateContent): string {
  // Sécurité : n'autoriser que des URLs http(s) (rejette javascript:/data:) et
  // échapper l'URL (attribut) + le texte avant interpolation HTML.
  const safeCtaText = escapeHtml(content.ctaText ?? 'Voir sur MonprojetPro')
  const cta = content.ctaUrl && /^https?:\/\//.test(content.ctaUrl)
    ? `<a href="${escapeHtml(content.ctaUrl)}" style="display:inline-block;margin-top:24px;padding:12px 24px;background:#059669;color:#ffffff;border-radius:6px;text-decoration:none;font-family:'Poppins',sans-serif;font-weight:600;">${safeCtaText}</a>`
    : ''

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(content.title)}</title>
</head>
<body style="margin:0;padding:20px;background:#f4f4f5;font-family:'Inter',Arial,sans-serif;">
  <div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:8px;padding:32px;">
    ${brandHeader()}
    <h2 style="color:#0a0a0a;font-family:'Poppins',sans-serif;margin:0 0 16px;">${escapeHtml(content.title)}</h2>
    <div style="color:#3f3f46;line-height:1.6;">${content.body}</div>
    ${cta}
    <hr style="margin-top:32px;border:none;border-top:1px solid #e4e4e7;" />
    <p style="font-size:12px;color:#a1a1aa;margin:16px 0 0;">
      Vous recevez cet email car vous êtes inscrit sur MonprojetPro.
      <a href="{{unsubscribe_url}}" style="color:#a1a1aa;">Se désabonner</a>
    </p>
  </div>
</body>
</html>`
}
