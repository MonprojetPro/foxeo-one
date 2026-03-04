export interface Intent {
  action: 'search_client' | 'help_feature' | 'general'
  query?: string
  feature?: string
}

const CLIENT_PATTERNS: Array<{ pattern: RegExp; groupIndex: number }> = [
  { pattern: /où en est (.+?)\s*\?/i, groupIndex: 1 },
  { pattern: /quel est le parcours de (.+?)\s*\?/i, groupIndex: 1 },
  { pattern: /infos?\s+(?:sur|client)\s+(.+)/i, groupIndex: 1 },
  { pattern: /recherche\s+(.+)/i, groupIndex: 1 },
]

const HELP_PATTERNS: Array<{ pattern: RegExp; groupIndex: number }> = [
  { pattern: /comment\s+(?:je\s+)?(.+?)\s*\?/i, groupIndex: 1 },
  { pattern: /où\s+(?:je\s+)?(.+?)\s*\?/i, groupIndex: 1 },
  { pattern: /c'est quoi\s+(.+?)\s*\?/i, groupIndex: 1 },
]

/**
 * Détecte l'intention d'un message utilisateur Hub.
 * Utilisé dans send-to-elio.ts pour décider si une recherche client est nécessaire.
 */
export function detectIntent(userMessage: string): Intent {
  if (!userMessage.trim()) {
    return { action: 'general' }
  }

  for (const { pattern, groupIndex } of CLIENT_PATTERNS) {
    const match = userMessage.match(pattern)
    if (match) {
      const query = match[groupIndex]?.trim()
      return { action: 'search_client', query }
    }
  }

  for (const { pattern, groupIndex } of HELP_PATTERNS) {
    const match = userMessage.match(pattern)
    if (match) {
      const feature = match[groupIndex]?.trim()
      return { action: 'help_feature', feature }
    }
  }

  return { action: 'general' }
}
