import { z } from 'zod'

export const emailSchema = z.string().email('Email invalide')

export const passwordSchema = z
  .string()
  .min(8, 'Minimum 8 caracteres')
  .regex(/[A-Z]/, 'Au moins une majuscule')
  .regex(/[a-z]/, 'Au moins une minuscule')
  .regex(/[0-9]/, 'Au moins un chiffre')

export const uuidSchema = z.string().uuid('UUID invalide')

export const slugSchema = z
  .string()
  .min(3, 'Minimum 3 caracteres')
  .max(50, 'Maximum 50 caracteres')
  .regex(/^[a-z0-9-]+$/, 'Uniquement lettres minuscules, chiffres et tirets')

export const phoneSchema = z
  .string()
  .regex(/^\+?[0-9\s-]{10,20}$/, 'Numero de telephone invalide')

// Client type enum (aligned with existing CRM types)
export const clientTypeSchema = z.enum(['complet', 'direct_one', 'ponctuel'])

// Schema for creating a new client
export const createClientSchema = z.object({
  firstName: z.string().max(100, 'Le prénom ne doit pas dépasser 100 caractères').optional().or(z.literal('')),
  name: z.string()
    .min(2, 'Le nom doit contenir au moins 2 caracteres')
    .max(100, 'Le nom ne doit pas depasser 100 caracteres'),
  email: z.string().email('Email invalide'),
  company: z.string().optional(),
  phone: phoneSchema.optional().or(z.literal('')),
  sector: z.string().optional(),
  clientType: clientTypeSchema.default('ponctuel'),
})

// Schema for updating a client (all fields optional)
export const updateClientSchema = z.object({
  firstName: z.string().max(100).optional().or(z.literal('')),
  name: z.string()
    .min(2, 'Le nom doit contenir au moins 2 caracteres')
    .max(100, 'Le nom ne doit pas depasser 100 caracteres')
    .optional(),
  email: z.string().email('Email invalide').optional(),
  company: z.string().optional(),
  phone: phoneSchema.optional().or(z.literal('')),
  sector: z.string().optional(),
  clientType: clientTypeSchema.optional(),
})
