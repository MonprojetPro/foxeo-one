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

export interface BaseTemplateContent {
  title: string
  body: string
  ctaUrl?: string
  ctaText?: string
}

export function baseTemplate(content: BaseTemplateContent): string {
  const cta = content.ctaUrl
    ? `<a href="${content.ctaUrl}" style="display:inline-block;margin-top:24px;padding:12px 24px;background:#059669;color:#ffffff;border-radius:6px;text-decoration:none;font-family:'Poppins',sans-serif;font-weight:600;">${content.ctaText ?? 'Voir sur MonprojetPro'}</a>`
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
    <img
      src="https://monprojetpro.biz/logo.png"
      alt="MonprojetPro"
      style="height:32px;margin-bottom:24px;"
    />
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
