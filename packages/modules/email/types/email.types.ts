import { z } from 'zod'

// --- Gmail Integration ---

/**
 * T-055 — `connected` ne suffit pas : il confondait « jamais connecté » et
 * « connexion morte », et c'est cette confusion qui a caché une panne de six
 * mois. `state` porte la distinction ; `connected` reste pour les lecteurs
 * existants et vaut `true` uniquement si le jeton répond vraiment.
 */
export type GmailConnectionState = 'never' | 'connected' | 'expired'

export interface GmailStatus {
  connected: boolean
  email: string | null
  state: GmailConnectionState
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
  /**
   * Version HTML optionnelle (T-057). `body` reste OBLIGATOIRE : c'est le repli
   * texte, lu par les clients en mode texte et les lecteurs d'écran. On n'envoie
   * jamais de l'HTML seul.
   */
  html: z.string().optional(),
  threadId: z.string().optional(),
  inReplyTo: z.string().optional(),   // Message-ID du message auquel on répond
  references: z.string().optional(),   // chaîne des Message-IDs du thread
})
export type SendEmailInput = z.infer<typeof SendEmailInput>
