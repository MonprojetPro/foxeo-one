import { z } from 'zod'
import { emailSchema, passwordSchema } from '@monprojetpro/utils'

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Mot de passe requis'),
})

export const forgotPasswordSchema = z.object({
  email: emailSchema,
})

export const signupSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  confirmPassword: z.string().min(1, 'Confirmation requise'),
  acceptCgu: z.boolean().refine((val) => val === true, {
    message: 'Vous devez accepter les CGU pour créer un compte',
  }),
  acceptIaProcessing: z.boolean(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Les mots de passe ne correspondent pas',
  path: ['confirmPassword'],
})
