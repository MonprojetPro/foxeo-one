// Documents Module
export { manifest } from './manifest'

// Components
export { DocumentsHubPage } from './components/documents-hub-page'
export { DocumentUpload } from './components/document-upload'
export { DocumentList } from './components/document-list'
export { DocumentIcon } from './components/document-icon'
export { DocumentSkeleton } from './components/document-skeleton'
export { DocumentsPageClient } from './components/documents-page-client'
export { DocumentViewer } from './components/document-viewer'
export { DocumentViewerSkeleton } from './components/document-viewer-skeleton'
export { DocumentMetadataPreview } from './components/document-metadata-preview'
export { DocumentDownloadButton } from './components/document-download-button'
export { DocumentVisibilityBadge } from './components/document-visibility-badge'
export { DocumentViewerPageClient } from './components/document-viewer-page-client'
export { DocumentShareButton } from './components/document-share-button'
export { FolderTree } from './components/folder-tree'
export { FolderTreeSkeleton } from './components/folder-tree-skeleton'
export { CreateFolderDialog } from './components/create-folder-dialog'
export { DocumentSearch } from './components/document-search'
export { SyncToZipButton } from './components/sync-to-zip-button'
export { DocumentSyncBadge } from './components/document-sync-badge'
export { DraftRestoreBanner } from './components/draft-restore-banner'
export { DocumentExportMenu } from './components/document-export-menu'

// Hooks
export { useDocuments } from './hooks/use-documents'
export { useDocumentViewer } from './hooks/use-document-viewer'
export { useShareDocument } from './hooks/use-share-document'
export { useFolders } from './hooks/use-folders'
export { useFolderMutations } from './hooks/use-folder-mutations'
export { useSyncDocuments } from './hooks/use-sync-documents'
export { useDraftForm } from './hooks/use-draft-form'
export { useUndoableAction } from './hooks/use-undo-action'
export { useExportDocuments } from './hooks/use-export-documents'

// Actions
export { uploadDocument } from './actions/upload-document'
export { getDocuments } from './actions/get-documents'
export { getAllDocuments } from './actions/get-all-documents'
export type { DocumentWithClient } from './actions/get-all-documents'
export { deleteDocument } from './actions/delete-document'
export { restoreDocument, type RestoreDocumentInput } from './actions/restore-document'
export { getDocumentUrl } from './actions/get-document-url'
export { generatePdf } from './actions/generate-pdf'
export { shareDocument } from './actions/share-document'
export { unshareDocument } from './actions/unshare-document'
export { shareDocumentsBatch } from './actions/share-documents-batch'
export { createFolder } from './actions/create-folder'
export { renameFolder } from './actions/rename-folder'
export { deleteFolder } from './actions/delete-folder'
export { getFolders } from './actions/get-folders'
export { moveDocument } from './actions/move-document'
export { syncDocumentsToZip } from './actions/sync-documents-to-zip'
export { getOperatorId } from './actions/get-operator-id'
export { exportDocumentsCSV } from './actions/export-documents-csv'
export { exportDocumentsJSON } from './actions/export-documents-json'
export type { SyncDocumentsResult } from './actions/sync-documents-to-zip'
export type { ZipFileEntry } from './utils/zip-generator'

// Types
export type {
  Document,
  DocumentDB,
  DocumentVisibility,
  UploadedBy,
  UploadDocumentInput,
  GetDocumentsInput,
  DeleteDocumentInput,
  GetDocumentUrlInput,
  GeneratePdfInput,
  ShareDocumentInput,
  UnshareDocumentInput,
  ShareDocumentsBatchInput,
  SyncDocumentsInput,
  ExportDocumentsInput,
  DocumentFilters,
  ExportMetadata,
} from './types/document.types'

export type {
  DocumentFolder,
  DocumentFolderDB,
  CreateFolderInput,
  RenameFolderInput,
  DeleteFolderInput,
  GetFoldersInput,
  MoveDocumentInput,
} from './types/folder.types'
