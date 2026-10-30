// [EMAIL:TEMPLATE] Bienvenue dans MonprojetPro Lab (destinataire: prospect converti)
// LOT C — Envoyé au LANCEMENT du parcours (pas au paiement). Le client définit
// lui-même son mot de passe via un lien d'invitation à usage unique (pattern
// recovery), plus aucun mot de passe en clair dans l'email.
import { baseTemplate, escapeHtml } from './base'

export interface WelcomeLabEmailData {
  clientName: string
  /**
   * Libellé réel de la 1ʳᵉ étape du parcours assemblé par MiKL — optionnel : l'email part
   * désormais à l'ACTIVATION du Lab, avant que le parcours ne soit forcément composé.
   */
  firstStepLabel?: string
  /** Lien d'invitation à usage unique (admin generateLink type recovery). */
  activationLink: string
}

export function welcomeLabEmailTemplate(data: WelcomeLabEmailData): string {
  const parcoursLine = data.firstStepLabel
    ? `<p>Votre parcours d'incubation est prêt. Vous commencerez par l'étape <strong>${escapeHtml(data.firstStepLabel)}</strong>.</p>`
    : `<p>Votre espace d'incubation est prêt. MiKL compose votre parcours — vous recevrez une notification dès qu'une première étape sera disponible.</p>`

  const body = `
    <p>Bonjour <strong>${escapeHtml(data.clientName)}</strong>,</p>
    <p>🎉 Bienvenue dans <strong>MonprojetPro Lab</strong> !</p>
    ${parcoursLine}
    <p>Pour accéder à votre espace, cliquez sur le bouton ci-dessous et choisissez votre mot de passe :</p>
    <p style="color:#6b7280;font-size:14px;">Ce lien personnel est valable 1 heure. Passé ce délai, utilisez « Mot de passe oublié » sur la page de connexion pour en recevoir un nouveau.</p>
  `

  return baseTemplate({
    title: 'Bienvenue dans MonprojetPro Lab !',
    body,
    ctaUrl: data.activationLink,
    ctaText: 'Définir mon mot de passe',
  })
}
