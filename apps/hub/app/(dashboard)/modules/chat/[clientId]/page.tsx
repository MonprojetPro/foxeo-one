import { notFound } from 'next/navigation'
import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { getMessages, markMessagesRead } from '@monprojetpro/modules-chat'
import { ChatConversationClient } from './chat-conversation-client'

interface ChatConversationPageProps {
  params: Promise<{ clientId: string }>
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export default async function ChatConversationPage({ params }: ChatConversationPageProps) {
  const { clientId } = await params

  if (!clientId || !UUID_REGEX.test(clientId)) {
    notFound()
  }

  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) notFound()

  // Get operator record
  const { data: operator } = await supabase
    .from('operators')
    .select('id')
    .eq('auth_user_id', user.id)
    .single()

  if (!operator) notFound()

  const op = operator as { id: string }

  // Load initial messages & mark existing as read in parallel
  const [messagesResult] = await Promise.all([
    getMessages({ clientId }),
    markMessagesRead({ clientId }),
  ])

  if (messagesResult.error) {
    throw new Error(messagesResult.error.message)
  }

  return (
    <ChatConversationClient
      clientId={clientId}
      operatorId={op.id}
      initialMessages={messagesResult.data ?? []}
    />
  )
}
