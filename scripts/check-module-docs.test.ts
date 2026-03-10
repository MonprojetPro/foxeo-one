import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as fs from 'fs'

vi.mock('fs')
vi.mock('path', async (importOriginal) => {
  const actual = await importOriginal<typeof import('path')>()
  return {
    ...actual,
    resolve: (...args: string[]) => args.join('/'),
    join: (...args: string[]) => args.join('/'),
  }
})

// Import AFTER mocks to avoid MODULES_DIR resolution issues
const { getModuleIds, runCheck } = await import('./check-module-docs')

const mockFs = vi.mocked(fs)

function makeReaddirResult(names: string[]): fs.Dirent[] {
  return names.map((name) => ({
    name,
    isDirectory: () => true,
    isFile: () => false,
    isBlockDevice: () => false,
    isCharacterDevice: () => false,
    isSymbolicLink: () => false,
    isFIFO: () => false,
    isSocket: () => false,
  })) as unknown as fs.Dirent[]
}

describe('getModuleIds', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('returns sorted module ids from packages/modules directory', () => {
    mockFs.existsSync.mockReturnValue(true)
    mockFs.readdirSync.mockReturnValue(makeReaddirResult(['crm', 'admin', 'chat']))

    const ids = getModuleIds()
    expect(ids).toEqual(['admin', 'chat', 'crm'])
  })

  it('returns empty array when modules directory does not exist', () => {
    mockFs.existsSync.mockReturnValue(false)

    const ids = getModuleIds()
    expect(ids).toEqual([])
  })
})

describe('runCheck', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockFs.existsSync.mockReturnValue(true)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('reports OK when all 3 doc files exist with sufficient sections', () => {
    const guideContent = '## Section 1\n\n## Section 2\n\n## Section 3\n'
    const faqContent = '## Q1\n\n## Q2\n\n## Q3\n\n## Q4\n\n## Q5\n'
    const flowsContent = '## Flux 1\n'

    mockFs.readFileSync.mockImplementation((filePath: fs.PathOrFileDescriptor) => {
      const p = String(filePath)
      if (p.includes('guide.md')) return guideContent
      if (p.includes('faq.md')) return faqContent
      if (p.includes('flows.md')) return flowsContent
      return ''
    })

    const results = runCheck(['admin'])
    expect(results).toHaveLength(1)
    expect(results[0].moduleId).toBe('admin')
    expect(results[0].allOk).toBe(true)
    expect(results[0].docs.every((d) => d.exists && d.hasMinContent)).toBe(true)
  })

  it('reports MISSING when doc file does not exist', () => {
    mockFs.existsSync.mockImplementation((p: fs.PathLike) => {
      return !String(p).includes('guide.md')
    })
    mockFs.readFileSync.mockReturnValue('## FAQ Q1\n\n## Q2\n\n## Q3\n\n## Q4\n\n## Q5\n')

    const results = runCheck(['chat'])
    expect(results[0].allOk).toBe(false)
    const guideResult = results[0].docs.find((d) => d.file === 'guide.md')
    expect(guideResult?.exists).toBe(false)
  })

  it('reports THIN when guide.md has fewer than 3 sections', () => {
    mockFs.readFileSync.mockImplementation((filePath: fs.PathOrFileDescriptor) => {
      const p = String(filePath)
      if (p.includes('guide.md')) return '## Section 1\n\n## Section 2\n'
      if (p.includes('faq.md')) return '## Q1\n\n## Q2\n\n## Q3\n\n## Q4\n\n## Q5\n'
      if (p.includes('flows.md')) return '## Flux 1\n'
      return ''
    })

    const results = runCheck(['elio'])
    expect(results[0].allOk).toBe(false)
    const guideResult = results[0].docs.find((d) => d.file === 'guide.md')
    expect(guideResult?.hasMinContent).toBe(false)
    expect(guideResult?.sectionCount).toBe(2)
  })

  it('reports THIN when faq.md has fewer than 5 questions', () => {
    mockFs.readFileSync.mockImplementation((filePath: fs.PathOrFileDescriptor) => {
      const p = String(filePath)
      if (p.includes('guide.md')) return '## S1\n\n## S2\n\n## S3\n'
      if (p.includes('faq.md')) return '## Q1\n\n## Q2\n\n## Q3\n'
      if (p.includes('flows.md')) return '## Flux 1\n'
      return ''
    })

    const results = runCheck(['crm'])
    expect(results[0].allOk).toBe(false)
    const faqResult = results[0].docs.find((d) => d.file === 'faq.md')
    expect(faqResult?.hasMinContent).toBe(false)
    expect(faqResult?.sectionCount).toBe(3)
  })

  it('handles multiple modules and reports each correctly', () => {
    const fullGuide = '## S1\n\n## S2\n\n## S3\n'
    const fullFaq = '## Q1\n\n## Q2\n\n## Q3\n\n## Q4\n\n## Q5\n'
    const fullFlows = '## Flux 1\n'

    mockFs.readFileSync.mockImplementation((filePath: fs.PathOrFileDescriptor) => {
      const p = String(filePath)
      if (p.includes('admin')) return fullGuide + fullFaq + fullFlows
      if (p.includes('guide.md')) return fullGuide
      if (p.includes('faq.md')) return fullFaq
      if (p.includes('flows.md')) return fullFlows
      return ''
    })

    const results = runCheck(['admin', 'chat'])
    expect(results).toHaveLength(2)
    expect(results.every((r) => r.allOk)).toBe(true)
  })

  it('reports exit code 1 condition when any module has missing docs', () => {
    mockFs.existsSync.mockReturnValue(false)
    mockFs.readFileSync.mockReturnValue('')

    const results = runCheck(['missing-module'])
    const hasErrors = results.some((r) => !r.allOk)
    expect(hasErrors).toBe(true)
  })

  it('exits with allOk=true for a module with all docs meeting minimum', () => {
    const guide = '## Introduction\n\n## Fonctionnalités\n\n## Configuration\n'
    const faq = '## Q1\n\n## Q2\n\n## Q3\n\n## Q4\n\n## Q5\n'
    const flows = '## Flux principal\n'

    mockFs.readFileSync.mockImplementation((filePath: fs.PathOrFileDescriptor) => {
      const p = String(filePath)
      if (p.includes('guide.md')) return guide
      if (p.includes('faq.md')) return faq
      if (p.includes('flows.md')) return flows
      return ''
    })

    const results = runCheck(['documents'])
    expect(results[0].allOk).toBe(true)
    expect(results[0].docs.every((d) => d.hasMinContent)).toBe(true)
  })

  it('counts H2 sections correctly ignoring H1 and H3', () => {
    const content = '# Titre\n\n## Section 1\n\n### Sous-section\n\n## Section 2\n\n## Section 3\n'
    mockFs.readFileSync.mockImplementation((filePath: fs.PathOrFileDescriptor) => {
      const p = String(filePath)
      if (p.includes('guide.md')) return content
      if (p.includes('faq.md')) return '## Q1\n\n## Q2\n\n## Q3\n\n## Q4\n\n## Q5\n'
      return '## Flux\n'
    })

    const results = runCheck(['chat'])
    const guideResult = results[0].docs.find((d) => d.file === 'guide.md')
    expect(guideResult?.sectionCount).toBe(3)
    expect(guideResult?.hasMinContent).toBe(true)
  })
})
