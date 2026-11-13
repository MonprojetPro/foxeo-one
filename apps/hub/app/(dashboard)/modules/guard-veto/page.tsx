import { notFound } from 'next/navigation'
import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { isInvoiceAwaitingPayment } from '@monprojetpro/utils'
import { GuardVetoDashboard, type RappelAbonnement } from '@monprojetpro/module-guard-veto'

/**
 * Cockpit GuardVeto — T-082.
 *
 * 🔑 POURQUOI LE RAPPEL D'ABONNEMENT EST CALCULÉ ICI ET PAS DANS LE MODULE :
 * la formule du « en attente de paiement » est unique et vit dans
 * `@monprojetpro/utils` (leçon T-083 : trois écrans en avaient chacun recopié
 * une version, et donnaient trois chiffres pour les mêmes factures). Un module
 * ne pouvant pas en importer un autre, c'est la page qui lit la Comptabilité
 * et injecte le résultat.
 *
 * 🔑 LE LIEN CABINET ↔ CLIENT VIT EN CONFIGURATION, pas dans le code. Un
 * module qui connaîtrait un cabinet en dur cesserait d'être réutilisable
 * (doctrine FORGE). Tant que la clé `guardveto_cabinet_clients` n'est pas
 * renseignée, l'onglet Cabinets le dit au lieu d'afficher un encart vide.
 */

type Mapping = Record<string, string>

export default async function GuardVetoPage() {
  const supabase = await createServerSupabaseClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) notFound()

  const { data: isOperator } = await supabase.rpc('is_operator')
  if (!isOperator) notFound()

  const rappels = await chargerRappels(supabase)

  return (
    <div className="flex flex-col gap-6 p-6">
      <GuardVetoDashboard rappels={rappels} lienComptabilite="/modules/facturation" />
    </div>
  )
}

/**
 * Rappel d'abonnement par cabinet GuardVeto.
 *
 * Renvoie `{}` quand rien n'est rattaché : l'écran dira « ce cabinet n'est
 * rattaché à aucun client du Hub », ce qui est vrai — plutôt qu'un zéro, qui
 * laisserait croire à un client sans facture.
 */
async function chargerRappels(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
): Promise<Record<string, RappelAbonnement>> {
  const { data: config } = await supabase
    .from('system_config')
    .select('value')
    .eq('key', 'guardveto_cabinet_clients')
    .maybeSingle()

  const mapping = lireMapping(config?.value)
  const clientIds = [...new Set(Object.values(mapping))]
  if (clientIds.length === 0) return {}

  const [{ data: clients }, { data: factures }] = await Promise.all([
    supabase.from('clients').select('id, name, company, subscription_tier').in('id', clientIds),
    supabase
      .from('billing_sync')
      .select('client_id, entity_type, status, amount, data, created_at')
      .in('client_id', clientIds)
      .in('entity_type', ['invoice', 'subscription']),
  ])

  const parClient = new Map((clients ?? []).map((c) => [c.id as string, c]))
  const rappels: Record<string, RappelAbonnement> = {}

  for (const [cabinetId, clientId] of Object.entries(mapping)) {
    const client = parClient.get(clientId)
    const lignes = (factures ?? []).filter((f) => f.client_id === clientId)
    const invoices = lignes.filter((f) => f.entity_type === 'invoice')
    const enAttente = invoices.filter((f) =>
      isInvoiceAwaitingPayment(String(f.status ?? '')),
    )

    rappels[cabinetId] = {
      clientId,
      clientNom: (client?.company as string | null) ?? (client?.name as string | null) ?? null,
      offre: (client?.subscription_tier as string | null) ?? null,
      montantEnAttenteCents: enAttente.reduce((n, f) => n + Number(f.amount ?? 0), 0),
      facturesEnAttente: enAttente.length,
      derniereFactureLe: derniereDate(invoices),
      sansAbonnement: lignes.every((f) => f.entity_type !== 'subscription'),
    }
  }

  return rappels
}

/** La configuration vient de la base : on ne lui fait pas confiance sur la forme. */
function lireMapping(valeur: unknown): Mapping {
  let brut = valeur
  if (typeof brut === 'string') {
    try {
      brut = JSON.parse(brut)
    } catch {
      return {}
    }
  }
  if (!brut || typeof brut !== 'object' || Array.isArray(brut)) return {}

  const mapping: Mapping = {}
  for (const [cabinetId, clientId] of Object.entries(brut as Record<string, unknown>)) {
    if (typeof clientId === 'string' && clientId.length > 0) mapping[cabinetId] = clientId
  }
  return mapping
}

/**
 * Date de la DERNIÈRE FACTURE — celle de Pennylane (`data.date`), pas la date
 * d'insertion locale.
 *
 * 🔑 Les deux coïncident tant que la synchro tourne, et divergent dès qu'elle
 * rattrape : le 11/11, des factures d'octobre ont été réinsérées après un mois
 * de panne. `created_at` aurait alors affiché « dernière facture le 11/11 »
 * pour une facture du 6 octobre — un chiffre faux et parfaitement crédible.
 */
function derniereDate(lignes: { created_at?: string | null; data?: Record<string, unknown> | null }[]): string | null {
  const dates = lignes
    .map((l) => {
      const duTiers = l.data?.['date']
      return typeof duTiers === 'string' && duTiers ? duTiers : (l.created_at ?? null)
    })
    .filter((d): d is string => Boolean(d))
    .sort()
  return dates.length > 0 ? dates[dates.length - 1]! : null
}
