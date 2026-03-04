import { describe, it, expect } from 'vitest'
import { sendDocumentEmail } from './send-document-email'

describe('sendDocumentEmail (Story 8.9b — Task 8)', () => {
  it('retourne VALIDATION_ERROR si documentName manquant', async () => {
    const result = await sendDocumentEmail('', 'Contenu', undefined)
    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })

  it('retourne VALIDATION_ERROR si documentContent manquant', async () => {
    const result = await sendDocumentEmail('Mon attestation', '', undefined)
    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })

  it('retourne un lien mailto avec subject encodé', async () => {
    const result = await sendDocumentEmail('Attestation de présence', 'Contenu du doc')
    expect(result.data?.mailtoUrl).toContain('mailto:?subject=')
    expect(result.data?.mailtoUrl).toContain('Attestation')
  })

  it('inclut le contenu du document dans le body du mailto', async () => {
    const result = await sendDocumentEmail('Attestation', 'Contenu test du document')
    expect(result.data?.mailtoUrl).toContain('Contenu')
  })

  it('inclut la pdfUrl dans le body si fournie', async () => {
    const pdfUrl = 'https://storage.example.com/signed-url'
    const result = await sendDocumentEmail('Attestation', 'Contenu', pdfUrl)
    expect(result.data?.mailtoUrl).toContain(encodeURIComponent(pdfUrl))
  })

  it('retourne le subject non encodé dans la réponse', async () => {
    const result = await sendDocumentEmail('Mon attestation', 'Contenu')
    expect(result.data?.subject).toBe('Document : Mon attestation')
  })

  it('tronque le contenu à 1000 chars pour éviter des URL trop longues', async () => {
    const longContent = 'A'.repeat(2000)
    const result = await sendDocumentEmail('Titre', longContent)
    // Le body du mailto ne doit pas contenir les 2000 chars
    const bodyEncoded = result.data?.mailtoUrl ?? ''
    const bodyDecoded = decodeURIComponent(bodyEncoded.split('&body=')[1] ?? '')
    expect(bodyDecoded.length).toBeLessThan(longContent.length)
  })
})
