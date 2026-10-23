// Module CII — Assistant de reformulation au format Crédit d'Impôt Innovation
export { manifest } from './manifest'

// Components
export { CiiReformulationTab } from './components/cii-reformulation-tab'
export { CiiImportUpload, type CiiClientProjectOption } from './components/cii-import-upload'
export { CiiImportDetail } from './components/cii-import-detail'

// Hooks
export {
  useCiiImports,
  useCreateCiiImport,
  useUpdateCiiLine,
  useUpdateCiiImportTjm,
  useGenerateCiiReformulations,
  useTransferCiiLines,
  useDeleteCiiImport,
} from './hooks/use-cii-imports'

// Actions
export { getCiiImports } from './actions/get-cii-imports'
export { createCiiImport } from './actions/create-cii-import'
export { updateCiiLine } from './actions/update-cii-line'
export { updateCiiImportTjm } from './actions/update-cii-import-tjm'
export { generateCiiReformulations } from './actions/generate-cii-reformulations'
export { transferCiiLines } from './actions/transfer-cii-lines'
export { deleteCiiImport } from './actions/delete-cii-import'

// Utils
export { parseCiiFunctionsFile, type ParsedCiiLine } from './utils/parse-cii-file'

// Types
export type {
  CiiImport,
  CiiImportDB,
  CiiImportWithLines,
  CiiReformulationLine,
  CiiReformulationLineDB,
  CreateCiiImportInput,
  UpdateCiiLineInput,
  UpdateCiiImportTjmInput,
  TransferCiiLinesInput,
  TransferCiiLinesResult,
} from './types/cii.types'
