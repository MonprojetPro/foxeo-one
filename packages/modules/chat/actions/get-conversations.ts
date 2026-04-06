'use server'

import { createServerSupabaseClient } from '@foxeo/supabase'
import { type ActionResponse, successResponse, errorResponse } from '@foxeo/types'
import type { Conversation } from '../types/chat.types'

export async function getConversations(): Promise<ActionResponse<Conversation[]>> {
  try {
    const supabase = await createServerSupabaseClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return errorResponse('Non authentifié', 'UNAUTHORIZED')
    }

    // Get operator record for current user
    const { data: operator, error: operatorError } = await supabase
      .from('operators')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()

    if (operatorError || !operator) {
      return errorResponse('Opérateur non trouvé', 'NOT_FOUND')
    }

    // Get all clients for this operator with their last message and unread count
    const { data: clients, error: clientsError } = await supabase
      .from('clients')
      .select('id, name, email, client_configs(dashboard_type)')
      .eq('operator_id', operator.id)
      .order('name', { ascending: true })

    if (clientsError) {
      console.error('[CHAT:GET_CONVERSATIONS] Clients DB error:', clientsError)
      return errorResponse('Erreur lors du chargement des conversations', 'DB_ERROR', clientsError)
    }

    if (!clients || clients.length === 0) {
      return successResponse([])
    }

    const clientIds = clients.map((c) => c.id)

    // Get last message per client + unread count in parallel using optimized queries
    const [lastMsgResult, unreadResult] = await Promise.all([
      // Last message per client: fetch only 1 per client using RPC or limit per group
      // Supabase JS doesn't support DISTINCT ON, so we fetch last N*2 and dedupe
      supabase
        .from('messages')
        .select('client_id, content, created_at')
        .in('client_id', clientIds)
        .order('created_at', { ascending: false })
        .limit(clientIds.length * 2),
      // Unread count: fetch only ids to minimize payload
      supabase
        .from('messages')
        .select('client_id', { count: 'exact', head: false })
        .in('client_id', clientIds)
        .eq('sender_type', 'client')
        .is('read_at', null),
    ])

    if (lastMsgResult.error) {
      console.error('[CHAT:GET_CONVERSATIONS] Last messages DB error:', lastMsgResult.error)
      return errorResponse('Erreur lors du chargement des messages', 'DB_ERROR', lastMsgResult.error)
    }

    if (unreadResult.error) {
      console.error('[CHAT:GET_CONVERSATIONS] Unread count DB error:', unreadResult.error)
      return errorResponse('Erreur lors du comptage des non lus', 'DB_ERROR', unreadResult.error)
    }

    // Build last message map (first result per client = most recent due to ORDER BY DESC)
    const lastMessageMap = new Map<string, { content: string; createdAt: string }>()
    for (const msg of lastMsgResult.data ?? []) {
      if (!lastMessageMap.has(msg.client_id)) {
        lastMessageMap.set(msg.client_id, {
          content: msg.content,
          createdAt: msg.created_at,
        })
      }
    }

    // Build unread count map
    const unreadCountMap = new Map<string, number>()
    for (const msg of unreadResult.data ?? []) {
      unreadCountMap.set(msg.client_id, (unreadCountMap.get(msg.client_id) ?? 0) + 1)
    }

    const conversations: Conversation[] = clients.map((client) => {
      const lastMsg = lastMessageMap.get(client.id)
      const configs = (client as unknown as { client_configs: { dashboard_type: string }[] | { dashboard_type: string } | null }).client_configs
      const configObj = Array.isArray(configs) ? configs[0] : configs
      const dashboardType = (configObj?.dashboard_type === 'lab' || configObj?.dashboard_type === 'one')
        ? configObj.dashboard_type as 'lab' | 'one'
        : undefined
      return {
        clientId: client.id,
        clientName: client.name,
        clientEmail: client.email,
        lastMessage: lastMsg?.content ?? null,
        lastMessageAt: lastMsg?.createdAt ?? null,
        unreadCount: unreadCountMap.get(client.id) ?? 0,
        dashboardType,
      }
    })

    // Sort by last message date (most recent first), then by name
    conversations.sort((a, b) => {
      if (a.lastMessageAt && b.lastMessageAt) {
        return b.lastMessageAt.localeCompare(a.lastMessageAt)
      }
      if (a.lastMessageAt) return -1
      if (b.lastMessageAt) return 1
      return a.clientName.localeCompare(b.clientName)
    })

    return successResponse(conversations)
  } catch (error) {
    console.error('[CHAT:GET_CONVERSATIONS] Unexpected error:', error)
    return errorResponse('Une erreur inattendue est survenue', 'INTERNAL_ERROR', error)
  }
}
