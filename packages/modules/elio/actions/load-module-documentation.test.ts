import { describe, it, expect, vi, beforeEach } from 'vitest'
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

const mockFs = vi.mocked(fs)

// Import AFTER mocks
const { loadModuleDocumentation, clearDocumentationCache } = await import(
  './load-module-documentation'
)

const GUIDE_CONTENT = 'Guide du module Chat\n\n## Introduction\nContenu du guide.'
const FAQ_CONTENT = 'FAQ Chat\n\n## Q: Comment envoyer ?\nEnvoyez votre message.'

describe('loadModuleDocumentation', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    clearDocumentationCache()
    mockFs.readFileSync.mockImplementation((filePath: fs.PathOrFileDescriptor) => {
      const p = String(filePath)
      if (p.includes('guide.md')) return GUIDE_CONTENT
      if (p.includes('faq.md')) return FAQ_CONTENT
      return ''
    })
  })

  it('returns null when no active modules', () => {
    const result = loadModuleDocumentation([])
    expect(result).toBeNull()
  })

  it('returns documentation section for active modules', () => {
    const result = loadModuleDocumentation(['chat'])
    expect(result).not.toBeNull()
    expect(result).toContain('DOCUMENTATION MODULES ACTIFS')
    expect(result).toContain('chat')
  })

  it('returns selective doc when user message mentions a module', () => {
    const result = loadModuleDocumentation(['chat', 'documents'], 'Comment utiliser le chat ?')
    expect(result).not.toBeNull()
    expect(result).toContain('DOCUMENTATION MODULE')
    expect(result).toContain('chat')
  })

  it('uses cache on second call with same modules', () => {
    loadModuleDocumentation(['chat'])
    loadModuleDocumentation(['chat'])
    // Global path only reads guide.md per module — 1 call total, cache hits on 2nd invocation
    expect(mockFs.readFileSync).toHaveBeenCalledTimes(1)
  })

  it('returns null when module docs are empty', () => {
    mockFs.readFileSync.mockReturnValue('')
    const result = loadModuleDocumentation(['empty-module'])
    expect(result).toBeNull()
  })

  it('truncates content exceeding token budget', () => {
    const longContent = 'A'.repeat(20000) // 20000 chars >> 2000 tokens budget
    mockFs.readFileSync.mockReturnValue(longContent)
    const result = loadModuleDocumentation(['chat'])
    // Result should not exceed ~(2000 tokens * 4 chars + overhead)
    expect(result!.length).toBeLessThan(12000)
    expect(result).toContain('[...tronqué]')
  })
})
