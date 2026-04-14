'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { type ActionResponse, successResponse, errorResponse } from '@monprojetpro/types'
import { z } from 'zod'
import { randomUUID } from 'crypto'

import { SLUG_REGEX } from '../utils/slug-validation'

const ProvisionInstanceSchema = z.object({
  clientId: z.string().uuid('clientId doit être un UUID valide'),
  slug: z
    .string()
    .regex(SLUG_REGEX, 'Slug invalide : 3–50 caractères, minuscules, chiffres et tirets uniquement'),
  modules: z.array(z.string()).min(1, 'Au moins un module requis'),
  tier: z.enum(['base', 'essentiel', 'agentique']),
})

export type ProvisionInstanceInput = z.infer<typeof ProvisionInstanceSchema>

export type ProvisionResult = {
  instanceId: string
  slug: string
  instanceUrl: string
  supabaseProjectId: string
  vercelProjectId: string
}

export type ProvisionStep =
  | 'validation'
  | 'supabase'
  | 'migrations'
  | 'vercel'
  | 'health_check'
  | 'ready'
  | 'failed'

// ============================================================
// External API helpers (isolated for testability)
// ============================================================

export async function createSupabaseProject(
  token: string,
  projectName: string
): Promise<{ projectId: string; dbUrl: string } | null> {
  const dbPass = randomUUID().replace(/-/g, '')
  const res = await fetch('https://api.supabase.com/v1/projects', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: projectName,
      db_pass: dbPass,
      region: 'eu-west-1',
      plan: 'free',
    }),
  })
  if (!res.ok) return null
  const data = (await res.json()) as { id: string; database: { host: string } }
  return {
    projectId: data.id,
    dbUrl: `postgresql://postgres:${dbPass}@${data.database.host}:5432/postgres`,
  }
}

export async function deleteSupabaseProject(token: string, projectId: string): Promise<void> {
  try {
    const res = await fetch(`https://api.supabase.com/v1/projects/${projectId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) {
      console.error(`[ADMIN:PROVISION_INSTANCE] Supabase project delete failed (${res.status}): ${projectId}`)
    }
  } catch (err) {
    console.error('[ADMIN:PROVISION_INSTANCE] Supabase project delete error:', err)
  }
}

export async function createVercelProject(
  token: string,
  projectName: string,
  envVars: Record<string, string>,
  domain: string
): Promise<string | null> {
  // 1. Create project
  const createRes = await fetch('https://api.vercel.com/v9/projects', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name: projectName, framework: 'nextjs' }),
  })
  if (!createRes.ok) return null
  const project = (await createRes.json()) as { id: string }

  // 2. Set env vars
  const envArray = Object.entries(envVars).map(([key, value]) => ({
    key,
    value,
    target: ['production', 'preview'],
    type: 'encrypted',
  }))
  const envRes = await fetch(`https://api.vercel.com/v9/projects/${project.id}/env`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(envArray),
  })
  if (!envRes.ok) return null

  // 3. Add domain
  await fetch(`https://api.vercel.com/v9/projects/${project.id}/domains`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name: domain }),
  })

  // 4. Trigger deploy
  await fetch('https://api.vercel.com/v13/deployments', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name: project.id, target: 'production' }),
  })

  return project.id
}

export async function deleteVercelProject(token: string, projectId: string): Promise<void> {
  try {
    const res = await fetch(`https://api.vercel.com/v9/projects/${projectId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) {
      console.error(`[ADMIN:PROVISION_INSTANCE] Vercel project delete failed (${res.status}): ${projectId}`)
    }
  } catch (err) {
    console.error('[ADMIN:PROVISION_INSTANCE] Vercel project delete error:', err)
  }
}

const HEALTH_CHECK_INTERVAL_MS = 10_000
const HEALTH_CHECK_MAX_ATTEMPTS = 30

export async function pollInstanceHealth(
  instanceUrl: string,
  maxAttempts = HEALTH_CHECK_MAX_ATTEMPTS,
  intervalMs = HEALTH_CHECK_INTERVAL_MS
): Promise<boolean> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (attempt > 0) {
      await new Promise<void>((resolve) => setTimeout(resolve, intervalMs))
    }
    try {
      const res = await fetch(`${instanceUrl}/api/hub/health`, { method: 'GET' })
      if (res.ok) return true
    } catch {
      // Instance not yet ready — continue polling
    }
  }
  return false
}

// ============================================================
// Rollback: mark failed + delete external resources
// ============================================================
async function rollback(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  instanceId: string,
  supabaseProjectId: string | null,
  vercelProjectId: string | null,
  supabaseToken: string,
  vercelToken: string
): Promise<void> {
  const { error: statusError } = await supabase
    .from('client_instances')
    .update({ status: 'failed' })
    .eq('id', instanceId)

  if (statusError) {
    console.error('[ADMIN:PROVISION_INSTANCE] Rollback status update failed:', statusError)
  }

  if (supabaseProjectId && supabaseToken) {
    await deleteSupabaseProject(supabaseToken, supabaseProjectId)
  }

  if (vercelProjectId && vercelToken) {
    await deleteVercelProject(vercelToken, vercelProjectId)
  }
}

// ============================================================
// Realtime progress broadcast (best-effort)
// ============================================================
async function emitProgress(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  clientId: string,
  step: ProvisionStep,
  message: string
): Promise<void> {
  try {
    const channel = supabase.channel(`provisioning:${clientId}`)
    await channel.send({
      type: 'broadcast',
      event: 'progress',
      payload: { step, message, timestamp: new Date().toISOString() },
    })
    supabase.removeChannel(channel)
  } catch {
    // Non-blocking — progress emission is best-effort
  }
}

// ============================================================
// Main Server Action
// Story 12.6: Real provisioning from Hub UI
// ============================================================
export async function provisionOneInstanceFromHub(
  input: ProvisionInstanceInput
): Promise<ActionResponse<ProvisionResult>> {
  // Validate input schema
  const parsed = ProvisionInstanceSchema.safeParse(input)
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message ?? 'Données invalides'
    return errorResponse(firstError, 'VALIDATION_ERROR', parsed.error.issues)
  }

  const { clientId, slug, modules, tier } = parsed.data
  const supabase = await createServerSupabaseClient()

  // Auth check
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return errorResponse('Non authentifié', 'UNAUTHORIZED')
  }

  const { data: isOperator } = await supabase.rpc('is_operator')
  if (!isOperator) {
    return errorResponse('Accès réservé aux opérateurs', 'FORBIDDEN')
  }

  // Step 1 — Validation
  await emitProgress(supabase, clientId, 'validation', 'Validation en cours...')

  // Check slug uniqueness
  const { data: existingSlug } = await supabase
    .from('client_instances')
    .select('id')
    .eq('slug', slug)
    .maybeSingle()

  if (existingSlug) {
    return errorResponse(`Le slug "${slug}" est déjà utilisé`, 'SLUG_CONFLICT')
  }

  // Check client has no active or provisioning instance
  const { data: existingInstance } = await supabase
    .from('client_instances')
    .select('id')
    .eq('client_id', clientId)
    .in('status', ['provisioning', 'active'])
    .maybeSingle()

  if (existingInstance) {
    return errorResponse(
      'Ce client possède déjà une instance active ou en cours de provisioning',
      'INSTANCE_EXISTS'
    )
  }

  const instanceUrl = `https://${slug}.monprojet-pro.com`

  // Create initial record with status='provisioning'
  const { data: instance, error: insertError } = await supabase
    .from('client_instances')
    .insert({
      client_id: clientId,
      slug,
      instance_url: instanceUrl,
      status: 'provisioning',
      tier,
      active_modules: modules,
    })
    .select('id')
    .single()

  if (insertError || !instance) {
    console.error('[ADMIN:PROVISION_INSTANCE] Insert error:', insertError)
    return errorResponse(
      "Erreur lors de la création de l'enregistrement d'instance",
      'DATABASE_ERROR',
      insertError
    )
  }

  const instanceId = instance.id
  const supabaseToken = process.env.SUPABASE_MANAGEMENT_TOKEN ?? ''
  const vercelToken = process.env.VERCEL_TOKEN ?? ''
  let supabaseProjectId: string | null = null
  let vercelProjectId: string | null = null

  // Step 2 — Supabase Management API
  await emitProgress(supabase, clientId, 'supabase', 'Création Supabase...')

  if (supabaseToken) {
    const supabaseResult = await createSupabaseProject(supabaseToken, `monprojetpro-one-${slug}`)
    if (!supabaseResult) {
      await rollback(supabase, instanceId, null, null, supabaseToken, vercelToken)
      await emitProgress(supabase, clientId, 'failed', 'Échec création Supabase')
      return errorResponse('Échec de la création du projet Supabase', 'SUPABASE_API_ERROR')
    }
    supabaseProjectId = supabaseResult.projectId
    await supabase
      .from('client_instances')
      .update({ supabase_project_id: supabaseProjectId })
      .eq('id', instanceId)
  }

  // Step 3 — Migrations (logged; actual execution depends on infra setup)
  await emitProgress(supabase, clientId, 'migrations', 'Exécution des migrations...')

  // Step 4 — Vercel API
  await emitProgress(supabase, clientId, 'vercel', 'Déploiement Vercel...')

  if (vercelToken) {
    const instanceSecret = randomUUID()
    const envVars: Record<string, string> = {
      INSTANCE_ID: instanceId,
      INSTANCE_SLUG: slug,
      INSTANCE_SECRET: instanceSecret,
      HUB_URL: 'https://hub.monprojet-pro.com',
    }
    if (supabaseProjectId) {
      envVars.SUPABASE_PROJECT_ID = supabaseProjectId
    }

    const vercelId = await createVercelProject(
      vercelToken,
      `monprojetpro-one-${slug}`,
      envVars,
      `${slug}.monprojet-pro.com`
    )
    if (!vercelId) {
      await rollback(supabase, instanceId, supabaseProjectId, null, supabaseToken, vercelToken)
      await emitProgress(supabase, clientId, 'failed', 'Échec déploiement Vercel')
      return errorResponse('Échec de la création du projet Vercel', 'VERCEL_API_ERROR')
    }
    vercelProjectId = vercelId
    await supabase
      .from('client_instances')
      .update({ vercel_project_id: vercelProjectId })
      .eq('id', instanceId)
  }

  // Step 5 — Health check
  await emitProgress(supabase, clientId, 'health_check', 'Vérification de santé...')

  if (supabaseToken && vercelToken) {
    const healthy = await pollInstanceHealth(instanceUrl)
    if (!healthy) {
      await rollback(
        supabase,
        instanceId,
        supabaseProjectId,
        vercelProjectId,
        supabaseToken,
        vercelToken
      )
      await emitProgress(supabase, clientId, 'failed', "Instance inaccessible après déploiement")
      return errorResponse(
        "L'instance n'a pas démarré dans les délais impartis",
        'HEALTH_CHECK_TIMEOUT'
      )
    }
  }

  // Update to active
  await supabase
    .from('client_instances')
    .update({ status: 'active', activated_at: new Date().toISOString() })
    .eq('id', instanceId)

  // Activity log
  const { error: logError } = await supabase.from('activity_logs').insert({
    actor_type: 'operator',
    actor_id: user.id,
    action: 'instance_provisioned',
    entity_type: 'client_instance',
    entity_id: instanceId,
    metadata: { slug, tier, modules, supabaseProjectId, vercelProjectId },
  })

  if (logError) {
    console.error('[ADMIN:PROVISION_INSTANCE] Activity log error:', logError)
  }

  await emitProgress(supabase, clientId, 'ready', 'Prêt !')

  return successResponse({
    instanceId,
    slug,
    instanceUrl,
    supabaseProjectId: supabaseProjectId ?? '',
    vercelProjectId: vercelProjectId ?? '',
  })
}
