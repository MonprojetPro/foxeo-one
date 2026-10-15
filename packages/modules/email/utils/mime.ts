/**
 * Assemblage d'un message MIME — fonctions PURES (T-057).
 *
 * 🔴 DEUX BUGS PROUVÉS QUE CE FICHIER FERME, trouvés sur un email réel du
 * 2026-10-15 reçu par MiKL :
 *
 * ① L'objet s'affichait « Visio MonprojetPro Ã¢Â€Â" … ». Un en-tête MIME ne
 *    transporte que de l'ASCII : tout accent, apostrophe typographique ou tiret
 *    cadratin DOIT passer par l'encodage RFC 2047. Le code écrivait l'objet
 *    brut — donc tout objet français un peu soigné arrivait illisible.
 *
 * ② L'en-tête annonçait `Content-Transfer-Encoding: quoted-printable` alors que
 *    le corps n'était PAS encodé ainsi. Les clients mail tolérants s'en
 *    accommodent, mais un corps contenant un « = » ou une ligne de plus de 998
 *    caractères (une URL longue, une ligne HTML) casse l'affichage. Déclarer un
 *    encodage qu'on n'applique pas, c'est une bombe à retardement silencieuse.
 *
 * ⚠️ Ces deux défauts étaient dans une BRIQUE PARTAGÉE : tout ce qui part par
 * Gmail en héritait, pas seulement l'invitation de visio.
 */

function toBase64(value: string): string {
  return Buffer.from(value, 'utf-8').toString('base64')
}

/** Un en-tête ne peut transporter que de l'ASCII imprimable. */
function isPureAscii(value: string): boolean {
  // eslint-disable-next-line no-control-regex
  return !/[^\x20-\x7E]/.test(value)
}

/**
 * Encode un en-tête selon la RFC 2047 — et seulement si c'est nécessaire.
 *
 * Un objet déjà ASCII reste lisible tel quel dans la source du message : on
 * n'encode pas par principe, on encode ce qui le demande.
 */
export function encodeMimeHeader(value: string): string {
  if (isPureAscii(value)) return value
  return `=?UTF-8?B?${toBase64(value)}?=`
}

/** Replie en base64 sur des lignes de 76 caractères (RFC 2045). */
function foldBase64(value: string): string {
  return (toBase64(value).match(/.{1,76}/g) ?? []).join('\r\n')
}

export interface MimeMessageInput {
  from: string
  to: string
  subject: string
  /** Corps texte brut — toujours fourni, c'est le repli universel. */
  text: string
  /** Corps HTML optionnel. Fourni → message `multipart/alternative`. */
  html?: string
  inReplyTo?: string
  references?: string
}

/**
 * Construit le message MIME complet.
 *
 * Le corps part en **base64** : contrairement au `quoted-printable` annoncé
 * sans être appliqué, il ne peut pas être cassé par un caractère ou une ligne
 * longue. C'est aussi ce qui rend l'envoi d'HTML sûr.
 *
 * Avec `html`, on produit un `multipart/alternative` : les clients riches
 * affichent la version HTML, les autres (et les lecteurs d'écran, et les
 * clients en mode texte) gardent une version lisible. Envoyer de l'HTML seul
 * laisserait ces derniers devant une page vide.
 */
export function buildMimeMessage(input: MimeMessageInput): string {
  const headers = [
    `From: ${input.from}`,
    `To: ${input.to}`,
    `Subject: ${encodeMimeHeader(input.subject)}`,
    'MIME-Version: 1.0',
  ]
  if (input.inReplyTo) headers.push(`In-Reply-To: ${input.inReplyTo}`)
  if (input.references) headers.push(`References: ${input.references}`)

  if (!input.html) {
    headers.push('Content-Type: text/plain; charset=UTF-8', 'Content-Transfer-Encoding: base64')
    return [...headers, '', foldBase64(input.text)].join('\r\n')
  }

  // Frontière fixe : aucune donnée aléatoire ici (les scripts du projet
  // interdisent Math.random, et une frontière constante suffit dès lors
  // qu'elle ne peut pas apparaître dans un corps encodé en base64.)
  const boundary = '==_MonprojetPro_Boundary_a7f3c1=='

  headers.push(`Content-Type: multipart/alternative; boundary="${boundary}"`)

  return [
    ...headers,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    foldBase64(input.text),
    `--${boundary}`,
    'Content-Type: text/html; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    foldBase64(input.html),
    `--${boundary}--`,
  ].join('\r\n')
}
