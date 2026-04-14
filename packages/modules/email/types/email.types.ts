import { z } from 'zod'

// --- Gmail Integration ---

export interface GmailStatus {
  connected: boolean
  email: string | null
}

// --- Email Thread (liste) ---

export interface EmailThread {
  id: string
  subject: string
  lastMessageDate: string   // ISO string
  lastMessagePreview: string
  messageCount: number
  unread: boolean
  from: string              // expéditeur du dernier message
}

// --- Email Message (détail thread) ---

export interface EmailMessage {
  id: string
  threadId: string
  from: string
  to: string[]
  cc: string[]
  subject: string
  bodyText: string          // plain text (HTML strippé si nécessaire)
  date: string              // ISO string
  isOutgoing: boolean       // envoyé depuis gmail_email de l'opérateur
  messageIdHeader: string   // Message-ID header pour les réponses
}

// --- Send Email ---

export const SendEmailInput = z.object({
  to: z.string().email('Adresse email invalide'),
  subject: z.string().min(1, 'Le sujet est requis'),
  body: z.string().min(1, 'Le corps du message est requis'),
  threadId: z.string().optional(),
  inReplyTo: z.string().optional(),   // Message-ID du message auquel on répond
  references: z.string().optional(),   // chaîne des Message-IDs du thread
})
export type SendEmailInput = z.infer<typeof SendEmailInput>
