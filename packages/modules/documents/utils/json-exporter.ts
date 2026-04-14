import { formatFileSize } from '@monprojetpro/utils'
import type { Document, ExportMetadata } from '../types/document.types'
import type { DocumentFolder } from '../types/folder.types'

export function generateDocumentsJson(
  documents: Document[],
  metadata: ExportMetadata,
  folders: DocumentFolder[] = []
): string {
  const folderMap = new Map(folders.map((f) => [f.id, f.name]))

  const payload = {
    exportedAt: metadata.exportedAt,
    exportedBy: metadata.exportedBy,
    clientId: metadata.clientId,
    totalCount: documents.length,
    documents: documents.map((doc) => ({
      id: doc.id,
      name: doc.name,
      fileType: doc.fileType,
      fileSize: doc.fileSize,
      formattedSize: formatFileSize(doc.fileSize),
      folderId: doc.folderId,
      folderName: doc.folderId ? (folderMap.get(doc.folderId) ?? null) : null,
      visibility: doc.visibility,
      uploadedBy: doc.uploadedBy,
      tags: doc.tags,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    })),
  }

  return JSON.stringify(payload, null, 2)
}
