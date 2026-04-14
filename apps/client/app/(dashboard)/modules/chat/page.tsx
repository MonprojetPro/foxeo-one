import { notFound } from 'next/navigation'
import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { getMessages, markMessagesRead } from '@monprojetpro/modules-chat'
import { ChatClientPageClient } from './chat-client-page-client'

export default async function ClientChatPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) notFound()

  // Get client record
  const { data: client } = await supabase
    .from('clients')
    .select('id, operator_id')
    .eq('auth_user_id', user.id)
    .single()

  if (!client) notFound()

  // Load messages & mark read in parallel
  const [messagesResult] = await Promise.all([
    getMessages({ clientId: client.id }),
    markMessagesRead({ clientId: client.id }),
  ])

  if (messagesResult.error) {
    throw new Error(messagesResult.error.message)
  }

  return (
    <ChatClientPageClient
      clientId={client.id}
      operatorId={client.operator_id}
      initialMessages={messagesResult.data ?? []}
    />
  )
}
