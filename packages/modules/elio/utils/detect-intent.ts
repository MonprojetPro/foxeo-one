export type ModuleActionVerb = 'send' | 'create' | 'update' | 'delete'

export interface Intent {
  action: 'search_client' | 'help_feature' | 'general' | 'correct_text' | 'generate_draft' | 'adjust_draft' | 'request_evolution' | 'module_action'
  query?: string          // search_client
  feature?: string        // help_feature
  clientName?: string     // correct_text | generate_draft
  originalText?: string   // correct_text
  draftType?: 'email' | 'validation_hub' | 'chat'  // generate_draft
  draftSubject?: string   // generate_draft
  initialRequest?: string // request_evolution — besoin exprimé par le client
  // module_action (Story 8.9a — FR48)
  moduleTarget?: string       // module cible : 'adhesions', 'agenda', 'sms', 'facturation', 'unknown'
  moduleActionVerb?: ModuleActionVerb  // verbe d'action
  moduleActionParams?: Record<string, unknown>  // paramètres extraits
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

// Story 8.9a — Module action patterns (AC2, FR48)
// Imperative commands targeting a module (One+ only)
const MODULE_SEND_PATTERN = /^envoie(?:r)?\s+(?:un\s+|une\s+)?(.+?)\s+(?:à|aux|a)\s+(.+)/i
const MODULE_CREATE_PATTERN = /^crée(?:r)?\s+(?:un\s+|une\s+)?(.+?)\s+(?:pour|le|la|les)\s+(.+)/i
const MODULE_DELETE_PATTERN = /^supprime(?:r)?\s+(?:le|la|les)\s+(.+)/i
const MODULE_UPDATE_PATTERN = /^modifie(?:r)?\s+(?:le|la|les)\s+(.+)/i

function inferModuleFromText(text: string): string {
  const lower = text.toLowerCase()
  // Checked in priority order — sms before membre to avoid false match on "membres"
  if (lower.includes('sms')) return 'sms'
  if (lower.includes('facture') || lower.includes('devis') || lower.includes('paiement')) return 'facturation'
  if (lower.includes('\u00e9v\u00e9nement') || lower.includes('evenement') ||
      lower.includes('r\u00e9servation') || lower.includes('reservation') ||
      lower.includes('rendez')) return 'agenda'
  if (lower.includes('rappel') || lower.includes('cotisation') ||
      lower.includes('adh\u00e9sion') || lower.includes('adhesion') ||
      lower.includes('membre')) return 'adhesions'
  return 'unknown'
}

// Story 8.8 — Evolution request patterns (AC1, FR47)
const EVOLUTION_PATTERNS: Array<{ pattern: RegExp; groupIndex: number }> = [
  { pattern: /je voudrais\s+(?:pouvoir\s+)?(.+)/i, groupIndex: 1 },
  { pattern: /j['']aimerais\s+(?:avoir\s+|pouvoir\s+)?(.+)/i, groupIndex: 1 },
  { pattern: /on pourrait\s+(.+)/i, groupIndex: 1 },
  { pattern: /il faudrait\s+(.+)/i, groupIndex: 1 },
  { pattern: /(?:est-ce qu['']on peut|peut-on)\s+ajouter\s+(.+)/i, groupIndex: 1 },
  { pattern: /(?:ce serait bien d['']avoir|il manque)\s+(.+)/i, groupIndex: 1 },
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

  // 3. Action module (Story 8.9a — FR48) — impératif + mot-clé module connu
  // Détecté AVANT adjust_draft car "Supprime les membres..." est un module_action, pas un ajustement
  const sendMatch = msg.match(MODULE_SEND_PATTERN)
  if (sendMatch) {
    const subject = sendMatch[1]?.trim() ?? ''
    const target = sendMatch[2]?.trim() ?? ''
    const moduleTarget = inferModuleFromText(subject + ' ' + target)
    if (moduleTarget !== 'unknown') {
      return {
        action: 'module_action',
        moduleActionVerb: 'send',
        moduleTarget,
        moduleActionParams: { subject, target },
      }
    }
  }

  const createMatch = msg.match(MODULE_CREATE_PATTERN)
  if (createMatch) {
    const subject = createMatch[1]?.trim() ?? ''
    const target = createMatch[2]?.trim() ?? ''
    const moduleTarget = inferModuleFromText(subject + ' ' + target)
    if (moduleTarget !== 'unknown') {
      return {
        action: 'module_action',
        moduleActionVerb: 'create',
        moduleTarget,
        moduleActionParams: { subject, target },
      }
    }
  }

  const deleteMatch = msg.match(MODULE_DELETE_PATTERN)
  if (deleteMatch) {
    const subject = deleteMatch[1]?.trim() ?? ''
    const moduleTarget = inferModuleFromText(subject)
    if (moduleTarget !== 'unknown') {
      return {
        action: 'module_action',
        moduleActionVerb: 'delete',
        moduleTarget,
        moduleActionParams: { subject },
      }
    }
  }

  const updateMatch = msg.match(MODULE_UPDATE_PATTERN)
  if (updateMatch) {
    const subject = updateMatch[1]?.trim() ?? ''
    const moduleTarget = inferModuleFromText(subject)
    if (moduleTarget !== 'unknown') {
      return {
        action: 'module_action',
        moduleActionVerb: 'update',
        moduleTarget,
        moduleActionParams: { subject },
      }
    }
  }

  // 4. Ajustement de brouillon (Hub — après module_action pour éviter les conflits)
  for (const pattern of ADJUSTMENT_PATTERNS) {
    if (pattern.test(msg)) {
      return { action: 'adjust_draft' }
    }
  }

  // 5. Demande d'évolution (Story 8.8)
  for (const { pattern, groupIndex } of EVOLUTION_PATTERNS) {
    const match = msg.match(pattern)
    if (match) {
      const initialRequest = match[groupIndex]?.trim() ?? msg
      return { action: 'request_evolution', initialRequest }
    }
  }

  // 6. Recherche client
  for (const { pattern, groupIndex } of CLIENT_PATTERNS) {
    const match = msg.match(pattern)
    if (match) {
      const query = match[groupIndex]?.trim()
      return { action: 'search_client', query }
    }
  }

  // 7. Aide fonctionnalités
  for (const { pattern, groupIndex } of HELP_PATTERNS) {
    const match = msg.match(pattern)
    if (match) {
      const feature = match[groupIndex]?.trim()
      return { action: 'help_feature', feature }
    }
  }

  return { action: 'general' }
}
