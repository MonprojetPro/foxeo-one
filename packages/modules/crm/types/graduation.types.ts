import { z } from 'zod'

// ============================================================
// Graduation types (Story 9.1)
// ============================================================

export const GraduationTierEnum = z.enum(['ponctuel', 'one', 'one_plus'])
export type GraduationTier = z.infer<typeof GraduationTierEnum>

export const GraduateClientSchema = z.object({
  clientId: z.string().uuid('clientId doit être un UUID valide'),
  tier: GraduationTierEnum,
  activeModules: z
    .array(z.string().min(1))
    .min(1, 'Au moins un module doit être sélectionné'),
  notes: z.string().max(2000, 'Les notes ne peuvent pas dépasser 2000 caractères').optional(),
  /**
   * Forçage opérateur : gradue le client MÊME si son parcours n'est pas terminé ou s'il
   * reste des demandes de validation en attente. Décision MiKL : pouvoir basculer en One
   * « au cas où » sans attendre la complétion (les garde-fous d'intégrité restent actifs :
   * client de l'opérateur + pas déjà en One).
   */
  force: z.boolean().optional(),
})

export type GraduateClientInput = z.infer<typeof GraduateClientSchema>

// ADR-01 Révision 2 (2026-04-13) — Plus de provisioning d'instance, juste un flag update
export type GraduationResult = {
  clientId: string
  status: 'graduated'
}

/**
 * @deprecated Depuis ADR-01 Révision 2 (2026-04-13).
 * Le modèle "instance per client" n'existe plus en exploitation normale.
 * Conservé temporairement pour Story 13.1 (kit de sortie) et Story 9.5b deprecated.
 */
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

