import { formatFileSize } from '@monprojetpro/utils'
import type { Document } from '../types/document.types'
import type { DocumentFolder } from '../types/folder.types'

export function generateDocumentsCsv(
  documents: Document[],
  folders: DocumentFolder[] = []
): string {
  const folderMap = new Map(folders.map((f) => [f.id, f.name]))

  const headers = [
    'Nom',
    'Type',
    'Taille',
    'Dossier',
    'Visibilité',
    'Date création',
    'Date modification',
  ].map(escapeCsvValue)

  const rows = documents.map((doc) => [
    escapeCsvValue(doc.name),
    escapeCsvValue(doc.fileType),
    escapeCsvValue(formatFileSize(doc.fileSize)),
    escapeCsvValue(
      doc.folderId ? (folderMap.get(doc.folderId) ?? 'Inconnu') : 'Non classes'
    ),
    escapeCsvValue(doc.visibility === 'shared' ? 'Partage' : 'Prive'),
    escapeCsvValue(formatCsvDate(doc.createdAt)),
    escapeCsvValue(formatCsvDate(doc.updatedAt)),
  ])

  const csvContent = [headers, ...rows].map((row) => row.join(',')).join('\n')

  // BOM UTF-8 pour compatibilité Excel
  return '\uFEFF' + csvContent
}

function escapeCsvValue(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

function formatCsvDate(isoDate: string): string {
  const date = new Date(isoDate)
  return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}
