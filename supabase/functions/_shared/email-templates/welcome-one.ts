// [EMAIL:TEMPLATE] Story 13.4 — Bienvenue MonprojetPro One (acompte 30% reçu)
import { baseTemplate, escapeHtml } from './base.ts'

export interface WelcomeOneEmailData {
  clientName: string
  activationLink: string
  temporaryPassword: string | null
}

export function welcomeOneEmailTemplate(data: WelcomeOneEmailData): string {
  const pwdBlock = data.temporaryPassword
    ? `<p>Votre mot de passe temporaire : <code style="background:#f4f4f5;padding:4px 8px;border-radius:4px;font-family:monospace;">${escapeHtml(data.temporaryPassword)}</code></p>
       <p style="color:#6b7280;font-size:14px;">Vous devrez le changer lors de votre première connexion.</p>`
    : `<p style="color:#6b7280;font-size:14px;">Utilisez l'email et le mot de passe que vous avez déjà définis pour vous connecter.</p>`

  const body = `
    <p>Bonjour <strong>${escapeHtml(data.clientName)}</strong>,</p>
    <p>🎉 Merci pour votre acompte de 30% — votre espace <strong>MonprojetPro One</strong> est maintenant actif.</p>
    <p>Le développement de votre projet peut démarrer. Vous aurez accès à votre dashboard dès votre première connexion.</p>
    ${pwdBlock}
  `

  return baseTemplate({
    title: 'Votre espace One est prêt !',
    body,
    ctaUrl: data.activationLink,
    ctaText: 'Accéder à mon espace',
  })
}
