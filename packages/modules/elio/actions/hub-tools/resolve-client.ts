/**
 * Résolution « clientIdOuNom » → client réel, pour les outils de l'agent Élio Hub.
 *
 * Le LLM peut fournir un UUID (préférable) ou un nom/email/entreprise approximatif.
 * La recherche passe par la session opérateur (RLS naturelle : MiKL ne voit que
 * SES clients). Une ambiguïté (plusieurs correspondances) est remontée telle
 * quelle — l'agent doit demander à MiKL de préciser, jamais choisir au hasard.
 *
 * Fichier serveur ordinaire (PAS 'use server') : importé par la boucle agent.
 */

import type { createServerSupabaseClient } from '@monprojetpro/supabase'

type Supa = Awaited<ReturnType<typeof createServerSupabaseClient>>

export interface ResolvedClient {
  id: string
  name: string
  company: string | null
  email: string | null
  authUserId: string | null
  operatorId: string | null
}

export type ResolveClientResult =
  | { ok: true; client: ResolvedClient }
  | { ok: false; reason: 'not_found' | 'ambiguous' | 'db_error'; message: string; candidates?: Array<{ id: string; name: string; company: string | null }> }

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const CLIENT_COLUMNS = 'id, name, company, email, auth_user_id, operator_id'

interface ClientRow {
  id: string
  name: string
  company: string | null
  email: string | null
  auth_user_id: string | null
  operator_id: string | null
}

function toResolved(row: ClientRow): ResolvedClient {
  return {
    id: row.id,
    name: row.name,
    company: row.company,
    email: row.email,
    authUserId: row.auth_user_id,
    operatorId: row.operator_id,
  }
}

/** Nom d'affichage du client dans les summaries (entreprise sinon nom). */
export function clientDisplayName(client: Pick<ResolvedClient, 'name' | 'company'>): string {
  return client.company?.trim() ? `${client.name} (${client.company})` : client.name
}

export async function resolveClient(supabase: Supa, clientIdOuNom: string): Promise<ResolveClientResult> {
  const query = clientIdOuNom.trim()
  if (!query) {
    return { ok: false, reason: 'not_found', message: 'Aucun client fourni.' }
  }

  // 1. UUID direct
  if (UUID_REGEX.test(query)) {
    const { data, error } = await supabase
      .from('clients')
      .select(CLIENT_COLUMNS)
      .eq('id', query)
      .maybeSingle()

    if (error) {
      return { ok: false, reason: 'db_error', message: `Erreur base de données : ${error.message}` }
    }
    if (!data) {
      return { ok: false, reason: 'not_found', message: `Aucun client avec l'id ${query}.` }
    }
    return { ok: true, client: toResolved(data as unknown as ClientRow) }
  }

  // 2. Recherche approximative (nom / email / entreprise) — wildcards SQL échappés
  const sanitized = query.replace(/[%_\\]/g, '\\$&')
  const { data, error } = await supabase
    .from('clients')
    .select(CLIENT_COLUMNS)
    .or(`name.ilike.%${sanitized}%,email.ilike.%${sanitized}%,company.ilike.%${sanitized}%`)
    .limit(5)

  if (error) {
    return { ok: false, reason: 'db_error', message: `Erreur base de données : ${error.message}` }
  }

  const rows = (data ?? []) as unknown as ClientRow[]
  if (rows.length === 0) {
    return { ok: false, reason: 'not_found', message: `Aucun client trouvé pour « ${query} ».` }
  }
  if (rows.length > 1) {
    return {
      ok: false,
      reason: 'ambiguous',
      message: `Plusieurs clients correspondent à « ${query} » — demande à MiKL de préciser.`,
      candidates: rows.map((r) => ({ id: r.id, name: r.name, company: r.company })),
    }
  }

  return { ok: true, client: toResolved(rows[0]!) }
}
