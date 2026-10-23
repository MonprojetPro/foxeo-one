import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getCiiImports } from '../actions/get-cii-imports'
import { createCiiImport } from '../actions/create-cii-import'
import { updateCiiLine } from '../actions/update-cii-line'
import { updateCiiImportTjm } from '../actions/update-cii-import-tjm'
import { generateCiiReformulations } from '../actions/generate-cii-reformulations'
import { transferCiiLines } from '../actions/transfer-cii-lines'
import { deleteCiiImport } from '../actions/delete-cii-import'
import type {
  CiiImportWithLines,
  CreateCiiImportInput,
  UpdateCiiLineInput,
  UpdateCiiImportTjmInput,
  TransferCiiLinesInput,
} from '../types/cii.types'

// ============================================================
// T-062 — assistant de reformulation CII
// ============================================================

function ciiImportsKey(clientId: string) {
  return ['cii-imports', clientId] as const
}

export function useCiiImports(clientId: string) {
  return useQuery({
    queryKey: ciiImportsKey(clientId),
    queryFn: async (): Promise<CiiImportWithLines[]> => {
      const result = await getCiiImports(clientId)
      if (result.error) throw new Error(result.error.message)
      return result.data ?? []
    },
    enabled: !!clientId,
  })
}

function useInvalidateCiiImports(clientId: string) {
  const queryClient = useQueryClient()
  return async () => {
    await queryClient.invalidateQueries({ queryKey: ciiImportsKey(clientId) })
  }
}

export function useCreateCiiImport(clientId: string) {
  const invalidate = useInvalidateCiiImports(clientId)
  return useMutation({
    mutationFn: async (input: CreateCiiImportInput): Promise<CiiImportWithLines> => {
      const result = await createCiiImport(input)
      if (result.error || !result.data) throw new Error(result.error?.message ?? 'Échec de l\'import')
      return result.data
    },
    onSuccess: invalidate,
  })
}

export function useUpdateCiiLine(clientId: string) {
  const invalidate = useInvalidateCiiImports(clientId)
  return useMutation({
    mutationFn: async (input: UpdateCiiLineInput) => {
      const result = await updateCiiLine(input)
      if (result.error) throw new Error(result.error.message)
      return result.data
    },
    onSuccess: invalidate,
  })
}

export function useUpdateCiiImportTjm(clientId: string) {
  const invalidate = useInvalidateCiiImports(clientId)
  return useMutation({
    mutationFn: async (input: UpdateCiiImportTjmInput) => {
      const result = await updateCiiImportTjm(input)
      if (result.error) throw new Error(result.error.message)
      return result.data
    },
    onSuccess: invalidate,
  })
}

export function useGenerateCiiReformulations(clientId: string) {
  const invalidate = useInvalidateCiiImports(clientId)
  return useMutation({
    mutationFn: async (importId: string) => {
      const result = await generateCiiReformulations(importId)
      if (result.error) throw new Error(result.error.message)
      return result.data
    },
    onSuccess: invalidate,
  })
}

export function useTransferCiiLines(clientId: string) {
  const invalidate = useInvalidateCiiImports(clientId)
  return useMutation({
    mutationFn: async (input: TransferCiiLinesInput) => {
      const result = await transferCiiLines(input)
      if (result.error || !result.data) throw new Error(result.error?.message ?? 'Échec du transfert')
      return result.data
    },
    onSuccess: invalidate,
  })
}

export function useDeleteCiiImport(clientId: string) {
  const invalidate = useInvalidateCiiImports(clientId)
  return useMutation({
    mutationFn: async (importId: string) => {
      const result = await deleteCiiImport(importId)
      if (result.error) throw new Error(result.error.message)
    },
    onSuccess: invalidate,
  })
}
