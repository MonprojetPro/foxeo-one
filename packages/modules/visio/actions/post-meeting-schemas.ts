// Post-meeting action schemas — NOT 'use server' (schemas are objects, not async functions)
import { z } from 'zod'

export const CreateLabOnboardingInput = z.object({
  meetingId: z.string().uuid('meetingId invalide'),
  clientName: z.string().min(1, 'Le nom est requis'),
  clientEmail: z.string().email('Email invalide'),
  parcoursTemplateId: z.string().uuid('parcoursTemplateId invalide'),
})
export type CreateLabOnboardingInput = z.infer<typeof CreateLabOnboardingInput>

export const NotInterestedReasonValues = [
  'budget',
  'timing',
  'competitor',
  'not_ready',
  'other',
] as const
export type NotInterestedReason = typeof NotInterestedReasonValues[number]

export const MarkProspectNotInterestedInput = z.object({
  meetingId: z.string().uuid('meetingId invalide'),
  reason: z.enum(NotInterestedReasonValues).optional(),
})
export type MarkProspectNotInterestedInput = z.infer<typeof MarkProspectNotInterestedInput>

export const ScheduleFollowUpInput = z.object({
  meetingId: z.string().uuid('meetingId invalide'),
  dueDate: z.string().datetime({ offset: true, message: 'Date invalide' }),
  message: z.string().min(1, 'Le message est requis').max(500),
})
export type ScheduleFollowUpInput = z.infer<typeof ScheduleFollowUpInput>

export const SendProspectResourcesInput = z.object({
  meetingId: z.string().uuid('meetingId invalide'),
  prospectEmail: z.string().email('Email invalide'),
  documentIds: z.array(z.string().uuid()).min(1, 'Au moins un document requis'),
})
export type SendProspectResourcesInput = z.infer<typeof SendProspectResourcesInput>
