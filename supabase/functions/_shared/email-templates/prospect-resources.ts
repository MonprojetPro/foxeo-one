// [EMAIL:TEMPLATE] Ressources prospect (destinataire: prospect)
import { baseTemplate, escapeHtml } from './base'

export interface ResourceLink {
  name: string
  url: string
}

export interface ProspectResourcesEmailData {
  links: ResourceLink[]
}

function escapeUrl(url: string): string {
  return url.replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

export function prospectResourcesEmailTemplate(data: ProspectResourcesEmailData): string {
  const linkItems = data.links
    .map(
      (link) =>
        `<li style="margin-bottom:8px;"><a href="${escapeUrl(link.url)}" style="color:#059669;text-decoration:underline;">${escapeHtml(link.name)}</a></li>`
    )
    .join('')

  const body = `
    <p>Suite à notre échange, voici les ressources qui pourraient vous être utiles :</p>
    ${
      data.links.length > 0
        ? `<ul style="padding-left:20px;color:#3f3f46;">${linkItems}</ul>`
        : '<p>Aucune ressource disponible.</p>'
    }
    <p style="color:#6b7280;font-size:14px;">⚠️ Ces liens sont valables pendant 7 jours.</p>
    <p>Si vous avez des questions, n'hésitez pas à nous recontacter.</p>
  `

  return baseTemplate({
    title: 'Vos ressources MonprojetPro',
    body,
  })
}
