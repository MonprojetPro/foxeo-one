#!/usr/bin/env tsx
/**
 * check-module-docs.ts — Validation CI de la documentation des modules
 *
 * Vérifie que chaque module dans packages/modules/ possède :
 * - docs/guide.md    (au moins 3 sections H2)
 * - docs/faq.md      (au moins 5 questions H2)
 * - docs/flows.md    (au moins 1 flux H2)
 *
 * Deux niveaux d'exigence :
 * - par défaut : l'ABSENCE d'un document est bloquante (exit 1). Un document
 *   présent mais trop léger est signalé en avertissement, sans bloquer.
 * - avec --strict : les seuils de contenu deviennent eux aussi bloquants.
 */

import * as fs from 'fs'
import * as path from 'path'

const MODULES_DIR = path.resolve(__dirname, '../packages/modules')
const REQUIRED_DOCS = ['guide.md', 'faq.md', 'flows.md'] as const
const MIN_SECTIONS: Record<string, number> = {
  'guide.md': 3,
  'faq.md': 5,
  'flows.md': 1,
}

interface DocResult {
  file: string
  exists: boolean
  hasMinContent: boolean
  sectionCount: number
}

interface ModuleResult {
  moduleId: string
  docs: DocResult[]
  allOk: boolean
}

function countH2Sections(content: string): number {
  return (content.match(/^## /gm) ?? []).length
}

function checkDocFile(docPath: string, fileName: string): DocResult {
  const exists = fs.existsSync(docPath)
  if (!exists) {
    return { file: fileName, exists: false, hasMinContent: false, sectionCount: 0 }
  }

  const content = fs.readFileSync(docPath, 'utf-8').trim()
  if (!content) {
    return { file: fileName, exists: true, hasMinContent: false, sectionCount: 0 }
  }

  const sectionCount = countH2Sections(content)
  const required = MIN_SECTIONS[fileName] ?? 1
  const hasMinContent = sectionCount >= required

  return { file: fileName, exists: true, hasMinContent, sectionCount }
}

function checkModule(moduleId: string): ModuleResult {
  const docsDir = path.join(MODULES_DIR, moduleId, 'docs')
  const docs: DocResult[] = REQUIRED_DOCS.map((fileName) =>
    checkDocFile(path.join(docsDir, fileName), fileName)
  )
  const allOk = docs.every((d) => d.exists && d.hasMinContent)
  return { moduleId, docs, allOk }
}

export function getModuleIds(): string[] {
  if (!fs.existsSync(MODULES_DIR)) {
    return []
  }
  return fs
    .readdirSync(MODULES_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort()
}

export function runCheck(moduleIds: string[]): ModuleResult[] {
  return moduleIds.map(checkModule)
}

function formatReport(
  results: ModuleResult[],
  strict: boolean
): { lines: string[]; hasErrors: boolean } {
  const lines: string[] = []
  let missingCount = 0
  let thinCount = 0

  lines.push('\n📋 Vérification documentation des modules MonprojetPro\n')
  lines.push(strict ? 'Mode : strict (seuils de contenu bloquants)' : 'Mode : présence bloquante')
  lines.push('─'.repeat(60))

  for (const result of results) {
    const status = result.allOk ? '✅' : result.docs.every((d) => d.exists) ? '🟡' : '❌'
    lines.push(`\n${status} ${result.moduleId}`)

    for (const doc of result.docs) {
      if (!doc.exists) {
        lines.push(`   🔴 MISSING  ${doc.file}`)
        missingCount++
      } else if (!doc.hasMinContent) {
        const required = MIN_SECTIONS[doc.file] ?? 1
        lines.push(
          `   🟡 THIN     ${doc.file} — ${doc.sectionCount}/${required} sections H2 recommandées`
        )
        thinCount++
      } else {
        lines.push(`   🟢 OK       ${doc.file} (${doc.sectionCount} sections)`)
      }
    }
  }

  lines.push('\n' + '─'.repeat(60))

  const totalModules = results.length
  const documented = results.filter((r) => r.docs.every((d) => d.exists)).length
  const complete = results.filter((r) => r.allOk).length

  lines.push(`\n📊 Documents présents  : ${documented}/${totalModules} modules`)
  lines.push(`📊 Seuils de contenu   : ${complete}/${totalModules} modules`)
  if (missingCount > 0) {
    lines.push(`   ⚠️  ${missingCount} document(s) manquant(s) — bloquant`)
  }
  if (thinCount > 0) {
    lines.push(
      `   ⚠️  ${thinCount} document(s) sous le seuil de contenu` +
        (strict ? ' — bloquant (mode strict)' : ' — avertissement')
    )
  }
  if (missingCount === 0 && thinCount === 0) {
    lines.push('   🎉 Tous les modules sont documentés !')
  }
  lines.push('')

  const hasErrors = missingCount > 0 || (strict && thinCount > 0)
  return { lines, hasErrors }
}

// Main — exécuté uniquement si appelé directement (pas importé)
if (require.main === module) {
  const moduleIds = getModuleIds()
  if (moduleIds.length === 0) {
    console.error(`❌ Aucun module trouvé dans ${MODULES_DIR}`)
    process.exit(1)
  }

  const strict = process.argv.includes('--strict')
  const results = runCheck(moduleIds)
  const { lines, hasErrors } = formatReport(results, strict)

  for (const line of lines) {
    console.log(line)
  }

  if (hasErrors) {
    console.error('❌ Vérification échouée — des modules manquent de documentation')
    process.exit(1)
  } else {
    console.log('✅ Vérification réussie')
    process.exit(0)
  }
}
