import { z } from 'zod'

export const TicketTypeEnum = z.enum(['bug', 'question', 'suggestion'])
export type TicketType = z.infer<typeof TicketTypeEnum>

export const TicketStatusEnum = z.enum(['open', 'in_progress', 'resolved', 'closed'])
export type TicketStatus = z.infer<typeof TicketStatusEnum>

export const CreateTicketInputSchema = z.object({
  type: TicketTypeEnum.default('bug'),
  subject: z.string().min(3, 'Le sujet doit contenir au moins 3 caractères').max(200, 'Le sujet ne doit pas dépasser 200 caractères'),
  description: z.string().min(10, 'La description doit contenir au moins 10 caractères').max(5000, 'La description ne doit pas dépasser 5000 caractères'),
  screenshotUrls: z.array(z.string().url()).max(3, 'Trois pièces jointes maximum').optional().default([]),
})

export type CreateTicketInput = z.infer<typeof CreateTicketInputSchema>

export type SupportTicket = {
  id: string
  clientId: string
  operatorId: string
  type: TicketType
  subject: string
  description: string
  screenshotUrls: string[]
  status: TicketStatus
  createdAt: string
  updatedAt: string
}

export type SupportTicketDB = {
  id: string
  client_id: string
  operator_id: string
  type: string
  subject: string
  description: string
  screenshot_urls: string[]
  status: string
  created_at: string
  updated_at: string
}

export const UpdateTicketStatusSchema = z.object({
  ticketId: z.string().uuid('ID ticket invalide'),
  status: TicketStatusEnum,
})

export type UpdateTicketStatusInput = z.infer<typeof UpdateTicketStatusSchema>
