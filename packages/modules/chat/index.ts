// Chat Module
export { manifest } from './manifest'

// Components
export { ChatWindow } from './components/chat-window'
export { ChatMessage } from './components/chat-message'
export { ChatInput } from './components/chat-input'
export { ChatList } from './components/chat-list'
export { ChatSkeleton } from './components/chat-skeleton'
export { UnreadBadge } from './components/unread-badge'
export { PresenceIndicator } from './components/presence-indicator'
export { PresenceProvider, PresenceContext, usePresenceContext } from './components/presence-provider'
export { ElioTransformPanel } from './components/elio-transform-panel'

// Hooks
export { useChatMessages } from './hooks/use-chat-messages'
export { useConversations } from './hooks/use-conversations'
export { useChatRealtime } from './hooks/use-chat-realtime'
export { useChatPresence } from './hooks/use-chat-presence'
export { usePresenceStatus } from './hooks/use-presence-status'
export { useOnlineUsers } from './hooks/use-online-users'

// Actions
export { sendMessage } from './actions/send-message'
export { getMessages } from './actions/get-messages'
export { getConversations } from './actions/get-conversations'
export { markMessagesRead } from './actions/mark-messages-read'
export { uploadMessageAttachment } from './actions/upload-message-attachment'

// Types
export type {
  Message,
  MessageDB,
  Conversation,
  SenderType,
  SendMessageInput,
  GetMessagesInput,
  MarkMessagesReadInput,
} from './types/chat.types'

export type { PresenceEntry, PresenceStateMap } from './types/presence.types'

// Types — Story 3.8
export type { ChatSendPayload, TransformMode } from './components/chat-input'
export type { AttachmentUploadResult } from './actions/upload-message-attachment'
