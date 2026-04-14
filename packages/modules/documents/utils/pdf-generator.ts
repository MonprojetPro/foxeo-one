/**
 * Lightweight PDF generator that wraps HTML content with MonprojetPro branding.
 * Returns a complete HTML document ready for PDF conversion.
 *
 * This generates a branded HTML template — the actual PDF conversion
 * happens in the Server Action using the HTML content.
 */

export interface PdfBrandingOptions {
  documentName: string
  generatedDate: string
  logoText?: string
}

/**
 * Wraps HTML content in a branded PDF template with MonprojetPro header and footer.
 */
export function wrapHtmlForPdf(htmlContent: string, options: PdfBrandingOptions): string {
  const { documentName, generatedDate, logoText = 'MonprojetPro' } = options

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      color: #1f2937;
      line-height: 1.6;
      padding: 40px;
      max-width: 800px;
      margin: 0 auto;
    }
    .pdf-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 16px;
      border-bottom: 2px solid #10b981;
      margin-bottom: 32px;
    }
    .pdf-header-logo {
      font-size: 24px;
      font-weight: 700;
      color: #10b981;
      letter-spacing: -0.5px;
    }
    .pdf-header-title {
      font-size: 14px;
      color: #6b7280;
      max-width: 400px;
      text-align: right;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .pdf-content {
      min-height: 600px;
    }
    .pdf-footer {
      margin-top: 40px;
      padding-top: 16px;
      border-top: 1px solid #e5e7eb;
      display: flex;
      justify-content: space-between;
      font-size: 11px;
      color: #9ca3af;
    }
  </style>
</head>
<body>
  <div class="pdf-header">
    <span class="pdf-header-logo">${escapeHtml(logoText)}</span>
    <span class="pdf-header-title">${escapeHtml(documentName)}</span>
  </div>
  <div class="pdf-content">
    ${htmlContent}
  </div>
  <div class="pdf-footer">
    <span>Généré depuis MonprojetPro</span>
    <span>${escapeHtml(generatedDate)}</span>
  </div>
</body>
</html>`
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
