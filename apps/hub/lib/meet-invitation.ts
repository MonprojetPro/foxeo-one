/**
 * Corps de l'email d'invitation à une visio — fonction PURE.
 *
 * ⚠️ POURQUOI CE FICHIER EXISTE, PLUTÔT QU'UN EXPORT DE `send-meet-link.ts` :
 * tout ce qu'un fichier `'use server'` exporte devient un endpoint appelable
 * depuis le navigateur. Un simple formateur de texte n'a aucune raison d'ouvrir
 * une surface réseau — ni de coûter un aller-retour serveur quand on veut juste
 * assembler une chaîne. Les fonctions pures vivent donc hors des Server Actions.
 *
 * `sendGmailMessage` envoie en `text/plain` : pas de HTML ici.
 */

export interface MeetInvitationInput {
  clientName: string
  title: string
  meetUri: string
  scheduledAt?: string
  message?: string
}

export function formatMeetingDateFr(iso: string): string {
  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'full',
    timeStyle: 'short',
    timeZone: 'Europe/Paris',
  }).format(new Date(iso))
}

export function buildMeetInvitationBody(input: MeetInvitationInput): string {
  const lines = [`Bonjour ${input.clientName},`, '']

  if (input.message?.trim()) {
    lines.push(input.message.trim(), '')
  }

  if (input.scheduledAt) {
    lines.push(
      `Notre rendez-vous « ${input.title} » est prévu le ${formatMeetingDateFr(input.scheduledAt)}.`
    )
  } else {
    lines.push(`Voici le lien pour notre visioconférence « ${input.title} ».`)
  }

  lines.push(
    '',
    'Lien pour rejoindre la visio :',
    input.meetUri,
    '',
    "Aucune installation n'est nécessaire : le lien s'ouvre directement dans votre navigateur.",
    '',
    'À bientôt,',
    'MiKL — MonprojetPro'
  )

  return lines.join('\n')
}
