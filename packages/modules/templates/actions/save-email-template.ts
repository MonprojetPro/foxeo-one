'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { type ActionResponse, successResponse, errorResponse } from '@monprojetpro/types'
import { z } from 'zod'

// ============================================================
// Types
// ============================================================

export interface EmailTemplate {
  id: string
  templateKey: string
  subject: string
  body: string
  variables: string[]
  createdAt: string
  updatedAt: string
}

// ============================================================
// Default templates (for reset)
// ============================================================

export const DEFAULT_EMAIL_TEMPLATES: Record<string, { subject: string; body: string }> = {
  bienvenue_lab: {
    subject: 'Bienvenue dans votre espace Lab MonprojetPro',
    body: 'Bonjour {prenom},\n\nBienvenue dans votre espace Lab MonprojetPro. Votre parcours d\'accompagnement commence aujourd\'hui.\n\nVotre Centaure,\nMiKL',
  },
  brief_valide: {
    subject: 'Votre brief a été validé — MonprojetPro',
    body: 'Bonjour {prenom},\n\nBonne nouvelle ! Votre brief "{titre_brief}" a été validé par votre accompagnateur.\n\n{commentaire}\n\nRejoignez votre espace Lab pour voir les prochaines étapes : {lien}\n\nVotre Centaure,\nMiKL',
  },
  brief_refuse: {
    subject: 'Votre brief nécessite des ajustements — MonprojetPro',
    body: 'Bonjour {prenom},\n\nVotre brief "{titre_brief}" a été retourné avec des commentaires.\n\n{commentaire}\n\nRendez-vous sur votre espace Lab pour le modifier : {lien}\n\nVotre Centaure,\nMiKL',
  },
  graduation: {
    subject: 'Félicitations ! Votre espace One est prêt — MonprojetPro',
    body: 'Bonjour {prenom},\n\nFélicitations pour votre graduation ! Votre dashboard One MonprojetPro est maintenant accessible : {lien}\n\nVotre Centaure,\nMiKL',
  },
  facture_envoyee: {
    subject: 'Votre facture MonprojetPro est disponible',
    body: 'Bonjour {prenom},\n\nVotre facture d\'un montant de {montant} est disponible sur votre espace : {lien}\n\nVotre Centaure,\nMiKL',
  },
  echec_paiement: {
    subject: 'Échec de paiement — MonprojetPro',
    body: 'Bonjour {prenom},\n\nNous n\'avons pas pu traiter votre paiement de {montant}. Veuillez mettre à jour vos informations de paiement : {lien}\n\nVotre Centaure,\nMiKL',
  },
  rappel_parcours: {
    subject: 'Votre parcours Lab vous attend — MonprojetPro',
    body: 'Bonjour {prenom},\n\nVotre accompagnateur a remarqué que vous n\'avez pas visité votre espace Lab depuis quelques jours. Continuez votre aventure : {lien}\n\nVotre Centaure,\nMiKL',
  },
}

const TEMPLATE_KEYS = Object.keys(DEFAULT_EMAIL_TEMPLATES)

// ============================================================
// assertOperator helper
// ============================================================

async function assertOperator() {
  const supabase = await createServerSupabaseClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { supabase: null, error: errorResponse('Non authentifié', 'UNAUTHORIZED') }
  }
  const { data: operator } = await supabase
    .from('operators')
    .select('id')
    .eq('auth_user_id', user.id)
    .single()
  if (!operator) {
    return { supabase: null, error: errorResponse('Accès réservé aux opérateurs', 'FORBIDDEN') }
  }
  return { supabase, error: null }
}

// ============================================================
// saveEmailTemplate — UPDATE subject + body
// ============================================================

const SaveEmailTemplateSchema = z.object({
  templateKey: z.string().min(1),
  subject: z.string().min(1, 'Le sujet est requis'),
  body: z.string().min(1, 'Le corps est requis'),
})

export async function saveEmailTemplate(
  input: z.infer<typeof SaveEmailTemplateSchema>
): Promise<ActionResponse<EmailTemplate>> {
  try {
    const parsed = SaveEmailTemplateSchema.safeParse(input)
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? 'Données invalides'
      return errorResponse(firstError, 'VALIDATION_ERROR', parsed.error.issues)
    }

    const { supabase, error: authErr } = await assertOperator()
    if (authErr || !supabase) {
      return authErr ?? errorResponse('Erreur auth', 'UNAUTHORIZED')
    }

    const { templateKey, subject, body } = parsed.data

    const { data, error } = await supabase
      .from('email_templates')
      .update({ subject, body })
      .eq('template_key', templateKey)
      .select('id, template_key, subject, body, variables, created_at, updated_at')
      .single()

    if (error || !data) {
      console.error('[TEMPLATES:SAVE_EMAIL] update error:', error)
      return errorResponse('Erreur lors de la mise à jour du template email', 'DATABASE_ERROR', error)
    }

    return successResponse(mapToEmailTemplate(data as Record<string, unknown>))
  } catch (error) {
    console.error('[TEMPLATES:SAVE_EMAIL] Unexpected error:', error)
    return errorResponse('Une erreur inattendue est survenue', 'INTERNAL_ERROR', error)
  }
}

// ============================================================
// resetEmailTemplate — restore defaults
// ============================================================

export async function resetEmailTemplate(
  templateKey: string
): Promise<ActionResponse<EmailTemplate>> {
  try {
    const { supabase, error: authErr } = await assertOperator()
    if (authErr || !supabase) {
      return authErr ?? errorResponse('Erreur auth', 'UNAUTHORIZED')
    }

    if (!TEMPLATE_KEYS.includes(templateKey)) {
      return errorResponse(`Template inconnu : ${templateKey}`, 'NOT_FOUND')
    }

    const defaults = DEFAULT_EMAIL_TEMPLATES[templateKey]

    const { data, error } = await supabase
      .from('email_templates')
      .update({ subject: defaults.subject, body: defaults.body })
      .eq('template_key', templateKey)
      .select('id, template_key, subject, body, variables, created_at, updated_at')
      .single()

    if (error || !data) {
      console.error('[TEMPLATES:RESET_EMAIL] update error:', error)
      return errorResponse('Erreur lors de la réinitialisation du template', 'DATABASE_ERROR', error)
    }

    return successResponse(mapToEmailTemplate(data as Record<string, unknown>))
  } catch (error) {
    console.error('[TEMPLATES:RESET_EMAIL] Unexpected error:', error)
    return errorResponse('Une erreur inattendue est survenue', 'INTERNAL_ERROR', error)
  }
}

// ============================================================
// Mapper
// ============================================================

function mapToEmailTemplate(row: Record<string, unknown>): EmailTemplate {
  return {
    id: row.id as string,
    templateKey: row.template_key as string,
    subject: row.subject as string,
    body: row.body as string,
    variables: (row.variables as string[]) ?? [],
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }
}
