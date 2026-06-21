import { z } from 'zod'

// ─── DB row (snake_case) ───────────────────────────────────────────────────────
export interface ToolPostRow {
  id: string
  client_id: string
  operator_id: string
  title: string | null
  body: string
  image_paths: string[]
  created_at: string
  updated_at: string
}

// ─── App model (camelCase) ────────────────────────────────────────────────────
export interface ToolPost {
  id: string
  clientId: string
  operatorId: string
  title: string | null
  body: string
  imagePaths: string[]
  imageUrls: string[]
  createdAt: string
  updatedAt: string
}

// ─── Zod schemas ──────────────────────────────────────────────────────────────
export const CreateToolPostSchema = z.object({
  clientId: z.string().uuid('clientId invalide'),
  title: z.string().max(200, 'Titre trop long (max 200 caractères)').optional(),
  body: z
    .string()
    .min(1, 'Le contenu est requis')
    .max(5000, 'Contenu trop long (max 5000 caractères)'),
})

export type CreateToolPostInput = z.infer<typeof CreateToolPostSchema>

export const UpdateToolPostSchema = z.object({
  postId: z.string().uuid('postId invalide'),
  title: z.string().max(200).optional(),
  body: z
    .string()
    .min(1, 'Le contenu est requis')
    .max(5000)
    .optional(),
})

export type UpdateToolPostInput = z.infer<typeof UpdateToolPostSchema>

// ─── Helper: DB row → app model ───────────────────────────────────────────────
export function rowToToolPost(row: ToolPostRow, imageUrls: string[] = []): ToolPost {
  return {
    id: row.id,
    clientId: row.client_id,
    operatorId: row.operator_id,
    title: row.title,
    body: row.body,
    imagePaths: row.image_paths ?? [],
    imageUrls,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}
