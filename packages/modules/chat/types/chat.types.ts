import { z } from 'zod'

// ============================================================
// Domain types (camelCase — post-boundary transformation)
// ============================================================

export type SenderType = 'client' | 'operator'

export interface Message {
  id: string
  clientId: string
  operatorId: string
  senderType: SenderType
  content: string
  readAt: string | null
  createdAt: string
  attachmentUrl?: string | null
  attachmentName?: string | null
  attachmentType?: string | null
}

export interface Conversation {
  clientId: string
  clientName: string
  clientEmail: string
  lastMessage: string | null
  lastMessageAt: string | null
  unreadCount: number
  dashboardType?: 'lab' | 'one'
}

// ============================================================
// DB types (snake_case — raw Supabase rows)
// ============================================================

export interface MessageDB {
  id: string
  client_id: string
  operator_id: string
  sender_type: SenderType
  content: string
  read_at: string | null
  created_at: string
  attachment_url?: string | null
  attachment_name?: string | null
  attachment_type?: string | null
}

// ============================================================
// Action input types & Zod schemas
// ============================================================

export const SendMessageInput = z.object({
  clientId: z.string().uuid(),
  operatorId: z.string().uuid(),
  senderType: z.enum(['client', 'operator']),
  content: z.string().min(1, 'Le message ne peut pas être vide').max(4000, 'Message trop long'),
  attachmentUrl: z.string().url().optional().nullable(),
  attachmentName: z.string().max(255).optional().nullable(),
  attachmentType: z.string().max(100).optional().nullable(),
})
export type SendMessageInput = z.infer<typeof SendMessageInput>

export const GetMessagesInput = z.object({
  clientId: z.string().uuid(),
})
export type GetMessagesInput = z.infer<typeof GetMessagesInput>

export const MarkMessagesReadInput = z.object({
  clientId: z.string().uuid(),
})
export type MarkMessagesReadInput = z.infer<typeof MarkMessagesReadInput>
