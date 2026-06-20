// [EMAIL:TEMPLATE] 1er mail de bienvenue — envoyé AU PAIEMENT du forfait Lab.
// Mail chaleureux qui accueille le client dans l'aventure et annonce qu'un 2e
// email (avec le lien d'accès + la 1ʳᵉ étape) arrivera au lancement du parcours.
// Pas de CTA ni de lien ici : on ne demande rien, on rassure.
import { baseTemplate, escapeHtml } from './base'

export interface WelcomeVentureEmailData {
  clientName: string
}

export function welcomeVentureEmailTemplate(data: WelcomeVentureEmailData): string {
  const body = `
    <p>Bonjour <strong>${escapeHtml(data.clientName)}</strong>,</p>
    <p>🎉 Quelle joie de vous compter parmi nous — <strong>bienvenue dans l'aventure MonprojetPro&nbsp;!</strong></p>
    <p>Votre paiement est bien reçu, c'est officiel : on embarque ensemble. 🚀</p>
    <p>Dans les prochains jours, vous recevrez un <strong>second email</strong> avec tout ce qu'il faut pour démarrer : votre accès personnel et la première étape de votre parcours.</p>
    <p>En attendant, on s'occupe de tout : on <strong>paramètre votre espace aux petits oignons</strong> pour qu'il soit parfaitement adapté à votre projet.</p>
    <p>À très vite,<br/>L'équipe MonprojetPro</p>
  `

  return baseTemplate({
    title: 'Bienvenue dans l’aventure MonprojetPro !',
    body,
  })
}
