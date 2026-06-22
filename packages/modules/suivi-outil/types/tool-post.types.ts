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

// ─── ToolPostComment — DB row (snake_case) ────────────────────────────────────
export interface ToolPostCommentRow {
  id: string
  post_id: string
  client_id: string
  author_type: 'client' | 'operator'
  author_id: string
  body: string
  image_paths: string[]
  created_at: string
}

// ─── ToolPostComment — App model (camelCase) ──────────────────────────────────
export interface ToolPostComment {
  id: string
  postId: string
  clientId: string
  authorType: 'client' | 'operator'
  authorId: string
  body: string
  imagePaths: string[]
  imageUrls: string[]
  createdAt: string
}

// ─── Zod schema — création d'un commentaire ───────────────────────────────────
export const ToolPostCommentSchema = z.object({
  postId: z.string().uuid('postId invalide'),
  clientId: z.string().uuid('clientId invalide'),
  body: z
    .string()
    .min(1, 'Le commentaire est requis')
    .max(2000, 'Commentaire trop long (max 2000 caractères)'),
  imagePaths: z
    .array(z.string())
    .default([]),
})
export type ToolPostCommentInput = z.infer<typeof ToolPostCommentSchema>

// ─── Helper: DB row → app model (commentaire) ─────────────────────────────────
export function rowToToolPostComment(
  row: ToolPostCommentRow,
  imageUrls: string[] = []
): ToolPostComment {
  return {
    id: row.id,
    postId: row.post_id,
    clientId: row.client_id,
    authorType: row.author_type,
    authorId: row.author_id,
    body: row.body,
    imagePaths: row.image_paths ?? [],
    imageUrls,
    createdAt: row.created_at,
  }
}

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
