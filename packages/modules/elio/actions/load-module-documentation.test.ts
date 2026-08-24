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

  // La documentation ne vient plus du systeme de fichiers mais d'un registre
  // compile dans le bundle : les fichiers source ne sont pas deployes sur Vercel,
  // ou la lecture disque echouait en silence. Il n'y a donc plus ni lecture de
  // fichier, ni cache a verifier — seulement un resultat stable d'un appel a l'autre.
  it('retourne le meme resultat a chaque appel, sans lecture disque', () => {
    const first = loadModuleDocumentation(['chat'])
    const second = loadModuleDocumentation(['chat'])
    expect(second).toBe(first)
    expect(mockFs.readFileSync).not.toHaveBeenCalled()
  })

  it('returns null when module docs are empty', () => {
    mockFs.readFileSync.mockReturnValue('')
    const result = loadModuleDocumentation(['empty-module'])
    expect(result).toBeNull()
  })

  // Le registre embarque des documents de taille maitrisee a la compilation :
  // il n'y a plus de troncature a l'execution. On verifie que l'injection reste
  // de taille raisonnable pour le contexte envoye au modele.
  it('produit une injection de taille raisonnable pour tous les modules', () => {
    const result = loadModuleDocumentation([
      'chat', 'documents', 'visio', 'facturation', 'support', 'elio', 'core-dashboard',
    ])
    expect(result).toBeTruthy()
    expect(result!.length).toBeLessThan(60000)
  })
})
