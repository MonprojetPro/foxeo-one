// Internal utility — NOT a Server Action. Called only from send-to-elio.ts.

import * as fs from 'fs'
import * as path from 'path'

const MODULES_DIR = path.resolve(process.cwd(), 'packages/modules')
const MAX_TOKENS_PER_MODULE = 2000 // NFR : limiter la taille d'injection
const CHARS_PER_TOKEN = 4 // approximation : 1 token ≈ 4 caractères

/** Cache Node.js en mémoire : invalidé au redémarrage (redéploiement Next.js) */
const docCache = new Map<string, string>()

function readDocFileSafe(moduleId: string, fileName: string): string {
  const filePath = path.join(MODULES_DIR, moduleId, 'docs', fileName)
  try {
    return fs.readFileSync(filePath, 'utf-8').trim()
  } catch {
    return ''
  }
}

function truncateToTokenBudget(content: string, maxTokens: number): string {
  const maxChars = maxTokens * CHARS_PER_TOKEN
  if (content.length <= maxChars) return content
  return content.slice(0, maxChars) + '\n[...tronqué]'
}

function buildModuleDocSection(moduleId: string): string {
  const guide = readDocFileSafe(moduleId, 'guide.md')
  const faq = readDocFileSafe(moduleId, 'faq.md')

  if (!guide && !faq) return ''

  const parts: string[] = [`## Module : ${moduleId}`]
  if (guide) parts.push(guide)
  if (faq) parts.push('### FAQ\n' + faq)

  return truncateToTokenBudget(parts.join('\n\n'), MAX_TOKENS_PER_MODULE)
}

/**
 * Charge la documentation des modules actifs pour injection dans le system prompt Élio One.
 *
 * Stratégie d'injection sélective (économie de tokens) :
 * - Si la question mentionne un module spécifique → injecter uniquement sa doc
 * - Sinon → injecter guide.md de tous les modules actifs (pas FAQ ni flows)
 *
 * Cache en mémoire : invalidé au restart (redéploiement).
 */
export function loadModuleDocumentation(
  activeModules: string[],
  userMessage?: string
): string | null {
  if (activeModules.length === 0) return null

  // Injection sélective : détecter si la question mentionne un module précis
  if (userMessage) {
    const mentionedModule = activeModules.find((id) =>
      userMessage.toLowerCase().includes(id.toLowerCase())
    )

    if (mentionedModule) {
      const cacheKey = `selective:${mentionedModule}`
      if (!docCache.has(cacheKey)) {
        const section = buildModuleDocSection(mentionedModule)
        docCache.set(cacheKey, section)
      }
      const cached = docCache.get(cacheKey) ?? ''
      return cached ? `# DOCUMENTATION MODULE\n${cached}` : null
    }
  }

  // Injection globale : guide.md de tous les modules actifs (sans FAQ pour économiser tokens)
  const cacheKey = `global:${[...activeModules].sort().join(',')}`
  if (!docCache.has(cacheKey)) {
    const sections = activeModules
      .map((id) => {
        const guide = readDocFileSafe(id, 'guide.md')
        if (!guide) return ''
        return `## Module : ${id}\n${truncateToTokenBudget(guide, MAX_TOKENS_PER_MODULE)}`
      })
      .filter(Boolean)

    docCache.set(cacheKey, sections.join('\n\n'))
  }

  const cached = docCache.get(cacheKey) ?? ''
  return cached ? `# DOCUMENTATION MODULES ACTIFS\n${cached}` : null
}

/** Vide le cache (utile pour les tests) */
export function clearDocumentationCache(): void {
  docCache.clear()
}
