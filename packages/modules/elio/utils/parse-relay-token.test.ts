import { describe, it, expect } from 'vitest'
import { parseRelayToken } from './parse-relay-token'

describe('parseRelayToken', () => {
  it('retourne le contenu inchangé quand il n’y a aucun jeton', () => {
    const content = 'Comment ça avance sur ton projet ?'
    expect(parseRelayToken(content)).toEqual({ text: content, relay: null })
  })

  it('extrait le résumé et retire le jeton du texte affiché', () => {
    const { text, relay } = parseRelayToken(
      "Je comprends, ce n'est pas simple.\n[[prevenir-mikl:Le client est bloqué sur le lancement de son site depuis deux semaines.]]",
    )
    expect(relay?.summary).toBe(
      'Le client est bloqué sur le lancement de son site depuis deux semaines.',
    )
    expect(text).toBe("Je comprends, ce n'est pas simple.")
    expect(text).not.toContain('prevenir-mikl')
  })

  it('tolère des espaces après le deux-points', () => {
    const { relay } = parseRelayToken('[[prevenir-mikl:   Le client traverse une période difficile.]]')
    expect(relay?.summary).toBe('Le client traverse une période difficile.')
  })

  it('ignore un résumé trop court mais retire quand même le jeton', () => {
    // Garde-fou : « ok » ne dit rien d'utile à MiKL — pas de bouton, mais surtout jamais
    // la syntaxe brute sous les yeux du client.
    const { text, relay } = parseRelayToken('Très bien. [[prevenir-mikl:ok]]')
    expect(relay).toBeNull()
    expect(text).toBe('Très bien.')
    expect(text).not.toContain('[[')
  })

  it('ne garde qu’un seul relais quand Élio en émet plusieurs', () => {
    const { relay } = parseRelayToken(
      '[[prevenir-mikl:Premier point à transmettre à MiKL.]] et [[prevenir-mikl:Second point à transmettre.]]',
    )
    expect(relay?.summary).toBe('Premier point à transmettre à MiKL.')
  })

  it('nettoie les lignes vides résiduelles laissées par le jeton', () => {
    const { text } = parseRelayToken(
      'Je préviens MiKL.\n\n[[prevenir-mikl:Le client rencontre des difficultés de trésorerie.]]\n\n',
    )
    expect(text).toBe('Je préviens MiKL.')
  })

  it('est réentrant : deux appels successifs donnent le même résultat', () => {
    // Le regex est global (lastIndex persistant) — un état résiduel ferait échouer
    // le second appel de façon très difficile à diagnostiquer.
    const content = '[[prevenir-mikl:Le client est découragé par les délais.]]'
    const first = parseRelayToken(content)
    const second = parseRelayToken(content)
    expect(second).toEqual(first)
    expect(second.relay?.summary).toBe('Le client est découragé par les délais.')
  })
})
