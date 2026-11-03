import { describe, it, expect } from 'vitest'
import { extractDeliverableSection } from './extract-deliverable-section'

describe('extractDeliverableSection', () => {
  it('extrait la section « Le livrable » jusqu’au titre suivant', () => {
    const prompt = '## Ta voix\nDirecte.\n\n## Le livrable — Offre documentée\n- **Nom** — le nom\n- **Prix** — le tarif\n\n## Autre\nfin'
    expect(extractDeliverableSection(prompt)).toBe('- **Nom** — le nom\n- **Prix** — le tarif')
  })

  it('va jusqu’à la fin du prompt quand la section est la dernière', () => {
    expect(extractDeliverableSection('## Le livrable\r\n- **A** — a\r\n- **B** — b\r\n')).toBe('- **A** — a\n- **B** — b')
  })

  it('renvoie null sans section livrable ou sans prompt', () => {
    expect(extractDeliverableSection('## Ta voix\nDirecte.')).toBeNull()
    expect(extractDeliverableSection(null)).toBeNull()
  })
})
