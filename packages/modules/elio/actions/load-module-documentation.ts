// Internal utility — NOT a Server Action. Called only from send-to-elio.ts.
//
// Utilise le registre statique embarqué dans le bundle (module-docs-registry.ts)
// au lieu de fs.readFileSync qui échoue silencieusement sur Vercel (fichiers source
// non déployés). Le registre est toujours disponible car compilé dans le bundle JS.

import { getModuleDoc } from '../config/module-docs-registry'

const KEYWORDS: Record<string, string[]> = {
  'chat': ['chat', 'message', 'messagerie', 'contacter mikl', 'écrire à mikl'],
  'documents': ['document', 'fichier', 'pdf', 'upload', 'dossier', 'télécharger'],
  'visio': ['visio', 'meeting', 'réunion', 'visioconférence', 'google meet', 'cal.com'],
  'facturation': ['facturation', 'facture', 'devis', 'abonnement', 'paiement', 'comptabilité'],
  'support': ['support', 'aide', 'faq', 'signaler', 'problème', 'ticket', 'contacter'],
  'elio': ['élio', 'elio', 'assistant'],
  'core-dashboard': ['accueil', 'dashboard', 'tableau de bord'],
}

/**
 * Détecte si le message mentionne un module spécifique (par nom ou mots-clés associés).
 */
function detectMentionedModule(activeModules: string[], userMessage: string): string | null {
  const lower = userMessage.toLowerCase()

  // 1. Correspondance exacte par ID de module
  const byId = activeModules.find((id) => lower.includes(id.toLowerCase()))
  if (byId) return byId

  // 2. Correspondance par mots-clés associés
  for (const [moduleId, kw] of Object.entries(KEYWORDS)) {
    if (!activeModules.includes(moduleId)) continue
    if (kw.some((k) => lower.includes(k))) return moduleId
  }

  return null
}

/**
 * Charge la documentation des modules actifs pour injection dans le system prompt Élio One.
 *
 * Stratégie d'injection sélective (économie de tokens) :
 * - Si la question mentionne un module spécifique → injecter uniquement sa doc
 * - Sinon → injecter la doc de tous les modules actifs
 *
 * Source : registre statique embarqué dans le bundle (pas de fs, fonctionne en prod Vercel).
 */
export function loadModuleDocumentation(
  activeModules: string[],
  userMessage?: string
): string | null {
  if (activeModules.length === 0) return null

  // Injection sélective : détecter si la question mentionne un module précis
  if (userMessage) {
    const mentionedModule = detectMentionedModule(activeModules, userMessage)
    if (mentionedModule) {
      const doc = getModuleDoc(mentionedModule)
      return doc ? `# DOCUMENTATION MODULE\n${doc}` : null
    }
  }

  // Injection globale : doc de tous les modules actifs
  const sections = activeModules
    .map((id) => getModuleDoc(id))
    .filter(Boolean) as string[]

  return sections.length > 0 ? `# DOCUMENTATION MODULES ACTIFS\n${sections.join('\n\n')}` : null
}

/** Conservé pour compatibilité des tests existants */
export function clearDocumentationCache(): void {
  // No-op : le registre statique n'a pas de cache à vider
}
