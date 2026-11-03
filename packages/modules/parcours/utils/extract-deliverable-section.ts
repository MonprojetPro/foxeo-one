/**
 * Extrait la section « ## Le livrable … » du prompt d'un agent Élio Lab, jusqu'au
 * titre de niveau 2 suivant. C'est la structure que le document généré doit suivre.
 */
export function extractDeliverableSection(agentPrompt: string | null | undefined): string | null {
  if (!agentPrompt) return null
  const lines = agentPrompt.split(/\r?\n/)
  const start = lines.findIndex((l) => /^##\s+Le livrable/i.test(l))
  if (start === -1) return null
  const rest = lines.slice(start + 1)
  const end = rest.findIndex((l) => /^##\s/.test(l))
  const section = (end === -1 ? rest : rest.slice(0, end)).join('\n').trim()
  return section || null
}
