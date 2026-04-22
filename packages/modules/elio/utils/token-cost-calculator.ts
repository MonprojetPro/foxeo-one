/**
 * Calculateur de coût tokens pour les modèles LLM utilisés par Élio.
 * Tarifs basés sur les prix publics des APIs (Avril 2026).
 * Conversion USD → EUR : taux fixe 0.92.
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
  // Google Gemini (provider actuel elio-chat)
  // Source : https://ai.google.dev/pricing (Avril 2026)
  'gemini-2.5-flash': { inputPer1M: 0.15, outputPer1M: 0.60 },  // Gemini 2.5 Flash
  'gemini-2.0-flash': { inputPer1M: 0.075, outputPer1M: 0.30 }, // Gemini 2.0 Flash
  'gemini-1.5-flash': { inputPer1M: 0.075, outputPer1M: 0.30 }, // Gemini 1.5 Flash
  'gemini-1.5-pro': { inputPer1M: 1.25, outputPer1M: 5.00 },    // Gemini 1.5 Pro
  // Anthropic Claude (compatibilité future)
  // Source : https://www.anthropic.com/pricing (Avril 2026)
  'claude-haiku-4-5': { inputPer1M: 0.80, outputPer1M: 4.00 },
  'claude-haiku-4-5-20251001': { inputPer1M: 0.80, outputPer1M: 4.00 },
  'claude-sonnet-4-6': { inputPer1M: 3.00, outputPer1M: 15.00 },
  'claude-sonnet-4-20250514': { inputPer1M: 3.00, outputPer1M: 15.00 },
  'claude-opus-4-6': { inputPer1M: 15.00, outputPer1M: 75.00 },
}

/** Tarif par défaut quand le modèle est inconnu — utilise Gemini 2.5 Flash */
const DEFAULT_PRICING = { inputPer1M: 0.15, outputPer1M: 0.60 }

/**
 * Calcule le coût en euros pour une utilisation de tokens.
 * @returns coût en EUR, arrondi à 6 décimales
 */
export function calculateCostEur(
  model: string,
  inputTokens: number,
  outputTokens: number,
): number {
  const normalizedModel = model.toLowerCase().trim()

  // Recherche exacte, puis recherche par préfixe
  const exactMatch = MODEL_PRICING[normalizedModel]
  const prefixMatch = !exactMatch
    ? Object.entries(MODEL_PRICING).find(([key]) => normalizedModel.startsWith(key))?.[1]
    : undefined
  const pricing = exactMatch ?? prefixMatch ?? DEFAULT_PRICING

  if (!exactMatch && !prefixMatch) {
    console.warn(`[TOKEN_COST] Modèle inconnu "${model}" — tarif par défaut utilisé (vérifier MODEL_PRICING)`)
  }

  const costUsd =
    (inputTokens / 1_000_000) * pricing.inputPer1M +
    (outputTokens / 1_000_000) * pricing.outputPer1M

  return Math.round(costUsd * USD_TO_EUR * 1_000_000) / 1_000_000
}

/**
 * Retourne les tarifs affichables pour un modèle donné (usage UI).
 */
export function getModelPricing(model: string): {
  inputPer1M: number
  outputPer1M: number
  currency: 'USD'
} {
  const normalizedModel = model.toLowerCase().trim()
  const pricing =
    MODEL_PRICING[normalizedModel] ??
    Object.entries(MODEL_PRICING).find(([key]) => normalizedModel.startsWith(key))?.[1] ??
    DEFAULT_PRICING
  return { ...pricing, currency: 'USD' }
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
