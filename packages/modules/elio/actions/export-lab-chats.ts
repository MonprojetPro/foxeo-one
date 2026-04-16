'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import {
  type ActionResponse,
  successResponse,
  errorResponse,
} from '@monprojetpro/types'

export interface ExportedChat {
  path: string
  content: string
  title: string
}

export async function exportLabChats(
  clientId: string
): Promise<ActionResponse<{ chats: ExportedChat[]; count: number }>> {
  try {
    const supabase = await createServerSupabaseClient()

    // Get client's auth_user_id to query elio_conversations
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('auth_user_id')
      .eq('id', clientId)
      .single()

    if (clientError || !client?.auth_user_id) {
      return successResponse({ chats: [], count: 0 })
    }

    // Fetch Lab conversations
    const { data: conversations, error: convError } = await supabase
      .from('elio_conversations')
      .select('id, title, created_at')
      .eq('user_id', client.auth_user_id)
      .eq('dashboard_type', 'lab')
      .order('created_at', { ascending: true })
      .limit(10000)

    if (convError) {
      return errorResponse(`Erreur récupération conversations : ${convError.message}`, 'DB_ERROR')
    }

    if (!conversations || conversations.length === 0) {
      return successResponse({ chats: [], count: 0 })
    }

    const chats: ExportedChat[] = []

    for (const conv of conversations) {
      // Fetch messages for this conversation
      const { data: messages, error: msgError } = await supabase
        .from('elio_messages')
        .select('role, content, created_at')
        .eq('conversation_id', conv.id)
        .order('created_at', { ascending: true })
        .limit(100000)

      if (msgError || !messages) continue

      const date = new Date(conv.created_at).toISOString().split('T')[0]
      const title = conv.title || `Conversation ${date}`

      const transcript = [
        `# ${title}`,
        '',
        `*${new Date(conv.created_at).toLocaleString('fr-FR')}*`,
        '',
        '---',
        '',
        ...messages.map((msg) => {
          const time = new Date(msg.created_at).toLocaleTimeString('fr-FR')
          const role = msg.role === 'user' ? 'Vous' : 'Élio'
          return `**${role}** (${time}) :\n${msg.content}\n`
        }),
      ].join('\n')

      chats.push({
        path: `chats/elio-lab-${date}-${conv.id.slice(0, 8)}.md`,
        content: transcript,
        title,
      })
    }

    return successResponse({ chats, count: chats.length })
  } catch (err) {
    return errorResponse(
      `Erreur export chats : ${err instanceof Error ? err.message : String(err)}`,
      'INTERNAL_ERROR'
    )
  }
}
