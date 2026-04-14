import { z } from 'zod'
import { emailSchema } from '@monprojetpro/utils'

export const hubLoginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Mot de passe requis'),
})

export const mfaCodeSchema = z.object({
  code: z.string().length(6, 'Le code doit contenir 6 chiffres').regex(/^\d{6}$/, 'Le code doit etre numerique'),
})
