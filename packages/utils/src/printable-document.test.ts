import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { buildPrintableDocument, printHtmlDocument } from './printable-document'

describe('buildPrintableDocument', () => {
  it('produit un document HTML autonome avec le corps fourni', () => {
    const html = buildPrintableDocument({
      title: 'Positionnement',
      bodyHtml: '<h2>Cible</h2><p>Restaurateurs</p>',
    })

    expect(html.startsWith('<!DOCTYPE html>')).toBe(true)
    expect(html).toContain('<h2>Cible</h2>')
    expect(html).toContain('Positionnement')
  })

  // Cœur du correctif du 2026-08-02 : ces règles remplacent la rastérisation
  // html2canvas + jsPDF, qui tranchait le document tous les 297 mm sans savoir
  // ce qu'elle coupait. Si l'une saute, les tableaux et encarts se remettent
  // à être coupés en deux — sans qu'aucun autre test ne le voie.
  describe('règles de saut de page', () => {
    const html = buildPrintableDocument({ title: 'T', bodyHtml: '<p>x</p>' })

    it('empêche de couper une ligne de tableau, un encart ou une image', () => {
      expect(html).toContain('tr, img, figure, pre, blockquote { break-inside: avoid; }')
    })

    it('répète les en-têtes de tableau en haut de chaque page', () => {
      expect(html).toContain('thead { display: table-header-group; }')
    })

    it('ne laisse jamais un titre orphelin en bas de page', () => {
      expect(html).toContain('break-after: avoid')
    })

    it('évite les lignes isolées en haut ou en bas de page', () => {
      expect(html).toContain('orphans: 3')
      expect(html).toContain('widows: 3')
    })

    it('fixe un format A4 avec des marges', () => {
      expect(html).toContain('size: A4')
    })

    it('ne fige PAS le tableau entier — il doit pouvoir s\'étaler sur plusieurs pages', () => {
      // `table { break-inside: avoid }` pousserait un grand tableau en bloc et
      // laisserait une page à moitié vide, avant que Chrome ne le coupe quand même.
      expect(html).not.toMatch(/\btable\s*\{[^}]*break-inside:\s*avoid/)
    })
  })

  it('échappe le titre pour empêcher toute injection de balise', () => {
    const html = buildPrintableDocument({
      title: '<script>alert(1)</script>',
      bodyHtml: '<p>ok</p>',
    })
    expect(html).not.toContain('<script>alert(1)</script>')
    expect(html).toContain('&lt;script&gt;')
  })

  it('affiche la date seulement si elle est fournie', () => {
    expect(buildPrintableDocument({ title: 'T', bodyHtml: '', dateLabel: 'Généré le 30 juillet 2026' }))
      .toContain('Généré le 30 juillet 2026')
    // `.doc-date` reste présent dans la feuille de style : c'est la balise qui doit manquer.
    expect(buildPrintableDocument({ title: 'T', bodyHtml: '' }))
      .not.toContain('<div class="doc-date">')
  })

  it('applique la couleur d\'accent demandée', () => {
    expect(buildPrintableDocument({ title: 'T', bodyHtml: '', accentColor: '#16a34a' }))
      .toContain('#16a34a')
  })
})

describe('printHtmlDocument', () => {
  const printSpy = vi.fn()
  const focusSpy = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(HTMLIFrameElement.prototype, 'contentWindow', 'get').mockReturnValue({
      focus: focusSpy,
      print: printSpy,
      addEventListener: vi.fn(),
    } as unknown as Window)
  })

  afterEach(() => {
    document.querySelectorAll('iframe').forEach((el) => el.remove())
    vi.restoreAllMocks()
  })

  it('injecte le document dans une iframe cachée et déclenche l\'impression', () => {
    printHtmlDocument('<p>doc</p>')

    const iframe = document.querySelector('iframe')
    expect(iframe).toBeTruthy()
    expect(iframe?.getAttribute('srcdoc')).toBe('<p>doc</p>')

    // L'iframe ne déclenche `onload` qu'une fois le srcdoc rendu : on le simule.
    iframe?.onload?.(new Event('load'))
    expect(printSpy).toHaveBeenCalled()
  })

  it('reste invisible et hors du parcours des lecteurs d\'écran', () => {
    printHtmlDocument('<p>doc</p>')

    const iframe = document.querySelector('iframe')
    expect(iframe?.getAttribute('aria-hidden')).toBe('true')
    expect(iframe?.style.visibility).toBe('hidden')
  })
})
