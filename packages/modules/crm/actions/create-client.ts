'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient } from '@monprojetpro/supabase'
import {
  type ActionResponse,
  successResponse,
  errorResponse,
} from '@monprojetpro/types'
import { createClientSchema } from '@monprojetpro/utils'
import type { Client, CreateClientInput } from '../types/crm.types'

export async function createClient(
  input: CreateClientInput
): Promise<ActionResponse<Client>> {
  try {
    const supabase = await createServerSupabaseClient()

    // Auth check
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return errorResponse('Non authentifié', 'UNAUTHORIZED')
    }

    // Lookup operator record (operators.id ≠ auth.uid())
    const { data: operator, error: opError } = await supabase
      .from('operators')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()

    if (opError || !operator) {
      return errorResponse('Opérateur non trouvé', 'NOT_FOUND')
    }

    const operatorId = operator.id

    // Server-side validation
    const parsed = createClientSchema.safeParse(input)
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? 'Données invalides'
      return errorResponse(firstError, 'VALIDATION_ERROR', parsed.error.issues)
    }

    const {
      clientKind,
      firstName,
      name,
      email,
      company,
      contact,
      siret,
      nafCode,
      billingAddress,
      billingPostalCode,
      billingCity,
      phone,
      sector,
      clientType,
    } = parsed.data

    const isEntity = clientKind === 'entity'

    // Pour une entité, l'identité EST la raison sociale : `name` et `company`
    // portent la même valeur, de sorte que tout l'affichage existant (en-tête,
    // liste, emails) et la facturation Pennylane montrent la bonne chose sans
    // avoir à connaître la distinction. Le prénom n'a pas de sens ici.
    const identityName = (isEntity ? company : name)?.trim() ?? ''
    const companyName = isEntity ? identityName : company?.trim() || identityName

    // Check email uniqueness per operator
    const { data: existing, error: emailCheckError } = await supabase
      .from('clients')
      .select('id')
      .eq('operator_id', operatorId)
      .eq('email', email)
      .maybeSingle()

    if (emailCheckError) {
      console.error('[CRM:CREATE] Email check error:', emailCheckError)
      return errorResponse('Erreur lors de la vérification', 'DB_ERROR', emailCheckError)
    }

    if (existing) {
      return errorResponse(
        'Cet email est déjà associé à un client',
        'EMAIL_ALREADY_EXISTS'
      )
    }

    // Insert client
    const { data: clientData, error: insertError } = await supabase
      .from('clients')
      .insert({
        operator_id: operatorId,
        client_kind: clientKind,
        first_name: isEntity ? null : firstName || null,
        name: identityName,
        email,
        company: companyName,
        contact: isEntity ? contact || null : null,
        siret: siret || null,
        naf_code: nafCode || null,
        billing_address: billingAddress || null,
        billing_postal_code: billingPostalCode || null,
        billing_city: billingCity || null,
        billing_country_alpha2: billingAddress ? 'FR' : null,
        phone: phone ?? null,
        sector: sector ?? null,
        client_type: clientType,
        status: 'active',
      })
      .select()
      .single()

    if (insertError || !clientData) {
      console.error('[CRM:CREATE] Insert error:', insertError)
      return errorResponse(
        'Erreur lors de la création du client',
        'DB_ERROR',
        insertError
      )
    }

    // T-039 — un contact saisi a la creation (import CSV, appel direct de
    // l'action) entre AUSSI au carnet. Sans cette reprise, `clients.contact`
    // porterait un nom que le carnet ne connait pas : le trigger de miroir
    // l'effacerait au premier contact ajoute a la main, et MiKL verrait un nom
    // disparaitre sans comprendre pourquoi.
    if (isEntity && contact && contact.trim() !== '') {
      const { error: contactError } = await supabase.from('client_contacts').insert({
        client_id: clientData.id,
        operator_id: operatorId,
        full_name: contact.trim(),
        receives_invoices: false,
        show_on_invoice: false,
      })
      if (contactError) {
        console.error('[CRM:CREATE] Contact carnet insert error:', contactError)
        // Non bloquant : le client existe, le contact se resaisit a la main.
      }
    }

    // Create default client_configs
    // operator_id est NOT NULL sans défaut — l'oublier fait échouer l'insert à CHAQUE
    // fois (contrainte base), silencieusement absorbé par le non-blocking ci-dessous.
    // Preuve du 02-11 : les 3 clients en prod avaient 0 ligne client_configs.
    //
    // T-073a — les flags d'acces suivent desormais le `clientType` choisi au formulaire,
    // au lieu d'un defaut unique « One direct » applique a tous. Avant ce correctif,
    // un client cree en « Complet » (chemin Lab) se retrouvait quand meme avec le One
    // debloque (badge vert, aucun Lab) — prouve par MiKL le 05-11 sur un client reel.
    // Seul `direct_one` debloque reellement quelque chose a la creation ; `ponctuel` et
    // `complet` restent sans aucun acces tant qu'un geste explicite (Activer le Lab /
    // ouvrir le One) n'a pas eu lieu.
    const isDirectOne = clientType === 'direct_one'
    const { error: configError } = await supabase
      .from('client_configs')
      .insert({
        client_id: clientData.id,
        operator_id: operatorId,
        active_modules: ['core-dashboard', 'chat', 'documents', 'visio'],
        dashboard_type: isDirectOne ? 'one' : 'lab',
        // Client One direct : Mode One débloqué dès la création (cf. matrice ADR-01).
        // Ponctuel/Complet : aucun accès tant que MiKL n'a rien déclenché explicitement.
        one_mode_available: isDirectOne,
      })

    if (configError) {
      console.error('[CRM:CREATE] Config insert error:', configError)
      // Non-blocking — client was created, config can be fixed later
    }

    // Transform snake_case → camelCase at boundary
    const client: Client = {
      id: clientData.id,
      operatorId: clientData.operator_id,
      firstName: clientData.first_name ?? undefined,
      name: clientData.name,
      company: clientData.company,
      clientKind: clientData.client_kind ?? 'individual',
      contact: clientData.contact ?? undefined,
      siret: clientData.siret ?? undefined,
      nafCode: clientData.naf_code ?? undefined,
      billingAddress: clientData.billing_address ?? undefined,
      billingPostalCode: clientData.billing_postal_code ?? undefined,
      billingCity: clientData.billing_city ?? undefined,
      email: clientData.email,
      clientType: clientData.client_type,
      status: clientData.status,
      sector: clientData.sector ?? undefined,
      phone: clientData.phone ?? undefined,
      website: clientData.website ?? undefined,
      notes: clientData.notes ?? undefined,
      createdAt: clientData.created_at,
      updatedAt: clientData.updated_at,
    }

    // Log activity — fire-and-forget
    supabase.from('activity_logs').insert({
      actor_type: 'operator',
      actor_id: operatorId,
      action: 'client_created',
      entity_type: 'client',
      entity_id: clientData.id,
      metadata: { client_type: clientType, client_kind: clientKind, name: identityName, company: companyName },
    }).then(({ error: logError }) => {
      if (logError) console.error('[CRM:CREATE] Activity log error:', logError)
    }).catch(() => {})

    // Invalidate Next.js RSC cache for CRM routes
    revalidatePath('/modules/crm')

    return successResponse(client)
  } catch (error) {
    console.error('[CRM:CREATE] Unexpected error:', error)
    return errorResponse(
      'Une erreur inattendue est survenue',
      'INTERNAL_ERROR',
      error
    )
  }
}
