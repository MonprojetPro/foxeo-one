'use server'

import { z } from 'zod'
import { createServerSupabaseClient } from '@foxeo/supabase'
import { errorResponse, successResponse, type ActionResponse } from '@foxeo/types'
import type { ElioModuleDoc } from '@foxeo/types'

const FaqItemSchema = z.object({
  question: z.string().min(1),
  answer: z.string().min(1),
})

const CommonIssueSchema = z.object({
  problem: z.string().min(1),
  diagnostic: z.string().min(1),
  escalation: z.string().min(1),
})

const ElioModuleDocSchema = z.object({
  moduleId: z.string().min(1, 'moduleId requis'),
  description: z.string().min(10, 'La description doit faire au moins 10 caractères'),
  faq: z.array(FaqItemSchema).default([]),
  commonIssues: z.array(CommonIssueSchema).default([]),
  updatedAt: z.string(),
})

const InjectElioDocSchema = z.object({
  clientId: z.string().uuid('ID client invalide'),
  doc: ElioModuleDocSchema,
})

export async function injectElioDocumentation(
  clientId: string,
  doc: ElioModuleDoc,
): Promise<ActionResponse<null>> {
  const parsed = InjectElioDocSchema.safeParse({ clientId, doc })
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message ?? 'Données invalides'
    return errorResponse(firstError, 'VALIDATION_ERROR', parsed.error.issues)
  }

  try {
    const supabase = await createServerSupabaseClient()

    // Auth
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return errorResponse('Non authentifié', 'UNAUTHORIZED')
    }

    // Lookup operator
    const { data: operator, error: opError } = await supabase
      .from('operators')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()

    if (opError || !operator) {
      return errorResponse('Opérateur non trouvé', 'NOT_FOUND')
    }

    // Check client belongs to operator
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('id, operator_id')
      .eq('id', clientId)
      .eq('operator_id', operator.id)
      .single()

    if (clientError || !client) {
      return errorResponse('Client introuvable', 'NOT_FOUND')
    }

    // Fetch current elio_module_docs
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: config, error: configError } = await (supabase as any)
      .from('client_configs')
      .select('id, elio_module_docs')
      .eq('client_id', clientId)
      .single() as {
        data: { id: string; elio_module_docs: ElioModuleDoc[] | null } | null
        error: unknown
      }

    if (configError || !config) {
      return errorResponse('Configuration client introuvable', 'NOT_FOUND')
    }

    const existingDocs: ElioModuleDoc[] = Array.isArray(config.elio_module_docs)
      ? config.elio_module_docs
      : []

    // Replace existing doc for moduleId or append — use validated data throughout
    const validatedDoc = parsed.data.doc
    const docWithDate: ElioModuleDoc = {
      ...validatedDoc,
      updatedAt: new Date().toISOString(),
    }

    const updatedDocs: ElioModuleDoc[] = existingDocs.some((d) => d.moduleId === validatedDoc.moduleId)
      ? existingDocs.map((d) => (d.moduleId === validatedDoc.moduleId ? docWithDate : d))
      : [...existingDocs, docWithDate]

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: updateError } = await (supabase as any)
      .from('client_configs')
      .update({ elio_module_docs: updatedDocs })
      .eq('id', config.id)

    if (updateError) {
      console.error('[CRM:INJECT_ELIO_DOC] Update error:', updateError)
      return errorResponse('Erreur lors de la mise à jour de la documentation', 'DATABASE_ERROR', updateError)
    }

    // Log activity
    const { error: logError } = await supabase.from('activity_logs').insert({
      actor_type: 'operator',
      actor_id: operator.id,
      action: 'elio_doc_injected',
      entity_type: 'client',
      entity_id: clientId,
      metadata: {
        moduleId: doc.moduleId,
      },
    })

    if (logError) {
      console.error('[CRM:INJECT_ELIO_DOC] Activity log error:', logError)
      // Non-fatal
    }

    return successResponse(null)
  } catch (error) {
    console.error('[CRM:INJECT_ELIO_DOC] Unexpected error:', error)
    return errorResponse('Une erreur inattendue est survenue', 'INTERNAL_ERROR', error)
  }
}
