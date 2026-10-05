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

/**
 * Nature du client (T-035).
 * `individual` : personne physique — nom de famille + prénom facultatif.
 * `entity`     : personne morale — raison sociale obligatoire, nom de contact facultatif.
 */
export const clientKindSchema = z.enum(['individual', 'entity'])

/** SIRET : 14 chiffres, saisie avec espaces tolérée côté formulaire (normalisée avant). */
export const siretSchema = z
  .string()
  .regex(/^[0-9]{14}$/, 'Un SIRET comporte 14 chiffres')

const clientIdentityFields = {
  clientKind: clientKindSchema.default('individual'),
  firstName: z.string().max(100, 'Le prénom ne doit pas dépasser 100 caractères').optional().or(z.literal('')),
  // Pour une entité, `name` est renseigné côté action à partir de la raison sociale :
  // il n'est donc plus obligatoire à la saisie, c'est `company` qui l'est (voir le refine).
  name: z.string()
    .max(100, 'Le nom ne doit pas depasser 100 caracteres')
    .optional()
    .or(z.literal('')),
  company: z.string().max(150, "Le nom de l'entité ne doit pas dépasser 150 caractères").optional().or(z.literal('')),
  /** Nom du contact chez une entité. N'apparaît JAMAIS en facturation. */
  contact: z.string().max(150, 'Le nom du contact ne doit pas dépasser 150 caractères').optional().or(z.literal('')),
  siret: siretSchema.optional().or(z.literal('')),
  nafCode: z.string().max(10).optional().or(z.literal('')),
  billingAddress: z.string().max(255).optional().or(z.literal('')),
  billingPostalCode: z.string().max(20).optional().or(z.literal('')),
  billingCity: z.string().max(120).optional().or(z.literal('')),
  phone: phoneSchema.optional().or(z.literal('')),
  sector: z.string().optional(),
}

/**
 * Une entité doit porter une raison sociale, un particulier un nom de famille.
 * Le contrôle vit ici pour que le formulaire ET la Server Action appliquent
 * exactement la même règle — une seule source, pas deux validations divergentes.
 */
function requireIdentity(
  data: { clientKind?: 'individual' | 'entity'; name?: string; company?: string },
  ctx: z.RefinementCtx,
  { allowEmpty = false }: { allowEmpty?: boolean } = {}
) {
  const kind = data.clientKind ?? 'individual'

  if (kind === 'entity') {
    if (allowEmpty && data.company === undefined) return
    if (!data.company || data.company.trim().length < 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['company'],
        message: "Le nom de l'entité est requis (au moins 2 caractères)",
      })
    }
    return
  }

  if (allowEmpty && data.name === undefined) return
  if (!data.name || data.name.trim().length < 2) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['name'],
      message: 'Le nom doit contenir au moins 2 caracteres',
    })
  }
}

// Schema for creating a new client
export const createClientSchema = z
  .object({
    ...clientIdentityFields,
    email: z.string().email('Email invalide'),
    clientType: clientTypeSchema.default('ponctuel'),
  })
  .superRefine((data, ctx) => requireIdentity(data, ctx))

// Schema for updating a client (all fields optional)
export const updateClientSchema = z
  .object({
    ...clientIdentityFields,
    email: z.string().email('Email invalide').optional(),
    clientType: clientTypeSchema.optional(),
    clientKind: clientKindSchema.optional(),
  })
  .superRefine((data, ctx) => requireIdentity(data, ctx, { allowEmpty: true }))
