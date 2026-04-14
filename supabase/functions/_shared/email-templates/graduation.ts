// [EMAIL:TEMPLATE] Graduation Lab → One (destinataire: client)
import { baseTemplate } from './base'

export interface GraduationEmailData {
  clientName: string
  oneUrl: string
}

export function graduationEmailTemplate(data: GraduationEmailData): string {
  const body = `
    <p>Bonjour <strong>${data.clientName}</strong>,</p>
    <p>🎉 <strong>Félicitations !</strong> Vous avez terminé votre parcours Lab avec succès.</p>
    <p>Votre espace <strong>MonprojetPro One</strong> est maintenant prêt. C'est votre tableau de bord professionnel personnalisé.</p>
    <p>Tout ce que vous avez créé durant votre parcours Lab est disponible dans votre espace One.</p>
    <p>Bienvenue dans votre nouvelle aventure entrepreneuriale !</p>
  `

  return baseTemplate({
    title: 'Félicitations ! Votre espace One est prêt',
    body,
    ctaUrl: data.oneUrl,
    ctaText: 'Accéder à mon espace One',
  })
}
