import { describe, it, expect } from 'vitest'
import { buildMarkdownPdfDefinition, slugifyDocumentName, sanitizeForPdfFont } from './markdown-to-pdf'

/** Retrouve le premier nœud de contenu satisfaisant un prédicat. */
function findNode(def: Record<string, unknown>, match: (n: Record<string, unknown>) => boolean) {
  const content = def.content as Record<string, unknown>[]
  return content.find(match)
}

describe('buildMarkdownPdfDefinition', () => {
  it('produit un A4 avec des marges et le titre dans les métadonnées', () => {
    const def = buildMarkdownPdfDefinition('# Titre', { title: 'Mon document' })

    expect(def.pageSize).toBe('A4')
    expect(def.pageMargins).toBeDefined()
    expect((def.info as { title: string }).title).toBe('Mon document')
  })

  describe('tableaux', () => {
    const md = [
      '| Argument | Pertinence |',
      '|---|---|',
      '| Fleurs de saison | Évolue au fil des semaines |',
      '| Circuit court | Langage commun |',
    ].join('\n')

    // Ces deux garanties remplacent l'ancien découpage à l'aveugle tous les 297 mm.
    it('répète l\'en-tête du tableau en haut de chaque page', () => {
      const def = buildMarkdownPdfDefinition(md, { title: 'T' })
      const node = findNode(def, (n) => Boolean(n.table))
      expect((node?.table as { headerRows: number }).headerRows).toBe(1)
    })

    it('ne coupe jamais une ligne de tableau en deux', () => {
      const def = buildMarkdownPdfDefinition(md, { title: 'T' })
      const node = findNode(def, (n) => Boolean(n.table))
      expect((node?.table as { dontBreakRows: boolean }).dontBreakRows).toBe(true)
    })

    it('conserve toutes les lignes et le contenu des cellules', () => {
      const def = buildMarkdownPdfDefinition(md, { title: 'T' })
      const body = (findNode(def, (n) => Boolean(n.table))?.table as { body: unknown[][] }).body
      expect(body).toHaveLength(3) // en-tête + 2 lignes
      expect(JSON.stringify(body)).toContain('Fleurs de saison')
      expect(JSON.stringify(body)).toContain('Langage commun')
    })
  })

  describe('encarts (blockquote)', () => {
    // Les blocs « Action identifiée » d'Élio, coupés entre bordure et texte par l'ancien moteur.
    it('rend l\'encart insécable', () => {
      const def = buildMarkdownPdfDefinition('> **Action :** faire ceci', { title: 'T' })
      const node = findNode(def, (n) => n.unbreakable === true)
      expect(node).toBeDefined()
      expect(JSON.stringify(node)).toContain('Action')
    })

    it('applique la couleur d\'accent au filet de l\'encart', () => {
      const def = buildMarkdownPdfDefinition('> Note', { title: 'T', accentColor: '#16a34a' })
      const node = findNode(def, (n) => n.unbreakable === true)
      expect(JSON.stringify(node)).toContain('#16a34a')
    })
  })

  describe('titres', () => {
    it('marque les titres pour qu\'ils ne restent pas orphelins en bas de page', () => {
      const def = buildMarkdownPdfDefinition('## Section', { title: 'T' })
      const node = findNode(def, (n) => n.headlineLevel === 2)
      expect(node).toBeDefined()
    })

    it('donne la couleur d\'accent aux titres de niveau 2', () => {
      const def = buildMarkdownPdfDefinition('## Section', { title: 'T', accentColor: '#16a34a' })
      expect(findNode(def, (n) => n.headlineLevel === 2)?.color).toBe('#16a34a')
    })

    it('hiérarchise les tailles du niveau 1 au niveau 3', () => {
      const def = buildMarkdownPdfDefinition('# Un\n\n## Deux\n\n### Trois', { title: 'T' })
      const h1 = findNode(def, (n) => n.headlineLevel === 1)?.fontSize as number
      const h2 = findNode(def, (n) => n.headlineLevel === 2)?.fontSize as number
      const h3 = findNode(def, (n) => n.headlineLevel === 3)?.fontSize as number
      expect(h1).toBeGreaterThan(h2)
      expect(h2).toBeGreaterThan(h3)
    })
  })

  describe('texte enrichi', () => {
    it('rend le gras et l\'italique', () => {
      const def = buildMarkdownPdfDefinition('Du **gras** et de l\'*italique*.', { title: 'T' })
      const runs = JSON.stringify(def.content)
      expect(runs).toContain('"bold":true')
      expect(runs).toContain('"italics":true')
    })

    it('combine les styles imbriqués', () => {
      const def = buildMarkdownPdfDefinition('**gras avec *italique* dedans**', { title: 'T' })
      const content = JSON.stringify(def.content)
      // Le fragment imbriqué porte les DEUX styles hérités.
      expect(content).toMatch(/"bold":true,"italics":true|"italics":true,"bold":true/)
    })

    it('conserve le texte des listes à puces', () => {
      const def = buildMarkdownPdfDefinition('- Premier point\n- Second point', { title: 'T' })
      const node = findNode(def, (n) => Boolean(n.ul))
      expect(JSON.stringify(node)).toContain('Premier point')
      expect(JSON.stringify(node)).toContain('Second point')
    })

    it('distingue listes ordonnées et non ordonnées', () => {
      expect(findNode(buildMarkdownPdfDefinition('1. Un', { title: 'T' }), (n) => Boolean(n.ol))).toBeDefined()
      expect(findNode(buildMarkdownPdfDefinition('- Un', { title: 'T' }), (n) => Boolean(n.ul))).toBeDefined()
    })
  })

  describe('bandeau de marque et pied de page', () => {
    // Régression du 2026-08-02 : le bandeau vivait dans `header`, confiné à la marge
    // haute (44 pt). Tout ce qui dépassait était rogné sans avertissement — la date
    // n'apparaissait jamais — et l'espaceur qui compensait laissait un grand vide.
    it('place le bandeau dans le CORPS, jamais dans un header pdfmake', () => {
      const def = buildMarkdownPdfDefinition('# T', { title: 'Doc', dateLabel: 'Généré le 30 juillet 2026' })

      expect(def.header).toBeUndefined()
      const first = (def.content as Record<string, unknown>[])[0]
      expect(JSON.stringify(first)).toContain('Monprojet')
    })

    it('affiche réellement la date de génération', () => {
      const def = buildMarkdownPdfDefinition('# T', { title: 'Doc', dateLabel: 'Généré le 30 juillet 2026' })
      expect(JSON.stringify(def.content)).toContain('Généré le 30 juillet 2026')
    })

    it('n\'insère aucun espaceur en dur sous le bandeau', () => {
      const def = buildMarkdownPdfDefinition('# T', { title: 'Doc' })
      const content = def.content as Record<string, unknown>[]
      // Un nœud de texte vide servant uniquement à pousser le contenu vers le bas
      // est le symptôme exact du bug : le bandeau doit occuper sa hauteur réelle.
      expect(content.some((n) => n.text === '' && Boolean(n.margin))).toBe(false)
    })

    it('ne répète pas le titre du document, déjà porté par son markdown', () => {
      const def = buildMarkdownPdfDefinition('# Élio Vision', { title: 'Document — 30 juillet 2026' })
      const bandeau = JSON.stringify((def.content as unknown[]).slice(0, 2))
      expect(bandeau).not.toContain('Document — 30 juillet 2026')
      // Le titre reste utilisé pour les métadonnées du fichier.
      expect((def.info as { title: string }).title).toBe('Document — 30 juillet 2026')
    })

    it('numérote les pages — impossible avec l\'impression navigateur', () => {
      const def = buildMarkdownPdfDefinition('# T', { title: 'Doc' })
      const footer = def.footer as (page: number, total: number) => unknown
      expect(JSON.stringify(footer(2, 5))).toContain('2 / 5')
    })
  })

  it('ne perd aucune section d\'un document réaliste', () => {
    const md = [
      '# Positioning Statement',
      '',
      '## Ce qu\'on a construit',
      'Un paragraphe.',
      '',
      '| A | B |',
      '|---|---|',
      '| 1 | 2 |',
      '',
      '> Un encart',
      '',
      '---',
      '',
      '- puce',
    ].join('\n')

    const def = buildMarkdownPdfDefinition(md, { title: 'T' })
    const content = def.content as Record<string, unknown>[]

    expect(findNode(def, (n) => Boolean(n.table))).toBeDefined()
    expect(findNode(def, (n) => n.unbreakable === true)).toBeDefined()
    expect(findNode(def, (n) => Boolean(n.ul))).toBeDefined()
    expect(findNode(def, (n) => Boolean(n.canvas))).toBeDefined() // le filet horizontal
    expect(content.length).toBeGreaterThan(6)
  })
})

// La police embarquée par pdfmake ne contient ni flèche ni coche : sans substitution,
// ces caractères disparaissaient PUREMENT du PDF, amputant la phrase sans alerte.
describe('sanitizeForPdfFont', () => {
  it('remplace les flèches absentes de la police par un chevron', () => {
    expect(sanitizeForPdfFont('cause → conséquence')).toBe('cause › conséquence')
    expect(sanitizeForPdfFont('a ⇒ b ➔ c')).toBe('a › b › c')
  })

  it('remplace coches et croix par un équivalent lisible', () => {
    expect(sanitizeForPdfFont('✓ fait')).toBe('[ok] fait')
    expect(sanitizeForPdfFont('✗ raté')).toBe('[x] raté')
  })

  it('préserve intégralement les accents et la ponctuation française', () => {
    const fr = 'Léa — « fournisseur » : cœur, être, à… 100 €'
    expect(sanitizeForPdfFont(fr)).toBe(fr)
  })

  it('retire les emojis plutôt que de laisser un caractère fantôme', () => {
    expect(sanitizeForPdfFont('Validation approuvée ✅')).toBe('Validation approuvée')
    expect(sanitizeForPdfFont('🔴 Urgent')).toBe('Urgent')
  })

  it('s\'applique au contenu du document généré', () => {
    const def = buildMarkdownPdfDefinition('Le vendredi → ça claque', { title: 'T' })
    const json = JSON.stringify(def.content)
    expect(json).toContain('›')
    expect(json).not.toContain('→')
  })
})

describe('slugifyDocumentName', () => {
  it('retire accents et ponctuation', () => {
    expect(slugifyDocumentName('Document — 30 juillet 2026')).toBe('document-30-juillet-2026')
  })

  it('ne renvoie jamais un nom vide', () => {
    expect(slugifyDocumentName('———')).toBe('document')
  })
})
