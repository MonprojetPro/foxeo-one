import { z } from 'zod'

// ============================================================
// Input types
// ============================================================

export const ExportClientDataInput = z.object({
  clientId: z.string().uuid('clientId doit être un UUID valide'),
  requestedBy: z.enum(['client', 'operator']),
})

export type ExportClientDataInput = z.infer<typeof ExportClientDataInput>

// ============================================================
// Domain types (camelCase)
// ============================================================

export type ExportStatus = 'pending' | 'processing' | 'completed' | 'failed'

export type ExportResult = {
  exportId: string
}

export type DataExport = {
  id: string
  clientId: string
  requestedBy: 'client' | 'operator'
  requesterId: string
  status: ExportStatus
  filePath: string | null
  fileSizeBytes: number | null
  expiresAt: string | null
  errorMessage: string | null
  createdAt: string
  completedAt: string | null
}
