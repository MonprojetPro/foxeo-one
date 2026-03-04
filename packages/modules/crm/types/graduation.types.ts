import { z } from 'zod'

// ============================================================
// Graduation types (Story 9.1)
// ============================================================

export const GraduationTierEnum = z.enum(['base', 'essentiel', 'agentique'])
export type GraduationTier = z.infer<typeof GraduationTierEnum>

export const GraduateClientSchema = z.object({
  clientId: z.string().uuid('clientId doit être un UUID valide'),
  tier: GraduationTierEnum,
  activeModules: z
    .array(z.string().min(1))
    .min(1, 'Au moins un module doit être sélectionné'),
  notes: z.string().max(2000, 'Les notes ne peuvent pas dépasser 2000 caractères').optional(),
})

export type GraduateClientInput = z.infer<typeof GraduateClientSchema>

export type GraduationResult = {
  clientId: string
  instanceId: string
  status: 'provisioning' | 'active'
  instanceUrl: string
  slug: string
}

// DB type (snake_case) for client_instances
export type ClientInstanceDB = {
  id: string
  client_id: string
  instance_url: string
  slug: string
  status: 'provisioning' | 'active' | 'suspended' | 'failed' | 'transferred'
  tier: 'base' | 'essentiel' | 'agentique'
  active_modules: string[]
  supabase_project_id: string | null
  vercel_project_id: string | null
  created_at: string
  updated_at: string
  activated_at: string | null
  metadata: Record<string, unknown>
}

