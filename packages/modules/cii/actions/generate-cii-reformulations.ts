'use server'

import Anthropic from '@anthropic-ai/sdk'
import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { type ActionResponse, successResponse, errorResponse } from '@monprojetpro/types'
import { toCamelCase } from '@monprojetpro/utils'
import { CII_REFORMULATION_MODEL, CII_API_TIMEOUT_MS, CII_MAX_TOKENS } from '../config/models'
import type { CiiReformulationLineDB, CiiReformulationLine } from '../types/cii.types'

// ============================================================
// generateCiiReformulations — T-062
//
// Reformule chaque fonction au format officiel CII (section 4 de
// agrement CII/CONSIGNES-CII-HUB.md) : Action + Innovation + Technologie +
// Bénéfice, sans jargon technique brut. L'IA ne touche JAMAIS au temps — il
// est fourni directement dans le fichier uploadé (décision du 23-10).
// ============================================================

export async function generateCiiReformulations(
  importId: string
): Promise<ActionResponse<CiiReformulationLine[]>> {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('[CII:GENERATE] ANTHROPIC_API_KEY non configurée')
    return errorResponse('Service IA indisponible', 'CONFIG_ERROR')
  }

  try {
    const supabase = await createServerSupabaseClient()

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) return errorResponse('Non authentifié', 'UNAUTHORIZED')

    // Jamais sur une ligne déjà validée ou transférée — la réécrire corromprait
    // la traçabilité exigée par le dossier justificatif CII (section 6 des
    // consignes) une fois le devis/la facture émis.
    const { data: lines, error: linesError } = await supabase
      .from('cii_reformulation_lines')
      .select('*')
      .eq('import_id', importId)
      .in('status', ['pending', 'reformulated'])
      .order('order_index', { ascending: true })

    if (linesError) {
      console.error('[CII:GENERATE] Fetch lines error:', linesError)
      return errorResponse('Impossible de charger les lignes', 'FETCH_FAILED', linesError)
    }

    const lineRows = (lines ?? []) as CiiReformulationLineDB[]
    if (lineRows.length === 0) {
      return errorResponse('Aucune ligne à reformuler — toutes sont déjà validées ou transférées', 'VALIDATION_ERROR')
    }

    const prompt = buildReformulationPrompt(lineRows.map((l) => l.function_name))

    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
      timeout: CII_API_TIMEOUT_MS,
    })

    const message = await anthropic.messages.create({
      model: CII_REFORMULATION_MODEL,
      max_tokens: CII_MAX_TOKENS,
      temperature: 0.3,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = message.content[0]?.type === 'text' ? message.content[0].text : ''
    const reformulations = parseReformulationsResponse(text, lineRows.length)

    if (!reformulations) {
      return errorResponse(
        'La réponse de l\'IA n\'a pas pu être exploitée — réessaie',
        'API_ERROR'
      )
    }

    const updates = lineRows.map((row, index) =>
      supabase
        .from('cii_reformulation_lines')
        .update({ reformulated_text: reformulations[index], status: 'reformulated', updated_at: new Date().toISOString() })
        .eq('id', row.id)
        .select()
        .single()
    )

    const results = await Promise.all(updates)
    const failed = results.find((r) => r.error || !r.data)
    if (failed) {
      console.error('[CII:GENERATE] Update error:', failed.error)
      return errorResponse('Échec de l\'enregistrement des reformulations', 'UPDATE_FAILED', failed.error)
    }

    const updatedLines = results.map((r) => toCamelCase(r.data as CiiReformulationLineDB) as unknown as CiiReformulationLine)
    return successResponse(updatedLines)
  } catch (error) {
    console.error('[CII:GENERATE] Unexpected error:', error)
    return errorResponse('Échec de la génération IA', 'API_ERROR', error)
  }
}

function buildReformulationPrompt(functionNames: string[]): string {
  const numberedList = functionNames.map((name, i) => `${i + 1}. ${name}`).join('\n')

  return `Tu reformules une liste de fonctions développées pour MonProjetPro, dans le cadre d'un devis ou d'une facture mentionnant le Crédit d'Impôt Innovation (CII).

**Format imposé pour chaque ligne, sans exception :**
[Action] + [Innovation] + [Technologie] + [Bénéfice nouveau]

**Règles strictes :**
- Jamais de libellé plat ("Développement de X", "Maintenance de Y", "Refonte de Z").
- Jamais de jargon technique brut (noms de frameworks, de librairies) — décris la fonction, pas l'implémentation.
- Chaque reformulation doit refléter une nouveauté ou une amélioration fonctionnelle réelle, en une phrase, concise (une ligne, pas un paragraphe).
- Ne mentionne jamais de pourcentage ou de montant de crédit d'impôt.

**Fonctions à reformuler, dans l'ordre :**
${numberedList}

**Réponds UNIQUEMENT avec un tableau JSON de ${functionNames.length} chaînes, dans le même ordre, sans aucun texte autour :**
["reformulation de la fonction 1", "reformulation de la fonction 2", ...]`
}

function parseReformulationsResponse(text: string, expectedCount: number): string[] | null {
  const jsonMatch = text.match(/\[[\s\S]*\]/)
  if (!jsonMatch) return null

  try {
    const parsed = JSON.parse(jsonMatch[0])
    if (!Array.isArray(parsed) || parsed.length !== expectedCount) return null
    if (!parsed.every((item) => typeof item === 'string' && item.trim().length > 0)) return null
    return parsed as string[]
  } catch {
    return null
  }
}
