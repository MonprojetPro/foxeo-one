import { describe, it, expect } from 'vitest'
import { composeStepContextMessage } from './compose-step-context-message'

describe('composeStepContextMessage', () => {
  it('génère le message format texte', () => {
    const msg = composeStepContextMessage({
      contextMessage: 'Quelle est ta proposition de valeur unique ?',
      contentType: 'text',
    })
    expect(msg).toBe(
      'MiKL a ajouté des précisions pour cette étape. Il te demande : Quelle est ta proposition de valeur unique ?'
    )
  })

  it('génère le message format fichier avec nom de fichier', () => {
    const msg = composeStepContextMessage({
      contextMessage: '[Document PDF : brief-client.pdf]',
      contentType: 'file',
      fileName: 'brief-client.pdf',
    })
    expect(msg).toBe(
      'MiKL a consulté le document "brief-client.pdf" et il te demande : [Document PDF : brief-client.pdf]'
    )
  })

  it('utilise le format texte si contentType=file mais fileName est null', () => {
    const msg = composeStepContextMessage({
      contextMessage: 'Contenu extrait',
      contentType: 'file',
      fileName: null,
    })
    expect(msg).toContain('MiKL a ajouté des précisions')
  })

  it('utilise le format texte si contentType=file mais fileName est undefined', () => {
    const msg = composeStepContextMessage({
      contextMessage: 'Contenu extrait',
      contentType: 'file',
    })
    expect(msg).toContain('MiKL a ajouté des précisions')
  })
})
