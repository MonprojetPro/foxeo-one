import type { Document } from '../types/document.types'

export type OriginFilter = 'all' | 'lab' | 'one'

export function filterByOrigin(
  documents: Document[],
  origin: OriginFilter,
  graduatedAt?: string
): Document[] {
  if (origin === 'all') return documents
  if (origin === 'lab') {
    return documents.filter((d) => d.uploadedBy === 'client')
  }
  if (origin === 'one') {
    if (graduatedAt) {
      return documents.filter(
        (d) => new Date(d.createdAt) >= new Date(graduatedAt)
      )
    }
    return documents.filter((d) => d.uploadedBy === 'operator')
  }
  return documents
}

export function groupDocuments(documents: Document[]): {
  labBriefs: Document[]
  livrables: Document[]
  autresDocuments: Document[]
} {
  const labBriefs = documents.filter((d) => d.uploadedBy === 'client')
  const livrables = documents.filter(
    (d) => d.uploadedBy === 'operator' && d.visibility === 'shared'
  )
  const briefIds = new Set(labBriefs.map((d) => d.id))
  const livIds = new Set(livrables.map((d) => d.id))
  const autresDocuments = documents.filter(
    (d) => !briefIds.has(d.id) && !livIds.has(d.id)
  )
  return { labBriefs, livrables, autresDocuments }
}
