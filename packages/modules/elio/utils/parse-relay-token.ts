/**
 * Relais Élio One → MiKL (décision MiKL du 2026-08-19).
 *
 * Élio One est « une extension de MiKL » : quand le client exprime une difficulté sur son
 * PROJET (pas une question d'usage de l'outil, que Élio traite lui-même), Élio propose de
 * prévenir MiKL et émet un jeton `[[prevenir-mikl:résumé du point à transmettre]]`.
 *
 * Ce jeton n'envoie RIEN par lui-même : il fait apparaître un bouton d'accord côté client.
 * Le relais n'a lieu que si le client clique. Élio ne prévient jamais MiKL dans son dos.
 *
 * Même contrat que parseGotoLinks : fonction pure, sans React, qui retire toujours le jeton
 * du texte affiché pour ne jamais montrer la syntaxe brute au client — y compris quand le
 * résumé est vide et qu'aucun bouton n'est proposé.
 */

// [[prevenir-mikl:résumé]] — résumé = tout sauf « ] ». Tolère les espaces autour du deux-points.
const RELAY_TOKEN = /\[\[prevenir-mikl:\s*([^\]]+)\]\]/g

/** Garde-fou : un résumé trop court ne dit rien d'utile à MiKL. */
const MIN_SUMMARY_LENGTH = 10

export interface RelayProposal {
  /** Résumé rédigé par Élio, transmis tel quel dans le Chat MiKL après accord du client. */
  summary: string
}

export function parseRelayToken(content: string): { text: string; relay: RelayProposal | null } {
  if (!content || !content.includes('[[prevenir-mikl:')) {
    return { text: content, relay: null }
  }

  let summary = ''
  let match: RegExpExecArray | null
  RELAY_TOKEN.lastIndex = 0
  while ((match = RELAY_TOKEN.exec(content)) !== null) {
    const candidate = match[1]?.trim() ?? ''
    // Un seul relais par message : on garde le premier résumé exploitable.
    if (!summary && candidate.length >= MIN_SUMMARY_LENGTH) {
      summary = candidate
    }
  }

  const text = content
    .replace(RELAY_TOKEN, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

  return { text, relay: summary ? { summary } : null }
}
