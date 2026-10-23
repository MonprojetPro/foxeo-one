import { z } from 'zod'

// ============================================================
// T-062 — Assistant de reformulation CII
// ============================================================

export const CiiReformulationLine = z.object({
  id: z.string().uuid(),
  importId: z.string().uuid(),
  orderIndex: z.number().int(),
  functionName: z.string(),
  timeRaw: z.string().nullable(),
  timeDays: z.number().nullable(),
  reformulatedText: z.string().nullable(),
  status: z.enum(['pending', 'reformulated', 'validated', 'transferred']),
  createdAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true }),
})

export type CiiReformulationLine = z.infer<typeof CiiReformulationLine>

export type CiiReformulationLineDB = {
  id: string
  import_id: string
  order_index: number
  function_name: string
  time_raw: string | null
  time_days: number | null
  reformulated_text: string | null
  status: 'pending' | 'reformulated' | 'validated' | 'transferred'
  created_at: string
  updated_at: string
}

export const CiiImport = z.object({
  id: z.string().uuid(),
  clientId: z.string().uuid(),
  clientProjectId: z.string().uuid().nullable(),
  fileName: z.string(),
  rawContent: z.string(),
  tjmEuros: z.number(),
  createdAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true }),
})

export type CiiImport = z.infer<typeof CiiImport>

export type CiiImportDB = {
  id: string
  client_id: string
  client_project_id: string | null
  file_name: string
  raw_content: string
  tjm_euros: number
  created_at: string
  updated_at: string
}

export const CiiImportWithLines = CiiImport.extend({
  lines: z.array(CiiReformulationLine),
})

export type CiiImportWithLines = z.infer<typeof CiiImportWithLines>

export const CreateCiiImportInput = z.object({
  clientId: z.string().uuid(),
  clientProjectId: z.string().uuid().nullable().optional(),
  fileName: z.string().min(1),
  rawContent: z.string().min(1, 'Le fichier est vide'),
})

export type CreateCiiImportInput = z.infer<typeof CreateCiiImportInput>

export const UpdateCiiLineInput = z.object({
  lineId: z.string().uuid(),
  functionName: z.string().trim().min(1).optional(),
  timeDays: z.number().min(0).nullable().optional(),
  reformulatedText: z.string().nullable().optional(),
  status: z.enum(['pending', 'reformulated', 'validated', 'transferred']).optional(),
})

export type UpdateCiiLineInput = z.infer<typeof UpdateCiiLineInput>

export const UpdateCiiImportTjmInput = z.object({
  importId: z.string().uuid(),
  tjmEuros: z.number().min(0, 'Le TJM ne peut pas être négatif'),
})

export type UpdateCiiImportTjmInput = z.infer<typeof UpdateCiiImportTjmInput>

export const TransferCiiLinesInput = z.object({
  importId: z.string().uuid(),
  lineIds: z.array(z.string().uuid()).min(1, 'Sélectionne au moins une ligne'),
  target: z.enum(['quote', 'invoice']),
  sendNow: z.boolean().optional(),
})

export type TransferCiiLinesInput = z.infer<typeof TransferCiiLinesInput>

export type TransferCiiLinesResult = {
  target: 'quote' | 'invoice'
  pennylaneId: string
}
