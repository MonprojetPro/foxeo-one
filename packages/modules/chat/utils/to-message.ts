import type { Message, MessageDB } from '../types/chat.types'

export function toMessage(row: MessageDB): Message {
  return {
    id: row.id,
    clientId: row.client_id,
    operatorId: row.operator_id,
    senderType: row.sender_type,
    content: row.content,
    readAt: row.read_at,
    createdAt: row.created_at,
    attachmentUrl: row.attachment_url ?? null,
    attachmentName: row.attachment_name ?? null,
    attachmentType: row.attachment_type ?? null,
  }
}
