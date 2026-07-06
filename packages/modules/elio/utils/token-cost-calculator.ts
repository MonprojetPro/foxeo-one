/**
 * Calculateur de coût tokens pour les modèles LLM utilisés par Élio.
 * Tarifs basés sur les prix publics des APIs.
 * Conversion USD → EUR : taux fixe 0.92.
 *
 * Multi-provider (chantier Élio Hub) : un modèle absent de MODEL_PRICING
 * (ex : modèle tiers via l'adaptateur openai-compatible) ne casse JAMAIS le
 * tracking — coût 0 + flag `unknownModel: true` (cf. calculateTokenCost).
 * Ajouter le tarif dans MODEL_PRICING dès qu'un nouveau modèle est adopté.
 */

const USD_TO_EUR = 0.92

/**
 * Table de tarifs par modèle : [inputPer1M$, outputPer1M$]
 * Source : pages publiques pricing Google AI / Anthropic
 * Dernière vérification : Avril 2026 — à mettre à jour si les tarifs changent.
 * Note : Gemini 2.5 Flash en mode "thinking" peut coûter davantage
 * (les thinking tokens comptent dans candidatesTokenCount mais le tarif est identique).
 */
const MODEL_PRICING: Record<string, { inputPer1M: number; outputPer1M: number }> = {
  // Google Gemini
  // Source : https://ai.google.dev/pricing (Avril 2026)
  'gemini-2.5-flash': { inputPer1M: 0.15, outputPer1M: 0.60 },  // Gemini 2.5 Flash
  'gemini-2.0-flash': { inputPer1M: 0.075, outputPer1M: 0.30 }, // Gemini 2.0 Flash
  'gemini-1.5-flash': { inputPer1M: 0.075, outputPer1M: 0.30 }, // Gemini 1.5 Flash
  'gemini-1.5-pro': { inputPer1M: 1.25, outputPer1M: 5.00 },    // Gemini 1.5 Pro
  // Anthropic Claude
  // Source : https://www.anthropic.com/pricing (Avril 2026)
  'claude-haiku-4-5': { inputPer1M: 0.80, outputPer1M: 4.00 },
  'claude-haiku-4-5-20251001': { inputPer1M: 0.80, outputPer1M: 4.00 },
  'claude-sonnet-4-6': { inputPer1M: 3.00, outputPer1M: 15.00 },
  'claude-opus-4-6': { inputPer1M: 15.00, outputPer1M: 75.00 },
}

/** Résout le tarif d'un modèle : match exact, puis par préfixe, sinon null. */
function resolvePricing(model: string): { inputPer1M: number; outputPer1M: number } | null {
  const normalizedModel = model.toLowerCase().trim()
  const exactMatch = MODEL_PRICING[normalizedModel]
  if (exactMatch) return exactMatch
  return (
    Object.entries(MODEL_PRICING).find(([key]) => normalizedModel.startsWith(key))?.[1] ?? null
  )
}

export interface TokenCostResult {
  /** Coût en EUR, arrondi à 6 décimales. 0 si le modèle est inconnu. */
  costEur: number
  /** true si le modèle est absent de MODEL_PRICING (coût non calculable → 0). */
  unknownModel: boolean
}

/**
 * Calcule le coût en euros pour une utilisation de tokens, avec flag modèle inconnu.
 * Modèle inconnu (ex : modèle tiers openai-compatible) → { costEur: 0, unknownModel: true } :
 * le tracking continue de fonctionner, sans inventer un tarif.
 */
export function calculateTokenCost(
  model: string,
  inputTokens: number,
  outputTokens: number,
): TokenCostResult {
  const pricing = resolvePricing(model)

  if (!pricing) {
    console.warn(
      `[TOKEN_COST] Modèle inconnu "${model}" — coût 0 enregistré (ajouter le tarif dans MODEL_PRICING)`,
    )
    return { costEur: 0, unknownModel: true }
  }

  const costUsd =
    (inputTokens / 1_000_000) * pricing.inputPer1M +
    (outputTokens / 1_000_000) * pricing.outputPer1M

  return {
    costEur: Math.round(costUsd * USD_TO_EUR * 1_000_000) / 1_000_000,
    unknownModel: false,
  }
}

/**
 * Calcule le coût en euros pour une utilisation de tokens.
 * Compat : signature historique (retourne un number). Modèle inconnu → 0.
 * @returns coût en EUR, arrondi à 6 décimales
 */
export function calculateCostEur(
  model: string,
  inputTokens: number,
  outputTokens: number,
): number {
  return calculateTokenCost(model, inputTokens, outputTokens).costEur
}

/**
 * Retourne les tarifs affichables pour un modèle donné (usage UI).
 * Modèle inconnu → tarifs à 0 + unknownModel: true (afficher « tarif inconnu »).
 */
export function getModelPricing(model: string): {
  inputPer1M: number
  outputPer1M: number
  currency: 'USD'
  unknownModel: boolean
} {
  const pricing = resolvePricing(model)
  if (!pricing) {
    return { inputPer1M: 0, outputPer1M: 0, currency: 'USD', unknownModel: true }
  }
  return { ...pricing, currency: 'USD', unknownModel: false }
}

/**
 * Formate un coût en euros pour l'affichage.
 * Ex: 0.000042 → "0,000042 €" | 1.23 → "1,23 €"
 */
export function formatCostEur(costEur: number): string {
  if (costEur < 0.01) {
    return `${costEur.toFixed(6).replace('.', ',')} €`
  }
  return `${costEur.toFixed(2).replace('.', ',')} €`
}
