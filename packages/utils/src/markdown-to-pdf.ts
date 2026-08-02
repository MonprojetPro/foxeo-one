/**
 * Markdown → définition de document PDF (format pdfmake).
 *
 * POURQUOI CETTE APPROCHE (à lire avant de la remplacer) :
 * deux générations précédentes ont échoué, chacune pour une raison différente.
 *
 * 1. html2canvas + jsPDF — le document était rastérisé en UNE image géante, puis
 *    tranchée tous les 297 mm. Le moteur ne voyait que des pixels : il coupait en
 *    plein milieu d'un tableau, d'un encart ou d'une phrase. Aucune règle CSS ne
 *    pouvait le corriger, la mise en page étant déjà aplatie en bitmap.
 * 2. Impression navigateur — la pagination était correcte, mais elle imposait au
 *    client de passer par le dialogue d'impression et de choisir « Enregistrer au
 *    format PDF ». Rejeté par MiKL le 2026-08-02 : fabriquer le fichier est notre
 *    travail, pas le sien.
 *
 * On construit donc le PDF nous-mêmes, en décrivant sa STRUCTURE (titres, tableaux,
 * encarts) plutôt que son apparence. pdfmake pagine ensuite en connaissance de
 * cause : `headerRows` répète l'en-tête d'un tableau sur chaque page, `unbreakable`
 * garde un encart d'un seul tenant. Le clic produit directement un fichier.
 *
 * Ce module est PUR : il ne fait qu'assembler un objet. pdfmake (~2 Mo) est chargé
 * dynamiquement par l'appelant, uniquement au moment du clic.
 */

import { marked } from 'marked'

/** Fragment de texte enrichi, tel que pdfmake l'attend. */
interface TextRun {
  text: string
  bold?: boolean
  italics?: boolean
  color?: string
  font?: string
}

/** Nœud de contenu pdfmake. Volontairement large : la lib accepte de nombreuses formes. */
type ContentNode = Record<string, unknown>

export interface MarkdownPdfOptions {
  /** Titre affiché en tête du document. */
  title: string
  /** Ligne de date sous le titre. Omise si absente. */
  dateLabel?: string
  /** Couleur d'accent (titres de niveau 2, filets, encarts). Défaut : violet Lab. */
  accentColor?: string
  /** Texte du pied de page, à gauche du numéro de page. */
  footerText?: string
}

/**
 * Symboles absents de la police Roboto embarquée par pdfmake, remplacés par un
 * équivalent réellement disponible.
 *
 * Sans cette table, ces caractères **disparaissent en silence** : le 2026-08-02,
 * les flèches des citations clients d'Élio (« J'y repensais jamais » → …) étaient
 * purement escamotées du PDF, laissant une phrase amputée sans le moindre signe
 * d'erreur. Un caractère manquant doit être visible, jamais évaporé.
 *
 * Les accents et la ponctuation française (é, œ, «, —, …) sont présents dans
 * Roboto et ne sont donc PAS touchés.
 */
const FONT_FALLBACKS: Record<string, string> = {
  // Flèches — très fréquentes dans les synthèses d'Élio (cause → conséquence)
  '→': '›', '⟶': '›', '⇒': '›', '➔': '›', '►': '›', '▸': '›', '➜': '›',
  '←': '‹', '⟵': '‹', '⇐': '‹',
  '↔': '<>', '⇔': '<>',
  '↑': '^', '↓': 'v',
  // Coches et croix — listes de contrôle
  '✓': '[ok]', '✔': '[ok]', '☑': '[ok]',
  '✗': '[x]', '✘': '[x]', '☒': '[x]',
  // Puces exotiques
  '‣': '·', '▪': '·', '▫': '·', '◦': '·', '●': '·', '○': '·',
  // Divers
  '★': '*', '☆': '*', '⚠': '/!\\',
}

const FALLBACK_PATTERN = new RegExp(`[${Object.keys(FONT_FALLBACKS).join('')}]`, 'g')

/**
 * Plages d'emojis et de pictogrammes : aucun n'existe dans Roboto. On les retire
 * plutôt que de laisser un trou — un titre « Validation approuvée ✅ » doit se lire
 * « Validation approuvée », sans espace orphelin ni carré blanc.
 */
const EMOJI_PATTERN =
  /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F000}-\u{1F2FF}]\u{FE0F}?/gu

/** Rend un texte imprimable avec la police embarquée, sans disparition silencieuse. */
export function sanitizeForPdfFont(text: string): string {
  const withFallbacks = text.replace(FALLBACK_PATTERN, (c) => FONT_FALLBACKS[c] ?? c)
  if (!EMOJI_PATTERN.test(withFallbacks)) {
    EMOJI_PATTERN.lastIndex = 0
    return withFallbacks
  }
  EMOJI_PATTERN.lastIndex = 0

  // Retirer un emoji laisse soit un espace double au milieu, soit un espace en bout.
  // On ne rogne les extrémités que si le texte d'origine n'y avait pas déjà d'espace,
  // pour ne pas souder deux fragments voisins d'un même paragraphe.
  let cleaned = withFallbacks.replace(EMOJI_PATTERN, '').replace(/[ \t]{2,}/g, ' ')
  if (!/^\s/.test(text)) cleaned = cleaned.replace(/^[ \t]+/, '')
  if (!/\s$/.test(text)) cleaned = cleaned.replace(/[ \t]+$/, '')
  return cleaned
}

const DEFAULT_ACCENT = '#7c3aed'
const TEXT_COLOR = '#1f2937'
const HEADING_COLOR = '#111827'
const MUTED_COLOR = '#6b7280'
const BORDER_COLOR = '#e5e7eb'

/**
 * Aplatit les tokens « inline » de marked (gras, italique, code, liens) en fragments
 * de texte enrichi. Les styles s'héritent en descendant : `**gras avec *italique***`
 * produit bien un fragment gras+italique.
 */
function flattenInline(
  tokens: unknown[] | undefined,
  inherited: Partial<TextRun> = {},
): TextRun[] {
  if (!tokens?.length) return []

  const runs: TextRun[] = []

  for (const raw of tokens) {
    const token = raw as { type?: string; text?: string; tokens?: unknown[] }

    switch (token.type) {
      case 'strong':
        runs.push(...flattenInline(token.tokens, { ...inherited, bold: true }))
        break
      case 'em':
        runs.push(...flattenInline(token.tokens, { ...inherited, italics: true }))
        break
      case 'codespan':
        // Police à chasse fixe : pdfmake n'embarque que Roboto par défaut, donc on
        // signale le code par la couleur d'accent plutôt que par une autre fonte.
        runs.push({ text: sanitizeForPdfFont(token.text ?? ''), ...inherited, color: DEFAULT_ACCENT })
        break
      case 'link':
        runs.push(...flattenInline(token.tokens, { ...inherited, color: DEFAULT_ACCENT }))
        break
      case 'br':
        runs.push({ text: '\n', ...inherited })
        break
      case 'text':
        // Un token `text` peut lui-même contenir des enfants (gras imbriqué…).
        if (token.tokens?.length) {
          runs.push(...flattenInline(token.tokens, inherited))
        } else {
          runs.push({ text: sanitizeForPdfFont(token.text ?? ''), ...inherited })
        }
        break
      default:
        if (token.tokens?.length) {
          runs.push(...flattenInline(token.tokens, inherited))
        } else if (token.text) {
          runs.push({ text: sanitizeForPdfFont(token.text), ...inherited })
        }
    }
  }

  return runs
}

/** Rend un tableau markdown. `headerRows: 1` fait répéter l'en-tête à chaque page. */
function buildTable(
  token: { header?: unknown[]; rows?: unknown[][] },
  accentColor: string,
): ContentNode {
  const header = (token.header ?? []).map((cell) => ({
    text: flattenInline((cell as { tokens?: unknown[] }).tokens),
    bold: true,
    color: HEADING_COLOR,
    fillColor: '#f9fafb',
    margin: [6, 6, 6, 6] as [number, number, number, number],
  }))

  const body = (token.rows ?? []).map((row) =>
    row.map((cell) => ({
      text: flattenInline((cell as { tokens?: unknown[] }).tokens),
      margin: [6, 5, 6, 5] as [number, number, number, number],
    })),
  )

  return {
    table: {
      headerRows: 1,
      // `*` répartit la largeur disponible équitablement entre les colonnes.
      widths: header.map(() => '*'),
      body: [header, ...body],
      // Une ligne de tableau ne se coupe jamais en deux : pdfmake la reporte
      // entièrement sur la page suivante (avec son en-tête, grâce à headerRows).
      dontBreakRows: true,
    },
    layout: {
      hLineWidth: () => 0.5,
      vLineWidth: () => 0.5,
      hLineColor: () => BORDER_COLOR,
      vLineColor: () => BORDER_COLOR,
    },
    margin: [0, 8, 0, 12],
    fontSize: 9,
    color: TEXT_COLOR,
  }
}

/**
 * Rend un encart (blockquote) : filet vertical coloré + fond pâle, d'un seul tenant.
 * Ce sont les blocs « Action identifiée » d'Élio, coupés entre leur bordure et leur
 * texte par l'ancien moteur.
 */
function buildBlockquote(
  token: { tokens?: unknown[] },
  accentColor: string,
): ContentNode {
  const inner: TextRun[] = []
  for (const child of (token.tokens ?? []) as { type?: string; tokens?: unknown[] }[]) {
    if (inner.length) inner.push({ text: '\n' })
    inner.push(...flattenInline(child.tokens, { italics: true }))
  }

  return {
    // `unbreakable` : l'encart passe entier sur la page suivante plutôt que d'être scindé.
    unbreakable: true,
    margin: [0, 8, 0, 12],
    table: {
      widths: [2, '*'],
      body: [[
        { text: '', fillColor: accentColor },
        {
          text: inner,
          fillColor: '#f5f3ff',
          color: '#4b5563',
          margin: [10, 8, 10, 8],
        },
      ]],
    },
    layout: 'noBorders',
  }
}

const HEADING_STYLE: Record<number, { fontSize: number; margin: [number, number, number, number] }> = {
  1: { fontSize: 15, margin: [0, 14, 0, 6] },
  2: { fontSize: 12.5, margin: [0, 14, 0, 5] },
  3: { fontSize: 11, margin: [0, 10, 0, 4] },
  4: { fontSize: 10, margin: [0, 8, 0, 3] },
  5: { fontSize: 10, margin: [0, 8, 0, 3] },
  6: { fontSize: 10, margin: [0, 8, 0, 3] },
}

function buildListItems(
  token: { items?: unknown[]; ordered?: boolean },
): ContentNode {
  const items = (token.items ?? []).map((item) => {
    const it = item as { tokens?: unknown[] }
    const runs: TextRun[] = []
    for (const child of (it.tokens ?? []) as { tokens?: unknown[] }[]) {
      runs.push(...flattenInline(child.tokens))
    }
    return { text: runs }
  })

  return {
    [token.ordered ? 'ol' : 'ul']: items,
    margin: [0, 4, 0, 8],
    fontSize: 10,
    color: TEXT_COLOR,
  }
}

/**
 * Convertit un document markdown en définition pdfmake prête à imprimer.
 * Le markdown est analysé par `marked` (mode GFM, donc tableaux supportés).
 */
export function buildMarkdownPdfDefinition(
  markdown: string,
  options: MarkdownPdfOptions,
): Record<string, unknown> {
  const {
    title,
    dateLabel,
    accentColor = DEFAULT_ACCENT,
    footerText = 'Document généré par MonprojetPro · monprojet-pro.com',
  } = options

  const tokens = marked.lexer(markdown, { gfm: true }) as unknown[]
  const content: ContentNode[] = []

  for (const raw of tokens) {
    const token = raw as {
      type?: string
      depth?: number
      tokens?: unknown[]
      text?: string
      items?: unknown[]
      ordered?: boolean
      header?: unknown[]
      rows?: unknown[][]
    }

    switch (token.type) {
      case 'heading': {
        const depth = token.depth ?? 1
        const style = HEADING_STYLE[depth] ?? HEADING_STYLE[6]!
        content.push({
          text: flattenInline(token.tokens),
          bold: true,
          fontSize: style.fontSize,
          // Le niveau 2 porte la couleur d'accent : c'est le rythme visuel du document.
          color: depth === 2 ? accentColor : HEADING_COLOR,
          margin: style.margin,
          // Un titre ne reste jamais seul en bas de page, séparé de ce qu'il annonce.
          headlineLevel: depth,
        })
        break
      }

      case 'paragraph':
        content.push({
          text: flattenInline(token.tokens),
          fontSize: 10,
          color: TEXT_COLOR,
          margin: [0, 4, 0, 6],
          lineHeight: 1.35,
        })
        break

      case 'list':
        content.push(buildListItems(token))
        break

      case 'table':
        content.push(buildTable(token, accentColor))
        break

      case 'blockquote':
        content.push(buildBlockquote(token, accentColor))
        break

      case 'hr':
        content.push({
          canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 0.5, lineColor: BORDER_COLOR }],
          margin: [0, 10, 0, 12],
        })
        break

      case 'code':
        content.push({
          text: sanitizeForPdfFont(token.text ?? ''),
          fontSize: 8.5,
          color: '#f9fafb',
          background: '#1f2937',
          margin: [0, 6, 0, 10],
        })
        break

      case 'space':
        break

      default:
        if (token.tokens?.length) {
          content.push({ text: flattenInline(token.tokens), fontSize: 10, color: TEXT_COLOR })
        }
    }
  }

  return {
    pageSize: 'A4',
    pageMargins: [40, 44, 40, 48],
    info: { title, creator: 'MonprojetPro', producer: 'MonprojetPro' },
    defaultStyle: { fontSize: 10, color: TEXT_COLOR, lineHeight: 1.3 },

    // Pied de page avec numérotation — impossible à obtenir avec l'impression navigateur.
    footer: (currentPage: number, pageCount: number) => ({
      margin: [40, 12, 40, 0],
      columns: [
        { text: footerText, fontSize: 7.5, color: MUTED_COLOR },
        { text: `${currentPage} / ${pageCount}`, fontSize: 7.5, color: MUTED_COLOR, alignment: 'right' },
      ],
    }),

    // ⚠️ Le bandeau de marque est le PREMIER ÉLÉMENT DU CORPS, jamais un `header`.
    // Un `header` pdfmake est confiné à la marge haute (44 pt ici) : tout ce qui
    // dépasse est ROGNÉ SANS AVERTISSEMENT, et il faut compenser par un espaceur
    // en dur dans le corps — ce qui laissait un grand vide sous le logo et faisait
    // disparaître la date (constaté par MiKL le 2026-08-02 sur les docs de Thomas).
    // Placé dans le corps, le bandeau occupe sa hauteur réelle : ni trou, ni rognage.
    //
    // Il ne répète pas le titre : les documents d'Élio commencent déjà par le leur
    // (`# …`), et l'afficher deux fois faisait doublon.
    content: [
      {
        columns: [
          {
            text: [
              { text: 'Monprojet', bold: true, color: accentColor, fontSize: 13 },
              { text: 'Pro', bold: true, color: HEADING_COLOR, fontSize: 13 },
            ],
          },
          ...(dateLabel
            ? [{ text: dateLabel, fontSize: 8, color: MUTED_COLOR, alignment: 'right', margin: [0, 4, 0, 0] as [number, number, number, number] }]
            : []),
        ],
      },
      {
        canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1.5, lineColor: accentColor }],
        margin: [0, 8, 0, 16],
      },
      ...content,
    ],
  }
}

/** Nom de fichier sûr, dérivé du titre du document. */
export function slugifyDocumentName(title: string): string {
  return title
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase() || 'document'
}
