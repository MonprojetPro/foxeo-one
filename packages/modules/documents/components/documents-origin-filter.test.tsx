import { describe, it, expect } from 'vitest'
import type { Document } from '../types/document.types'
import { filterByOrigin, groupDocuments } from '../utils/origin-filter'

const makeDoc = (overrides: Partial<Document> = {}): Document => ({
  id: crypto.randomUUID(),
  clientId: 'client-1',
  operatorId: 'op-1',
  name: 'doc.pdf',
  filePath: '/path/doc.pdf',
  fileType: 'application/pdf',
  fileSize: 1024,
  folderId: null,
  tags: [],
  visibility: 'shared',
  uploadedBy: 'client',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  lastSyncedAt: null,
  deletedAt: null,
  ...overrides,
})

describe('Document Origin Filter', () => {
  describe('filterByOrigin', () => {
    const labDoc = makeDoc({ uploadedBy: 'client', createdAt: '2025-12-01T00:00:00Z' })
    const oneDoc = makeDoc({ uploadedBy: 'operator', createdAt: '2026-03-01T00:00:00Z' })
    const documents = [labDoc, oneDoc]

    it('filter "all" returns all documents', () => {
      expect(filterByOrigin(documents, 'all')).toHaveLength(2)
    })

    it('filter "lab" returns only client-uploaded documents', () => {
      const result = filterByOrigin(documents, 'lab')
      expect(result).toHaveLength(1)
      expect(result[0].uploadedBy).toBe('client')
    })

    it('filter "one" with graduatedAt returns docs created after graduation', () => {
      const graduatedAt = '2026-02-01T00:00:00Z'
      const result = filterByOrigin(documents, 'one', graduatedAt)
      expect(result).toHaveLength(1)
      expect(result[0].createdAt).toBe('2026-03-01T00:00:00Z')
    })

    it('filter "one" without graduatedAt returns operator-uploaded docs', () => {
      const result = filterByOrigin(documents, 'one')
      expect(result).toHaveLength(1)
      expect(result[0].uploadedBy).toBe('operator')
    })

    it('filter "lab" returns empty if no client-uploaded docs', () => {
      const opOnlyDocs = [oneDoc]
      const result = filterByOrigin(opOnlyDocs, 'lab')
      expect(result).toHaveLength(0)
    })
  })

  describe('groupDocuments', () => {
    it('groups client-uploaded docs as labBriefs', () => {
      const doc = makeDoc({ uploadedBy: 'client' })
      const { labBriefs } = groupDocuments([doc])
      expect(labBriefs).toHaveLength(1)
    })

    it('groups operator shared docs as livrables', () => {
      const doc = makeDoc({ uploadedBy: 'operator', visibility: 'shared' })
      const { livrables } = groupDocuments([doc])
      expect(livrables).toHaveLength(1)
    })

    it('operator private docs go to autresDocuments', () => {
      const doc = makeDoc({ uploadedBy: 'operator', visibility: 'private' })
      const { livrables, autresDocuments } = groupDocuments([doc])
      expect(livrables).toHaveLength(0)
      expect(autresDocuments).toHaveLength(1)
    })

    it('correctly splits mixed documents into 3 sections', () => {
      const docs = [
        makeDoc({ uploadedBy: 'client', visibility: 'shared' }),
        makeDoc({ uploadedBy: 'operator', visibility: 'shared' }),
        makeDoc({ uploadedBy: 'operator', visibility: 'private' }),
      ]
      const { labBriefs, livrables, autresDocuments } = groupDocuments(docs)
      expect(labBriefs).toHaveLength(1)
      expect(livrables).toHaveLength(1)
      expect(autresDocuments).toHaveLength(1)
    })
  })
})
