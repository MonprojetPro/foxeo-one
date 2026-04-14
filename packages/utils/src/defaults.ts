import { z } from 'zod'
import type { CommunicationProfile } from '@monprojetpro/types'

// --- Schéma Zod de validation du profil de communication ---

export const communicationProfileSchema = z.object({
  levelTechnical: z.enum(['beginner', 'intermediaire', 'advanced']),
  styleExchange: z.enum(['direct', 'conversationnel', 'formel']),
  adaptedTone: z.enum(['formel', 'pro_decontracte', 'chaleureux', 'coach']),
  messageLength: z.enum(['court', 'moyen', 'detaille']),
  tutoiement: z.boolean(),
  concreteExamples: z.boolean(),
  avoid: z.array(z.string()),
  privilege: z.array(z.string()),
  styleNotes: z.string(),
  lab_learnings: z.array(z.string()).optional(),
})

export type CommunicationProfileInput = z.infer<typeof communicationProfileSchema>

// --- Profil par défaut ---

export const DEFAULT_COMMUNICATION_PROFILE: CommunicationProfile = {
  levelTechnical: 'intermediaire',
  styleExchange: 'conversationnel',
  adaptedTone: 'pro_decontracte',
  messageLength: 'moyen',
  tutoiement: false,
  concreteExamples: true,
  avoid: [],
  privilege: [],
  styleNotes: '',
}
