/**
 * Génération de documents imprimables (PDF) — brique partagée.
 *
 * POURQUOI CE FICHIER EXISTE (à lire avant de le remplacer par une lib) :
 * l'ancienne implémentation rastérisait le document en UNE image géante
 * (html2canvas-pro) puis la tranchait tous les 297 mm (jsPDF). Le moteur ne
 * voyait que des pixels : il coupait en plein milieu d'un tableau, d'un encart
 * ou d'une phrase — c'est le bug « toujours coupé au mauvais moment » signalé
 * par MiKL le 2026-08-02. Aucune règle CSS ne pouvait le corriger, puisque la
 * mise en page était déjà aplatie en bitmap avant la pagination.
 *
 * On délègue donc la pagination au moteur d'impression du navigateur, seul
 * composant qui connaît les règles typographiques de saut de page. Bénéfices
 * annexes : texte sélectionnable/cherchable (donc accessible), fichier ~10×
 * plus léger, et zéro dépendance à maintenir.
 *
 * ⚠️ Ne JAMAIS revenir à une capture canvas pour produire un PDF de texte.
 */

export interface PrintableDocumentOptions {
  /** Titre affiché en tête du document ET utilisé comme nom de fichier proposé. */
  title: string
  /** Corps du document, déjà converti en HTML assaini. */
  bodyHtml: string
  /** Ligne de date sous le titre (déjà formatée). Omise si absente. */
  dateLabel?: string
  /** Couleur d'accent de l'en-tête. Défaut : violet Lab. */
  accentColor?: string
  /** Pied de page répété en bas de chaque page. */
  footerText?: string
}

/**
 * Règles de saut de page — le cœur du correctif.
 *
 * Chaque règle répond à une coupure réellement observée sur les documents Lab :
 * - `tr` insécable + `thead` répété : un tableau peut s'étaler sur deux pages,
 *   mais jamais au milieu d'une ligne, et on retrouve ses en-têtes en haut de
 *   la page suivante. On ne met PAS `break-inside: avoid` sur `table` : un
 *   tableau plus haut qu'une page serait alors poussé en bloc, laissant une
 *   page à moitié vide — et Chrome finirait par le couper quand même.
 * - `blockquote` insécable : ce sont les encarts « Action identifiée » d'Élio,
 *   coupés entre leur bordure et leur texte sur la capture du 2026-08-02.
 * - `break-after: avoid` sur les titres : un titre ne reste jamais orphelin en
 *   bas de page, séparé du paragraphe qu'il annonce.
 * - `orphans`/`widows` : jamais une ligne isolée d'un paragraphe en haut ou en
 *   bas de page.
 */
const PRINT_RULES = `
  @page {
    size: A4;
    margin: 16mm 14mm 18mm;
  }
  @media print {
    html, body { background: #fff !important; }
    .page { padding: 0 !important; max-width: none !important; }

    tr, img, figure, pre, blockquote { break-inside: avoid; }
    thead { display: table-header-group; }
    tfoot { display: table-footer-group; }

    h1, h2, h3, h4, h5, h6 { break-inside: avoid; break-after: avoid; }
    li { break-inside: avoid; }
    p { orphans: 3; widows: 3; }

    /* L'en-tête de marque ne se répète pas : il ouvre le document, point. */
    .doc-header { break-after: avoid; }
    /* Pied de page répété sur chaque page (Chrome répète les position:fixed). */
    .doc-footer {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      text-align: center;
      font-size: 8pt;
      color: #9ca3af;
    }
  }
`

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/**
 * Construit un document HTML autonome, stylé et prêt à imprimer.
 * `bodyHtml` doit déjà être assaini par l'appelant (markdown → HTML).
 */
export function buildPrintableDocument(options: PrintableDocumentOptions): string {
  const {
    title,
    bodyHtml,
    dateLabel,
    accentColor = '#7c3aed',
    footerText = 'Document généré par MonprojetPro · monprojet-pro.com',
  } = options

  const safeTitle = escapeHtml(title)
  const dateBlock = dateLabel
    ? `<div class="doc-date">${escapeHtml(dateLabel)}</div>`
    : ''

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8" />
<title>${safeTitle}</title>
<style>
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: #fff; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
    color: #1f2937;
    line-height: 1.6;
    font-size: 11pt;
  }
  .page { padding: 32px 40px 48px; max-width: 800px; margin: 0 auto; }
  .doc-header {
    border-bottom: 2px solid ${accentColor};
    padding-bottom: 16px;
    margin-bottom: 26px;
  }
  .doc-brand { font-weight: 700; font-size: 17pt; color: ${accentColor}; letter-spacing: -0.01em; }
  .doc-brand-suffix { color: #1f2937; }
  .doc-title { font-weight: 600; font-size: 21pt; color: #111827; margin-top: 10px; line-height: 1.25; }
  .doc-date { color: #6b7280; font-size: 10pt; margin-top: 6px; }

  .content h1, .content h2, .content h3,
  .content h4, .content h5, .content h6 { color: #111827; line-height: 1.3; margin: 20px 0 9px; }
  .content h1 { font-size: 17pt; font-weight: 700; border-bottom: 1px solid #e5e7eb; padding-bottom: 6px; }
  .content h2 { font-size: 14pt; font-weight: 600; color: ${accentColor}; }
  .content h3 { font-size: 12pt; font-weight: 600; }
  .content h4, .content h5, .content h6 { font-size: 11pt; font-weight: 600; }
  .content p { margin: 10px 0; }
  .content ul, .content ol { margin: 10px 0; padding-left: 24px; }
  .content li { margin: 4px 0; }
  .content strong { color: #111827; font-weight: 600; }
  .content em { color: #374151; }
  .content a { color: ${accentColor}; text-decoration: underline; }
  .content hr { border: 0; border-top: 1px solid #e5e7eb; margin: 22px 0; }
  .content code {
    background: #f3f4f6; padding: 2px 6px; border-radius: 4px;
    font-family: 'Menlo', 'Consolas', monospace; font-size: 10pt; color: ${accentColor};
  }
  .content pre {
    background: #1f2937; color: #f9fafb; padding: 14px 16px;
    border-radius: 8px; font-size: 9.5pt; line-height: 1.5; white-space: pre-wrap;
  }
  .content pre code { background: transparent; color: inherit; padding: 0; }
  .content blockquote {
    border-left: 3px solid ${accentColor}; background: #f5f3ff;
    margin: 14px 0; padding: 10px 16px; color: #4b5563; font-style: italic;
  }
  .content table { border-collapse: collapse; width: 100%; margin: 14px 0; font-size: 10pt; }
  .content th, .content td { border: 1px solid #e5e7eb; padding: 8px 12px; text-align: left; }
  .content th { background: #f9fafb; font-weight: 600; color: #111827; }
${PRINT_RULES}
</style>
</head>
<body>
  <div class="page">
    <header class="doc-header">
      <div class="doc-brand">Monprojet<span class="doc-brand-suffix">Pro</span></div>
      <div class="doc-title">${safeTitle}</div>
      ${dateBlock}
    </header>
    <main class="content">${bodyHtml}</main>
  </div>
  <div class="doc-footer">${escapeHtml(footerText)}</div>
</body>
</html>`
}

/**
 * Ouvre le dialogue d'impression du navigateur sur un document HTML autonome.
 *
 * Passe par une iframe cachée plutôt qu'une popup : `window.open` est bloqué par
 * défaut par les bloqueurs de fenêtres, et l'utilisateur n'aurait aucun retour.
 * L'iframe est retirée après impression (ou après un délai de garde si le
 * navigateur n'émet pas `afterprint`, ce que fait Safari).
 *
 * Navigateur uniquement — ne jamais appeler côté serveur.
 */
export function printHtmlDocument(html: string): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    throw new Error('printHtmlDocument ne peut être appelé que côté navigateur')
  }

  const iframe = document.createElement('iframe')
  iframe.setAttribute('aria-hidden', 'true')
  iframe.setAttribute('title', 'Impression du document')
  iframe.style.cssText =
    'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden'

  let cleaned = false
  const cleanup = () => {
    if (cleaned) return
    cleaned = true
    // Délai : retirer l'iframe pendant que le dialogue est ouvert annule l'impression
    // sur Firefox. On attend que la main soit rendue au document.
    window.setTimeout(() => iframe.remove(), 1000)
  }

  iframe.onload = () => {
    const frameWindow = iframe.contentWindow
    if (!frameWindow) {
      cleanup()
      return
    }

    frameWindow.addEventListener('afterprint', cleanup)
    try {
      frameWindow.focus()
      frameWindow.print()
    } catch {
      cleanup()
      return
    }
    // Garde-fou : Safari n'émet pas toujours `afterprint`.
    window.setTimeout(cleanup, 60_000)
  }

  document.body.appendChild(iframe)
  iframe.srcdoc = html
}
