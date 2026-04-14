import { describe, it, expect } from 'vitest'

describe('migrateLabDataToOne (MVP stub)', () => {
  it('should return success with MVP summary (all false/0)', async () => {
    const { migrateLabDataToOne } = await import('./migrate-lab-data')

    const result = await migrateLabDataToOne(
      '550e8400-e29b-41d4-a716-446655440000',
      'https://acme-corp.monprojet-pro.com'
    )

    expect(result.error).toBeNull()
    expect(result.data).toBeTruthy()
    expect(result.data?.communicationProfileCopied).toBe(false)
    expect(result.data?.conversationsCopied).toBe(0)
    expect(result.data?.documentsCopied).toBe(0)
    expect(result.data?.parcoursCopied).toBe(false)
    expect(result.data?.labLearningsCompiled).toBe(false)
  })

  it('should accept any clientId and instanceUrl without error', async () => {
    const { migrateLabDataToOne } = await import('./migrate-lab-data')

    const result = await migrateLabDataToOne(
      '550e8400-e29b-41d4-a716-446655440001',
      'https://test-client.monprojet-pro.com'
    )

    expect(result.error).toBeNull()
    expect(result.data).not.toBeNull()
  })
})
