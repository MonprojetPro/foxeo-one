import { z } from 'zod'
import { emailSchema } from '@monprojetpro/utils'

// Fichier séparé (pas 'use server') : ce sont des constantes, pas des fonctions
// async — un export de constante dans un fichier 'use server' casse le build
// Next.js sans que tsc/vitest ne le voient (cf. CLAUDE.md, incident déjà tracé).

export const updateOperatorProfileSchema = z.object({
  name: z
    .string()
    .min(1, 'Le nom est requis')
    .max(100, 'Le nom ne doit pas dépasser 100 caractères')
    .optional(),
  email: emailSchema.optional(),
})

export const updateOperatorPasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Mot de passe actuel requis'),
  newPassword: z.string().min(8, 'Minimum 8 caractères'),
})
