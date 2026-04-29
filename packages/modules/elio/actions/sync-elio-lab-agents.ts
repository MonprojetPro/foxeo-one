'use server'

import { readdirSync, readFileSync } from 'fs'
import { join } from 'path'
import { z } from 'zod'
import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { type ActionResponse, successResponse, errorResponse } from '@monprojetpro/types'

export interface ElioLabAgent {
  id: string
  name: string
  description: string | null
  model: string
  temperature: number
  imagePath: string | null
  filePath: string
  systemPrompt: string | null
  archived: boolean
  createdAt: string
  updatedAt: string
}

export interface SyncResult {
  synced: number
  agents: ElioLabAgent[]
}

const VALID_MODELS = ['claude-haiku-4-5-20251001', 'claude-sonnet-4-6', 'claude-opus-4-6'] as const

const AgentFrontmatterSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  model: z.enum(VALID_MODELS).default('claude-sonnet-4-6'),
  temperature: z.number().min(0).max(2).default(1.0),
  image_path: z.string().optional(),
  sort_order: z.number().int().min(0).default(99),
})

/** Valide qu'un nom de fichier est sûr (pas de path traversal) */
function isSafeFilename(filename: string): boolean {
  return /^[a-zA-Z0-9_\-]+\.md$/.test(filename) && !filename.includes('..')
}

/** Parse un frontmatter YAML simple (--- ... ---) */
function parseFrontmatter(content: string): { data: Record<string, string | number>; body: string } {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/)
  if (!match) {
    return { data: {}, body: content.trim() }
  }

  const yamlBlock = match[1]
  const body = match[2].trim()
  const data: Record<string, string | number> = {}

  for (const line of yamlBlock.split('\n')) {
    const colonIdx = line.indexOf(':')
    if (colonIdx === -1) continue
    const key = line.slice(0, colonIdx).trim()
    const value = line.slice(colonIdx + 1).trim()
    if (!key || !value) continue
    const num = parseFloat(value)
    data[key] = isNaN(num) ? value : num
  }

  return { data, body }
}

/**
 * Server Action — Synchronise les agents Élio Lab depuis les fichiers .md.
 * Lit le dossier `packages/modules/elio/agents/lab/`, parse les frontmatters,
 * et effectue un UPSERT dans `elio_lab_agents`.
 */
export async function syncElioLabAgents(): Promise<ActionResponse<SyncResult>> {
  // process.cwd() = apps/hub/ dans Next.js — remonter à la racine du monorepo
  const monorepoRoot = join(process.cwd(), '..', '..')
  const agentsDir = join(monorepoRoot, 'packages', 'modules', 'elio', 'agents', 'lab')

  let files: string[]
  try {
    files = readdirSync(agentsDir)
  } catch {
    return errorResponse('Dossier agents introuvable', 'NOT_FOUND')
  }

  // H1: Filtrer uniquement les .md avec noms sûrs (pas de path traversal)
  const mdFiles = files.filter((f) => f.endsWith('.md') && isSafeFilename(f))

  if (mdFiles.length === 0) {
    return successResponse({ synced: 0, agents: [] })
  }

  const upsertData: Array<{
    name: string
    description: string | null
    model: string
    temperature: number
    image_path: string | null
    file_path: string
    system_prompt: string | null
    sort_order: number
  }> = []

  for (const file of mdFiles) {
    const filePath = join(agentsDir, file)
    let content: string
    try {
      content = readFileSync(filePath, 'utf-8')
    } catch {
      continue
    }

    const { data: raw, body } = parseFrontmatter(content)

    // M5: Validation Zod des valeurs critiques du frontmatter
    const parsed = AgentFrontmatterSchema.safeParse(raw)
    const fm = parsed.success ? parsed.data : AgentFrontmatterSchema.parse({})

    const relPath = `packages/modules/elio/agents/lab/${file}`

    upsertData.push({
      name: fm.name ?? file.replace('.md', ''),
      description: fm.description ?? null,
      model: fm.model,
      temperature: fm.temperature,
      image_path: fm.image_path ?? null,
      file_path: relPath,
      system_prompt: body || null,
      sort_order: fm.sort_order,
    })
  }

  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase
    .from('elio_lab_agents')
    .upsert(upsertData, { onConflict: 'file_path' })
    .select()

  if (error) {
    return errorResponse('Erreur lors de la synchronisation', 'DB_ERROR', error)
  }

  const agents: ElioLabAgent[] = (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description,
    model: row.model,
    temperature: Number(row.temperature),
    imagePath: row.image_path,
    filePath: row.file_path,
    systemPrompt: row.system_prompt,
    archived: row.archived,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }))

  return successResponse({ synced: agents.length, agents })
}
