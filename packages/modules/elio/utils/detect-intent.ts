export interface Intent {
  action: 'search_client' | 'help_feature' | 'general' | 'correct_text' | 'generate_draft' | 'adjust_draft'
  query?: string          // search_client
  feature?: string        // help_feature
  clientName?: string     // correct_text | generate_draft
  originalText?: string   // correct_text
  draftType?: 'email' | 'validation_hub' | 'chat'  // generate_draft
  draftSubject?: string   // generate_draft
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

// Correction patterns: "Corrige ça pour Thomas : texte", "Adapte ce texte pour Marie : texte"
const CORRECTION_PATTERNS: RegExp[] = [
  /corrige\s+(?:ça|ce texte|ce message)\s+pour\s+(\w[\w\s-]*?)\s*:\s*(.+)/is,
  /corrige\s+pour\s+(\w[\w\s-]*?)\s*:\s*(.+)/is,
  /adapte\s+(?:ce texte|ce message|ça)?\s*pour\s+(\w[\w\s-]*?)\s*:\s*(.+)/is,
]

// Draft generation patterns
const DRAFT_PATTERNS: RegExp[] = [
  /génère\s+(?:un|une)\s+(email|message|brouillon|réponse\s+validation\s+hub|réponse)\s+pour\s+(\w[\w\s-]*?)(?:\s+pour\s+(.+))?$/is,
  /écris\s+(?:un|une)\s+(email|message|brouillon|réponse\s+validation\s+hub|réponse)\s+pour\s+(\w[\w\s-]*?)(?:\s+(?:pour|afin de|pour lui dire)\s+(.+))?$/is,
  /rédige\s+(?:un|une)\s+(email|message|brouillon|réponse)\s+pour\s+(\w[\w\s-]*?)(?:\s+(.+))?$/is,
]

// Adjustment patterns (short imperative commands for draft tweaks)
const ADJUSTMENT_PATTERNS: RegExp[] = [
  /^plus\s+court\s*\.?$/i,
  /^plus\s+long\s*\.?$/i,
  /^plus\s+formel\s*\.?$/i,
  /^plus\s+décontracté\s*\.?$/i,
  /^rends[- ](?:le|la)\s+plus\s+/i,
  /^ajoute\s+/i,
  /^enlève\s+/i,
  /^supprime\s+/i,
  /^passe\s+au\s+tutoiement/i,
  /^passe\s+au\s+vouvoiement/i,
  /^raccourcis\s+/i,
  /^version\s+\d+/i,
]

function detectDraftType(rawType: string): 'email' | 'validation_hub' | 'chat' {
  const t = rawType.toLowerCase().trim()
  if (t === 'email') return 'email'
  if (t.includes('validation') || t.includes('hub')) return 'validation_hub'
  return 'chat'
}

/**
 * Détecte l'intention d'un message utilisateur Hub.
 * Utilisé dans send-to-elio.ts pour décider de la Server Action à appeler.
 */
export function detectIntent(userMessage: string): Intent {
  const msg = userMessage.trim()

  if (!msg) {
    return { action: 'general' }
  }

  // 1. Correction / adaptation
  for (const pattern of CORRECTION_PATTERNS) {
    const match = msg.match(pattern)
    if (match) {
      const clientName = match[1]?.trim() ?? ''
      const originalText = match[2]?.trim() ?? ''
      return { action: 'correct_text', clientName, originalText }
    }
  }

  // 2. Génération de brouillon
  for (const pattern of DRAFT_PATTERNS) {
    const match = msg.match(pattern)
    if (match) {
      const rawType = match[1]?.trim() ?? ''
      const clientName = match[2]?.trim() ?? ''
      const draftSubject = match[3]?.trim()
      const draftType = detectDraftType(rawType)
      return { action: 'generate_draft', clientName, draftType, draftSubject }
    }
  }

  // 3. Ajustement de brouillon
  for (const pattern of ADJUSTMENT_PATTERNS) {
    if (pattern.test(msg)) {
      return { action: 'adjust_draft' }
    }
  }

  // 4. Recherche client
  for (const { pattern, groupIndex } of CLIENT_PATTERNS) {
    const match = msg.match(pattern)
    if (match) {
      const query = match[groupIndex]?.trim()
      return { action: 'search_client', query }
    }
  }

  // 5. Aide fonctionnalités
  for (const { pattern, groupIndex } of HELP_PATTERNS) {
    const match = msg.match(pattern)
    if (match) {
      const feature = match[groupIndex]?.trim()
      return { action: 'help_feature', feature }
    }
  }

  return { action: 'general' }
}
