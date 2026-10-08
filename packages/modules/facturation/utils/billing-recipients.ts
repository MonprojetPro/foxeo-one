// ============================================================
// billing-recipients — T-039
//
// Qui recoit la facture, et quel nom s'imprime dessus.
//
// Mots de MiKL (06-10) : « le nom du contact que j'ai mis c'est pour le secretaire
// du CSE mais c'est la comptable qui me paie et elle a pas la meme adresse mail ».
//
// 🔑 LES DEUX REPONSES SONT INDEPENDANTES, et c'est tout l'enjeu :
//   `receivesInvoices` -> les ADRESSES d'envoi (tableau `emails` du compte Pennylane)
//   `showOnInvoice`    -> les NOMS imprimes (mention « A l'attention de »)
// On peut donc imprimer le nom du secretaire et envoyer a la comptable.
//
// ⚠️ REPLI VOLONTAIRE : sans aucun contact coche, on retombe sur `clients.email`
// — l'identifiant de connexion du client. Jamais d'envoi dans le vide, et jamais
// d'emission bloquee par un carnet vide. L'ecran du carnet le dit en clair, pour
// que ce repli ne soit pas une surprise (zone d'ombre 3 de T-039).
// ============================================================

export type RecipientContact = {
  fullName: string
  email: string | null
  receivesInvoices: boolean
  showOnInvoice: boolean
}

export type ResolvedRecipients = {
  /** Adresses d'envoi, dedoublonnees, dans l'ordre du carnet. Jamais vide. */
  emails: string[]
  /** Noms a imprimer sur le document, dans l'ordre du carnet. Peut etre vide. */
  attentionNames: string[]
  /** true quand aucun contact n'etait coche : on est reparti sur l'adresse du client */
  usedFallback: boolean
}

/** « A l'attention de Marie Dupont » — prefixe des notes publiques du document. */
export function buildAttentionLine(names: string[]): string | null {
  if (names.length === 0) return null
  return `À l'attention de ${names.join(', ')}`
}

function cleanEmail(value: string | null | undefined): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed === '' ? null : trimmed
}

/**
 * Resout les destinataires d'un client a partir de son carnet.
 *
 * Le dedoublonnage est insensible a la casse : « Marie@x.fr » et « marie@x.fr »
 * sont la meme boite, et Pennylane enverrait deux fois la meme facture.
 */
export function resolveRecipients(
  contacts: readonly RecipientContact[] | null | undefined,
  clientEmail: string | null | undefined
): ResolvedRecipients {
  const list = Array.isArray(contacts) ? contacts : []

  const emails: string[] = []
  const seen = new Set<string>()
  for (const contact of list) {
    if (contact?.receivesInvoices !== true) continue
    const email = cleanEmail(contact.email)
    // Un destinataire coche sans adresse est deja refuse en base (contrainte
    // CHECK) ET par le formulaire ; s'il en reste un, on ne le transforme pas en
    // envoi fantome, on l'ignore.
    if (!email) continue
    const key = email.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    emails.push(email)
  }

  const attentionNames: string[] = []
  const seenNames = new Set<string>()
  for (const contact of list) {
    if (contact?.showOnInvoice !== true) continue
    const name = typeof contact.fullName === 'string' ? contact.fullName.trim() : ''
    if (name === '' || seenNames.has(name.toLowerCase())) continue
    seenNames.add(name.toLowerCase())
    attentionNames.push(name)
  }

  if (emails.length > 0) {
    return { emails, attentionNames, usedFallback: false }
  }

  const fallback = cleanEmail(clientEmail)
  return {
    emails: fallback ? [fallback] : [],
    attentionNames,
    usedFallback: true,
  }
}

/**
 * Compose les notes publiques du document : la mention « A l'attention de » passe
 * EN TETE des notes de MiKL, sans les ecraser. Un document peut porter les deux.
 */
export function composePublicNotes(
  attentionNames: string[],
  publicNotes: string | null | undefined
): string | null {
  const attention = buildAttentionLine(attentionNames)
  const notes = typeof publicNotes === 'string' && publicNotes.trim() !== '' ? publicNotes.trim() : null

  if (!attention) return notes
  if (!notes) return attention
  return `${attention}\n\n${notes}`
}
