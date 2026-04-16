import { describe, it, expect } from 'vitest'
import { buildLabZip } from './build-lab-zip'
import JSZip from 'jszip'

describe('buildLabZip', () => {
  it('creates a ZIP with documents, briefs, chats and PRD', async () => {
    const zipBuffer = await buildLabZip({
      files: [
        { path: 'documents/brief.pdf', buffer: Buffer.from('pdf content'), name: 'brief.pdf' },
      ],
      briefs: [
        { path: 'briefs/brief-2026-03-01.md', content: '# Brief\nContenu', name: 'brief-2026-03-01' },
      ],
      chats: [
        { path: 'chats/elio-lab-2026-03-01.md', content: '# Chat\nMessage', title: 'Chat 1' },
      ],
      prd: '# PRD Consolidé\nContenu PRD',
      clientName: 'Test Client',
    })

    expect(zipBuffer).toBeInstanceOf(Buffer)
    expect(zipBuffer.length).toBeGreaterThan(0)

    // Verify ZIP contents
    const zip = await JSZip.loadAsync(zipBuffer)
    expect(zip.file('documents/brief.pdf')).toBeTruthy()
    expect(zip.file('briefs/brief-2026-03-01.md')).toBeTruthy()
    expect(zip.file('chats/elio-lab-2026-03-01.md')).toBeTruthy()
    expect(zip.file('PRD.md')).toBeTruthy()
    expect(zip.file('README.md')).toBeTruthy()

    const readme = await zip.file('README.md')!.async('string')
    expect(readme).toContain('Test Client')
    expect(readme).toContain('1 fichier(s)')
  })

  it('creates a ZIP without PRD when none available', async () => {
    const zipBuffer = await buildLabZip({
      files: [],
      briefs: [],
      chats: [],
      prd: null,
      clientName: 'Empty Client',
    })

    const zip = await JSZip.loadAsync(zipBuffer)
    expect(zip.file('PRD.md')).toBeNull()
    expect(zip.file('README.md')).toBeTruthy()

    const readme = await zip.file('README.md')!.async('string')
    expect(readme).toContain('0 fichier(s)')
  })
})
