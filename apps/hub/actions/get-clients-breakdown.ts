'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'

export type ClientBreakdownItem = {
  id: string
  name: string
  company: string
}

export type ClientsBreakdown = {
  lab: {
    pendingPayment: ClientBreakdownItem[]
    active: ClientBreakdownItem[]
    suspended: ClientBreakdownItem[]
  }
  one: {
    active: ClientBreakdownItem[]
  }
  unpaidInvoices: {
    clientName: string
    clientId: string
    amount: number
    pennylaneId: string
  }[]
}

export async function getClientsBreakdown(operatorId: string): Promise<ClientsBreakdown> {
  const supabase = await createServerSupabaseClient()

  type ClientRow = {
    id: string
    name: string
    first_name: string | null
    company: string
    lab_paid: boolean | null
    lab_invoice_sent_at: string | null
    client_configs: { dashboard_type: string }[] | { dashboard_type: string } | null
  }

  const { data: rawClients } = await supabase
    .from('clients')
    .select('id, name, first_name, company, lab_paid, lab_invoice_sent_at, client_configs(dashboard_type)')
    .eq('operator_id', operatorId)
    .neq('status', 'archived')

  const clients = (rawClients ?? []) as ClientRow[]

  function toItem(c: ClientRow): ClientBreakdownItem {
    const fullName = c.first_name ? `${c.first_name} ${c.name}` : c.name
    return { id: c.id, name: fullName, company: c.company }
  }

  function getDashboardType(c: ClientRow): string | null {
    const cfg = Array.isArray(c.client_configs) ? c.client_configs[0] : c.client_configs
    return (cfg as { dashboard_type?: string } | null)?.dashboard_type ?? null
  }

  const labPendingPayment = clients.filter(
    (c) => getDashboardType(c) === null && c.lab_invoice_sent_at && !c.lab_paid
  )
  const labClients = clients.filter((c) => getDashboardType(c) === 'lab')
  const oneActive = clients.filter((c) => getDashboardType(c) === 'one')

  // Récupérer les IDs des clients Lab avec un parcours en statut abandoned
  const labClientIds = labClients.map((c) => c.id)
  const abandonedClientIds = new Set<string>()
  if (labClientIds.length > 0) {
    const { data: abandonedParcours } = await supabase
      .from('parcours')
      .select('client_id')
      .eq('status', 'abandoned')
      .in('client_id', labClientIds)
    for (const row of abandonedParcours ?? []) {
      abandonedClientIds.add((row as { client_id: string }).client_id)
    }
  }

  const labActive = labClients.filter((c) => !abandonedClientIds.has(c.id))
  const labSuspended = labClients.filter((c) => abandonedClientIds.has(c.id))

  type BillingSyncRow = {
    pennylane_id: string
    amount: number | null
    data: Record<string, unknown> | null
  }

  const { data: rawUnpaid } = await supabase
    .from('billing_sync')
    .select('pennylane_id, amount, data')
    .eq('entity_type', 'invoice')
    .in('status', ['unpaid', 'pending'])

  const unpaidRows = (rawUnpaid ?? []) as BillingSyncRow[]

  const unpaidInvoices = unpaidRows.map((inv) => {
    const clientId = (inv.data?.client_id as string | null) ?? ''
    const client = clients.find((c) => c.id === clientId)
    const clientName = client
      ? (client.first_name ? `${client.first_name} ${client.name}` : client.name)
      : 'Client inconnu'
    return {
      clientName,
      clientId,
      amount: Math.round((inv.amount ?? 0) / 100),
      pennylaneId: inv.pennylane_id,
    }
  })

  return {
    lab: {
      pendingPayment: labPendingPayment.map(toItem),
      active: labActive.map(toItem),
      suspended: labSuspended.map(toItem),
    },
    one: {
      active: oneActive.map(toItem),
    },
    unpaidInvoices,
  }
}
