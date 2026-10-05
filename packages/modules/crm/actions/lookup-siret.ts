'use server'

import type { ActionResponse } from '@monprojetpro/types'
import { successResponse, errorResponse } from '@monprojetpro/types'
import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { isValidSiret, nafSectionLabel, normalizeSiret } from '../utils/naf-sections'
import type { SiretLookupResult } from '../types/crm.types'

/**
 * Rapprochement d'un SIRET avec le répertoire Sirene (T-035).
 *
 * Source : API « Recherche d'entreprises » de la DINUM
 * (https://recherche-entreprises.api.gouv.fr), qui expose les données Sirene de
 * l'INSEE. Choisie face à l'API Sirene officielle parce qu'elle est publique,
 * gratuite et SANS CLÉ — aucun compte à créer, donc aucun secret à gérer.
 *
 * Volontairement non bloquante : si l'API est muette ou le SIRET inconnu, on
 * remonte une erreur lisible et la création du client reste possible à la main.
 */
export async function lookupSiret(
  rawSiret: string
): Promise<ActionResponse<SiretLookupResult>> {
  // Une Server Action est une route HTTP : sans ce contrôle, n'importe qui
  // pourrait s'en servir comme proxy vers l'API publique sous notre IP.
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return errorResponse('Non authentifié', 'UNAUTHORIZED')
  }

  const { data: operator } = await supabase
    .from('operators')
    .select('id')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  if (!operator) {
    return errorResponse('Opérateur non trouvé', 'NOT_FOUND')
  }

  const siret = normalizeSiret(rawSiret ?? '')

  if (siret.length !== 14) {
    return errorResponse('Un SIRET comporte 14 chiffres', 'INVALID_SIRET')
  }

  if (!isValidSiret(siret)) {
    return errorResponse(
      'Ce SIRET est invalide (clé de contrôle incorrecte) — vérifiez la saisie',
      'INVALID_SIRET'
    )
  }

  try {
    const url = `https://recherche-entreprises.api.gouv.fr/search?q=${siret}&per_page=1`
    const response = await fetch(url, {
      headers: { Accept: 'application/json' },
      // L'API est publique et lente par intermittence : on coupe plutôt que de
      // laisser l'opérateur devant un bouton qui tourne indéfiniment.
      signal: AbortSignal.timeout(8000),
      cache: 'no-store',
    })

    if (!response.ok) {
      console.error('[CRM:SIRET] API HTTP', response.status)
      return errorResponse(
        `Le service de recherche d'entreprises a répondu ${response.status}`,
        'LOOKUP_UNAVAILABLE'
      )
    }

    const payload = (await response.json()) as {
      results?: Array<Record<string, unknown>>
    }

    const company = payload.results?.[0]
    if (!company) {
      return errorResponse('Aucune entreprise trouvée pour ce SIRET', 'SIRET_NOT_FOUND')
    }

    // L'établissement exact d'abord (matching_etablissements), le siège en repli.
    const matching = (company.matching_etablissements as
      | Array<Record<string, unknown>>
      | undefined)?.find((e) => e.siret === siret)
    const siege = company.siege as Record<string, unknown> | undefined
    const etablissement = matching ?? (siege?.siret === siret ? siege : undefined) ?? siege

    const postalCode = (etablissement?.code_postal as string | null) ?? undefined
    const city = (etablissement?.libelle_commune as string | null) ?? undefined
    const fullAddress = (etablissement?.adresse as string | null) ?? undefined

    // `adresse` contient déjà le code postal et la commune — on les retire pour
    // ne pas les voir en double sur la facture Pennylane, qui a ses propres champs.
    // Découpage littéral, SANS expression régulière construite depuis la réponse :
    // un nom de commune contenant une parenthèse ferait une regex invalide, et
    // l'exception serait rapportée comme « service injoignable » alors que l'appel
    // a réussi — un message faux sur une opération réussie.
    let street = fullAddress?.trim()
    if (street && postalCode) {
      const cut = street.indexOf(postalCode)
      if (cut > 0) street = street.slice(0, cut).trim()
    }

    const result: SiretLookupResult = {
      siret,
      siren: (company.siren as string | null) ?? undefined,
      companyName:
        (company.nom_complet as string | null) ??
        (company.nom_raison_sociale as string | null) ??
        undefined,
      address: street || undefined,
      postalCode,
      city,
      nafCode:
        (etablissement?.activite_principale as string | null) ??
        (company.activite_principale as string | null) ??
        undefined,
      sector: nafSectionLabel(company.section_activite_principale as string | null),
      // 'A' = administrativement actif, 'F' = fermé. On le remonte pour prévenir
      // l'opérateur plutôt que de refuser la saisie à sa place.
      closed: (etablissement?.etat_administratif as string | null) === 'F',
    }

    if (!result.companyName) {
      return errorResponse(
        'Entreprise trouvée mais sans raison sociale diffusable',
        'SIRET_NOT_DIFFUSIBLE'
      )
    }

    return successResponse(result)
  } catch (error) {
    console.error('[CRM:SIRET] Lookup error:', error)
    const isTimeout = error instanceof Error && error.name === 'TimeoutError'
    return errorResponse(
      isTimeout
        ? "Le service de recherche d'entreprises n'a pas répondu à temps"
        : "Impossible d'interroger le service de recherche d'entreprises",
      'LOOKUP_UNAVAILABLE',
      error
    )
  }
}
